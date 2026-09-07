// ============================================================================
//  GameEvents.ts  —  弱耦合事件匯流排
// ============================================================================

import type { TouchEvent, TouchMoveEvent, GravityVector, Pigment, GameStateType } from './types';

type Handler<T> = (payload: T) => void;

/**
 * 全域事件匯流排 —— 用 Map<event, Set<handler>> 實作，
 * 比 DOM CustomEvent 效能好（沒有 event object 配置）。
 */
class GameEventsImpl {
  private map = new Map<string, Set<Handler<any>>>();

  on<T>(event: string, handler: Handler<T>): () => void {
    let set = this.map.get(event);
    if (!set) {
      set = new Set();
      this.map.set(event, set);
    }
    set.add(handler);
    // 回傳 unsubscribe 函式
    return () => set!.delete(handler);
  }

  emit<T>(event: string, payload: T): void {
    const set = this.map.get(event);
    if (!set) return;
    // 複製 iterate 避免 emit 過程中改動 set
    for (const h of set) {
      try { h(payload); } catch (e) { console.error('[GameEvents]', event, e); }
    }
  }

  off(event: string, handler: Handler<any>): void {
    const set = this.map.get(event);
    if (set) set.delete(handler);
  }

  clear(): void {
    this.map.clear();
  }
}

export const GameEvents = new GameEventsImpl();

// 事件名稱常數（避免字串拼錯）
export const EVT = {
  TouchStarted: 'touch:started',
  TouchMoved:   'touch:moved',
  TouchEnded:   'touch:ended',
  Gravity:      'gravity:changed',
  Shake:        'gyro:shake',
  PigmentDrop:  'pigment:dropped',
  PigmentSelect:'pigment:selected',
  UserActivity: 'user:activity',
  StateChanged: 'state:changed',
  FPSChanged:   'fps:changed',
} as const;

// 便利包裝
export const raiseTouchStarted = (e: TouchEvent) => { GameEvents.emit(EVT.TouchStarted, e); GameEvents.emit(EVT.UserActivity, null); };
export const raiseTouchMoved   = (e: TouchMoveEvent) => { GameEvents.emit(EVT.TouchMoved, e); GameEvents.emit(EVT.UserActivity, null); };
export const raiseTouchEnded   = (e: TouchEvent) => { GameEvents.emit(EVT.TouchEnded, e); GameEvents.emit(EVT.UserActivity, null); };
export const raiseGravity      = (g: GravityVector) => {
  GameEvents.emit(EVT.Gravity, g);
  if (g.magnitude > 0.4) GameEvents.emit(EVT.UserActivity, null);
};
export const raiseShake        = (intensity: number) => { GameEvents.emit(EVT.Shake, intensity); GameEvents.emit(EVT.UserActivity, null); };
export const raisePigmentDrop  = (color: [number,number,number], x: number, y: number) => { GameEvents.emit(EVT.PigmentDrop, { color, x, y }); GameEvents.emit(EVT.UserActivity, null); };
export const raisePigmentSelect= (idx: number) => { GameEvents.emit(EVT.PigmentSelect, idx); GameEvents.emit(EVT.UserActivity, null); };
export const raiseStateChanged = (from: GameStateType, to: GameStateType) => GameEvents.emit(EVT.StateChanged, { from, to });
export const raiseFPSChanged   = (fps: number) => GameEvents.emit(EVT.FPSChanged, fps);
