// ============================================================================
//  GameStateMachine.ts  —  有限狀態機 (FSM)
// ============================================================================

import { GameStateType } from './types';
import { raiseStateChanged } from './GameEvents';

export interface IGameState {
  type: GameStateType;
  onEnter(prev: GameStateType): void;
  onUpdate(dt: number): void;
  onFixedUpdate(fixedDt: number): void;
  onExit(next: GameStateType): void;
}

/**
 * 通用 FSM —— 採用延遲切換（在 tick 結束時才切換）避免 OnExit 中再觸發切換造成遞迴。
 */
export class GameStateMachine {
  private current: IGameState | null = null;
  private pending: IGameState | null = null;
  private hasPending = false;
  private initialized = false;

  get currentStateType(): GameStateType {
    return this.current?.type ?? GameStateType.Idle;
  }

  initialize(initial: IGameState): void {
    if (this.initialized) return;
    this.current = initial;
    this.current.onEnter(GameStateType.Idle);
    this.initialized = true;
  }

  changeState(next: IGameState): void {
    if (!next) return;
    if (this.current && next.type === this.current.type) return;
    this.pending = next;
    this.hasPending = true;
  }

  tick(dt: number): void {
    if (this.hasPending) {
      const prev = this.current;
      const prevType = prev?.type ?? GameStateType.Idle;
      prev?.onExit(this.pending!.type);
      this.current = this.pending!;
      this.current.onEnter(prevType);
      this.pending = null;
      this.hasPending = false;
      raiseStateChanged(prevType, this.current.type);
    }
    this.current?.onUpdate(dt);
  }

  fixedTick(fixedDt: number): void {
    this.current?.onFixedUpdate(fixedDt);
  }
}
