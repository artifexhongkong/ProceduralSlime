// ============================================================================
//  GameManager.ts  —  主入口協調器
// ============================================================================
//  對應 Lead Game Architect：
//  - 建立狀態機（Idle / Touch / Gyro）
//  - 啟動 ActivityTracker + DynamicFPSController
//  - 協調 SlimePhysics / SlimeRenderer / PigmentSystem / AudioEngine
//  - 主 RAF loop
// ============================================================================

import { GameStateMachine } from './GameStateMachine';
import { IdleState, TouchState, GyroState } from '../states/States';
import { GameEvents, EVT, raisePigmentDrop } from './GameEvents';
import { ActivityTracker } from '../perf/ActivityTracker';
import { DynamicFPSController } from '../perf/DynamicFPSController';
import { MemoryPool } from '../perf/MemoryPool';
import { SlimePhysics } from '../physics/SlimePhysics';
import { GyroInput } from '../physics/GyroInput';
import { TouchInput } from '../physics/TouchInput';
import { SlimeRenderer } from '../graphics/SlimeRenderer';
import { PigmentSystem } from '../graphics/PigmentSystem';
import { ProceduralAudioEngine } from '../audio/ProceduralAudioEngine';
import { PigmentPalette } from '../ui/PigmentPalette';
import { GameStateType } from './types';

export class GameManager {
  // 子系統
  private fsm: GameStateMachine;
  private activity: ActivityTracker;
  private fpsController: DynamicFPSController;
  private pool: MemoryPool;
  private slimePhysics: SlimePhysics;
  private gyroInput: GyroInput;
  private touchInput: TouchInput;
  private slimeRenderer: SlimeRenderer | null = null;
  private pigmentSystem: PigmentSystem | null = null;
  private audioEngine: ProceduralAudioEngine;
  private palette: PigmentPalette;

  // 狀態
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private dpr = 1;
  private lastTime = 0;
  private fixedAccumulator = 0;
  private readonly fixedDt = 1 / 60;
  private pigRTWidth = 0;
  private pigRTHeight = 0;

  // 用於 desktop fallback 重力
  private mouseCenter: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement, uiPalette: HTMLElement) {
    this.canvas = canvas;
    this.pool = new MemoryPool(4096, 32);
    this.activity = new ActivityTracker();
    this.fpsController = new DynamicFPSController(this.activity);
    this.slimePhysics = new SlimePhysics({});
    this.gyroInput = new GyroInput();
    this.audioEngine = new ProceduralAudioEngine();
    this.palette = new PigmentPalette(uiPalette);

    // FSM 初始化（兩階段建構）
    this.fsm = new GameStateMachine();
    const idle = new IdleState(this.fsm, null as any, null as any);
    const touch = new TouchState(this.fsm, idle);
    const gyro = new GyroState(this.fsm, idle, touch);
    (idle as any).touchState = touch;
    (idle as any).gyroState = gyro;
    this.fsm.initialize(idle);

    // TouchInput 綁到 canvas
    this.touchInput = new TouchInput(canvas);
  }

  async start(): Promise<void> {
    // 1. 初始化 WebGL2
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.gl = this.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'low-power',
    }) as WebGL2RenderingContext | null;

    if (!this.gl) {
      this.showError('您的瀏覽器不支援 WebGL2，無法執行此遊戲。');
      return;
    }

    // 啟用 float blend（如果支援）
    this.gl.getExtension('EXT_color_buffer_float');
    this.gl.getExtension('EXT_float_blend');

    // 2. 調整 canvas 大小
    this.resizeCanvas();
    window.addEventListener('resize', this.onResize);

    // 3. 建立渲染器與色粉系統
    this.slimeRenderer = new SlimeRenderer(this.gl);
    this.pigmentSystem = new PigmentSystem(this.gl,
      Math.floor(this.canvas.width / 2),
      Math.floor(this.canvas.height / 2));

    // 4. 啟動子系統
    this.activity.start();
    this.fpsController.start();
    this.touchInput.start();

    // 5. 觸控 → 物理橋接
    GameEvents.on<{ x: number; y: number; force: number }>(EVT.TouchStarted, (e) => {
      const uv = this.screenToUV(e.x, e.y);
      this.slimePhysics.setTouch(true, uv.x, uv.y);
    });
    GameEvents.on<{ x: number; y: number; dx: number; dy: number; speed: number; force: number }>(EVT.TouchMoved, (e) => {
      const uv = this.screenToUV(e.x, e.y);
      this.slimePhysics.setTouch(true, uv.x, uv.y);
    });
    GameEvents.on<{ x: number; y: number; force: number }>(EVT.TouchEnded, () => {
      this.slimePhysics.setTouch(false, 0, 0);
    });

    // 6. 色粉事件 → PigmentSystem
    GameEvents.on<{ color: [number, number, number]; x: number; y: number }>(EVT.PigmentDrop, (e) => {
      if (!this.pigmentSystem) return;
      const uv = this.screenToUV(e.x, e.y);
      this.pigmentSystem.dropPigment({ color: e.color, x: uv.x, y: uv.y });
    });

    // 7. 點擊 canvas 拖放色粉（在 TouchStarted 額外觸發）
    GameEvents.on<{ x: number; y: number; force: number }>(EVT.TouchStarted, (e) => {
      // 只有當色粉盤被選中時才拖放（簡化：永遠拖放，使用者點螢幕即滴色粉）
      this.palette.dropAt(e.x, e.y);
    });

    // 8. 重力 → 物理
    GameEvents.on<{ x: number; y: number; magnitude: number }>(EVT.Gravity, (g) => {
      this.slimePhysics.setGravity(g);
    });

    // 9. 按鈕事件
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      this.slimePhysics.reset();
      if (this.pigmentSystem) {
        // 清除色粉 —— 重新建立 RT
        const gl = this.gl!;
        gl.bindTexture(gl.TEXTURE_2D, (this.pigmentSystem as any).rtA);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.pigRTWidth, this.pigRTHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindTexture(gl.TEXTURE_2D, (this.pigmentSystem as any).rtB);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.pigRTWidth, this.pigRTHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
    });

    const muteBtn = document.getElementById('btn-mute');
    muteBtn?.addEventListener('click', () => {
      this.audioEngine.setMuted(!this.audioEngine.isMuted());
      muteBtn.textContent = this.audioEngine.isMuted() ? '🔇' : '🔊';
    });

    // 10. 嘗試啟動陀螺儀（需要使用者互動）—— 在第一次 click 時請求權限
    const tryStartGyro = async () => {
      const ok = await this.gyroInput.requestPermission();
      if (ok) {
        this.gyroInput.start();
        document.removeEventListener('click', tryStartGyro);
        document.removeEventListener('touchend', tryStartGyro);
      }
    };
    document.addEventListener('click', tryStartGyro, { once: false });
    document.addEventListener('touchend', tryStartGyro, { once: false });

    // 11. 啟動音效（需要使用者互動）
    const tryStartAudio = async () => {
      await this.audioEngine.init();
      this.audioEngine.resume();
      document.removeEventListener('click', tryStartAudio);
      document.removeEventListener('touchend', tryStartAudio);
    };
    document.addEventListener('click', tryStartAudio, { once: false });
    document.addEventListener('touchend', tryStartAudio, { once: false });

    // 12. 啟動主迴圈
    this.lastTime = performance.now();
    this.loop(this.lastTime);

    // 13. 隱藏載入畫面
    setTimeout(() => {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 600);
      }
    }, 300);
  }

  private loop = (timestamp: number): void => {
    requestAnimationFrame(this.loop);

    // FPS 控制 —— 跳幀
    if (!this.fpsController.shouldRenderNow(timestamp)) return;

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // 更新子系統
    this.activity.tick(dt);
    this.fpsController.tick(dt);

    // FixedUpdate（用累加器保持物理步進穩定）
    this.fixedAccumulator += dt;
    while (this.fixedAccumulator >= this.fixedDt) {
      this.slimePhysics.fixedUpdate(this.fixedDt);
      this.fsm.fixedTick(this.fixedDt);
      this.fixedAccumulator -= this.fixedDt;
    }

    // Update（每幀）
    this.fsm.tick(dt);

    // 更新色粉系統
    if (this.pigmentSystem) {
      this.pigmentSystem.update(dt);
    }

    // 渲染
    if (this.slimeRenderer && this.gl) {
      const w = this.canvas.width;
      const h = this.canvas.height;
      this.slimeRenderer.render(
        this.slimePhysics.metaballs,
        this.slimePhysics.particleCount,
        this.pigmentSystem?.currentReadTexture ?? null,
        timestamp / 1000,
        w, h
      );
    }

    // 更新狀態顯示
    this.updateStatus();
  };

  private statusUpdateTimer = 0;
  private lastStatusStr = '';
  private updateStatus(): void {
    this.statusUpdateTimer += 1;
    if (this.statusUpdateTimer < 30) return;   // 每 0.5 秒更新一次
    this.statusUpdateTimer = 0;

    const state = this.fsm.currentStateType;
    const stateStr = state === GameStateType.Idle ? 'Idle' :
                     state === GameStateType.Touch ? 'Touch' :
                     state === GameStateType.Gyro ? 'Gyro' : 'Paused';
    const fps = this.fpsController.current;
    const viscosity = (this.slimePhysics.currentViscosityValue * 100).toFixed(0);
    const spread = (this.slimePhysics.currentSpreadRadiusValue * 100).toFixed(0);
    const statusStr = `${stateStr} · ${fps} FPS · η=${viscosity}% · r=${spread}%`;
    if (statusStr !== this.lastStatusStr) {
      const el = document.getElementById('status');
      if (el) el.textContent = statusStr;
      this.lastStatusStr = statusStr;
    }
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';

    this.pigRTWidth = Math.max(2, Math.floor(this.canvas.width / 2));
    this.pigRTHeight = Math.max(2, Math.floor(this.canvas.height / 2));

    if (this.pigmentSystem) {
      this.pigmentSystem.resize(this.pigRTWidth, this.pigRTHeight);
    }
  }

  private onResize = () => {
    this.resizeCanvas();
  };

  private screenToUV(x: number, y: number): { x: number; y: number } {
    // canvas 是全螢幕，UV 範圍 0..1，y 朝上
    return {
      x: x / window.innerWidth,
      y: 1 - y / window.innerHeight,
    };
  }

  private showError(msg: string): void {
    const loader = document.getElementById('loader');
    if (loader) {
      loader.innerHTML = `<div style="color: #ff6666; padding: 2rem; text-align: center;">⚠️<br/>${msg}</div>`;
    }
    console.error(msg);
  }

  dispose(): void {
    this.touchInput.stop();
    this.gyroInput.stop();
    this.activity.stop();
    this.fpsController.stop();
    this.audioEngine.dispose();
    this.slimeRenderer?.dispose();
    this.pigmentSystem?.dispose();
    GameEvents.clear();
    window.removeEventListener('resize', this.onResize);
  }
}
