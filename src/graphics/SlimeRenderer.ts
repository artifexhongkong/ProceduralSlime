// ============================================================================
//  SlimeRenderer.ts  —  WebGL2 SDF/Metaballs 史萊姆渲染器
// ============================================================================
//  對應 Graphics Specialist Agent
//  - 建立/編譯 slime SDF shader
//  - 每幀上傳 metaball uniform（UBo 或 uniform array）
//  - 渲染到全螢幕 quad
//  - 接收 pigment texture 進行色粉混合
// ============================================================================

import { SLIME_VERT, SLIME_FRAG } from '../../shaders/slime-sdf-shader';
import { linkProgram, createFullscreenQuad } from './WebGLHelper';
import type { Metaball } from '../core/types';

export class SlimeRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private quadBuf: WebGLBuffer;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private metaballArr = new Float32Array(64 * 4);   // 預分配

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = linkProgram(gl, SLIME_VERT, SLIME_FRAG);
    this.quadBuf = createFullscreenQuad(gl);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    const loc = gl.getAttribLocation(this.program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Cache uniform locations
    const u = (n: string) => gl.getUniformLocation(this.program, n);
    this.uniforms = {
      u_resolution:   u('u_resolution'),
      u_time:         u('u_time'),
      u_baseColor:    u('u_baseColor'),
      u_refraction:   u('u_refraction'),
      u_specPower:    u('u_specPower'),
      u_specIntensity: u('u_specIntensity'),
      u_rimIntensity: u('u_rimIntensity'),
      u_smoothK:      u('u_smoothK'),
      u_metaballCount: u('u_metaballCount'),
      u_metaballs:    u('u_metaballs'),
      u_pigmentTex:   u('u_pigmentTex'),
      u_backgroundTex: u('u_backgroundTex'),
      u_hasBackground: u('u_hasBackground'),
    };
  }

  /**
   * 渲染一幀。
   * @param metaballs  質點陣列
   * @param count      實際使用數量
   * @param pigmentTex 色粉 texture（可為 null）
   * @param time       時間（秒）
   * @param w          viewport 寬
   * @param h          viewport 高
   */
  render(metaballs: Metaball[], count: number, pigmentTex: WebGLTexture | null, time: number, w: number, h: number): void {
    const gl = this.gl;
    gl.viewport(0, 0, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Pack metaballs into Float32Array (vec4 per metaball)
    const arr = this.metaballArr;
    const n = Math.min(count, 64);
    for (let i = 0; i < n; i++) {
      const m = metaballs[i];
      arr[i * 4 + 0] = m.x;
      arr[i * 4 + 1] = m.y;
      arr[i * 4 + 2] = m.z;
      arr[i * 4 + 3] = m.w;
    }
    gl.uniform4fv(this.uniforms.u_metaballs!, arr);
    gl.uniform1i(this.uniforms.u_metaballCount!, n);
    gl.uniform2f(this.uniforms.u_resolution!, w, h);
    gl.uniform1f(this.uniforms.u_time!, time);
    gl.uniform4f(this.uniforms.u_baseColor!, 0.85, 0.95, 1.0, 0.55);
    gl.uniform1f(this.uniforms.u_refraction!, 0.04);
    gl.uniform1f(this.uniforms.u_specPower!, 64.0);
    gl.uniform1f(this.uniforms.u_specIntensity!, 1.5);
    gl.uniform1f(this.uniforms.u_rimIntensity!, 0.8);
    gl.uniform1f(this.uniforms.u_smoothK!, 0.12);

    // Pigment texture: unit 0
    if (pigmentTex) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, pigmentTex);
      gl.uniform1i(this.uniforms.u_pigmentTex!, 0);
    }
    // Background texture: unit 1 (no background provided = use procedural gradient)
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.uniform1i(this.uniforms.u_backgroundTex!, 1);
    gl.uniform1i(this.uniforms.u_hasBackground!, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuf);
    gl.deleteVertexArray(this.vao);
  }
}
