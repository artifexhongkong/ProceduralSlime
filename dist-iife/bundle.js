"use strict";(()=>{var Y=class{constructor(){this.map=new Map}on(t,i){let e=this.map.get(t);return e||(e=new Set,this.map.set(t,e)),e.add(i),()=>e.delete(i)}emit(t,i){let e=this.map.get(t);if(e)for(let r of e)try{r(i)}catch(n){console.error("[GameEvents]",t,n)}}off(t,i){let e=this.map.get(t);e&&e.delete(i)}clear(){this.map.clear()}},u=new Y,l={TouchStarted:"touch:started",TouchMoved:"touch:moved",TouchEnded:"touch:ended",Gravity:"gravity:changed",Shake:"gyro:shake",PigmentDrop:"pigment:dropped",PigmentSelect:"pigment:selected",UserActivity:"user:activity",StateChanged:"state:changed",FPSChanged:"fps:changed"},ot=o=>{u.emit(l.TouchStarted,o),u.emit(l.UserActivity,null)},st=o=>{u.emit(l.TouchMoved,o),u.emit(l.UserActivity,null)},H=o=>{u.emit(l.TouchEnded,o),u.emit(l.UserActivity,null)},$=o=>{u.emit(l.Gravity,o),o.magnitude>.4&&u.emit(l.UserActivity,null)},nt=o=>{u.emit(l.Shake,o),u.emit(l.UserActivity,null)},at=(o,t,i)=>{u.emit(l.PigmentDrop,{color:o,x:t,y:i}),u.emit(l.UserActivity,null)},ut=o=>{u.emit(l.PigmentSelect,o),u.emit(l.UserActivity,null)},ct=(o,t)=>u.emit(l.StateChanged,{from:o,to:t}),lt=o=>u.emit(l.FPSChanged,o);var A=class{constructor(){this.current=null;this.pending=null;this.hasPending=!1;this.initialized=!1}get currentStateType(){return this.current?.type??0}initialize(t){this.initialized||(this.current=t,this.current.onEnter(0),this.initialized=!0)}changeState(t){t&&(this.current&&t.type===this.current.type||(this.pending=t,this.hasPending=!0))}tick(t){if(this.hasPending){let i=this.current,e=i?.type??0;i?.onExit(this.pending.type),this.current=this.pending,this.current.onEnter(e),this.pending=null,this.hasPending=!1,ct(e,this.current.type)}this.current?.onUpdate(t)}fixedTick(t){this.current?.onFixedUpdate(t)}};var F=class{constructor(t,i,e){this.fsm=t;this.touchState=i;this.gyroState=e;this.type=0;this.idleDuration=0;this.lowPower=!1;this.onTouchStarted=()=>this.fsm.changeState(this.touchState);this.onGravity=t=>{t.magnitude>.16&&this.fsm.changeState(this.gyroState)};this.onShake=t=>{t>.5&&this.fsm.changeState(this.gyroState)}}onEnter(t){this.idleDuration=0,this.lowPower=!1,u.on(l.TouchStarted,this.onTouchStarted),u.on(l.Gravity,this.onGravity),u.on(l.Shake,this.onShake)}onUpdate(t){this.idleDuration+=t,!this.lowPower&&this.idleDuration>10&&(this.lowPower=!0)}onFixedUpdate(t){}onExit(t){u.off(l.TouchStarted,this.onTouchStarted),u.off(l.Gravity,this.onGravity),u.off(l.Shake,this.onShake)}},w=class{constructor(t,i){this.fsm=t;this.idleState=i;this.type=1;this.onTouchEnded=()=>this.fsm.changeState(this.idleState)}onEnter(t){u.on(l.TouchEnded,this.onTouchEnded)}onUpdate(t){}onFixedUpdate(t){}onExit(t){u.off(l.TouchEnded,this.onTouchEnded)}},E=class E{constructor(t,i,e){this.fsm=t;this.idleState=i;this.touchState=e;this.type=2;this.gravityMag=0;this.quietDuration=0;this.onTouchStarted=()=>this.fsm.changeState(this.touchState);this.onGravity=t=>{this.gravityMag=t.magnitude}}onEnter(t){this.quietDuration=0,u.on(l.TouchStarted,this.onTouchStarted),u.on(l.Gravity,this.onGravity)}onUpdate(t){this.gravityMag<E.QuietThreshold?(this.quietDuration+=t,this.quietDuration>E.QuietExitTime&&this.fsm.changeState(this.idleState)):this.quietDuration=0}onFixedUpdate(t){}onExit(t){u.off(l.TouchStarted,this.onTouchStarted),u.off(l.Gravity,this.onGravity)}};E.QuietThreshold=.05,E.QuietExitTime=.8;var G=E;var L=class{constructor(){this.idle=0;this.activityUnsub=null}start(){this.activityUnsub||(this.activityUnsub=u.on(l.UserActivity,()=>{this.idle=0}))}stop(){this.activityUnsub&&(this.activityUnsub(),this.activityUnsub=null)}tick(t){this.idle+=t}notifyActivity(){this.idle=0}get idleDuration(){return this.idle}isIdleFor(t){return this.idle>=t}};var f=class f{constructor(t){this.currentFPS=f.FPS_INTERACTIVE;this.isBackground=!1;this.lastFrameTime=0;this.targetInterval=1e3/60;this.onVisibilityChange=()=>{document.hidden?(this.isBackground=!0,this.setFPS(f.FPS_IDLE_LONG)):(this.isBackground=!1,this.activity.notifyActivity(),this.setFPS(f.FPS_INTERACTIVE))};this.onBlur=()=>{this.isBackground=!0,this.setFPS(f.FPS_IDLE_LONG)};this.onFocus=()=>{this.isBackground=!1,this.activity.notifyActivity(),this.setFPS(f.FPS_INTERACTIVE)};this.activity=t}start(){document.addEventListener("visibilitychange",this.onVisibilityChange),window.addEventListener("blur",this.onBlur),window.addEventListener("focus",this.onFocus)}stop(){document.removeEventListener("visibilitychange",this.onVisibilityChange),window.removeEventListener("blur",this.onBlur),window.removeEventListener("focus",this.onFocus)}shouldRenderNow(t){if(this.isBackground)return!1;let i=t-this.lastFrameTime;return i<this.targetInterval?!1:(this.lastFrameTime=t-i%this.targetInterval,!0)}tick(t){if(this.isBackground)return;let i=f.FPS_INTERACTIVE;this.activity.idleDuration>=f.T_15?i=f.FPS_IDLE_LONG:this.activity.idleDuration>=f.T_30&&(i=f.FPS_IDLE_SHORT),i!==this.currentFPS&&this.setFPS(i)}setFPS(t){this.currentFPS!==t&&(this.currentFPS=t,this.targetInterval=1e3/t,lt(t),console.log(`[AdaptiveFPS] \u2192 ${t} FPS`))}get current(){return this.currentFPS}get background(){return this.isBackground}};f.FPS_INTERACTIVE=60,f.FPS_IDLE_SHORT=30,f.FPS_IDLE_LONG=15,f.T_30=10,f.T_15=30;var M=f;var C=class{constructor(t=4096,i=32){this.vec3Pool=[];this.colorPool=[];this.arraySize=t,this.maxPoolSize=i;for(let e=0;e<4;e++)this.vec3Pool.push(new Float32Array(this.arraySize)),this.colorPool.push(new Float32Array(this.arraySize))}rentVec3(){return this.vec3Pool.pop()??new Float32Array(this.arraySize)}rentColor(){return this.colorPool.pop()??new Float32Array(this.arraySize)}returnVec3(t){t.length===this.arraySize&&(this.vec3Pool.length>=this.maxPoolSize||this.vec3Pool.push(t))}returnColor(t){t.length===this.arraySize&&(this.colorPool.length>=this.maxPoolSize||this.colorPool.push(t))}get size(){return this.arraySize}};var St={particleCount:28,initialRadius:.25,maxSpreadRadius:.85,initialViscosity:.92,viscosityDecayTime:180,minViscosity:.15,springStiffness:12,springDamping:3.5,gravityStrength:2,gravitySmooth:.5,touchRadius:.12,touchForce:25},I=class{constructor(t={}){this.idleTimer=0;this.smoothedGravityX=0;this.smoothedGravityY=0;this.touchActive=!1;this.touchX=0;this.touchY=0;this.config={...St,...t};let i=this.config.particleCount;this.positionsX=new Float32Array(i),this.positionsY=new Float32Array(i),this.velocitiesX=new Float32Array(i),this.velocitiesY=new Float32Array(i),this.restPositionsX=new Float32Array(i),this.restPositionsY=new Float32Array(i),this.radii=new Float32Array(i),this.metaballs=new Array(i);for(let e=0;e<i;e++)this.metaballs[e]={x:.5,y:.5,z:.05,w:0};this.currentViscosity=this.config.initialViscosity,this.currentSpreadRadius=this.config.initialRadius,this.initializeParticles()}initializeParticles(){let t=this.config.particleCount,i=Math.ceil(Math.sqrt(t)),e=this.config.initialRadius/Math.max(i,1)*1.5,r=0;for(let n=0;n<i*2&&r<t;n++){let a=n===0?1:n*6;for(let s=0;s<a&&r<t;s++){let c=s/a*Math.PI*2,h=n*e*.6,m=.5+Math.cos(c)*h,g=.5+Math.sin(c)*h;this.positionsX[r]=m,this.positionsY[r]=g,this.restPositionsX[r]=m,this.restPositionsY[r]=g,this.velocitiesX[r]=0,this.velocitiesY[r]=0,this.radii[r]=e*1.2,r++}}for(;r<t;)this.positionsX[r]=.5,this.positionsY[r]=.5,this.restPositionsX[r]=.5,this.restPositionsY[r]=.5,this.radii[r]=e*1.2,r++}setTouch(t,i,e){this.touchActive=t,this.touchX=i,this.touchY=e}setGravity(t){let i=1-this.config.gravitySmooth,e=Math.sqrt(t.magnitude),r=t.x/Math.max(e,1e-4)*e,n=t.y/Math.max(e,1e-4)*e;this.smoothedGravityX=this.smoothedGravityX*(1-i)+r*i,this.smoothedGravityY=this.smoothedGravityY*(1-i)+n*i}reset(){this.idleTimer=0,this.currentViscosity=this.config.initialViscosity,this.currentSpreadRadius=this.config.initialRadius,this.smoothedGravityX=0,this.smoothedGravityY=0;for(let t=0;t<this.config.particleCount;t++)this.velocitiesX[t]=0,this.velocitiesY[t]=0;this.initializeParticles()}fixedUpdate(t){if(t<=0)return;let i=this.config.particleCount,e=this.config;this.idleTimer+=t;let r=Math.exp(-this.idleTimer/e.viscosityDecayTime);this.currentViscosity=e.minViscosity+(e.initialViscosity-e.minViscosity)*r,this.touchActive&&(this.idleTimer=Math.max(0,this.idleTimer-t*5));let n=e.initialRadius+(e.maxSpreadRadius-e.initialRadius)*(1-this.currentViscosity/e.initialViscosity);this.currentSpreadRadius+=(n-this.currentSpreadRadius)*t*.5;let a=this.smoothedGravityX*e.gravityStrength*(1-this.currentViscosity),s=this.smoothedGravityY*e.gravityStrength*(1-this.currentViscosity),c=e.touchRadius,h=c*c,m=e.touchForce;for(let d=0;d<i;d++){let v=this.positionsX[d],y=this.positionsY[d],p=this.velocitiesX[d],b=this.velocitiesY[d],T=a,x=s,xt=this.restPositionsX[d]-v,Et=this.restPositionsY[d]-y,tt=e.springStiffness*(.3+this.currentViscosity);T+=xt*tt,x+=Et*tt;let et=e.springDamping*(.5+this.currentViscosity);if(T-=p*et,x-=b*et,this.touchActive){let O=v-this.touchX,q=y-this.touchY,R=O*O+q*q;if(R<h&&R>1e-4){let it=Math.sqrt(R),rt=1-R/h;T+=O/it*rt*m,x+=q/it*rt*m}}p+=T*t,b+=x*t;let _=v+p*t,P=y+b*t;_<0&&(_=0,p=-p*.3),_>1&&(_=1,p=-p*.3),P<0&&(P=0,b=-b*.3),P>1&&(P=1,b=-b*.3),this.positionsX[d]=_,this.positionsY[d]=P,this.velocitiesX[d]=p,this.velocitiesY[d]=b}let g=.02*t;for(let d=0;d<i;d++){let v=this.restPositionsX[d]-.5,y=this.restPositionsY[d]-.5,p=Math.sqrt(v*v+y*y);if(p>.001){let T=Math.min(p+g,this.currentSpreadRadius)/p;this.restPositionsX[d]=.5+v*T,this.restPositionsY[d]=.5+y*T}}for(let d=0;d<i;d++){let v=Math.sqrt(this.velocitiesX[d]*this.velocitiesX[d]+this.velocitiesY[d]*this.velocitiesY[d]),y=Math.min(1,v*(this.touchActive?.5:.2));this.metaballs[d].x=this.positionsX[d],this.metaballs[d].y=this.positionsY[d],this.metaballs[d].z=this.radii[d],this.metaballs[d].w=y}}get particleCount(){return this.config.particleCount}get currentViscosityValue(){return this.currentViscosity}get currentSpreadRadiusValue(){return this.currentSpreadRadius}};var D=class{constructor(){this.enabled=!1;this.lastBeta=0;this.lastGamma=0;this.lastAccel={x:0,y:0,z:0};this.lowPass={x:0,y:0,z:0};this.shakeThreshold=2.5;this.sampleInterval=33;this.lastSample=0;this.onOrientation=t=>{let i=t.beta||0,e=t.gamma||0,r=Math.sin(e*Math.PI/180),n=-Math.sin(i*Math.PI/180),a=r*r+n*n;$({x:r,y:n,magnitude:a}),this.lastBeta=i,this.lastGamma=e};this.onMotion=t=>{let i=performance.now();if(i-this.lastSample<this.sampleInterval)return;this.lastSample=i;let e=t.accelerationIncludingGravity;if(!e||e.x==null||e.y==null)return;let r=e.x,n=e.y,a=e.z??0;this.lowPass.x=this.lowPass.x*.85+r*.15,this.lowPass.y=this.lowPass.y*.85+n*.15,this.lowPass.z=this.lowPass.z*.85+a*.15;let s=r-this.lowPass.x,c=n-this.lowPass.y,h=a-this.lowPass.z,m=Math.sqrt(s*s+c*c+h*h);m>this.shakeThreshold&&nt(m),this.lastAccel={x:r,y:n,z:a}}}async requestPermission(){let t=window.DeviceOrientationEvent;if(t&&typeof t.requestPermission=="function")try{return await t.requestPermission()==="granted"}catch(i){return console.warn("[GyroInput] requestPermission failed",i),!1}return!0}start(){this.enabled||(window.addEventListener("deviceorientation",this.onOrientation,!0),window.addEventListener("devicemotion",this.onMotion,!0),this.enabled=!0,console.log("[GyroInput] started"))}stop(){this.enabled&&(window.removeEventListener("deviceorientation",this.onOrientation,!0),window.removeEventListener("devicemotion",this.onMotion,!0),this.enabled=!1)}enableDesktopFallback(t){let i=setInterval(()=>{if(this.enabled)return;let e=t(),r={x:e.x,y:e.y,magnitude:e.x*e.x+e.y*e.y};$(r)},33);this._fallbackInterval=i}get isEnabled(){return this.enabled}};var U=class{constructor(t){this.trackedPointerId=null;this.lastPos=null;this.lastTime=0;this.speedSampleWindow=50;this.onDown=t=>{if(t.preventDefault(),this.trackedPointerId!==null)return;this.trackedPointerId=t.pointerId,this.lastPos={x:t.clientX,y:t.clientY},this.lastTime=performance.now(),this.el.setPointerCapture(t.pointerId);let i={x:t.clientX,y:t.clientY,force:t.pressure||.5};ot(i)};this.onMove=t=>{if(this.trackedPointerId!==t.pointerId)return;t.preventDefault();let i=performance.now(),e=(i-this.lastTime)/1e3;if(e<=0)return;let r=t.clientX-this.lastPos.x,n=t.clientY-this.lastPos.y,a=Math.sqrt(r*r+n*n)/e;st({x:t.clientX,y:t.clientY,dx:r,dy:n,speed:a,force:t.pressure||.5}),this.lastPos={x:t.clientX,y:t.clientY},this.lastTime=i};this.onUp=t=>{this.trackedPointerId===t.pointerId&&(t.preventDefault(),this.trackedPointerId=null,this.lastPos=null,H({x:t.clientX,y:t.clientY,force:0}))};this.onCancel=t=>{this.trackedPointerId===t.pointerId&&(this.trackedPointerId=null,this.lastPos=null,H({x:t.clientX,y:t.clientY,force:0}))};this.el=t}start(){this.el.addEventListener("pointerdown",this.onDown),this.el.addEventListener("pointermove",this.onMove),this.el.addEventListener("pointerup",this.onUp),this.el.addEventListener("pointercancel",this.onCancel),this.el.addEventListener("pointerleave",this.onCancel)}stop(){this.el.removeEventListener("pointerdown",this.onDown),this.el.removeEventListener("pointermove",this.onMove),this.el.removeEventListener("pointerup",this.onUp),this.el.removeEventListener("pointercancel",this.onCancel),this.el.removeEventListener("pointerleave",this.onCancel)}};var dt=`#version 300 es
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

// Metaball buffer (uniform array \u2014\u2014 \u6BD4 SSBO \u517C\u5BB9\u6027\u66F4\u597D)
uniform int       u_metaballCount;
uniform vec4      u_metaballs[METABALL_MAX_COUNT];   // xy=pos, z=radius, w=pressure

// Textures
uniform sampler2D u_pigmentTex;
uniform sampler2D u_backgroundTex;
uniform int       u_hasBackground;

// \u7C21\u55AE hash noise\uFF08\u80CC\u666F\u7528\uFF09
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

// \u8A08\u7B97\u6240\u6709 metaball \u7684\u806F\u5408 SDF
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

// \u5F9E SDF \u53D6\u5F97\u68AF\u5EA6\uFF08\u7528\u65BC\u6CD5\u7DDA\uFF09
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

  // 2. \u6CD5\u7DDA + \u6298\u5C04
  vec2 grad = sdfGradient(uv);
  vec3 n = normalize(vec3(-grad, 1.0));
  vec2 refractOffset = n.xy * u_refraction * interior;

  // \u80CC\u666F\u63A1\u6A23\uFF08\u6298\u5C04\u5F8C\u4F4D\u7F6E\uFF09\u2014\u2014 \u6C92\u6709\u80CC\u666F\u7D0B\u7406\u6642\u7528\u6F38\u5C64 noise
  vec3 bgColor;
  if (u_hasBackground == 1) {
    bgColor = texture(u_backgroundTex, uv + refractOffset).rgb;
  } else {
    // \u7A0B\u5E8F\u5316\u6F38\u5C64\u80CC\u666F
    float t = uv.y;
    vec3 top = vec3(0.06, 0.07, 0.15);
    vec3 bot = vec3(0.02, 0.03, 0.08);
    bgColor = mix(bot, top, t);
    // \u52A0\u4E00\u9EDE noise
    float n = hash21(uv * 200.0 + u_time * 0.05);
    bgColor += (n - 0.5) * 0.015;
  }

  // 3. \u9AD8\u5149
  vec3 lightDir = normalize(vec3(0.3, 0.5, 0.8));
  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(n, halfDir), 0.0), u_specPower) * u_specIntensity;

  // 4. Fresnel rim
  float rim = pow(1.0 - max(n.z, 0.0), 3.0) * u_rimIntensity;

  // 5. \u8272\u7C89\u6DF7\u5408
  vec4 pigment = texture(u_pigmentTex, uv);

  // 6. \u5408\u6210
  vec3 finalColor = bgColor * (1.0 - u_baseColor.a * interior)
                  + u_baseColor.rgb * u_baseColor.a * interior
                  + pigment.rgb * pigment.a * interior;
  finalColor += spec * mask;
  finalColor += rim * mask;

  float alpha = max(interior, mask * 0.6) * u_baseColor.a;
  alpha = clamp(alpha + pigment.a * 0.4, 0.0, 1.0);

  fragColor = vec4(finalColor, alpha);
}`;function ft(o,t,i){let e=o.createShader(t);if(o.shaderSource(e,i),o.compileShader(e),!o.getShaderParameter(e,o.COMPILE_STATUS)){let r=o.getShaderInfoLog(e);throw o.deleteShader(e),new Error("Shader compile error: "+r+`
--- src ---
`+i)}return e}function S(o,t,i){let e=ft(o,o.VERTEX_SHADER,t),r=ft(o,o.FRAGMENT_SHADER,i),n=o.createProgram();if(o.attachShader(n,e),o.attachShader(n,r),o.linkProgram(n),!o.getProgramParameter(n,o.LINK_STATUS)){let a=o.getProgramInfoLog(n);throw o.deleteProgram(n),new Error("Program link error: "+a)}return o.deleteShader(e),o.deleteShader(r),n}function j(o,t,i,e=o.RGBA16F,r=o.RGBA,n=o.HALF_FLOAT){let a=o.createTexture();return o.bindTexture(o.TEXTURE_2D,a),o.texImage2D(o.TEXTURE_2D,0,e,t,i,0,r,n,null),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MIN_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_MAG_FILTER,o.LINEAR),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_S,o.CLAMP_TO_EDGE),o.texParameteri(o.TEXTURE_2D,o.TEXTURE_WRAP_T,o.CLAMP_TO_EDGE),a}function K(o){let t=o.createFramebuffer();return o.bindFramebuffer(o.FRAMEBUFFER,t),t}function Q(o,t,i,e=o.COLOR_ATTACHMENT0){o.bindFramebuffer(o.FRAMEBUFFER,t),o.framebufferTexture2D(o.FRAMEBUFFER,e,o.TEXTURE_2D,i,0)}function B(o){let t=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),i=o.createBuffer();return o.bindBuffer(o.ARRAY_BUFFER,i),o.bufferData(o.ARRAY_BUFFER,t,o.STATIC_DRAW),i}function J(o){let t=o.checkFramebufferStatus(o.FRAMEBUFFER);if(t!==o.FRAMEBUFFER_COMPLETE)throw new Error("Framebuffer incomplete: 0x"+t.toString(16)+(t===36061?" (UNSUPPORTED)":""))}var k=class{constructor(t){this.uniforms={};this.metaballArr=new Float32Array(64*4);this.gl=t,this.program=S(t,dt,mt),this.quadBuf=B(t),this.vao=t.createVertexArray(),t.bindVertexArray(this.vao),t.bindBuffer(t.ARRAY_BUFFER,this.quadBuf);let i=t.getAttribLocation(this.program,"a_pos");t.enableVertexAttribArray(i),t.vertexAttribPointer(i,2,t.FLOAT,!1,0,0),t.bindVertexArray(null);let e=r=>t.getUniformLocation(this.program,r);this.uniforms={u_resolution:e("u_resolution"),u_time:e("u_time"),u_baseColor:e("u_baseColor"),u_refraction:e("u_refraction"),u_specPower:e("u_specPower"),u_specIntensity:e("u_specIntensity"),u_rimIntensity:e("u_rimIntensity"),u_smoothK:e("u_smoothK"),u_metaballCount:e("u_metaballCount"),u_metaballs:e("u_metaballs"),u_pigmentTex:e("u_pigmentTex"),u_backgroundTex:e("u_backgroundTex"),u_hasBackground:e("u_hasBackground")}}render(t,i,e,r,n,a){let s=this.gl;s.viewport(0,0,n,a),s.bindFramebuffer(s.FRAMEBUFFER,null),s.clearColor(0,0,0,0),s.clear(s.COLOR_BUFFER_BIT),s.enable(s.BLEND),s.blendFunc(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA),s.useProgram(this.program),s.bindVertexArray(this.vao);let c=this.metaballArr,h=Math.min(i,64);for(let m=0;m<h;m++){let g=t[m];c[m*4+0]=g.x,c[m*4+1]=g.y,c[m*4+2]=g.z,c[m*4+3]=g.w}s.uniform4fv(this.uniforms.u_metaballs,c),s.uniform1i(this.uniforms.u_metaballCount,h),s.uniform2f(this.uniforms.u_resolution,n,a),s.uniform1f(this.uniforms.u_time,r),s.uniform4f(this.uniforms.u_baseColor,.85,.95,1,.75),s.uniform1f(this.uniforms.u_refraction,.08),s.uniform1f(this.uniforms.u_specPower,80),s.uniform1f(this.uniforms.u_specIntensity,2.2),s.uniform1f(this.uniforms.u_rimIntensity,1.2),s.uniform1f(this.uniforms.u_smoothK,.25),e&&(s.activeTexture(s.TEXTURE0),s.bindTexture(s.TEXTURE_2D,e),s.uniform1i(this.uniforms.u_pigmentTex,0)),s.activeTexture(s.TEXTURE1),s.bindTexture(s.TEXTURE_2D,null),s.uniform1i(this.uniforms.u_backgroundTex,1),s.uniform1i(this.uniforms.u_hasBackground,0),s.drawArrays(s.TRIANGLES,0,6),s.bindVertexArray(null)}dispose(){let t=this.gl;t.deleteProgram(this.program),t.deleteBuffer(this.quadBuf),t.deleteVertexArray(this.vao)}};var V=`#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,pt=`#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;

uniform sampler2D u_prev;     // \u4E0A\u4E00\u5E40 pigment
uniform sampler2D u_sdf;      // slime SDF\uFF08mask \u7528\uFF09
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
}`,vt=`#version 300 es
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
}`,yt=`#version 300 es
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
}`;var W=class{constructor(t,i,e){this.dropUniforms={};this.diffuseUniforms={};this.sssUniforms={};this.pendingDrops=[];this.jacobiIterations=3;this.diffuseRate=.16;this.decayRate=.02;this.enableSSS=!0;this.sdfTexture=null;this.gl=t,this.rtW=Math.max(2,i),this.rtH=Math.max(2,e),this.dropProg=S(t,V,pt),this.diffuseProg=S(t,V,vt),this.sssProg=S(t,V,yt),this.quadBuf=B(t),this.vao=t.createVertexArray(),t.bindVertexArray(this.vao),t.bindBuffer(t.ARRAY_BUFFER,this.quadBuf),[this.dropProg,this.diffuseProg,this.sssProg].forEach(s=>{t.useProgram(s);let c=t.getAttribLocation(s,"a_pos");t.enableVertexAttribArray(c),t.vertexAttribPointer(c,2,t.FLOAT,!1,0,0)}),t.bindVertexArray(null);let r=t.getExtension("EXT_color_buffer_float")?t.RGBA16F:t.RGBA8,n=r===t.RGBA16F?t.HALF_FLOAT:t.UNSIGNED_BYTE;this.rtA=j(t,this.rtW,this.rtH,r,t.RGBA,n),this.rtB=j(t,this.rtW,this.rtH,r,t.RGBA,n),this.fboA=K(t),Q(t,this.fboA,this.rtA),J(t),this.fboB=K(t),Q(t,this.fboB,this.rtB),J(t),t.bindFramebuffer(t.FRAMEBUFFER,null),this.currentReadTexture=this.rtA;let a=(s,c)=>{let h={};for(let m of c)h[m]=t.getUniformLocation(s,m);return h};this.dropUniforms=a(this.dropProg,["u_prev","u_sdf","u_dropPos","u_dropColor","u_dropRadius","u_dropStrength"]),this.diffuseUniforms=a(this.diffuseProg,["u_prev","u_texelSize","u_sdf","u_diffuseRate","u_decayRate","u_dt"]),this.sssUniforms=a(this.sssProg,["u_prev","u_texelSize","u_sdf"])}setSDFTexture(t){this.sdfTexture=t}dropPigment(t){this.pendingDrops.push(t)}resize(t,i){if(t===this.rtW&&i===this.rtH)return;let e=this.gl;this.rtW=Math.max(2,t),this.rtH=Math.max(2,i);let r=e.getExtension("EXT_color_buffer_float")?e.RGBA16F:e.RGBA8,n=r===e.RGBA16F?e.HALF_FLOAT:e.UNSIGNED_BYTE;e.bindTexture(e.TEXTURE_2D,this.rtA),e.texImage2D(e.TEXTURE_2D,0,r,this.rtW,this.rtH,0,e.RGBA,n,null),e.bindTexture(e.TEXTURE_2D,this.rtB),e.texImage2D(e.TEXTURE_2D,0,r,this.rtW,this.rtH,0,e.RGBA,n,null)}update(t){let i=this.gl,e=this.currentReadTexture,r=this.rtB,n=this.fboA,a=this.fboB;e===this.rtA?(n=this.fboA,a=this.fboB,r=this.rtB):(n=this.fboB,a=this.fboA,r=this.rtA);for(let s of this.pendingDrops)this.runPass(this.dropProg,e,a,n,(c,h)=>{h.uniform2f(this.dropUniforms.u_dropPos,s.x,s.y),h.uniform4f(this.dropUniforms.u_dropColor,s.color[0],s.color[1],s.color[2],1),h.uniform1f(this.dropUniforms.u_dropRadius,.025),h.uniform1f(this.dropUniforms.u_dropStrength,1.5),h.activeTexture(h.TEXTURE1),h.bindTexture(h.TEXTURE_2D,this.sdfTexture),h.uniform1i(this.dropUniforms.u_sdf,1)}),[e,r]=[r,e],[n,a]=[a,n];this.pendingDrops.length=0;for(let s=0;s<this.jacobiIterations;s++)this.runPass(this.diffuseProg,e,a,n,(c,h)=>{h.uniform2f(this.diffuseUniforms.u_texelSize,1/this.rtW,1/this.rtH),h.uniform1f(this.diffuseUniforms.u_diffuseRate,this.diffuseRate),h.uniform1f(this.diffuseUniforms.u_decayRate,this.decayRate),h.uniform1f(this.diffuseUniforms.u_dt,t),h.activeTexture(h.TEXTURE1),h.bindTexture(h.TEXTURE_2D,this.sdfTexture),h.uniform1i(this.diffuseUniforms.u_sdf,1)}),[e,r]=[r,e],[n,a]=[a,n];this.enableSSS&&(this.runPass(this.sssProg,e,a,n,(s,c)=>{c.uniform2f(this.sssUniforms.u_texelSize,1/this.rtW,1/this.rtH),c.activeTexture(c.TEXTURE1),c.bindTexture(c.TEXTURE_2D,this.sdfTexture),c.uniform1i(this.sssUniforms.u_sdf,1)}),[e,r]=[r,e],[n,a]=[a,n]),this.currentReadTexture=e,i.bindFramebuffer(i.FRAMEBUFFER,null)}runPass(t,i,e,r,n){let a=this.gl;a.bindFramebuffer(a.FRAMEBUFFER,e),a.viewport(0,0,this.rtW,this.rtH),a.useProgram(t),a.bindVertexArray(this.vao),a.activeTexture(a.TEXTURE0),a.bindTexture(a.TEXTURE_2D,i),a.uniform1i(t===this.dropProg?this.dropUniforms.u_prev:t===this.diffuseProg?this.diffuseUniforms.u_prev:this.sssUniforms.u_prev,0),n(t,a),a.drawArrays(a.TRIANGLES,0,6),a.bindVertexArray(null)}dispose(){let t=this.gl;t.deleteProgram(this.dropProg),t.deleteProgram(this.diffuseProg),t.deleteProgram(this.sssProg),t.deleteBuffer(this.quadBuf),t.deleteVertexArray(this.vao),t.deleteTexture(this.rtA),t.deleteTexture(this.rtB),t.deleteFramebuffer(this.fboA),t.deleteFramebuffer(this.fboB)}};var _t={},Z=8,X=class{constructor(){this.ctx=null;this.workletNode=null;this.scriptNode=null;this.useWorklet=!1;this.voices=[];this.started=!1;this.muted=!1;this.baseVolume=.3;this.speedToPitch=1.5;this.speedToVolume=.8;this.maxTouchSpeed=2e3;this.onTouchStarted=t=>{this.resume(),this.triggerGooey(0,t.force)};this.onTouchMoved=t=>{t.speed>200&&Math.random()<.3&&this.triggerGooey(t.speed,.5)}}async init(){if(!this.started)try{let t=new(window.AudioContext||window.webkitAudioContext);this.ctx=t;for(let e=0;e<Z;e++)this.voices.push({active:!1,phase:0,currentFreq:220,endFreq:65,duration:.08,samplesRemaining:0,totalSamples:0,volume:.3,waveBlend:.35,filterCutoff:1200,filterState1:0,filterState2:0});let i=!1;try{let e=new URL("../public/gooey-processor.js",_t.url);await t.audioWorklet.addModule(e),this.workletNode=new AudioWorkletNode(t,"gooey-processor",{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],parameterData:{masterVolume:this.baseVolume}}),this.workletNode.connect(t.destination),this.useWorklet=!0,i=!0,console.log("[AudioEngine] AudioWorklet started, sampleRate=",t.sampleRate)}catch(e){console.warn("[AudioEngine] AudioWorklet failed, falling back to ScriptProcessor:",e)}i||(this.scriptNode=t.createScriptProcessor(4096,0,2),this.scriptNode.onaudioprocess=r=>this.processScript(r),this.scriptNode.connect(t.destination),console.log("[AudioEngine] ScriptProcessor fallback started, sampleRate=",t.sampleRate)),u.on(l.TouchMoved,this.onTouchMoved),u.on(l.TouchStarted,this.onTouchStarted),this.started=!0}catch(t){console.error("[AudioEngine] init completely failed:",t)}}resume(){this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume().catch(()=>{})}setMuted(t){if(this.muted=t,this.workletNode){let i=this.workletNode.parameters.get("masterVolume");i&&i.setValueAtTime(t?0:this.baseVolume,this.ctx.currentTime)}}isMuted(){return this.muted}triggerGooey(t=0,i=.5){if(!this.started)return;let e=Math.min(1,t/this.maxTouchSpeed),r=1+e*this.speedToPitch,n=1+e*this.speedToVolume,a=1+e*2,s={startFreq:220*r,endFreq:65*r,duration:.08,volume:this.baseVolume*n*Math.min(1,i+.3),waveBlend:.35,filterCutoff:1200*a};this.useWorklet&&this.workletNode?this.workletNode.port.postMessage({type:"trigger",...s}):this.activateVoice(s)}activateVoice(t){let i=-1;for(let r=0;r<Z;r++)if(!this.voices[r].active){i=r;break}i<0&&(i=0);let e=this.voices[i];e.active=!0,e.phase=0,e.currentFreq=t.startFreq,e.endFreq=t.endFreq,e.duration=t.duration,e.totalSamples=t.duration*(this.ctx?.sampleRate??48e3),e.samplesRemaining=e.totalSamples,e.volume=t.volume,e.waveBlend=t.waveBlend,e.filterCutoff=t.filterCutoff,e.filterState1=0,e.filterState2=0}processScript(t){let i=t.outputBuffer,e=i.numberOfChannels,r=i.length,n=this.ctx?.sampleRate??48e3;for(let a=0;a<e;a++){let s=i.getChannelData(a);for(let c=0;c<r;c++)s[c]=0}if(!this.muted){for(let a=0;a<Z;a++){let s=this.voices[a];if(s.active)for(let c=0;c<r&&s.active;c++){let h=1-s.samplesRemaining/s.totalSamples;s.currentFreq+=(s.endFreq-s.currentFreq)*.1,s.phase+=2*Math.PI*s.currentFreq/n;let m=Math.sin(s.phase),g=2/Math.PI*Math.asin(Math.sin(s.phase)),d=m*(1-s.waveBlend)+g*s.waveBlend,v;h<.05?v=h/.05:v=Math.exp(-(h-.05)*4),d*=v*s.volume;let y=1/n,p=1/(2*Math.PI*Math.max(50,s.filterCutoff)),b=y/(p+y);s.filterState1+=b*(d-s.filterState1),s.filterState2+=b*(s.filterState1-s.filterState2);let T=s.filterState2;for(let x=0;x<e;x++)i.getChannelData(x)[c]+=T;s.samplesRemaining--,s.samplesRemaining<=0&&(s.active=!1)}}for(let a=0;a<e;a++){let s=i.getChannelData(a);for(let c=0;c<s.length;c++)s[c]>1?s[c]=1:s[c]<-1&&(s[c]=-1)}}}dispose(){this.started&&(u.off(l.TouchMoved,this.onTouchMoved),u.off(l.TouchStarted,this.onTouchStarted),this.workletNode?.disconnect(),this.scriptNode?.disconnect(),this.ctx?.close(),this.workletNode=null,this.scriptNode=null,this.ctx=null,this.started=!1)}};var bt=[{name:"\u7D05",color:[1,.2,.2],hex:"#ff3333"},{name:"\u85CD",color:[.2,.4,1],hex:"#3366ff"},{name:"\u9EC3",color:[1,.85,.1],hex:"#ffd919"},{name:"\u87A2\u5149\u7C89",color:[1,.2,.8],hex:"#ff33cc"},{name:"\u87A2\u5149\u7DA0",color:[.3,1,.4],hex:"#4dff66"},{name:"\u7D2B",color:[.8,.3,1],hex:"#cc4dff"},{name:"\u6A59",color:[1,.55,0],hex:"#ff8c00"},{name:"\u767D",color:[1,1,1],hex:"#ffffff"}],N=class{constructor(t,i=bt){this.buttons=[];this.selectedIndex=0;this.el=t,this.build(i)}build(t){this.el.innerHTML="",this.buttons=[],t.forEach((i,e)=>{let r=document.createElement("button");r.className="palette-btn",r.style.background=i.hex,r.title=i.name,r.setAttribute("aria-label",`\u8272\u7C89\uFF1A${i.name}`),r.addEventListener("click",n=>{n.stopPropagation(),this.select(e)}),this.el.appendChild(r),this.buttons.push(r)}),this.select(0)}select(t){t<0||t>=this.buttons.length||(this.selectedIndex=t,this.buttons.forEach((i,e)=>i.classList.toggle("selected",e===t)),ut(t))}get currentColor(){return bt[this.selectedIndex].color}dropAt(t,i){let e=this.currentColor;at(e,t,i)}};var z=class{constructor(t,i){this.slimeRenderer=null;this.pigmentSystem=null;this.gl=null;this.dpr=1;this.lastTime=0;this.fixedAccumulator=0;this.fixedDt=1/60;this.pigRTWidth=0;this.pigRTHeight=0;this.mouseCenter=null;this.loop=t=>{if(requestAnimationFrame(this.loop),!this.fpsController.shouldRenderNow(t))return;let i=(t-this.lastTime)/1e3;for(this.lastTime=t,this.activity.tick(i),this.fpsController.tick(i),this.fixedAccumulator+=i;this.fixedAccumulator>=this.fixedDt;)this.slimePhysics.fixedUpdate(this.fixedDt),this.fsm.fixedTick(this.fixedDt),this.fixedAccumulator-=this.fixedDt;if(this.fsm.tick(i),this.pigmentSystem&&this.pigmentSystem.update(i),this.slimeRenderer&&this.gl){let e=this.canvas.width,r=this.canvas.height;this.slimeRenderer.render(this.slimePhysics.metaballs,this.slimePhysics.particleCount,this.pigmentSystem?.currentReadTexture??null,t/1e3,e,r)}this.updateStatus()};this.statusUpdateTimer=0;this.lastStatusStr="";this.onResize=()=>{this.resizeCanvas()};this.canvas=t,this.pool=new C(4096,32),this.activity=new L,this.fpsController=new M(this.activity),this.slimePhysics=new I({}),this.gyroInput=new D,this.audioEngine=new X,this.palette=new N(i),this.fsm=new A;let e=new F(this.fsm,null,null),r=new w(this.fsm,e),n=new G(this.fsm,e,r);e.touchState=r,e.gyroState=n,this.fsm.initialize(e),this.touchInput=new U(t)}async start(){try{if(this.dpr=Math.min(window.devicePixelRatio||1,2),this.gl=this.canvas.getContext("webgl2",{alpha:!0,antialias:!1,premultipliedAlpha:!1,preserveDrawingBuffer:!1,powerPreference:"low-power"}),!this.gl){this.showError("\u60A8\u7684\u700F\u89BD\u5668\u4E0D\u652F\u63F4 WebGL2\uFF0C\u7121\u6CD5\u57F7\u884C\u6B64\u904A\u6232\u3002");return}this.gl.getExtension("EXT_color_buffer_float"),this.gl.getExtension("EXT_float_blend"),this.resizeCanvas(),window.addEventListener("resize",this.onResize);try{this.slimeRenderer=new k(this.gl)}catch(r){console.error("[GameManager] SlimeRenderer init failed:",r),this.showError("Shader \u7DE8\u8B6F\u5931\u6557\uFF1A"+r.message);return}try{this.pigmentSystem=new W(this.gl,Math.floor(this.canvas.width/2),Math.floor(this.canvas.height/2))}catch(r){console.error("[GameManager] PigmentSystem init failed:",r)}this.activity.start(),this.fpsController.start(),this.touchInput.start(),u.on(l.TouchStarted,r=>{let n=this.screenToUV(r.x,r.y);this.slimePhysics.setTouch(!0,n.x,n.y),navigator.vibrate&&navigator.vibrate(8)}),u.on(l.TouchMoved,r=>{let n=this.screenToUV(r.x,r.y);this.slimePhysics.setTouch(!0,n.x,n.y)}),u.on(l.TouchEnded,()=>{this.slimePhysics.setTouch(!1,0,0)}),u.on(l.PigmentDrop,r=>{if(!this.pigmentSystem)return;let n=this.screenToUV(r.x,r.y);this.pigmentSystem.dropPigment({color:r.color,x:n.x,y:n.y})}),u.on(l.TouchStarted,r=>{let n=document.elementFromPoint(r.x,r.y);n&&(n.closest(".palette-btn")||n.closest(".icon-btn"))||this.palette.dropAt(r.x,r.y)}),u.on(l.Gravity,r=>{this.slimePhysics.setGravity(r)}),document.getElementById("btn-reset")?.addEventListener("click",r=>{if(r.stopPropagation(),this.slimePhysics.reset(),navigator.vibrate&&navigator.vibrate(20),this.pigmentSystem&&this.gl){let n=this.gl,a=this.pigmentSystem;a.rtA&&(n.bindTexture(n.TEXTURE_2D,a.rtA),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,this.pigRTWidth,this.pigRTHeight,0,n.RGBA,n.UNSIGNED_BYTE,null)),a.rtB&&(n.bindTexture(n.TEXTURE_2D,a.rtB),n.texImage2D(n.TEXTURE_2D,0,n.RGBA8,this.pigRTWidth,this.pigRTHeight,0,n.RGBA,n.UNSIGNED_BYTE,null))}});let t=document.getElementById("btn-mute");t?.addEventListener("click",r=>{r.stopPropagation(),this.audioEngine.setMuted(!this.audioEngine.isMuted()),t.textContent=this.audioEngine.isMuted()?"\u{1F507}":"\u{1F50A}"});let i=async()=>{try{await this.gyroInput.requestPermission()&&(this.gyroInput.start(),document.removeEventListener("click",i),document.removeEventListener("touchend",i))}catch(r){console.warn("[GameManager] gyro failed:",r)}};document.addEventListener("click",i),document.addEventListener("touchend",i);let e=async()=>{await this.audioEngine.init(),this.audioEngine.resume(),document.removeEventListener("click",e),document.removeEventListener("touchend",e)};document.addEventListener("click",e),document.addEventListener("touchend",e),this.lastTime=performance.now(),this.loop(this.lastTime),setTimeout(()=>{let r=document.getElementById("loader");r&&(r.classList.add("hidden"),setTimeout(()=>{r.style.display="none"},600))},300),console.log("[GameManager] start() completed successfully")}catch(t){console.error("[GameManager] start() failed:",t),this.showError("\u555F\u52D5\u5931\u6557\uFF1A"+t.message)}}updateStatus(){if(this.statusUpdateTimer+=1,this.statusUpdateTimer<30)return;this.statusUpdateTimer=0;let t=this.fsm.currentStateType,i=t===0?"Idle":t===1?"Touch":t===2?"Gyro":"Paused",e=this.fpsController.current,r=(this.slimePhysics.currentViscosityValue*100).toFixed(0),n=(this.slimePhysics.currentSpreadRadiusValue*100).toFixed(0),a=`${i} \xB7 ${e} FPS \xB7 \u03B7=${r}% \xB7 r=${n}%`;if(a!==this.lastStatusStr){let s=document.getElementById("status");s&&(s.textContent=a),this.lastStatusStr=a}}resizeCanvas(){if(!this.canvas)return;let t=window.innerWidth,i=window.innerHeight;this.dpr=Math.min(window.devicePixelRatio||1,2),this.canvas.width=Math.floor(t*this.dpr),this.canvas.height=Math.floor(i*this.dpr),this.canvas.style.width=t+"px",this.canvas.style.height=i+"px",this.pigRTWidth=Math.max(2,Math.floor(this.canvas.width/2)),this.pigRTHeight=Math.max(2,Math.floor(this.canvas.height/2)),this.pigmentSystem&&this.pigmentSystem.resize(this.pigRTWidth,this.pigRTHeight)}screenToUV(t,i){return{x:t/window.innerWidth,y:1-i/window.innerHeight}}showError(t){let i=document.getElementById("loader");i&&(i.innerHTML=`<div style="color: #ff6666; padding: 2rem; text-align: center;">\u26A0\uFE0F<br/>${t}</div>`),console.error(t)}dispose(){this.touchInput.stop(),this.gyroInput.stop(),this.activity.stop(),this.fpsController.stop(),this.audioEngine.dispose(),this.slimeRenderer?.dispose(),this.pigmentSystem?.dispose(),u.clear(),window.removeEventListener("resize",this.onResize)}};var gt=document.getElementById("glcanvas"),Tt=document.getElementById("palette");if(!gt||!Tt)throw new Error("Required DOM elements not found");var Pt=new z(gt,Tt),Rt=async()=>{try{await Pt.start()}catch(o){console.error("[main] Failed to start game:",o);let t=document.getElementById("loader");t&&(t.innerHTML=`<div style="color: #ff6666; padding: 2rem; text-align: center;">\u26A0\uFE0F<br/>\u555F\u52D5\u5931\u6557\uFF1A${o.message}</div>`)}};"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(o=>{console.warn("[PWA] SW registration failed:",o)})});Rt();document.addEventListener("touchmove",o=>{o.touches.length>1&&o.preventDefault()},{passive:!1});document.addEventListener("gesturestart",o=>o.preventDefault());document.addEventListener("contextmenu",o=>o.preventDefault());})();
