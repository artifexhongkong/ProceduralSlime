// ============================================================================
//  MemoryPool.ts  —  預分配陣列池，避免每幀 GC
// ============================================================================
//  Web 端 Float32Array 比一般 Array 效能好，且 transferable 給 Worker 無成本。
//  此處實作輕量級 pool：每個型別一個 stack。
// ============================================================================

export class MemoryPool {
  private vec3Pool: Float32Array[] = [];
  private colorPool: Float32Array[] = [];
  private arraySize: number;
  private maxPoolSize: number;

  constructor(arraySize = 4096, maxPoolSize = 32) {
    this.arraySize = arraySize;
    this.maxPoolSize = maxPoolSize;
    // 預熱
    for (let i = 0; i < 4; i++) {
      this.vec3Pool.push(new Float32Array(this.arraySize));
      this.colorPool.push(new Float32Array(this.arraySize));
    }
  }

  rentVec3(): Float32Array {
    return this.vec3Pool.pop() ?? new Float32Array(this.arraySize);
  }
  rentColor(): Float32Array {
    return this.colorPool.pop() ?? new Float32Array(this.arraySize);
  }
  returnVec3(arr: Float32Array): void {
    if (arr.length !== this.arraySize) return;
    if (this.vec3Pool.length >= this.maxPoolSize) return;
    this.vec3Pool.push(arr);
  }
  returnColor(arr: Float32Array): void {
    if (arr.length !== this.arraySize) return;
    if (this.colorPool.length >= this.maxPoolSize) return;
    this.colorPool.push(arr);
  }

  get size(): number { return this.arraySize; }
}
