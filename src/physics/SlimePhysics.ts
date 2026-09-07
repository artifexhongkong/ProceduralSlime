// ============================================================================
//  SlimePhysics.ts  —  軟體流體物理（質點系統 + 彈簧 + 阻尼 + 靜置平攤）
// ============================================================================
//  對應規格書「流體物理與陀螺儀感應系統」
//  - 靜置平攤：粘滯指數衰減，rest position 向外擴散
//  - 陀螺儀：施加加速度
//  - 觸控擠擠壓：徑向排斥力 + 彈性復原
// ============================================================================

import type { Metaball, GravityVector } from '../core/types';

export interface SlimePhysicsConfig {
  particleCount: number;       // 8..64
  initialRadius: number;       // 初始排列半徑（UV space, 0..1）
  maxSpreadRadius: number;     // 最大擴散半徑 (0.8 = 80% 螢幕覆蓋)

  initialViscosity: number;    // 0..1
  viscosityDecayTime: number;   // 秒
  minViscosity: number;

  springStiffness: number;
  springDamping: number;

  gravityStrength: number;
  gravitySmooth: number;

  touchRadius: number;          // UV space
  touchForce: number;
}

export const DEFAULT_CONFIG: SlimePhysicsConfig = {
  particleCount: 28,           // 18 → 28：更多質點讓史萊姆更連續
  initialRadius: 0.25,         // 0.15 → 0.25：初始時史萊姆就比較大
  maxSpreadRadius: 0.85,       // 0.8 → 0.85：可擴散到接近全螢幕

  initialViscosity: 0.92,      // 0.85 → 0.92：更像凝膠，回彈更明顯
  viscosityDecayTime: 180,     // 120 → 180：衰減更慢，初期保持固態
  minViscosity: 0.15,          // 0.08 → 0.15：永遠保持一點張力

  springStiffness: 12,         // 8 → 12：回彈更Q彈
  springDamping: 3.5,          // 2.5 → 3.5：阻尼更強避免震盪

  gravityStrength: 2.0,        // 1.5 → 2.0：重力反應更明顯
  gravitySmooth: 0.5,          // 0.7 → 0.5：反應更快

  touchRadius: 0.12,           // 0.08 → 0.12：觸控影響範圍更大
  touchForce: 25,              // 15 → 25：戳擠更有感
};

export class SlimePhysics {
  // 質點資料（每個軸獨立 Float32Array，更 cache-friendly）
  public positionsX: Float32Array;
  public positionsY: Float32Array;
  public velocitiesX: Float32Array;
  public velocitiesY: Float32Array;
  public restPositionsX: Float32Array;
  public restPositionsY: Float32Array;
  public radii: Float32Array;

  public metaballs: Metaball[];   // 上傳給 GPU 的緩衝

  private config: SlimePhysicsConfig;
  private currentViscosity: number;
  private idleTimer = 0;
  private smoothedGravityX = 0;
  private smoothedGravityY = 0;
  private currentSpreadRadius: number;

  // 觸控狀態
  private touchActive = false;
  private touchX = 0;
  private touchY = 0;

  constructor(config: Partial<SlimePhysicsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    const n = this.config.particleCount;
    this.positionsX = new Float32Array(n);
    this.positionsY = new Float32Array(n);
    this.velocitiesX = new Float32Array(n);
    this.velocitiesY = new Float32Array(n);
    this.restPositionsX = new Float32Array(n);
    this.restPositionsY = new Float32Array(n);
    this.radii = new Float32Array(n);
    this.metaballs = new Array(n);
    for (let i = 0; i < n; i++) {
      this.metaballs[i] = { x: 0.5, y: 0.5, z: 0.05, w: 0 };
    }
    this.currentViscosity = this.config.initialViscosity;
    this.currentSpreadRadius = this.config.initialRadius;
    this.initializeParticles();
  }

  private initializeParticles(): void {
    // 蜂巢排列（六角堆積）—— 更緊密的排列讓 metaballs 融合得更明顯
    const n = this.config.particleCount;
    const rings = Math.ceil(Math.sqrt(n));
    // 每個 metaball 的半徑設為「足以讓相鄰 metaball 融合」的大小
    // 原本 r = initialRadius / rings * 0.8 → 太小
    // 改為 initialRadius * 0.5 / rings * 1.5 → 半徑變大 1.875 倍
    const r = (this.config.initialRadius / Math.max(rings, 1)) * 1.5;
    let idx = 0;
    for (let ring = 0; ring < rings * 2 && idx < n; ring++) {
      const countInRing = ring === 0 ? 1 : ring * 6;
      for (let i = 0; i < countInRing && idx < n; i++) {
        const angle = (i / countInRing) * Math.PI * 2;
        const radius = ring * r * 0.6;  // 環間距離縮小讓質點更密集
        const x = 0.5 + Math.cos(angle) * radius;
        const y = 0.5 + Math.sin(angle) * radius;
        this.positionsX[idx] = x;
        this.positionsY[idx] = y;
        this.restPositionsX[idx] = x;
        this.restPositionsY[idx] = y;
        this.velocitiesX[idx] = 0;
        this.velocitiesY[idx] = 0;
        this.radii[idx] = r * 1.2;  // 半徑加大讓融合更明顯
        idx++;
      }
    }
    while (idx < n) {
      this.positionsX[idx] = 0.5;
      this.positionsY[idx] = 0.5;
      this.restPositionsX[idx] = 0.5;
      this.restPositionsY[idx] = 0.5;
      this.radii[idx] = r * 1.2;
      idx++;
    }
  }

  setTouch(active: boolean, x: number, y: number): void {
    this.touchActive = active;
    this.touchX = x;
    this.touchY = y;
  }

  setGravity(g: GravityVector): void {
    // 平滑 —— low-pass filter
    const t = 1 - this.config.gravitySmooth;
    // 注意：重力 sqrt 後再平滑效果較好（避免小幅度雜訊被過度放大）
    const mag = Math.sqrt(g.magnitude);
    const sx = (g.x / Math.max(mag, 0.0001)) * mag;
    const sy = (g.y / Math.max(mag, 0.0001)) * mag;
    this.smoothedGravityX = this.smoothedGravityX * (1 - t) + sx * t;
    this.smoothedGravityY = this.smoothedGravityY * (1 - t) + sy * t;
  }

  reset(): void {
    this.idleTimer = 0;
    this.currentViscosity = this.config.initialViscosity;
    this.currentSpreadRadius = this.config.initialRadius;
    this.smoothedGravityX = 0;
    this.smoothedGravityY = 0;
    for (let i = 0; i < this.config.particleCount; i++) {
      this.velocitiesX[i] = 0;
      this.velocitiesY[i] = 0;
    }
    this.initializeParticles();
  }

  fixedUpdate(dt: number): void {
    if (dt <= 0) return;
    const n = this.config.particleCount;
    const cfg = this.config;

    // 1. 更新粘滯（idle 越久越像水）
    this.idleTimer += dt;
    const decay = Math.exp(-this.idleTimer / cfg.viscosityDecayTime);
    this.currentViscosity = cfg.minViscosity + (cfg.initialViscosity - cfg.minViscosity) * decay;

    // 觸控活躍時 reset timer
    if (this.touchActive) {
      this.idleTimer = Math.max(0, this.idleTimer - dt * 5);
    }

    // 2. 目標 spread radius
    const targetSpread = cfg.initialRadius +
      (cfg.maxSpreadRadius - cfg.initialRadius) * (1 - this.currentViscosity / cfg.initialViscosity);
    this.currentSpreadRadius += (targetSpread - this.currentSpreadRadius) * dt * 0.5;

    // 3. 重力
    const gravityX = this.smoothedGravityX * cfg.gravityStrength * (1 - this.currentViscosity);
    const gravityY = this.smoothedGravityY * cfg.gravityStrength * (1 - this.currentViscosity);

    // 4. 質點積分
    const tr = cfg.touchRadius;
    const trSq = tr * tr;
    const tf = cfg.touchForce;

    for (let i = 0; i < n; i++) {
      const px = this.positionsX[i];
      const py = this.positionsY[i];
      let vx = this.velocitiesX[i];
      let vy = this.velocitiesY[i];

      let fx = gravityX;
      let fy = gravityY;

      // 彈簧回 rest position
      const toRestX = this.restPositionsX[i] - px;
      const toRestY = this.restPositionsY[i] - py;
      const springK = cfg.springStiffness * (0.3 + this.currentViscosity);
      fx += toRestX * springK;
      fy += toRestY * springK;

      // 阻尼
      const damp = cfg.springDamping * (0.5 + this.currentViscosity);
      fx -= vx * damp;
      fy -= vy * damp;

      // 觸控排斥
      if (this.touchActive) {
        const dx = px - this.touchX;
        const dy = py - this.touchY;
        const distSq = dx * dx + dy * dy;
        if (distSq < trSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const falloff = 1 - distSq / trSq;
          fx += (dx / dist) * falloff * tf;
          fy += (dy / dist) * falloff * tf;
        }
      }

      // 半隱式 Euler
      vx += fx * dt;
      vy += fy * dt;
      let nx = px + vx * dt;
      let ny = py + vy * dt;

      // clamp 到 0..1
      if (nx < 0) { nx = 0; vx = -vx * 0.3; }
      if (nx > 1) { nx = 1; vx = -vx * 0.3; }
      if (ny < 0) { ny = 0; vy = -vy * 0.3; }
      if (ny > 1) { ny = 1; vy = -vy * 0.3; }

      this.positionsX[i] = nx;
      this.positionsY[i] = ny;
      this.velocitiesX[i] = vx;
      this.velocitiesY[i] = vy;
    }

    // 5. 緩慢擴大 rest position（向四周平攤）
    const spreadRate = 0.02 * dt;
    for (let i = 0; i < n; i++) {
      const dx = this.restPositionsX[i] - 0.5;
      const dy = this.restPositionsY[i] - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.001) {
        const targetDist = Math.min(dist + spreadRate, this.currentSpreadRadius);
        const k = targetDist / dist;
        this.restPositionsX[i] = 0.5 + dx * k;
        this.restPositionsY[i] = 0.5 + dy * k;
      }
    }

    // 6. 更新 metaballs 給 renderer
    for (let i = 0; i < n; i++) {
      const speed = Math.sqrt(this.velocitiesX[i] * this.velocitiesX[i] + this.velocitiesY[i] * this.velocitiesY[i]);
      const pressure = Math.min(1, speed * (this.touchActive ? 0.5 : 0.2));
      this.metaballs[i].x = this.positionsX[i];
      this.metaballs[i].y = this.positionsY[i];
      this.metaballs[i].z = this.radii[i];
      this.metaballs[i].w = pressure;
    }
  }

  get particleCount(): number { return this.config.particleCount; }
  get currentViscosityValue(): number { return this.currentViscosity; }
  get currentSpreadRadiusValue(): number { return this.currentSpreadRadius; }
}
