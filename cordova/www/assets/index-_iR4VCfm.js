(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))e(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const a of n.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&e(a)}).observe(document,{childList:!0,subtree:!0});function i(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function e(s){if(s.ep)return;s.ep=!0;const n=i(s);fetch(s.href,n)}})();var _=(r=>(r[r.Idle=0]="Idle",r[r.Touch=1]="Touch",r[r.Gyro=2]="Gyro",r[r.Paused=3]="Paused",r))(_||{});class j{constructor(){this.map=new Map}on(t,i){let e=this.map.get(t);return e||(e=new Set,this.map.set(t,e)),e.add(i),()=>e.delete(i)}emit(t,i){const e=this.map.get(t);if(e)for(const s of e)try{s(i)}catch(n){console.error("[GameEvents]",t,n)}}off(t,i){const e=this.map.get(t);e&&e.delete(i)}clear(){this.map.clear()}}const u=new j,l={TouchStarted:"touch:started",TouchMoved:"touch:moved",TouchEnded:"touch:ended",Gravity:"gravity:changed",Shake:"gyro:shake",PigmentDrop:"pigment:dropped",PigmentSelect:"pigment:selected",UserActivity:"user:activity",StateChanged:"state:changed",FPSChanged:"fps:changed"},Q=r=>{u.emit(l.TouchStarted,r),u.emit(l.UserActivity,null)},J=r=>{u.emit(l.TouchMoved,r),u.emit(l.UserActivity,null)},G=r=>{u.emit(l.TouchEnded,r),u.emit(l.UserActivity,null)},X=r=>{u.emit(l.Gravity,r),r.magnitude>.4&&u.emit(l.UserActivity,null)},Z=r=>{u.emit(l.Shake,r),u.emit(l.UserActivity,null)},tt=(r,t,i)=>{u.emit(l.PigmentDrop,{color:r,x:t,y:i}),u.emit(l.UserActivity,null)},et=r=>{u.emit(l.PigmentSelect,r),u.emit(l.UserActivity,null)},it=(r,t)=>u.emit(l.StateChanged,{from:r,to:t}),st=r=>u.emit(l.FPSChanged,r);class rt{constructor(){this.current=null,this.pending=null,this.hasPending=!1,this.initialized=!1}get currentStateType(){return this.current?.type??_.Idle}initialize(t){this.initialized||(this.current=t,this.current.onEnter(_.Idle),this.initialized=!0)}changeState(t){t&&(this.current&&t.type===this.current.type||(this.pending=t,this.hasPending=!0))}tick(t){if(this.hasPending){const i=this.current,e=i?.type??_.Idle;i?.onExit(this.pending.type),this.current=this.pending,this.current.onEnter(e),this.pending=null,this.hasPending=!1,it(e,this.current.type)}this.current?.onUpdate(t)}fixedTick(t){this.current?.onFixedUpdate(t)}}class ot{constructor(t,i,e){this.fsm=t,this.touchState=i,this.gyroState=e,this.type=_.Idle,this.idleDuration=0,this.lowPower=!1,this.onTouchStarted=()=>this.fsm.changeState(this.touchState),this.onGravity=s=>{s.magnitude>.16&&this.fsm.changeState(this.gyroState)},this.onShake=s=>{s>.5&&this.fsm.changeState(this.gyroState)}}onEnter(t){this.idleDuration=0,this.lowPower=!1,u.on(l.TouchStarted,this.onTouchStarted),u.on(l.Gravity,this.onGravity),u.on(l.Shake,this.onShake)}onUpdate(t){this.idleDuration+=t,!this.lowPower&&this.idleDuration>10&&(this.lowPower=!0)}onFixedUpdate(t){}onExit(t){u.off(l.TouchStarted,this.onTouchStarted),u.off(l.Gravity,this.onGravity),u.off(l.Shake,this.onShake)}}class nt{constructor(t,i){this.fsm=t,this.idleState=i,this.type=_.Touch,this.onTouchEnded=()=>this.fsm.changeState(this.idleState)}onEnter(t){u.on(l.TouchEnded,this.onTouchEnded)}onUpdate(t){}onFixedUpdate(t){}onExit(t){u.off(l.TouchEnded,this.onTouchEnded)}}const S=class S{constructor(t,i,e){this.fsm=t,this.idleState=i,this.touchState=e,this.type=_.Gyro,this.gravityMag=0,this.quietDuration=0,this.onTouchStarted=()=>this.fsm.changeState(this.touchState),this.onGravity=s=>{this.gravityMag=s.magnitude}}onEnter(t){this.quietDuration=0,u.on(l.TouchStarted,this.onTouchStarted),u.on(l.Gravity,this.onGravity)}onUpdate(t){this.gravityMag<S.QuietThreshold?(this.quietDuration+=t,this.quietDuration>S.QuietExitTime&&this.fsm.changeState(this.idleState)):this.quietDuration=0}onFixedUpdate(t){}onExit(t){u.off(l.TouchStarted,this.onTouchStarted),u.off(l.Gravity,this.onGravity)}};S.QuietThreshold=.05,S.QuietExitTime=.8;let M=S;class at{constructor(){this.idle=0,this.activityUnsub=null}start(){this.activityUnsub||(this.activityUnsub=u.on(l.UserActivity,()=>{this.idle=0}))}stop(){this.activityUnsub&&(this.activityUnsub(),this.activityUnsub=null)}tick(t){this.idle+=t}notifyActivity(){this.idle=0}get idleDuration(){return this.idle}isIdleFor(t){return this.idle>=t}}const m=class m{constructor(t){this.currentFPS=m.FPS_INTERACTIVE,this.isBackground=!1,this.lastFrameTime=0,this.targetInterval=1e3/60,this.onVisibilityChange=()=>{document.hidden?(this.isBackground=!0,this.setFPS(m.FPS_IDLE_LONG)):(this.isBackground=!1,this.activity.notifyActivity(),this.setFPS(m.FPS_INTERACTIVE))},this.onBlur=()=>{this.isBackground=!0,this.setFPS(m.FPS_IDLE_LONG)},this.onFocus=()=>{this.isBackground=!1,this.activity.notifyActivity(),this.setFPS(m.FPS_INTERACTIVE)},this.activity=t}start(){document.addEventListener("visibilitychange",this.onVisibilityChange),window.addEventListener("blur",this.onBlur),window.addEventListener("focus",this.onFocus)}stop(){document.removeEventListener("visibilitychange",this.onVisibilityChange),window.removeEventListener("blur",this.onBlur),window.removeEventListener("focus",this.onFocus)}shouldRenderNow(t){if(this.isBackground)return!1;const i=t-this.lastFrameTime;return i<this.targetInterval?!1:(this.lastFrameTime=t-i%this.targetInterval,!0)}tick(t){if(this.isBackground)return;let i=m.FPS_INTERACTIVE;this.activity.idleDuration>=m.T_15?i=m.FPS_IDLE_LONG:this.activity.idleDuration>=m.T_30&&(i=m.FPS_IDLE_SHORT),i!==this.currentFPS&&this.setFPS(i)}setFPS(t){this.currentFPS!==t&&(this.currentFPS=t,this.targetInterval=1e3/t,st(t),console.log(`[AdaptiveFPS] → ${t} FPS`))}get current(){return this.currentFPS}get background(){return this.isBackground}};m.FPS_INTERACTIVE=60,m.FPS_IDLE_SHORT=30,m.FPS_IDLE_LONG=15,m.T_30=10,m.T_15=30;let D=m;class ht{constructor(t=4096,i=32){this.vec3Pool=[],this.colorPool=[],this.arraySize=t,this.maxPoolSize=i;for(let e=0;e<4;e++)this.vec3Pool.push(new Float32Array(this.arraySize)),this.colorPool.push(new Float32Array(this.arraySize))}rentVec3(){return this.vec3Pool.pop()??new Float32Array(this.arraySize)}rentColor(){return this.colorPool.pop()??new Float32Array(this.arraySize)}returnVec3(t){t.length===this.arraySize&&(this.vec3Pool.length>=this.maxPoolSize||this.vec3Pool.push(t))}returnColor(t){t.length===this.arraySize&&(this.colorPool.length>=this.maxPoolSize||this.colorPool.push(t))}get size(){return this.arraySize}}const ct={particleCount:28,initialRadius:.25,maxSpreadRadius:.85,initialViscosity:.92,viscosityDecayTime:180,minViscosity:.15,springStiffness:12,springDamping:3.5,gravityStrength:2,gravitySmooth:.5,touchRadius:.12,touchForce:25};class ut{constructor(t={}){this.idleTimer=0,this.smoothedGravityX=0,this.smoothedGravityY=0,this.touchActive=!1,this.touchX=0,this.touchY=0,this.config={...ct,...t};const i=this.config.particleCount;this.positionsX=new Float32Array(i),this.positionsY=new Float32Array(i),this.velocitiesX=new Float32Array(i),this.velocitiesY=new Float32Array(i),this.restPositionsX=new Float32Array(i),this.restPositionsY=new Float32Array(i),this.radii=new Float32Array(i),this.metaballs=new Array(i);for(let e=0;e<i;e++)this.metaballs[e]={x:.5,y:.5,z:.05,w:0};this.currentViscosity=this.config.initialViscosity,this.currentSpreadRadius=this.config.initialRadius,this.initializeParticles()}initializeParticles(){const t=this.config.particleCount,i=Math.ceil(Math.sqrt(t)),e=this.config.initialRadius/Math.max(i,1)*1.5;let s=0;for(let n=0;n<i*2&&s<t;n++){const a=n===0?1:n*6;for(let o=0;o<a&&s<t;o++){const h=o/a*Math.PI*2,c=n*e*.6,f=.5+Math.cos(h)*c,T=.5+Math.sin(h)*c;this.positionsX[s]=f,this.positionsY[s]=T,this.restPositionsX[s]=f,this.restPositionsY[s]=T,this.velocitiesX[s]=0,this.velocitiesY[s]=0,this.radii[s]=e*1.2,s++}}for(;s<t;)this.positionsX[s]=.5,this.positionsY[s]=.5,this.restPositionsX[s]=.5,this.restPositionsY[s]=.5,this.radii[s]=e*1.2,s++}setTouch(t,i,e){this.touchActive=t,this.touchX=i,this.touchY=e}setGravity(t){const i=1-this.config.gravitySmooth,e=Math.sqrt(t.magnitude),s=t.x/Math.max(e,1e-4)*e,n=t.y/Math.max(e,1e-4)*e;this.smoothedGravityX=this.smoothedGravityX*(1-i)+s*i,this.smoothedGravityY=this.smoothedGravityY*(1-i)+n*i}reset(){this.idleTimer=0,this.currentViscosity=this.config.initialViscosity,this.currentSpreadRadius=this.config.initialRadius,this.smoothedGravityX=0,this.smoothedGravityY=0;for(let t=0;t<this.config.particleCount;t++)this.velocitiesX[t]=0,this.velocitiesY[t]=0;this.initializeParticles()}fixedUpdate(t){if(t<=0)return;const i=this.config.particleCount,e=this.config;this.idleTimer+=t;const s=Math.exp(-this.idleTimer/e.viscosityDecayTime);this.currentViscosity=e.minViscosity+(e.initialViscosity-e.minViscosity)*s,this.touchActive&&(this.idleTimer=Math.max(0,this.idleTimer-t*5));const n=e.initialRadius+(e.maxSpreadRadius-e.initialRadius)*(1-this.currentViscosity/e.initialViscosity);this.currentSpreadRadius+=(n-this.currentSpreadRadius)*t*.5;const a=this.smoothedGravityX*e.gravityStrength*(1-this.currentViscosity),o=this.smoothedGravityY*e.gravityStrength*(1-this.currentViscosity),h=e.touchRadius,c=h*h,f=e.touchForce;for(let d=0;d<i;d++){const v=this.positionsX[d],y=this.positionsY[d];let p=this.velocitiesX[d],g=this.velocitiesY[d],E=a,x=o;const $=this.restPositionsX[d]-v,K=this.restPositionsY[d]-y,C=e.springStiffness*(.3+this.currentViscosity);E+=$*C,x+=K*C;const B=e.springDamping*(.5+this.currentViscosity);if(E-=p*B,x-=g*B,this.touchActive){const A=v-this.touchX,F=y-this.touchY,R=A*A+F*F;if(R<c&&R>1e-4){const L=Math.sqrt(R),k=1-R/c;E+=A/L*k*f,x+=F/L*k*f}}p+=E*t,g+=x*t;let P=v+p*t,b=y+g*t;P<0&&(P=0,p=-p*.3),P>1&&(P=1,p=-p*.3),b<0&&(b=0,g=-g*.3),b>1&&(b=1,g=-g*.3),this.positionsX[d]=P,this.positionsY[d]=b,this.velocitiesX[d]=p,this.velocitiesY[d]=g}const T=.02*t;for(let d=0;d<i;d++){const v=this.restPositionsX[d]-.5,y=this.restPositionsY[d]-.5,p=Math.sqrt(v*v+y*y);if(p>.001){const E=Math.min(p+T,this.currentSpreadRadius)/p;this.restPositionsX[d]=.5+v*E,this.restPositionsY[d]=.5+y*E}}for(let d=0;d<i;d++){const v=Math.sqrt(this.velocitiesX[d]*this.velocitiesX[d]+this.velocitiesY[d]*this.velocitiesY[d]),y=Math.min(1,v*(this.touchActive?.5:.2));this.metaballs[d].x=this.positionsX[d],this.metaballs[d].y=this.positionsY[d],this.metaballs[d].z=this.radii[d],this.metaballs[d].w=y}}get particleCount(){return this.config.particleCount}get currentViscosityValue(){return this.currentViscosity}get currentSpreadRadiusValue(){return this.currentSpreadRadius}}class lt{constructor(){this.enabled=!1,this.lastBeta=0,this.lastGamma=0,this.lastAccel={x:0,y:0,z:0},this.lowPass={x:0,y:0,z:0},this.shakeThreshold=2.5,this.sampleInterval=33,this.lastSample=0,this.onOrientation=t=>{const i=t.beta||0,e=t.gamma||0,s=Math.sin(e*Math.PI/180),n=-Math.sin(i*Math.PI/180),a=s*s+n*n;X({x:s,y:n,magnitude:a}),this.lastBeta=i,this.lastGamma=e},this.onMotion=t=>{const i=performance.now();if(i-this.lastSample<this.sampleInterval)return;this.lastSample=i;const e=t.accelerationIncludingGravity;if(!e||e.x==null||e.y==null)return;const s=e.x,n=e.y,a=e.z??0;this.lowPass.x=this.lowPass.x*.85+s*.15,this.lowPass.y=this.lowPass.y*.85+n*.15,this.lowPass.z=this.lowPass.z*.85+a*.15;const o=s-this.lowPass.x,h=n-this.lowPass.y,c=a-this.lowPass.z,f=Math.sqrt(o*o+h*h+c*c);f>this.shakeThreshold&&Z(f),this.lastAccel={x:s,y:n,z:a}}}async requestPermission(){const t=window.DeviceOrientationEvent;if(t&&typeof t.requestPermission=="function")try{return await t.requestPermission()==="granted"}catch(i){return console.warn("[GyroInput] requestPermission failed",i),!1}return!0}start(){this.enabled||(window.addEventListener("deviceorientation",this.onOrientation,!0),window.addEventListener("devicemotion",this.onMotion,!0),this.enabled=!0,console.log("[GyroInput] started"))}stop(){this.enabled&&(window.removeEventListener("deviceorientation",this.onOrientation,!0),window.removeEventListener("devicemotion",this.onMotion,!0),this.enabled=!1)}enableDesktopFallback(t){const i=setInterval(()=>{if(this.enabled)return;const e=t(),s={x:e.x,y:e.y,magnitude:e.x*e.x+e.y*e.y};X(s)},33);this._fallbackInterval=i}get isEnabled(){return this.enabled}}class dt{constructor(t){this.trackedPointerId=null,this.lastPos=null,this.lastTime=0,this.speedSampleWindow=50,this.onDown=i=>{if(i.preventDefault(),this.trackedPointerId!==null)return;this.trackedPointerId=i.pointerId,this.lastPos={x:i.clientX,y:i.clientY},this.lastTime=performance.now(),this.el.setPointerCapture(i.pointerId);const e={x:i.clientX,y:i.clientY,force:i.pressure||.5};Q(e)},this.onMove=i=>{if(this.trackedPointerId!==i.pointerId)return;i.preventDefault();const e=performance.now(),s=(e-this.lastTime)/1e3;if(s<=0)return;const n=i.clientX-this.lastPos.x,a=i.clientY-this.lastPos.y,o=Math.sqrt(n*n+a*a)/s;J({x:i.clientX,y:i.clientY,dx:n,dy:a,speed:o,force:i.pressure||.5}),this.lastPos={x:i.clientX,y:i.clientY},this.lastTime=e},this.onUp=i=>{this.trackedPointerId===i.pointerId&&(i.preventDefault(),this.trackedPointerId=null,this.lastPos=null,G({x:i.clientX,y:i.clientY,force:0}))},this.onCancel=i=>{this.trackedPointerId===i.pointerId&&(this.trackedPointerId=null,this.lastPos=null,G({x:i.clientX,y:i.clientY,force:0}))},this.el=t}start(){this.el.addEventListener("pointerdown",this.onDown),this.el.addEventListener("pointermove",this.onMove),this.el.addEventListener("pointerup",this.onUp),this.el.addEventListener("pointercancel",this.onCancel),this.el.addEventListener("pointerleave",this.onCancel)}stop(){this.el.removeEventListener("pointerdown",this.onDown),this.el.removeEventListener("pointermove",this.onMove),this.el.removeEventListener("pointerup",this.onUp),this.el.removeEventListener("pointercancel",this.onCancel),this.el.removeEventListener("pointerleave",this.onCancel)}}const ft=`#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,mt=`#version 300 es
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
}`;function V(r,t,i){const e=r.createShader(t);if(r.shaderSource(e,i),r.compileShader(e),!r.getShaderParameter(e,r.COMPILE_STATUS)){const s=r.getShaderInfoLog(e);throw r.deleteShader(e),new Error("Shader compile error: "+s+`
--- src ---
`+i)}return e}function w(r,t,i){const e=V(r,r.VERTEX_SHADER,t),s=V(r,r.FRAGMENT_SHADER,i),n=r.createProgram();if(r.attachShader(n,e),r.attachShader(n,s),r.linkProgram(n),!r.getProgramParameter(n,r.LINK_STATUS)){const a=r.getProgramInfoLog(n);throw r.deleteProgram(n),new Error("Program link error: "+a)}return r.deleteShader(e),r.deleteShader(s),n}function z(r,t,i,e=r.RGBA16F,s=r.RGBA,n=r.HALF_FLOAT){const a=r.createTexture();return r.bindTexture(r.TEXTURE_2D,a),r.texImage2D(r.TEXTURE_2D,0,e,t,i,0,s,n,null),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),a}function N(r){const t=r.createFramebuffer();return r.bindFramebuffer(r.FRAMEBUFFER,t),t}function O(r,t,i,e=r.COLOR_ATTACHMENT0){r.bindFramebuffer(r.FRAMEBUFFER,t),r.framebufferTexture2D(r.FRAMEBUFFER,e,r.TEXTURE_2D,i,0)}function W(r){const t=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),i=r.createBuffer();return r.bindBuffer(r.ARRAY_BUFFER,i),r.bufferData(r.ARRAY_BUFFER,t,r.STATIC_DRAW),i}function Y(r){const t=r.checkFramebufferStatus(r.FRAMEBUFFER);if(t!==r.FRAMEBUFFER_COMPLETE)throw new Error("Framebuffer incomplete: 0x"+t.toString(16)+(t===36061?" (UNSUPPORTED)":""))}class pt{constructor(t){this.uniforms={},this.metaballArr=new Float32Array(64*4),this.gl=t,this.program=w(t,ft,mt),this.quadBuf=W(t),this.vao=t.createVertexArray(),t.bindVertexArray(this.vao),t.bindBuffer(t.ARRAY_BUFFER,this.quadBuf);const i=t.getAttribLocation(this.program,"a_pos");t.enableVertexAttribArray(i),t.vertexAttribPointer(i,2,t.FLOAT,!1,0,0),t.bindVertexArray(null);const e=s=>t.getUniformLocation(this.program,s);this.uniforms={u_resolution:e("u_resolution"),u_time:e("u_time"),u_baseColor:e("u_baseColor"),u_refraction:e("u_refraction"),u_specPower:e("u_specPower"),u_specIntensity:e("u_specIntensity"),u_rimIntensity:e("u_rimIntensity"),u_smoothK:e("u_smoothK"),u_metaballCount:e("u_metaballCount"),u_metaballs:e("u_metaballs"),u_pigmentTex:e("u_pigmentTex"),u_backgroundTex:e("u_backgroundTex"),u_hasBackground:e("u_hasBackground")}}render(t,i,e,s,n,a){const o=this.gl;o.viewport(0,0,n,a),o.bindFramebuffer(o.FRAMEBUFFER,null),o.clearColor(0,0,0,0),o.clear(o.COLOR_BUFFER_BIT),o.enable(o.BLEND),o.blendFunc(o.SRC_ALPHA,o.ONE_MINUS_SRC_ALPHA),o.useProgram(this.program),o.bindVertexArray(this.vao);const h=this.metaballArr,c=Math.min(i,64);for(let f=0;f<c;f++){const T=t[f];h[f*4+0]=T.x,h[f*4+1]=T.y,h[f*4+2]=T.z,h[f*4+3]=T.w}o.uniform4fv(this.uniforms.u_metaballs,h),o.uniform1i(this.uniforms.u_metaballCount,c),o.uniform2f(this.uniforms.u_resolution,n,a),o.uniform1f(this.uniforms.u_time,s),o.uniform4f(this.uniforms.u_baseColor,.85,.95,1,.75),o.uniform1f(this.uniforms.u_refraction,.08),o.uniform1f(this.uniforms.u_specPower,80),o.uniform1f(this.uniforms.u_specIntensity,2.2),o.uniform1f(this.uniforms.u_rimIntensity,1.2),o.uniform1f(this.uniforms.u_smoothK,.25),e&&(o.activeTexture(o.TEXTURE0),o.bindTexture(o.TEXTURE_2D,e),o.uniform1i(this.uniforms.u_pigmentTex,0)),o.activeTexture(o.TEXTURE1),o.bindTexture(o.TEXTURE_2D,null),o.uniform1i(this.uniforms.u_backgroundTex,1),o.uniform1i(this.uniforms.u_hasBackground,0),o.drawArrays(o.TRIANGLES,0,6),o.bindVertexArray(null)}dispose(){const t=this.gl;t.deleteProgram(this.program),t.deleteBuffer(this.quadBuf),t.deleteVertexArray(this.vao)}}const I=`#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,vt=`#version 300 es
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
}`,yt=`#version 300 es
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
}`,gt=`#version 300 es
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
}`;class Tt{constructor(t,i,e){this.dropUniforms={},this.diffuseUniforms={},this.sssUniforms={},this.pendingDrops=[],this.jacobiIterations=3,this.diffuseRate=.16,this.decayRate=.02,this.enableSSS=!0,this.sdfTexture=null,this.gl=t,this.rtW=Math.max(2,i),this.rtH=Math.max(2,e),this.dropProg=w(t,I,vt),this.diffuseProg=w(t,I,yt),this.sssProg=w(t,I,gt),this.quadBuf=W(t),this.vao=t.createVertexArray(),t.bindVertexArray(this.vao),t.bindBuffer(t.ARRAY_BUFFER,this.quadBuf),[this.dropProg,this.diffuseProg,this.sssProg].forEach(o=>{t.useProgram(o);const h=t.getAttribLocation(o,"a_pos");t.enableVertexAttribArray(h),t.vertexAttribPointer(h,2,t.FLOAT,!1,0,0)}),t.bindVertexArray(null);const s=t.getExtension("EXT_color_buffer_float")?t.RGBA16F:t.RGBA8,n=s===t.RGBA16F?t.HALF_FLOAT:t.UNSIGNED_BYTE;this.rtA=z(t,this.rtW,this.rtH,s,t.RGBA,n),this.rtB=z(t,this.rtW,this.rtH,s,t.RGBA,n),this.fboA=N(t),O(t,this.fboA,this.rtA),Y(t),this.fboB=N(t),O(t,this.fboB,this.rtB),Y(t),t.bindFramebuffer(t.FRAMEBUFFER,null),this.currentReadTexture=this.rtA;const a=(o,h)=>{const c={};for(const f of h)c[f]=t.getUniformLocation(o,f);return c};this.dropUniforms=a(this.dropProg,["u_prev","u_sdf","u_dropPos","u_dropColor","u_dropRadius","u_dropStrength"]),this.diffuseUniforms=a(this.diffuseProg,["u_prev","u_texelSize","u_sdf","u_diffuseRate","u_decayRate","u_dt"]),this.sssUniforms=a(this.sssProg,["u_prev","u_texelSize","u_sdf"])}setSDFTexture(t){this.sdfTexture=t}dropPigment(t){this.pendingDrops.push(t)}resize(t,i){if(t===this.rtW&&i===this.rtH)return;const e=this.gl;this.rtW=Math.max(2,t),this.rtH=Math.max(2,i);const s=e.getExtension("EXT_color_buffer_float")?e.RGBA16F:e.RGBA8,n=s===e.RGBA16F?e.HALF_FLOAT:e.UNSIGNED_BYTE;e.bindTexture(e.TEXTURE_2D,this.rtA),e.texImage2D(e.TEXTURE_2D,0,s,this.rtW,this.rtH,0,e.RGBA,n,null),e.bindTexture(e.TEXTURE_2D,this.rtB),e.texImage2D(e.TEXTURE_2D,0,s,this.rtW,this.rtH,0,e.RGBA,n,null)}update(t){const i=this.gl;let e=this.currentReadTexture,s=this.rtB,n=this.fboA,a=this.fboB;e===this.rtA?(n=this.fboA,a=this.fboB,s=this.rtB):(n=this.fboB,a=this.fboA,s=this.rtA);for(const o of this.pendingDrops)this.runPass(this.dropProg,e,a,n,(h,c)=>{c.uniform2f(this.dropUniforms.u_dropPos,o.x,o.y),c.uniform4f(this.dropUniforms.u_dropColor,o.color[0],o.color[1],o.color[2],1),c.uniform1f(this.dropUniforms.u_dropRadius,.025),c.uniform1f(this.dropUniforms.u_dropStrength,1.5),c.activeTexture(c.TEXTURE1),c.bindTexture(c.TEXTURE_2D,this.sdfTexture),c.uniform1i(this.dropUniforms.u_sdf,1)}),[e,s]=[s,e],[n,a]=[a,n];this.pendingDrops.length=0;for(let o=0;o<this.jacobiIterations;o++)this.runPass(this.diffuseProg,e,a,n,(h,c)=>{c.uniform2f(this.diffuseUniforms.u_texelSize,1/this.rtW,1/this.rtH),c.uniform1f(this.diffuseUniforms.u_diffuseRate,this.diffuseRate),c.uniform1f(this.diffuseUniforms.u_decayRate,this.decayRate),c.uniform1f(this.diffuseUniforms.u_dt,t),c.activeTexture(c.TEXTURE1),c.bindTexture(c.TEXTURE_2D,this.sdfTexture),c.uniform1i(this.diffuseUniforms.u_sdf,1)}),[e,s]=[s,e],[n,a]=[a,n];this.enableSSS&&(this.runPass(this.sssProg,e,a,n,(o,h)=>{h.uniform2f(this.sssUniforms.u_texelSize,1/this.rtW,1/this.rtH),h.activeTexture(h.TEXTURE1),h.bindTexture(h.TEXTURE_2D,this.sdfTexture),h.uniform1i(this.sssUniforms.u_sdf,1)}),[e,s]=[s,e],[n,a]=[a,n]),this.currentReadTexture=e,i.bindFramebuffer(i.FRAMEBUFFER,null)}runPass(t,i,e,s,n){const a=this.gl;a.bindFramebuffer(a.FRAMEBUFFER,e),a.viewport(0,0,this.rtW,this.rtH),a.useProgram(t),a.bindVertexArray(this.vao),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,i),a.uniform1i(t===this.dropProg?this.dropUniforms.u_prev:t===this.diffuseProg?this.diffuseUniforms.u_prev:this.sssUniforms.u_prev,0),n(t,a),a.drawArrays(a.TRIANGLES,0,6),a.bindVertexArray(null)}dispose(){const t=this.gl;t.deleteProgram(this.dropProg),t.deleteProgram(this.diffuseProg),t.deleteProgram(this.sssProg),t.deleteBuffer(this.quadBuf),t.deleteVertexArray(this.vao),t.deleteTexture(this.rtA),t.deleteTexture(this.rtB),t.deleteFramebuffer(this.fboA),t.deleteFramebuffer(this.fboB)}}const U=8;class _t{constructor(){this.ctx=null,this.workletNode=null,this.scriptNode=null,this.useWorklet=!1,this.voices=[],this.started=!1,this.muted=!1,this.baseVolume=.3,this.speedToPitch=1.5,this.speedToVolume=.8,this.maxTouchSpeed=2e3,this.onTouchStarted=t=>{this.resume(),this.triggerGooey(0,t.force)},this.onTouchMoved=t=>{t.speed>200&&Math.random()<.3&&this.triggerGooey(t.speed,.5)}}async init(){if(!this.started)try{const t=new(window.AudioContext||window.webkitAudioContext);this.ctx=t;for(let e=0;e<U;e++)this.voices.push({active:!1,phase:0,currentFreq:220,endFreq:65,duration:.08,samplesRemaining:0,totalSamples:0,volume:.3,waveBlend:.35,filterCutoff:1200,filterState1:0,filterState2:0});let i=!1;try{await t.audioWorklet.addModule("./gooey-processor.js"),this.workletNode=new AudioWorkletNode(t,"gooey-processor",{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],parameterData:{masterVolume:this.baseVolume}}),this.workletNode.connect(t.destination),this.useWorklet=!0,i=!0,console.log("[AudioEngine] AudioWorklet started, sampleRate=",t.sampleRate)}catch(e){console.warn("[AudioEngine] AudioWorklet failed, falling back to ScriptProcessor:",e)}i||(this.scriptNode=t.createScriptProcessor(4096,0,2),this.scriptNode.onaudioprocess=s=>this.processScript(s),this.scriptNode.connect(t.destination),console.log("[AudioEngine] ScriptProcessor fallback started, sampleRate=",t.sampleRate)),u.on(l.TouchMoved,this.onTouchMoved),u.on(l.TouchStarted,this.onTouchStarted),this.started=!0}catch(t){console.error("[AudioEngine] init completely failed:",t)}}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume().catch(()=>{})}setMuted(t){if(this.muted=t,this.workletNode){const i=this.workletNode.parameters.get("masterVolume");i&&i.setValueAtTime(t?0:this.baseVolume,this.ctx.currentTime)}}isMuted(){return this.muted}triggerGooey(t=0,i=.5){if(!this.started)return;const e=Math.min(1,t/this.maxTouchSpeed),s=1+e*this.speedToPitch,n=1+e*this.speedToVolume,a=1+e*2,o={startFreq:220*s,endFreq:65*s,duration:.08,volume:this.baseVolume*n*Math.min(1,i+.3),waveBlend:.35,filterCutoff:1200*a};this.useWorklet&&this.workletNode?this.workletNode.port.postMessage({type:"trigger",...o}):this.activateVoice(o)}activateVoice(t){let i=-1;for(let s=0;s<U;s++)if(!this.voices[s].active){i=s;break}i<0&&(i=0);const e=this.voices[i];e.active=!0,e.phase=0,e.currentFreq=t.startFreq,e.endFreq=t.endFreq,e.duration=t.duration,e.totalSamples=t.duration*(this.ctx?.sampleRate??48e3),e.samplesRemaining=e.totalSamples,e.volume=t.volume,e.waveBlend=t.waveBlend,e.filterCutoff=t.filterCutoff,e.filterState1=0,e.filterState2=0}processScript(t){const i=t.outputBuffer,e=i.numberOfChannels,s=i.length,n=this.ctx?.sampleRate??48e3;for(let a=0;a<e;a++){const o=i.getChannelData(a);for(let h=0;h<s;h++)o[h]=0}if(!this.muted){for(let a=0;a<U;a++){const o=this.voices[a];if(o.active)for(let h=0;h<s&&o.active;h++){const c=1-o.samplesRemaining/o.totalSamples;o.currentFreq+=(o.endFreq-o.currentFreq)*.1,o.phase+=2*Math.PI*o.currentFreq/n;const f=Math.sin(o.phase),T=2/Math.PI*Math.asin(Math.sin(o.phase));let d=f*(1-o.waveBlend)+T*o.waveBlend,v;c<.05?v=c/.05:v=Math.exp(-(c-.05)*4),d*=v*o.volume;const y=1/n,p=1/(2*Math.PI*Math.max(50,o.filterCutoff)),g=y/(p+y);o.filterState1+=g*(d-o.filterState1),o.filterState2+=g*(o.filterState1-o.filterState2);const E=o.filterState2;for(let x=0;x<e;x++)i.getChannelData(x)[h]+=E;o.samplesRemaining--,o.samplesRemaining<=0&&(o.active=!1)}}for(let a=0;a<e;a++){const o=i.getChannelData(a);for(let h=0;h<o.length;h++)o[h]>1?o[h]=1:o[h]<-1&&(o[h]=-1)}}}dispose(){this.started&&(u.off(l.TouchMoved,this.onTouchMoved),u.off(l.TouchStarted,this.onTouchStarted),this.workletNode?.disconnect(),this.scriptNode?.disconnect(),this.ctx?.close(),this.workletNode=null,this.scriptNode=null,this.ctx=null,this.started=!1)}}const q=[{name:"紅",color:[1,.2,.2],hex:"#ff3333"},{name:"藍",color:[.2,.4,1],hex:"#3366ff"},{name:"黃",color:[1,.85,.1],hex:"#ffd919"},{name:"螢光粉",color:[1,.2,.8],hex:"#ff33cc"},{name:"螢光綠",color:[.3,1,.4],hex:"#4dff66"},{name:"紫",color:[.8,.3,1],hex:"#cc4dff"},{name:"橙",color:[1,.55,0],hex:"#ff8c00"},{name:"白",color:[1,1,1],hex:"#ffffff"}];class Et{constructor(t,i=q){this.buttons=[],this.selectedIndex=0,this.el=t,this.build(i)}build(t){this.el.innerHTML="",this.buttons=[],t.forEach((i,e)=>{const s=document.createElement("button");s.className="palette-btn",s.style.background=i.hex,s.title=i.name,s.setAttribute("aria-label",`色粉：${i.name}`),s.addEventListener("click",n=>{n.stopPropagation(),this.select(e)}),this.el.appendChild(s),this.buttons.push(s)}),this.select(0)}select(t){t<0||t>=this.buttons.length||(this.selectedIndex=t,this.buttons.forEach((i,e)=>i.classList.toggle("selected",e===t)),et(t))}get currentColor(){return q[this.selectedIndex].color}dropAt(t,i){const e=this.currentColor;tt(e,t,i)}}class xt{constructor(t,i){this.slimeRenderer=null,this.pigmentSystem=null,this.gl=null,this.dpr=1,this.lastTime=0,this.fixedAccumulator=0,this.fixedDt=1/60,this.pigRTWidth=0,this.pigRTHeight=0,this.mouseCenter=null,this.loop=a=>{if(requestAnimationFrame(this.loop),!this.fpsController.shouldRenderNow(a))return;const o=(a-this.lastTime)/1e3;for(this.lastTime=a,this.activity.tick(o),this.fpsController.tick(o),this.fixedAccumulator+=o;this.fixedAccumulator>=this.fixedDt;)this.slimePhysics.fixedUpdate(this.fixedDt),this.fsm.fixedTick(this.fixedDt),this.fixedAccumulator-=this.fixedDt;if(this.fsm.tick(o),this.pigmentSystem&&this.pigmentSystem.update(o),this.slimeRenderer&&this.gl){const h=this.canvas.width,c=this.canvas.height;this.slimeRenderer.render(this.slimePhysics.metaballs,this.slimePhysics.particleCount,this.pigmentSystem?.currentReadTexture??null,a/1e3,h,c)}this.updateStatus()},this.statusUpdateTimer=0,this.lastStatusStr="",this.onResize=()=>{this.resizeCanvas()},this.canvas=t,this.pool=new ht(4096,32),this.activity=new at,this.fpsController=new D(this.activity),this.slimePhysics=new ut({}),this.gyroInput=new lt,this.audioEngine=new _t,this.palette=new Et(i),this.fsm=new rt;const e=new ot(this.fsm,null,null),s=new nt(this.fsm,e),n=new M(this.fsm,e,s);e.touchState=s,e.gyroState=n,this.fsm.initialize(e),this.touchInput=new dt(t)}async start(){if(this.dpr=Math.min(window.devicePixelRatio||1,2),this.gl=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"low-power"}),!this.gl){this.showError("您的瀏覽器不支援 WebGL2，無法執行此遊戲。");return}this.gl.getExtension("EXT_color_buffer_float"),this.gl.getExtension("EXT_float_blend"),this.resizeCanvas(),window.addEventListener("resize",this.onResize),this.slimeRenderer=new pt(this.gl),this.pigmentSystem=new Tt(this.gl,Math.floor(this.canvas.width/2),Math.floor(this.canvas.height/2)),this.activity.start(),this.fpsController.start(),this.touchInput.start(),u.on(l.TouchStarted,s=>{const n=this.screenToUV(s.x,s.y);this.slimePhysics.setTouch(!0,n.x,n.y)}),u.on(l.TouchMoved,s=>{const n=this.screenToUV(s.x,s.y);this.slimePhysics.setTouch(!0,n.x,n.y)}),u.on(l.TouchEnded,()=>{this.slimePhysics.setTouch(!1,0,0)}),u.on(l.PigmentDrop,s=>{if(!this.pigmentSystem)return;const n=this.screenToUV(s.x,s.y);this.pigmentSystem.dropPigment({color:s.color,x:n.x,y:n.y})}),u.on(l.TouchStarted,s=>{this.palette.dropAt(s.x,s.y)}),u.on(l.Gravity,s=>{this.slimePhysics.setGravity(s)}),document.getElementById("btn-reset")?.addEventListener("click",()=>{if(this.slimePhysics.reset(),this.pigmentSystem){const s=this.gl;s.bindTexture(s.TEXTURE_2D,this.pigmentSystem.rtA),s.texImage2D(s.TEXTURE_2D,0,s.RGBA8,this.pigRTWidth,this.pigRTHeight,0,s.RGBA,s.UNSIGNED_BYTE,null),s.bindTexture(s.TEXTURE_2D,this.pigmentSystem.rtB),s.texImage2D(s.TEXTURE_2D,0,s.RGBA8,this.pigRTWidth,this.pigRTHeight,0,s.RGBA,s.UNSIGNED_BYTE,null)}});const t=document.getElementById("btn-mute");t?.addEventListener("click",()=>{this.audioEngine.setMuted(!this.audioEngine.isMuted()),t.textContent=this.audioEngine.isMuted()?"🔇":"🔊"});const i=async()=>{await this.gyroInput.requestPermission()&&(this.gyroInput.start(),document.removeEventListener("click",i),document.removeEventListener("touchend",i))};document.addEventListener("click",i,{once:!1}),document.addEventListener("touchend",i,{once:!1});const e=async()=>{await this.audioEngine.init(),this.audioEngine.resume(),document.removeEventListener("click",e),document.removeEventListener("touchend",e)};document.addEventListener("click",e,{once:!1}),document.addEventListener("touchend",e,{once:!1}),this.lastTime=performance.now(),this.loop(this.lastTime),setTimeout(()=>{const s=document.getElementById("loader");s&&(s.classList.add("hidden"),setTimeout(()=>s.style.display="none",600))},300)}updateStatus(){if(this.statusUpdateTimer+=1,this.statusUpdateTimer<30)return;this.statusUpdateTimer=0;const t=this.fsm.currentStateType,i=t===_.Idle?"Idle":t===_.Touch?"Touch":t===_.Gyro?"Gyro":"Paused",e=this.fpsController.current,s=(this.slimePhysics.currentViscosityValue*100).toFixed(0),n=(this.slimePhysics.currentSpreadRadiusValue*100).toFixed(0),a=`${i} · ${e} FPS · η=${s}% · r=${n}%`;if(a!==this.lastStatusStr){const o=document.getElementById("status");o&&(o.textContent=a),this.lastStatusStr=a}}resizeCanvas(){if(!this.canvas)return;const t=window.innerWidth,i=window.innerHeight;this.dpr=Math.min(window.devicePixelRatio||1,2),this.canvas.width=Math.floor(t*this.dpr),this.canvas.height=Math.floor(i*this.dpr),this.canvas.style.width=t+"px",this.canvas.style.height=i+"px",this.pigRTWidth=Math.max(2,Math.floor(this.canvas.width/2)),this.pigRTHeight=Math.max(2,Math.floor(this.canvas.height/2)),this.pigmentSystem&&this.pigmentSystem.resize(this.pigRTWidth,this.pigRTHeight)}screenToUV(t,i){return{x:t/window.innerWidth,y:1-i/window.innerHeight}}showError(t){const i=document.getElementById("loader");i&&(i.innerHTML=`<div style="color: #ff6666; padding: 2rem; text-align: center;">⚠️<br/>${t}</div>`),console.error(t)}dispose(){this.touchInput.stop(),this.gyroInput.stop(),this.activity.stop(),this.fpsController.stop(),this.audioEngine.dispose(),this.slimeRenderer?.dispose(),this.pigmentSystem?.dispose(),u.clear(),window.removeEventListener("resize",this.onResize)}}window.addEventListener("error",r=>{console.error("[Global Error]",r.message,r.filename,r.lineno,r.error?.stack);const t=document.getElementById("loader");t&&(t.innerHTML=`<div style="color: #ff6666; padding: 2rem; text-align: center; font-family: monospace; font-size: 12px;">
      <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
      <div>啟動錯誤：${r.message}</div>
      <div style="margin-top: 0.5rem; color: #888; font-size: 10px;">${r.filename}:${r.lineno}</div>
      <pre style="margin-top: 1rem; color: #aaa; font-size: 10px; text-align: left; max-height: 200px; overflow: auto;">${r.error?.stack||""}</pre>
    </div>`)});window.addEventListener("unhandledrejection",r=>{console.error("[Unhandled Rejection]",r.reason);const t=document.getElementById("loader");if(t){const i=r.reason?.message||String(r.reason);t.innerHTML=`<div style="color: #ff6666; padding: 2rem; text-align: center; font-family: monospace;">
      <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
      <div>Promise 拒絕：${i}</div>
      <pre style="margin-top: 1rem; color: #aaa; font-size: 10px; text-align: left;">${r.reason?.stack||""}</pre>
    </div>`}});const H=()=>{const r=document.getElementById("glcanvas"),t=document.getElementById("palette");if(!r||!t){console.error("[main] Required DOM elements not found");const e=document.getElementById("loader");e&&(e.innerHTML=`<div style="color: #ff6666; padding: 2rem; text-align: center;">⚠️<br/>DOM 元素找不到<br/>canvas: ${!!r}, palette: ${!!t}</div>`);return}new xt(r,t).start().catch(e=>{console.error("[main] start failed:",e);const s=document.getElementById("loader");s&&(s.innerHTML=`<div style="color: #ff6666; padding: 2rem; text-align: center; font-family: monospace;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
        <div>啟動失敗：${e.message}</div>
        <pre style="margin-top: 1rem; color: #aaa; font-size: 10px; text-align: left;">${e.stack||""}</pre>
      </div>`)})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",H):H();document.addEventListener("touchmove",r=>{r.touches.length>1&&r.preventDefault()},{passive:!1});document.addEventListener("gesturestart",r=>r.preventDefault());document.addEventListener("contextmenu",r=>r.preventDefault());
