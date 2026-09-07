// ============================================================================
//  main.ts  —  應用程式入口
// ============================================================================

import { GameManager } from './core/GameManager';

const canvas = document.getElementById('glcanvas') as HTMLCanvasElement;
const paletteEl = document.getElementById('palette') as HTMLElement;

if (!canvas || !paletteEl) {
  throw new Error('Required DOM elements not found');
}

const game = new GameManager(canvas, paletteEl);

// 等待 DOM 載入完成 + 第一個使用者互動後啟動
const startGame = async () => {
  try {
    await game.start();
  } catch (e) {
    console.error('[main] Failed to start game:', e);
    const loader = document.getElementById('loader');
    if (loader) {
      loader.innerHTML = `<div style="color: #ff6666; padding: 2rem; text-align: center;">⚠️<br/>啟動失敗：${(e as Error).message}</div>`;
    }
  }
};

// PWA 註冊 Service Worker（vite-plugin-pwa 自動產生）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => {
      console.warn('[PWA] SW registration failed:', e);
    });
  });
}

// 立即啟動（音效與陀螺儀會在使用者互動後才初始化）
startGame();

// 防止 Pull-to-refresh / 雙指縮放
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

document.addEventListener('gesturestart', (e) => e.preventDefault());

// 防止 contextmenu (長按彈出選單)
document.addEventListener('contextmenu', (e) => e.preventDefault());
