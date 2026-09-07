// ============================================================================
//  DynamicFPSController.ts  —  60 / 30 / 15 FPS 智能省電策略
// ============================================================================
//  對應規格書「智能降幀省電策略 (Adaptive FPS)」：
//  - 60 FPS：當有手指觸控或陀螺儀發生顯著運動時
//  - 30 FPS：無操作超過 10 秒後
//  - 15 FPS：無操作超過 30 秒或切換至手機背景時
//
//  Web 端實作：
//  - requestAnimationFrame 本身會跟隨螢幕刷新率，但當 tab 不可見時自動降至 ~1 FPS
//  - 我們透過「跳幀策略」實現目標 FPS —— 每收到 RAF callback，
//    若距離上次渲染時間小於目標間隔則跳過
//  - 背景時不需主動降頻（瀏覽器已經處理）但仍記錄狀態
// ============================================================================

import type { ActivityTracker } from './ActivityTracker';
import { raiseFPSChanged } from '../core/GameEvents';

export class DynamicFPSController {
  static readonly FPS_INTERACTIVE = 60;
  static readonly FPS_IDLE_SHORT  = 30;
  static readonly FPS_IDLE_LONG   = 15;
  static readonly T_30 = 10;
  static readonly T_15 = 30;

  private activity: ActivityTracker;
  private currentFPS: number = DynamicFPSController.FPS_INTERACTIVE;
  private isBackground = false;
  private lastFrameTime = 0;
  private targetInterval = 1000 / 60;

  constructor(activity: ActivityTracker) {
    this.activity = activity;
  }

  start(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('focus', this.onFocus);
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('focus', this.onFocus);
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.isBackground = true;
      this.setFPS(DynamicFPSController.FPS_IDLE_LONG);
    } else {
      this.isBackground = false;
      this.activity.notifyActivity();
      this.setFPS(DynamicFPSController.FPS_INTERACTIVE);
    }
  };

  private onBlur = () => { this.isBackground = true; this.setFPS(DynamicFPSController.FPS_IDLE_LONG); };
  private onFocus = () => { this.isBackground = false; this.activity.notifyActivity(); this.setFPS(DynamicFPSController.FPS_INTERACTIVE); };

  /**
   * 每幀 RAF 呼叫。回傳 true 表示應渲染，false 表示跳幀。
   */
  shouldRenderNow(timestamp: number): boolean {
    if (this.isBackground) return false;     // 背景完全不渲染
    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.targetInterval) return false;
    this.lastFrameTime = timestamp - (elapsed % this.targetInterval);
    return true;
  }

  tick(_dt: number): void {
    if (this.isBackground) return;
    let target = DynamicFPSController.FPS_INTERACTIVE;
    if (this.activity.idleDuration >= DynamicFPSController.T_15) target = DynamicFPSController.FPS_IDLE_LONG;
    else if (this.activity.idleDuration >= DynamicFPSController.T_30) target = DynamicFPSController.FPS_IDLE_SHORT;
    if (target !== this.currentFPS) this.setFPS(target);
  }

  private setFPS(fps: number): void {
    if (this.currentFPS === fps) return;
    this.currentFPS = fps;
    this.targetInterval = 1000 / fps;
    raiseFPSChanged(fps);
    console.log(`[AdaptiveFPS] → ${fps} FPS`);
  }

  get current(): number { return this.currentFPS; }
  get background(): boolean { return this.isBackground; }
}
