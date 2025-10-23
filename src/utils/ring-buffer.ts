/**
 * Ring buffer (circular buffer) implementation
 *
 * A ring buffer is a fixed-size buffer that overwrites the oldest data
 * when the buffer is full. It's particularly useful for streaming data
 * and maintaining a sliding window of recent values.
 */

export class RingBuf<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Ring buffer capacity must be greater than 0');
    }
    this.capacity = capacity;
    this.buffer = new Array<T>(capacity);
  }

  /**
   * Add an element to the buffer
   * If the buffer is full, the oldest element is overwritten
   */
  push(item: T): T | undefined {
    let evicted: T | undefined;

    if (this.size === this.capacity) {
      // Buffer is full, get the oldest element before overwriting
      evicted = this.buffer[this.head];
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      // Buffer was full, move head forward
      this.head = (this.head + 1) % this.capacity;
    }

    return evicted;
  }

  /**
   * Get the element at the specified index
   * Index 0 is the oldest element, index size-1 is the newest
   */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.size) {
      return undefined;
    }

    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex];
  }

  /**
   * Get the most recently added element
   */
  last(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }

    const lastIndex = (this.tail - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIndex];
  }

  /**
   * Get the oldest element in the buffer
   */
  first(): T | undefined {
    if (this.size === 0) {
      return undefined;
    }

    return this.buffer[this.head];
  }

  /**
   * Get all elements in chronological order (oldest to newest)
   */
  toArray(): T[] {
    if (this.size === 0) {
      return [];
    }

    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      result.push(this.get(i)!);
    }
    return result;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this.buffer.fill(undefined as any);
  }

  /**
   * Check if the buffer is empty
   */
  empty(): boolean {
    return this.size === 0;
  }

  len(): number {
    return this.size;
  }

  /**
   * Check if the buffer is full
   */
  full(): boolean {
    return this.size === this.capacity;
  }

  /**
   * Get the maximum capacity of the buffer
   */
  cap(): number {
    return this.capacity;
  }
}

export class StatsRingBuf extends RingBuf<number> {
  private _sum: number = 0;

  constructor(capacity: number) {
    super(capacity);
  }

  clear(): void {
    super.clear();
    this._sum = 0;
  }

  push(item: number): number | undefined {
    const evicted = super.push(item);
    this._sum += item;
    if (evicted !== undefined) {
      this._sum -= evicted;
    }
    return evicted;
  }

  sum(): number {
    return this._sum;
  }

  avg(): number {
    if (this.len() === 0) {
      return 0;
    }
    return this._sum / this.len();
  }
}
