// ============================================================================
//  WebGLHelper.ts  —  共用 WebGL2 工具
// ============================================================================

export function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error('Shader compile error: ' + log + '\n--- src ---\n' + src);
  }
  return sh;
}

export function linkProgram(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error('Program link error: ' + log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return p;
}

export function createTexture(gl: WebGL2RenderingContext, w: number, h: number, internalFormat: number = gl.RGBA16F, format: number = gl.RGBA, type: number = gl.HALF_FLOAT): WebGLTexture {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

export function createFBO(gl: WebGL2RenderingContext): WebGLFramebuffer {
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  return fb;
}

export function bindFBOTexture(gl: WebGL2RenderingContext, fb: WebGLFramebuffer, tex: WebGLTexture, attachment = gl.COLOR_ATTACHMENT0): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, tex, 0);
}

/** 全螢幕 quad —— 2 個三角形，6 個頂點 */
export function createFullscreenQuad(gl: WebGL2RenderingContext): WebGLBuffer {
  const verts = new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
  ]);
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  return buf;
}

export function checkFBO(gl: WebGL2RenderingContext): void {
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error('Framebuffer incomplete: 0x' + status.toString(16) +
      (status === 0x8cdd ? ' (UNSUPPORTED)' : ''));
  }
}

export function isFloatBlendSupported(gl: WebGL2RenderingContext): boolean {
  // EXT_float_blend 檢查
  return gl.getExtension('EXT_float_blend') !== null ||
         gl.getExtension('EXT_color_buffer_float') !== null;
}
