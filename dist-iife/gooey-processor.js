// ============================================================================
//  gooey-processor.js  —  AudioWorkletProcessor（程序化「咕「咕嘰」聲）
// ============================================================================
//  ⚠️ AudioWorklet 必須是獨立檔案，且要在 audioWorklet.addModule() 時載入。
//     不能是 TypeScript module，必須是純 JS 在 audio thread 執行。
//     此檔案會被複製到 public/ 目錄（讓 Vite 原樣輸出）。
// ============================================================================
//
//  對應規格書「程序化動態音效」：
//  - Sine + Triangle 混合
//  - 80ms 內頻率從 220Hz 滑降到 65Hz
//  - 一階動態低通濾波器
//  - 觸控速度映射音高 / cutoff / volume
//  - 多 voice（最多 8 同時發聲，超出時 voice stealing）
// ============================================================================

class GooeyProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'masterVolume', defaultValue: 0.3, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor(options) {
    super(options);
    this.sampleRate = sampleRate;   // global in AudioWorkletGlobalScope
    this.maxVoices = 8;
    this.voices = [];
    for (let i = 0; i < this.maxVoices; i++) {
      this.voices.push({
        active: false,
        phase: 0,
        currentFreq: 220,
        endFreq: 65,
        duration: 0.08,
        samplesRemaining: 0,
        totalSamples: 0,
        volume: 0.3,
        waveBlend: 0.35,
        filterCutoff: 1200,
        filterState1: 0,
        filterState2: 0,
      });
    }

    // 接收 main thread 的觸發訊息
    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'trigger') {
        this.triggerGooey(msg.startFreq || 220, msg.endFreq || 65, msg.duration || 0.08,
                          msg.volume || 0.3, msg.waveBlend || 0.35, msg.filterCutoff || 1200);
      }
    };
  }

  triggerGooey(startFreq, endFreq, duration, volume, waveBlend, filterCutoff) {
    // 找空閒 voice，沒有則覆蓋最舊的
    let slot = -1;
    for (let i = 0; i < this.maxVoices; i++) {
      if (!this.voices[i].active) { slot = i; break; }
    }
    if (slot < 0) slot = 0;   // voice stealing —— 簡化直接覆蓋 voice 0
    const v = this.voices[slot];
    v.active = true;
    v.phase = 0;
    v.currentFreq = startFreq;
    v.endFreq = endFreq;
    v.duration = duration;
    v.totalSamples = duration * this.sampleRate;
    v.samplesRemaining = v.totalSamples;
    v.volume = volume;
    v.waveBlend = waveBlend;
    v.filterCutoff = filterCutoff;
    v.filterState1 = 0;
    v.filterState2 = 0;
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const channels = output.length;
    const frameCount = output[0].length;
    const masterVol = parameters.masterVolume[0];

    // 每聲道清零
    for (let c = 0; c < channels; c++) {
      for (let i = 0; i < frameCount; i++) output[c][i] = 0;
    }

    // 每個 voice 計算 sample 並累加到所有聲道
    for (let vi = 0; vi < this.maxVoices; vi++) {
      const v = this.voices[vi];
      if (!v.active) continue;

      for (let i = 0; i < frameCount; i++) {
        if (!v.active) break;

        const progress = 1 - v.samplesRemaining / v.totalSamples;

        // 頻率指數滑降
        v.currentFreq += (v.endFreq - v.currentFreq) * 0.1;

        // 累積相位
        const phaseDelta = 2 * Math.PI * v.currentFreq / this.sampleRate;
        v.phase += phaseDelta;

        // Sine + Triangle 混合
        const sine = Math.sin(v.phase);
        const triangle = (2 / Math.PI) * Math.asin(Math.sin(v.phase));
        let raw = sine * (1 - v.waveBlend) + triangle * v.waveBlend;

        // Envelope: attack + exp decay
        let env;
        if (progress < 0.05) {
          env = progress / 0.05;
        } else {
          env = Math.exp(-(progress - 0.05) * 4);
        }
        raw *= env * v.volume * masterVol;

        // 一階低通濾波（二次）
        const dt = 1 / this.sampleRate;
        const rc = 1 / (2 * Math.PI * Math.max(50, v.filterCutoff));
        const alpha = dt / (rc + dt);
        v.filterState1 += alpha * (raw - v.filterState1);
        v.filterState2 += alpha * (v.filterState1 - v.filterState2);

        const sample = v.filterState2;

        // 寫入所有聲道
        for (let c = 0; c < channels; c++) {
          output[c][i] += sample;
        }

        v.samplesRemaining--;
        if (v.samplesRemaining <= 0) v.active = false;
      }
    }

    // Hard clip
    for (let c = 0; c < channels; c++) {
      const buf = output[c];
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] > 1) buf[i] = 1;
        else if (buf[i] < -1) buf[i] = -1;
      }
    }

    return true;
  }
}

registerProcessor('gooey-processor', GooeyProcessor);
