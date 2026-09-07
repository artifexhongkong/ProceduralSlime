// ============================================================================
//  TouchInput.ts  —  觸控輸入處理（pointer events + multi-touch first finger）
// ============================================================================

import { raiseTouchStarted, raiseTouchMoved, raiseTouchEnded } from '../core/GameEvents';
import type { TouchEvent } from '../core/types';

export class TouchInput {
  private el: HTMLElement;
  private trackedPointerId: number | null = null;
  private lastPos: { x: number; y: number } | null = null;
  private lastTime = 0;
  private speedSampleWindow = 50;   // ms

  constructor(el: HTMLElement) {
    this.el = el;
  }

  start(): void {
    this.el.addEventListener('pointerdown', this.onDown);
    this.el.addEventListener('pointermove', this.onMove);
    this.el.addEventListener('pointerup', this.onUp);
    this.el.addEventListener('pointercancel', this.onCancel);
    this.el.addEventListener('pointerleave', this.onCancel);
  }

  stop(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onCancel);
    this.el.removeEventListener('pointerleave', this.onCancel);
  }

  private onDown = (e: PointerEvent) => {
    e.preventDefault();
    if (this.trackedPointerId !== null) return;
    this.trackedPointerId = e.pointerId;
    this.lastPos = { x: e.clientX, y: e.clientY };
    this.lastTime = performance.now();
    this.el.setPointerCapture(e.pointerId);

    const ev: TouchEvent = {
      x: e.clientX,
      y: e.clientY,
      force: (e as any).pressure || 0.5,
    };
    raiseTouchStarted(ev);
  };

  private onMove = (e: PointerEvent) => {
    if (this.trackedPointerId !== e.pointerId) return;
    e.preventDefault();
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    if (dt <= 0) return;

    const dx = e.clientX - this.lastPos!.x;
    const dy = e.clientY - this.lastPos!.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;

    raiseTouchMoved({
      x: e.clientX, y: e.clientY,
      dx, dy, speed,
      force: (e as any).pressure || 0.5,
    });
    this.lastPos = { x: e.clientX, y: e.clientY };
    this.lastTime = now;
  };

  private onUp = (e: PointerEvent) => {
    if (this.trackedPointerId !== e.pointerId) return;
    e.preventDefault();
    this.trackedPointerId = null;
    this.lastPos = null;
    raiseTouchEnded({ x: e.clientX, y: e.clientY, force: 0 });
  };

  private onCancel = (e: PointerEvent) => {
    if (this.trackedPointerId !== e.pointerId) return;
    this.trackedPointerId = null;
    this.lastPos = null;
    raiseTouchEnded({ x: e.clientX, y: e.clientY, force: 0 });
  };
}
