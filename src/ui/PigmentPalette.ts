// ============================================================================
//  PigmentPalette.ts  —  色粉盤 UI
// ============================================================================

import { raisePigmentSelect, raisePigmentDrop } from '../core/GameEvents';

export interface PigmentDef {
  name: string;
  color: [number, number, number];   // 0..1
  hex: string;
}

export const DEFAULT_PALETTE: PigmentDef[] = [
  { name: '紅',     color: [1.0, 0.2, 0.2],   hex: '#ff3333' },
  { name: '藍',     color: [0.2, 0.4, 1.0],   hex: '#3366ff' },
  { name: '黃',     color: [1.0, 0.85, 0.1],  hex: '#ffd919' },
  { name: '螢光粉', color: [1.0, 0.2, 0.8],   hex: '#ff33cc' },
  { name: '螢光綠', color: [0.3, 1.0, 0.4],   hex: '#4dff66' },
  { name: '紫',     color: [0.8, 0.3, 1.0],   hex: '#cc4dff' },
  { name: '橙',     color: [1.0, 0.55, 0.0],  hex: '#ff8c00' },
  { name: '白',     color: [1.0, 1.0, 1.0],   hex: '#ffffff' },
];

export class PigmentPalette {
  private el: HTMLElement;
  private buttons: HTMLButtonElement[] = [];
  private selectedIndex = 0;

  constructor(el: HTMLElement, palette: PigmentDef[] = DEFAULT_PALETTE) {
    this.el = el;
    this.build(palette);
  }

  private build(palette: PigmentDef[]): void {
    this.el.innerHTML = '';
    this.buttons = [];
    palette.forEach((p, i) => {
      const btn = document.createElement('button');
      btn.className = 'palette-btn';
      btn.style.background = p.hex;
      btn.title = p.name;
      btn.setAttribute('aria-label', `色粉：${p.name}`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.select(i);
      });
      this.el.appendChild(btn);
      this.buttons.push(btn);
    });
    this.select(0);
  }

  select(idx: number): void {
    if (idx < 0 || idx >= this.buttons.length) return;
    this.selectedIndex = idx;
    this.buttons.forEach((b, i) => b.classList.toggle('selected', i === idx));
    raisePigmentSelect(idx);
  }

  get currentColor(): [number, number, number] {
    return DEFAULT_PALETTE[this.selectedIndex].color;
  }

  dropAt(screenX: number, screenY: number): void {
    const c = this.currentColor;
    raisePigmentDrop(c, screenX, screenY);
  }
}
