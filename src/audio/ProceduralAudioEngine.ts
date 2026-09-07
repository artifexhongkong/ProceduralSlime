// ============================================================================
//  ProceduralAudioEngine.ts  —  Web Audio API 程序化音效引擎
// ============================================================================
//  對應 Procedural Dynamic Audio Agent：
//  - 使用 AudioWorklet (gooey-processor.js) 在 audio thread 上合成「咕嘰」聲
//  - 透過 MessagePort 觸發新 voice
//  - 根據觸控速度動態調整參數
//
//  注意：AudioWorklet 必須在 https 或 localhost 才能啟動，
//  Cordova 包裝的 APK 由於使用 file:// 協議，需要特殊處理（見下方 init()）
// ============================================================================

import { GameEvents, EVT } from '../core/GameEvents';
import type { TouchMoveEvent } from '../core/types';

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private node: AudioWorkletNode | null = null;
  private started = false;
  private muted = false;
  private baseVolume = 0.3;
  private speedToPitch = 1.5;
  private speedToVolume = 0.8;
  private maxTouchSpeed = 2000;

  async init(): Promise<void> {
    if (this.started) return;
    try {
      // 為相容 Cordova (file://)，先嘗試 https URL，否則用相對路徑
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.ctx = ctx;

      try {
        await ctx.audioWorklet.addModule(new URL('../public/gooey-processor.js', import.meta.url));
      } catch (e) {
        // fallback：用絕對路徑
        await ctx.audioWorklet.addModule('./gooey-processor.js');
      }

      this.node = new AudioWorkletNode(ctx, 'gooey-processor', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        parameterData: { masterVolume: this.baseVolume },
      });
      this.node.connect(ctx.destination);

      // 訂閱觸控事件 → 觸發音效
      GameEvents.on<TouchMoveEvent>(EVT.TouchMoved, this.onTouchMoved);
      GameEvents.on<{ x: number; y: number; force: number }>(EVT.TouchStarted, this.onTouchStarted);

      this.started = true;
      console.log('[AudioEngine] started, sampleRate=', ctx.sampleRate);
    } catch (e) {
      console.error('[AudioEngine] init failed:', e);
      // AudioWorklet 在某些環境不支援 → 靜默降級（不影響遊戲）
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.node) {
      const param = (this.node.parameters as Map<string, AudioParam>).get('masterVolume');
      if (param) param.setValueAtTime(muted ? 0 : this.baseVolume, this.ctx!.currentTime);
    }
  }

  isMuted(): boolean { return this.muted; }

  triggerGooey(touchSpeed = 0, force = 0.5): void {
    if (!this.node || !this.started) return;

    const speedNorm = Math.min(1, touchSpeed / this.maxTouchSpeed);
    const pitchMul = 1 + speedNorm * this.speedToPitch;
    const volMul = 1 + speedNorm * this.speedToVolume;
    const cutoffMul = 1 + speedNorm * 2;

    this.node.port.postMessage({
      type: 'trigger',
      startFreq: 220 * pitchMul,
      endFreq: 65 * pitchMul,
      duration: 0.08,
      volume: this.baseVolume * volMul * Math.min(1, force + 0.3),
      waveBlend: 0.35,
      filterCutoff: 1200 * cutoffMul,
    });
  }

  private onTouchStarted = (e: { x: number; y: number; force: number }) => {
    this.resume();
    this.triggerGooey(0, e.force);
  };

  private onTouchMoved = (e: TouchMoveEvent) => {
    if (e.speed > 200 && Math.random() < 0.3) {
      this.triggerGooey(e.speed, 0.5);
    }
  };

  dispose(): void {
    if (!this.started) return;
    GameEvents.off(EVT.TouchMoved, this.onTouchMoved);
    GameEvents.off(EVT.TouchStarted, this.onTouchStarted);
    this.node?.disconnect();
    this.ctx?.close();
    this.node = null;
    this.ctx = null;
    this.started = false;
  }
}
