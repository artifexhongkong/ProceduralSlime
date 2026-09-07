// ============================================================================
//  ProceduralAudioEngine.ts  —  Web Audio API 程序化音效引擎
// ============================================================================
//  對應 Procedural Dynamic Audio Agent：
//  - 優先使用 AudioWorklet (gooey-processor.js) 在 audio thread 上合成「咕嘰」聲
//  - 若 AudioWorklet 不可用（例如 file:// 協議、舊瀏覽器），降級為
//    ScriptProcessorNode（在 main thread 合成，效能較差但相容性高）
//  - 根據觸控速度動態調整參數
// ============================================================================

import { GameEvents, EVT } from '../core/GameEvents';
import type { TouchMoveEvent } from '../core/types';

interface GooeyTrigger {
  startFreq: number;
  endFreq: number;
  duration: number;
  volume: number;
  waveBlend: number;
  filterCutoff: number;
}

interface GooeyVoice {
  active: boolean;
  phase: number;
  currentFreq: number;
  endFreq: number;
  duration: number;          // 用於計算 totalSamples（雖然 samplesRemaining 已足夠）
  samplesRemaining: number;
  totalSamples: number;
  volume: number;
  waveBlend: number;
  filterCutoff: number;
  filterState1: number;
  filterState2: number;
}

const MAX_VOICES = 8;

export class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private useWorklet = false;

  // ScriptProcessorNode 用的 voice 狀態
  private voices: GooeyVoice[] = [];

  private started = false;
  private muted = false;
  private baseVolume = 0.3;
  private speedToPitch = 1.5;
  private speedToVolume = 0.8;
  private maxTouchSpeed = 2000;

  async init(): Promise<void> {
    if (this.started) return;

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.ctx = ctx;

      // 初始化 voices（給 fallback 用）
      for (let i = 0; i < MAX_VOICES; i++) {
        this.voices.push({
          active: false, phase: 0, currentFreq: 220, endFreq: 65,
          duration: 0.08, samplesRemaining: 0, totalSamples: 0,
          volume: 0.3, waveBlend: 0.35,
          filterCutoff: 1200, filterState1: 0, filterState2: 0,
        });
      }

      // 嘗試 AudioWorklet
      let workletOk = false;
      try {
        // 用相對路徑（Cordova file:// 與 http:// server 都能用）
        // 注意：不能用 new URL('../public/gooey-processor.js', import.meta.url)
        // 因為 esbuild IIFE bundle 中 import.meta.url 會變成 "."
        // 直接用 './gooey-processor.js' 即可（檔案已放在 public/ 中，會被 vite copy 到 dist/）
        await ctx.audioWorklet.addModule('./gooey-processor.js');
        this.workletNode = new AudioWorkletNode(ctx, 'gooey-processor', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [2],
          parameterData: { masterVolume: this.baseVolume },
        });
        this.workletNode.connect(ctx.destination);
        this.useWorklet = true;
        workletOk = true;
        console.log('[AudioEngine] AudioWorklet started, sampleRate=', ctx.sampleRate);
      } catch (e) {
        console.warn('[AudioEngine] AudioWorklet failed, falling back to ScriptProcessor:', e);
      }

      // Fallback: ScriptProcessorNode（在 main thread 上合成）
      if (!workletOk) {
        // 4096 samples buffer (約 85ms at 48kHz) - 與 gooey 音效時長相符
        const bufSize = 4096;
        this.scriptNode = ctx.createScriptProcessor(bufSize, 0, 2);
        this.scriptNode.onaudioprocess = (e) => this.processScript(e);
        this.scriptNode.connect(ctx.destination);
        console.log('[AudioEngine] ScriptProcessor fallback started, sampleRate=', ctx.sampleRate);
      }

      // 訂閱觸控事件 → 觸發音效
      GameEvents.on<TouchMoveEvent>(EVT.TouchMoved, this.onTouchMoved);
      GameEvents.on<{ x: number; y: number; force: number }>(EVT.TouchStarted, this.onTouchStarted);

      this.started = true;
    } catch (e) {
      console.error('[AudioEngine] init completely failed:', e);
      // 靜默降級 - 遊戲仍可運作，只是沒聲音
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.workletNode) {
      const param = (this.workletNode.parameters as Map<string, AudioParam>).get('masterVolume');
      if (param) param.setValueAtTime(muted ? 0 : this.baseVolume, this.ctx!.currentTime);
    }
    // ScriptProcessor 沒有 volume 控制，靠 muted flag 在 process 中實現
  }

  isMuted(): boolean { return this.muted; }

  triggerGooey(touchSpeed = 0, force = 0.5): void {
    if (!this.started) return;

    const speedNorm = Math.min(1, touchSpeed / this.maxTouchSpeed);
    const pitchMul = 1 + speedNorm * this.speedToPitch;
    const volMul = 1 + speedNorm * this.speedToVolume;
    const cutoffMul = 1 + speedNorm * 2;

    const trigger: GooeyTrigger = {
      startFreq: 220 * pitchMul,
      endFreq: 65 * pitchMul,
      duration: 0.08,
      volume: this.baseVolume * volMul * Math.min(1, force + 0.3),
      waveBlend: 0.35,
      filterCutoff: 1200 * cutoffMul,
    };

    if (this.useWorklet && this.workletNode) {
      // 透過 MessagePort 送給 audio thread
      this.workletNode.port.postMessage({ type: 'trigger', ...trigger });
    } else {
      // 在 main thread 上啟動 voice
      this.activateVoice(trigger);
    }
  }

  // ===== ScriptProcessorNode fallback =====

  private activateVoice(t: GooeyTrigger): void {
    // 找空閒 voice 或 steal 最舊的
    let slot = -1;
    for (let i = 0; i < MAX_VOICES; i++) {
      if (!this.voices[i].active) { slot = i; break; }
    }
    if (slot < 0) slot = 0;
    const v = this.voices[slot];
    v.active = true;
    v.phase = 0;
    v.currentFreq = t.startFreq;
    v.endFreq = t.endFreq;
    v.duration = t.duration;
    v.totalSamples = t.duration * (this.ctx?.sampleRate ?? 48000);
    v.samplesRemaining = v.totalSamples;
    v.volume = t.volume;
    v.waveBlend = t.waveBlend;
    v.filterCutoff = t.filterCutoff;
    v.filterState1 = 0;
    v.filterState2 = 0;
  }

  private processScript(e: AudioProcessingEvent): void {
    const output = e.outputBuffer;
    const channels = output.numberOfChannels;
    const frameCount = output.length;
    const sr = this.ctx?.sampleRate ?? 48000;

    // 清零
    for (let c = 0; c < channels; c++) {
      const data = output.getChannelData(c);
      for (let i = 0; i < frameCount; i++) data[i] = 0;
    }

    if (this.muted) return;

    // 每個 voice 累加 sample
    for (let vi = 0; vi < MAX_VOICES; vi++) {
      const v = this.voices[vi];
      if (!v.active) continue;

      for (let i = 0; i < frameCount; i++) {
        if (!v.active) break;
        const progress = 1 - v.samplesRemaining / v.totalSamples;

        // 頻率指數滑降
        v.currentFreq += (v.endFreq - v.currentFreq) * 0.1;
        // 累積相位
        v.phase += 2 * Math.PI * v.currentFreq / sr;
        // Sine + Triangle 混合
        const sine = Math.sin(v.phase);
        const triangle = (2 / Math.PI) * Math.asin(Math.sin(v.phase));
        let raw = sine * (1 - v.waveBlend) + triangle * v.waveBlend;
        // Envelope: attack + exp decay
        let env;
        if (progress < 0.05) env = progress / 0.05;
        else env = Math.exp(-(progress - 0.05) * 4);
        raw *= env * v.volume;
        // 一階低通濾波（二次）
        const dt = 1 / sr;
        const rc = 1 / (2 * Math.PI * Math.max(50, v.filterCutoff));
        const alpha = dt / (rc + dt);
        v.filterState1 += alpha * (raw - v.filterState1);
        v.filterState2 += alpha * (v.filterState1 - v.filterState2);
        const sample = v.filterState2;
        // 寫入所有聲道
        for (let c = 0; c < channels; c++) {
          output.getChannelData(c)[i] += sample;
        }
        v.samplesRemaining--;
        if (v.samplesRemaining <= 0) v.active = false;
      }
    }

    // Hard clip
    for (let c = 0; c < channels; c++) {
      const data = output.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        if (data[i] > 1) data[i] = 1;
        else if (data[i] < -1) data[i] = -1;
      }
    }
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
    this.workletNode?.disconnect();
    this.scriptNode?.disconnect();
    this.ctx?.close();
    this.workletNode = null;
    this.scriptNode = null;
    this.ctx = null;
    this.started = false;
  }
}
