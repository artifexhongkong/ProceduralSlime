// ============================================================================
//  types.ts  —  共用型別定義
// ============================================================================

/** 遊戲狀態類型 —— 對應核心玩法循環 */
export enum GameStateType {
  Idle = 0,        // 放置靜置
  Touch = 1,       // 觸控擠壓
  Gyro = 2,        // 陀螺儀傾斜
  Paused = 3,      // 背景
}

/** 觸控事件參數 */
export interface TouchEvent {
  x: number;       // 螢幕座標 px
  y: number;
  force: number;   // 0~1
}

/** 觸控移動事件 */
export interface TouchMoveEvent extends TouchEvent {
  dx: number;
  dy: number;
  speed: number;   // px/s
}

/** 重力向量 (單位向量，G.x / G.y 範圍 -1..1) */
export interface GravityVector {
  x: number;
  y: number;
  magnitude: number;  // 平方值（避免 sqrt）
}

/** 色粉定義 */
export interface Pigment {
  color: [number, number, number];  // RGB 0..1
  name: string;
}

/** metaball 質點資料（傳給 shader）*/
export interface Metaball {
  x: number;       // UV 空間 0..1
  y: number;
  z: number;       // radius
  w: number;       // pressure 0..1
}

/** 記憶體池（避免 GC）*/
export interface IMemoryPool {
  rentVec3(): Float32Array;
  rentColor(): Float32Array;
  returnVec3(arr: Float32Array): void;
  returnColor(arr: Float32Array): void;
}
