// ============================================================================
//  ActivityTracker.ts  —  追蹤使用者活躍度，供 DynamicFPSController 查詢
// ============================================================================

import { GameEvents, EVT } from '../core/GameEvents';

export class ActivityTracker {
  private idle = 0;
  private activityUnsub: (() => void) | null = null;

  start(): void {
    if (this.activityUnsub) return;
    this.activityUnsub = GameEvents.on<null>(EVT.UserActivity, () => { this.idle = 0; });
  }

  stop(): void {
    if (this.activityUnsub) { this.activityUnsub(); this.activityUnsub = null; }
  }

  tick(dt: number): void {
    this.idle += dt;
  }

  notifyActivity(): void {
    this.idle = 0;
  }

  get idleDuration(): number { return this.idle; }
  isIdleFor(sec: number): boolean { return this.idle >= sec; }
}
