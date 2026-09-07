// ============================================================================
//  pigment-shader.ts  —  色粉擴散 Shader (WebGL2 GLSL ES 300)
// ============================================================================
//  對應規格書「色粉擴散演算法」：
//  - Drop pass：在指定位置注入色粉
//  - Diffuse pass：Jacobi 迭代（拉普拉斯運算子）
//  - SSS pass：9-tap 高斯模糊近似次表面散射
// ============================================================================

export const PIGMENT_VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const PIGMENT_DROP_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_prev;     // 上一幀 pigment
uniform sampler2D u_sdf;      // slime SDF（mask 用）
uniform vec2  u_dropPos;
uniform vec4  u_dropColor;
uniform float u_dropRadius;
uniform float u_dropStrength;

void main() {
  vec4 cur = texture(u_prev, v_uv);
  float dist = distance(v_uv, u_dropPos);
  float sdf = texture(u_sdf, v_uv).r;
  if (sdf > 0.0) { fragColor = cur; return; }

  float falloff = clamp(1.0 - dist / max(u_dropRadius, 0.0001), 0.0, 1.0);
  falloff = pow(falloff, 2.0) * u_dropStrength;

  vec3 newColor = mix(cur.rgb, u_dropColor.rgb, falloff * 0.5);
  float newAlpha = clamp(cur.a + falloff * 0.5, 0.0, 1.0);
  fragColor = vec4(newColor, newAlpha);
}`;

export const PIGMENT_DIFFUSE_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_prev;
uniform vec2  u_texelSize;
uniform sampler2D u_sdf;
uniform float u_diffuseRate;
uniform float u_decayRate;
uniform float u_dt;

void main() {
  vec4 center = texture(u_prev, v_uv);
  vec2 ts = u_texelSize;
  vec4 left  = texture(u_prev, v_uv + vec2(-ts.x, 0.0));
  vec4 right = texture(u_prev, v_uv + vec2( ts.x, 0.0));
  vec4 down  = texture(u_prev, v_uv + vec2(0.0, -ts.y));
  vec4 up    = texture(u_prev, v_uv + vec2(0.0,  ts.y));

  vec4 laplacian = (left + right + down + up - 4.0 * center);

  float sdf = texture(u_sdf, v_uv).r;
  float mask = sdf < 0.0 ? 1.0 : 0.0;
  float rate = u_diffuseRate * mask;

  vec4 diffused = center + laplacian * rate;
  diffused.rgb *= exp(-u_decayRate * u_dt);
  diffused.a   *= exp(-u_decayRate * u_dt * 0.5);

  fragColor = diffused;
}`;

export const PIGMENT_SSS_FRAG = /* glsl */ `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_prev;
uniform vec2  u_texelSize;
uniform sampler2D u_sdf;

void main() {
  vec2 ts = u_texelSize * 3.0;
  vec4 sum = vec4(0.0);
  float wsum = 0.0;

  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 off = vec2(float(x), float(y)) * ts;
      float w = exp(-(float(x*x + y*y)) / 2.0);
      vec4 c = texture(u_prev, v_uv + off);
      float sdf = texture(u_sdf, v_uv + off).r;
      if (sdf > 0.0) c *= 0.0;
      sum += c * w;
      wsum += w;
    }
  }
  fragColor = sum / max(wsum, 0.0001);
}`;
