// ============================================================================
//  States.ts  —  三個核心狀態：Idle / Touch / Gyro
// ============================================================================

import { GameStateType, type GravityVector } from '../core/types';
import { GameStateMachine, type IGameState } from '../core/GameStateMachine';
import { GameEvents, EVT, raiseGravity } from '../core/GameEvents';

// ============================================================================
//  IdleState —— 放置靜置
// ============================================================================
export class IdleState implements IGameState {
  readonly type = GameStateType.Idle;
  private idleDuration = 0;
  private lowPower = false;

  constructor(
    private fsm: GameStateMachine,
    private touchState: IGameState,
    private gyroState: IGameState,
  ) {}

  onEnter(prev: GameStateType): void {
    this.idleDuration = 0;
    this.lowPower = false;
    GameEvents.on(EVT.TouchStarted, this.onTouchStarted);
    GameEvents.on(EVT.Gravity, this.onGravity);
    GameEvents.on(EVT.Shake, this.onShake);
  }

  onUpdate(dt: number): void {
    this.idleDuration += dt;
    if (!this.lowPower && this.idleDuration > 10) {
      this.lowPower = true;
    }
  }
  onFixedUpdate(_fdt: number): void {}

  onExit(next: GameStateType): void {
    GameEvents.off(EVT.TouchStarted, this.onTouchStarted);
    GameEvents.off(EVT.Gravity, this.onGravity);
    GameEvents.off(EVT.Shake, this.onShake);
  }

  private onTouchStarted = () => this.fsm.changeState(this.touchState);
  private onGravity = (g: GravityVector) => {
    if (g.magnitude > 0.16) this.fsm.changeState(this.gyroState);   // ≈ 23°
  }
  private onShake = (intensity: number) => {
    if (intensity > 0.5) this.fsm.changeState(this.gyroState);
  }
}

// ============================================================================
//  TouchState —— 觸控擠壓
// ============================================================================
export class TouchState implements IGameState {
  readonly type = GameStateType.Touch;

  constructor(
    private fsm: GameStateMachine,
    private idleState: IGameState,
  ) {}

  onEnter(_prev: GameStateType): void {
    GameEvents.on(EVT.TouchEnded, this.onTouchEnded);
  }
  onUpdate(_dt: number): void {}
  onFixedUpdate(_fdt: number): void {}
  onExit(_next: GameStateType): void {
    GameEvents.off(EVT.TouchEnded, this.onTouchEnded);
  }
  private onTouchEnded = () => this.fsm.changeState(this.idleState);
}

// ============================================================================
//  GyroState —— 陀螺儀傾斜
// ============================================================================
export class GyroState implements IGameState {
  readonly type = GameStateType.Gyro;
  private gravityMag = 0;
  private quietDuration = 0;
  private static readonly QuietThreshold = 0.05;   // 平方值
  private static readonly QuietExitTime = 0.8;     // 0.8s 靜止回 Idle

  constructor(
    private fsm: GameStateMachine,
    private idleState: IGameState,
    private touchState: IGameState,
  ) {}

  onEnter(_prev: GameStateType): void {
    this.quietDuration = 0;
    GameEvents.on(EVT.TouchStarted, this.onTouchStarted);
    GameEvents.on(EVT.Gravity, this.onGravity);
  }

  onUpdate(dt: number): void {
    if (this.gravityMag < GyroState.QuietThreshold) {
      this.quietDuration += dt;
      if (this.quietDuration > GyroState.QuietExitTime) {
        this.fsm.changeState(this.idleState);
      }
    } else {
      this.quietDuration = 0;
    }
  }

  onFixedUpdate(_fdt: number): void {}
  onExit(_next: GameStateType): void {
    GameEvents.off(EVT.TouchStarted, this.onTouchStarted);
    GameEvents.off(EVT.Gravity, this.onGravity);
  }
  private onTouchStarted = () => this.fsm.changeState(this.touchState);
  private onGravity = (g: GravityVector) => { this.gravityMag = g.magnitude; };
}
