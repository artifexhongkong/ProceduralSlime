// ============================================================================
//  GyroInput.ts  —  DeviceOrientation 監聽（陀螺儀 + 重力）
// ============================================================================
//  對應規格書「陀螺儀動態變形」：
//  - 使用 DeviceOrientationEvent 讀取 beta / gamma 角度
//  - 轉成 2D 重力向量 G = (sin(gamma), -sin(beta))
//  - iOS 13+ 需呼叫 DeviceOrientationEvent.requestPermission()
//  - 偵測 shake 事件
// ============================================================================

import { raiseGravity, raiseShake } from '../core/GameEvents';
import type { GravityVector } from '../core/types';

export class GyroInput {
  private enabled = false;
  private lastBeta = 0;
  private lastGamma = 0;
  private lastAccel: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private lowPass = { x: 0, y: 0, z: 0 };
  private shakeThreshold = 2.5;
  private sampleInterval = 33;   // ms
  private lastSample = 0;

  async requestPermission(): Promise<boolean> {
    // iOS 13+ 需要使用者互動後請求
    const anyDOE = (window as any).DeviceOrientationEvent;
    if (anyDOE && typeof anyDOE.requestPermission === 'function') {
      try {
        const r = await anyDOE.requestPermission();
        return r === 'granted';
      } catch (e) {
        console.warn('[GyroInput] requestPermission failed', e);
        return false;
      }
    }
    return true;   // Android 不需權限請求
  }

  start(): void {
    if (this.enabled) return;
    window.addEventListener('deviceorientation', this.onOrientation, true);
    window.addEventListener('devicemotion', this.onMotion, true);
    this.enabled = true;
    console.log('[GyroInput] started');
  }

  stop(): void {
    if (!this.enabled) return;
    window.removeEventListener('deviceorientation', this.onOrientation, true);
    window.removeEventListener('devicemotion', this.onMotion, true);
    this.enabled = false;
  }

  private onOrientation = (e: DeviceOrientationEvent) => {
    // beta: 前後傾斜 (-180..180, 0 = 平放正面朝上)
    // gamma: 左右傾斜 (-90..90, 0 = 平放)
    const beta = e.beta || 0;
    const gamma = e.gamma || 0;

    // 轉成重力向量（手機向右傾斜 → 史萊姆向右）
    // 在豎屏模式下：gamma 正向是向右傾斜
    const gx = Math.sin(gamma * Math.PI / 180);
    // beta 正向是向前傾斜（手機頂端向你傾）—— 我們希望向前傾時史萊姆向下
    const gy = -Math.sin(beta * Math.PI / 180);
    const magnitude = gx * gx + gy * gy;

    const g: GravityVector = { x: gx, y: gy, magnitude };
    raiseGravity(g);

    this.lastBeta = beta;
    this.lastGamma = gamma;
  };

  private onMotion = (e: DeviceMotionEvent) => {
    const now = performance.now();
    if (now - this.lastSample < this.sampleInterval) return;
    this.lastSample = now;

    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null) return;

    const x = acc.x;
    const y = acc.y;
    const z = acc.z ?? 0;

    // Low-pass filter for shake detection
    this.lowPass.x = this.lowPass.x * 0.85 + x * 0.15;
    this.lowPass.y = this.lowPass.y * 0.85 + y * 0.15;
    this.lowPass.z = this.lowPass.z * 0.85 + z * 0.15;

    const dx = x - this.lowPass.x;
    const dy = y - this.lowPass.y;
    const dz = z - this.lowPass.z;
    const intensity = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (intensity > this.shakeThreshold) {
      raiseShake(intensity);
    }

    this.lastAccel = { x, y, z };
  };

  // 桌面 fallback：用滑鼠位置模擬重力
  enableDesktopFallback(getMouseDelta: () => { x: number; y: number }): void {
    const interval = setInterval(() => {
      if (this.enabled) return;   // 真實 gyro 啟用時不使用 fallback
      const d = getMouseDelta();
      const g: GravityVector = {
        x: d.x,
        y: d.y,
        magnitude: d.x * d.x + d.y * d.y,
      };
      raiseGravity(g);
    }, 33);
    // 提供停止方式
    (this as any)._fallbackInterval = interval;
  }

  get isEnabled(): boolean { return this.enabled; }
}
