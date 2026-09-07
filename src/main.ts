// ============================================================================
//  main.ts  —  應用程式入口
// ============================================================================

import { GameManager } from './core/GameManager';

// 全域錯誤捕獲 - 任何階段失敗都顯示
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.message, e.filename, e.lineno, e.error?.stack);
  const loader = document.getElementById('loader');
  if (loader) {
    loader.innerHTML = `<div style="color: #ff6666; padding: 2rem; text-align: center; font-family: monospace; font-size: 12px;">
      <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
      <div>啟動錯誤：${e.message}</div>
      <div style="margin-top: 0.5rem; color: #888; font-size: 10px;">${e.filename}:${e.lineno}</div>
      <pre style="margin-top: 1rem; color: #aaa; font-size: 10px; text-align: left; max-height: 200px; overflow: auto;">${e.error?.stack || ''}</pre>
    </div>`;
  }
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason);
  const loader = document.getElementById('loader');
  if (loader) {
    const msg = e.reason?.message || String(e.reason);
    loader.innerHTML = `<div style="color: #ff6666; padding: 2rem; text-align: center; font-family: monospace;">
      <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
      <div>Promise 拒絕：${msg}</div>
      <pre style="margin-top: 1rem; color: #aaa; font-size: 10px; text-align: left;">${e.reason?.stack || ''}</pre>
    </div>`;
  }
});

const startApp = () => {
  const canvas = document.getElementById('glcanvas') as HTMLCanvasElement;
  const paletteEl = document.getElementById('palette') as HTMLElement;

  if (!canvas || !paletteEl) {
    console.error('[main] Required DOM elements not found');
    const loader = document.getElementById('loader');
    if (loader) {
      loader.innerHTML = `<div style="color: #ff6666; padding: 2rem; text-align: center;">⚠️<br/>DOM 元素找不到<br/>canvas: ${!!canvas}, palette: ${!!paletteEl}</div>`;
    }
    return;
  }

  const game = new GameManager(canvas, paletteEl);
  game.start().catch((e) => {
    console.error('[main] start failed:', e);
    const loader = document.getElementById('loader');
    if (loader) {
      loader.innerHTML = `<div style="color: #ff6666; padding: 2rem; text-align: center; font-family: monospace;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
        <div>啟動失敗：${(e as Error).message}</div>
        <pre style="margin-top: 1rem; color: #aaa; font-size: 10px; text-align: left;">${(e as Error).stack || ''}</pre>
      </div>`;
    }
  });
};

// 等 DOM 載入完成再啟動
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}

// 防止 Pull-to-refresh / 雙指縮放
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart', (e) => e.preventDefault());

// 防止 contextmenu (長按彈出選單)
document.addEventListener('contextmenu', (e) => e.preventDefault());
