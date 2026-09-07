// ============================================================================
//  slime-sdf-shader.ts  —  SDF/Metaballs 史萊姆 shader (WebGL2 GLSL ES 300)
// ============================================================================
//  對應規格書「程序化視覺與色粉系統」：
//  - 初始形態：純透明高折射率液滴
//  - SDF / Metaballs：Smooth Minimum (smin) 實現質點間柔和融合
//  - 色粉混合：直接採樣 pigment RT
//  - 表面高光 + 邊緣折射微光
// ============================================================================

export const SLIME_VERT = /* glsl */ `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const SLIME_FRAG = /* glsl */ `#version 300 es
precision highp float;

#define METABALL_MAX_COUNT 64

in vec2 v_uv;
out vec4 fragColor;

// Uniforms
uniform vec2      u_resolution;
uniform float     u_time;
uniform vec4      u_baseColor;       // rgb + alpha
uniform float     u_refraction;
uniform float     u_specPower;
uniform float     u_specIntensity;
uniform float     u_rimIntensity;
uniform float     u_smoothK;          // smin k

// Metaball buffer (uniform array —— 比 SSBO 兼容性更好)
uniform int       u_metaballCount;
uniform vec4      u_metaballs[METABALL_MAX_COUNT];   // xy=pos, z=radius, w=pressure

// Textures
uniform sampler2D u_pigmentTex;
uniform sampler2D u_backgroundTex;
uniform int       u_hasBackground;

// 簡單 hash noise（背景用）
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Smooth minimum
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / max(k, 0.0001), 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdCircle(vec2 p, vec2 c, float r) {
  return length(p - c) - r;
}

// 計算所有 metaball 的聯合 SDF
float computeSDF(vec2 uv) {
  float d = 1e9;
  int count = min(u_metaballCount, METABALL_MAX_COUNT);
  for (int i = 0; i < METABALL_MAX_COUNT; i++) {
    if (i >= count) break;
    vec4 m = u_metaballs[i];
    float r = m.z * (1.0 + 0.2 * m.w);
    d = smin(d, sdCircle(uv, m.xy, r), u_smoothK);
  }
  return d;
}

// 從 SDF 取得梯度（用於法線）
vec2 sdfGradient(vec2 uv) {
  vec2 e = 1.0 / u_resolution;
  float dL = computeSDF(uv - vec2(e.x, 0.0));
  float dR = computeSDF(uv + vec2(e.x, 0.0));
  float dD = computeSDF(uv - vec2(0.0, e.y));
  float dU = computeSDF(uv + vec2(0.0, e.y));
  return vec2(dR - dL, dU - dD);
}

void main() {
  vec2 uv = v_uv;
  // 1. SDF
  float d = computeSDF(uv);
  float mask = smoothstep(0.02, 0.0, d);
  float interior = smoothstep(0.0, -0.05, d);

  if (mask < 0.001) discard;

  // 2. 法線 + 折射
  vec2 grad = sdfGradient(uv);
  vec3 n = normalize(vec3(-grad, 1.0));
  vec2 refractOffset = n.xy * u_refraction * interior;

  // 背景採樣（折射後位置）—— 沒有背景紋理時用漸層 noise
  vec3 bgColor;
  if (u_hasBackground == 1) {
    bgColor = texture(u_backgroundTex, uv + refractOffset).rgb;
  } else {
    // 程序化漸層背景
    float t = uv.y;
    vec3 top = vec3(0.06, 0.07, 0.15);
    vec3 bot = vec3(0.02, 0.03, 0.08);
    bgColor = mix(bot, top, t);
    // 加一點 noise
    float n = hash21(uv * 200.0 + u_time * 0.05);
    bgColor += (n - 0.5) * 0.015;
  }

  // 3. 高光
  vec3 lightDir = normalize(vec3(0.3, 0.5, 0.8));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(n, halfDir), 0.0), u_specPower) * u_specIntensity;

  // 4. Fresnel rim
  float rim = pow(1.0 - max(n.z, 0.0), 3.0) * u_rimIntensity;

  // 5. 色粉混合
  vec4 pigment = texture(u_pigmentTex, uv);

  // 6. 合成
  vec3 finalColor = bgColor * (1.0 - u_baseColor.a * interior)
                  + u_baseColor.rgb * u_baseColor.a * interior
                  + pigment.rgb * pigment.a * interior;
  finalColor += spec * mask;
  finalColor += rim * mask;

  float alpha = max(interior, mask * 0.6) * u_baseColor.a;
  alpha = clamp(alpha + pigment.a * 0.4, 0.0, 1.0);

  fragColor = vec4(finalColor, alpha);
}`;
