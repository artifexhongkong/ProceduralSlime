// ============================================================================
//  PigmentSystem.ts  —  色粉注入 + Jacobi 擴散 + SSS
// ============================================================================
//  對應規格書「色粉擴散演算法」
//  - 兩個 ping-pong RT
//  - Drop pass / Diffuse pass / SSS pass
//  - 半解析度（效能考量）
// ============================================================================

import { PIGMENT_VERT, PIGMENT_DROP_FRAG, PIGMENT_DIFFUSE_FRAG, PIGMENT_SSS_FRAG } from '../../shaders/pigment-shader';
import { linkProgram, createFullscreenQuad, createTexture, createFBO, bindFBOTexture, checkFBO } from './WebGLHelper';

export interface DropRequest {
  color: [number, number, number];
  x: number;       // UV space 0..1
  y: number;
}

export class PigmentSystem {
  private gl: WebGL2RenderingContext;
  private dropProg: WebGLProgram;
  private diffuseProg: WebGLProgram;
  private sssProg: WebGLProgram;
  private quadBuf: WebGLBuffer;
  private vao: WebGLVertexArrayObject;

  private rtA: WebGLTexture;
  private rtB: WebGLTexture;
  private fboA: WebGLFramebuffer;
  private fboB: WebGLFramebuffer;

  private rtW: number;
  private rtH: number;

  private dropUniforms: Record<string, WebGLUniformLocation | null> = {};
  private diffuseUniforms: Record<string, WebGLUniformLocation | null> = {};
  private sssUniforms: Record<string, WebGLUniformLocation | null> = {};

  private pendingDrops: DropRequest[] = [];
  private jacobiIterations = 3;
  private diffuseRate = 0.16;
  private decayRate = 0.02;
  private enableSSS = true;

  // 預先記錄的 SDF texture（由外部注入）
  private sdfTexture: WebGLTexture | null = null;

  // 用於初始 pigmentTex = rtA；外部 SlimeRenderer 每幀渲染後讀取
  public currentReadTexture: WebGLTexture;

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.rtW = Math.max(2, width);
    this.rtH = Math.max(2, height);

    // 建立 3 個 program
    this.dropProg = linkProgram(gl, PIGMENT_VERT, PIGMENT_DROP_FRAG);
    this.diffuseProg = linkProgram(gl, PIGMENT_VERT, PIGMENT_DIFFUSE_FRAG);
    this.sssProg = linkProgram(gl, PIGMENT_VERT, PIGMENT_SSS_FRAG);

    // 全螢幕 quad
    this.quadBuf = createFullscreenQuad(gl);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    [this.dropProg, this.diffuseProg, this.sssProg].forEach(prog => {
      gl.useProgram(prog);
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    });
    gl.bindVertexArray(null);

    // 建立兩個 RT + FBO
    const internalFormat = gl.getExtension('EXT_color_buffer_float') ? gl.RGBA16F : gl.RGBA8;
    const dataType = internalFormat === gl.RGBA16F ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;

    this.rtA = createTexture(gl, this.rtW, this.rtH, internalFormat, gl.RGBA, dataType);
    this.rtB = createTexture(gl, this.rtW, this.rtH, internalFormat, gl.RGBA, dataType);
    this.fboA = createFBO(gl);
    bindFBOTexture(gl, this.fboA, this.rtA);
    checkFBO(gl);
    this.fboB = createFBO(gl);
    bindFBOTexture(gl, this.fboB, this.rtB);
    checkFBO(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.currentReadTexture = this.rtA;

    // Cache uniforms
    const cacheU = (prog: WebGLProgram, names: string[]) => {
      const obj: Record<string, WebGLUniformLocation | null> = {};
      for (const n of names) obj[n] = gl.getUniformLocation(prog, n);
      return obj;
    };
    this.dropUniforms = cacheU(this.dropProg, ['u_prev', 'u_sdf', 'u_dropPos', 'u_dropColor', 'u_dropRadius', 'u_dropStrength']);
    this.diffuseUniforms = cacheU(this.diffuseProg, ['u_prev', 'u_texelSize', 'u_sdf', 'u_diffuseRate', 'u_decayRate', 'u_dt']);
    this.sssUniforms = cacheU(this.sssProg, ['u_prev', 'u_texelSize', 'u_sdf']);
  }

  setSDFTexture(tex: WebGLTexture): void {
    this.sdfTexture = tex;
  }

  dropPigment(req: DropRequest): void {
    this.pendingDrops.push(req);
  }

  resize(width: number, height: number): void {
    if (width === this.rtW && height === this.rtH) return;
    const gl = this.gl;
    this.rtW = Math.max(2, width);
    this.rtH = Math.max(2, height);
    const internalFormat = gl.getExtension('EXT_color_buffer_float') ? gl.RGBA16F : gl.RGBA8;
    const dataType = internalFormat === gl.RGBA16F ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE;
    gl.bindTexture(gl.TEXTURE_2D, this.rtA);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this.rtW, this.rtH, 0, gl.RGBA, dataType, null);
    gl.bindTexture(gl.TEXTURE_2D, this.rtB);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, this.rtW, this.rtH, 0, gl.RGBA, dataType, null);
  }

  update(dt: number): void {
    const gl = this.gl;
    let readTex = this.currentReadTexture;
    let writeTex = this.rtB;
    let readFBO = this.fboA;
    let writeFBO = this.fboB;

    // 確保 readTex 對應正確的 FBO
    if (readTex === this.rtA) { readFBO = this.fboA; writeFBO = this.fboB; writeTex = this.rtB; }
    else { readFBO = this.fboB; writeFBO = this.fboA; writeTex = this.rtA; }

    // 1. Drop pass（如果有 pending）
    for (const drop of this.pendingDrops) {
      this.runPass(this.dropProg, readTex, writeFBO, readFBO, (prog, gl) => {
        gl.uniform2f(this.dropUniforms.u_dropPos!, drop.x, drop.y);
        gl.uniform4f(this.dropUniforms.u_dropColor!, drop.color[0], drop.color[1], drop.color[2], 1.0);
        gl.uniform1f(this.dropUniforms.u_dropRadius!, 0.025);
        gl.uniform1f(this.dropUniforms.u_dropStrength!, 1.5);
        // SDF texture bind to unit 1
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.sdfTexture);
        gl.uniform1i(this.dropUniforms.u_sdf!, 1);
      });
      // swap
      [readTex, writeTex] = [writeTex, readTex];
      [readFBO, writeFBO] = [writeFBO, readFBO];
    }
    this.pendingDrops.length = 0;

    // 2. Diffuse pass × N iterations
    for (let i = 0; i < this.jacobiIterations; i++) {
      this.runPass(this.diffuseProg, readTex, writeFBO, readFBO, (prog, gl) => {
        gl.uniform2f(this.diffuseUniforms.u_texelSize!, 1.0 / this.rtW, 1.0 / this.rtH);
        gl.uniform1f(this.diffuseUniforms.u_diffuseRate!, this.diffuseRate);
        gl.uniform1f(this.diffuseUniforms.u_decayRate!, this.decayRate);
        gl.uniform1f(this.diffuseUniforms.u_dt!, dt);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.sdfTexture);
        gl.uniform1i(this.diffuseUniforms.u_sdf!, 1);
      });
      [readTex, writeTex] = [writeTex, readTex];
      [readFBO, writeFBO] = [writeFBO, readFBO];
    }

    // 3. SSS pass（可選）
    if (this.enableSSS) {
      this.runPass(this.sssProg, readTex, writeFBO, readFBO, (prog, gl) => {
        gl.uniform2f(this.sssUniforms.u_texelSize!, 1.0 / this.rtW, 1.0 / this.rtH);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.sdfTexture);
        gl.uniform1i(this.sssUniforms.u_sdf!, 1);
      });
      [readTex, writeTex] = [writeTex, readTex];
      [readFBO, writeFBO] = [writeFBO, readFBO];
    }

    this.currentReadTexture = readTex;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private runPass(prog: WebGLProgram, readTex: WebGLTexture, writeFBO: WebGLFramebuffer, _readFBO: WebGLFramebuffer, setup: (prog: WebGLProgram, gl: WebGL2RenderingContext) => void): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFBO);
    gl.viewport(0, 0, this.rtW, this.rtH);
    gl.useProgram(prog);
    gl.bindVertexArray(this.vao);

    // Bind read texture to unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTex);
    gl.uniform1i(prog === this.dropProg ? this.dropUniforms.u_prev! :
                  prog === this.diffuseProg ? this.diffuseUniforms.u_prev! : this.sssUniforms.u_prev!, 0);

    setup(prog, gl);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.dropProg);
    gl.deleteProgram(this.diffuseProg);
    gl.deleteProgram(this.sssProg);
    gl.deleteBuffer(this.quadBuf);
    gl.deleteVertexArray(this.vao);
    gl.deleteTexture(this.rtA);
    gl.deleteTexture(this.rtB);
    gl.deleteFramebuffer(this.fboA);
    gl.deleteFramebuffer(this.fboB);
  }
}
