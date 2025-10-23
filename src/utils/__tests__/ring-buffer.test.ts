import { RingBuf, StatsRingBuf } from '../ring-buffer';

describe('RingBuf', () => {
  let buffer: RingBuf<number>;

  beforeEach(() => {
    buffer = new RingBuf<number>(3);
  });

  describe('constructor', () => {
    it('should create a buffer with specified capacity', () => {
      const buf = new RingBuf<number>(5);
      expect(buf.cap()).toBe(5);
      expect(buf.len()).toBe(0);
      expect(buf.empty()).toBe(true);
      expect(buf.full()).toBe(false);
    });

    it('should throw error for invalid capacity', () => {
      expect(() => new RingBuf<number>(0)).toThrow('Ring buffer capacity must be greater than 0');
      expect(() => new RingBuf<number>(-1)).toThrow('Ring buffer capacity must be greater than 0');
    });
  });

  describe('push', () => {
    it('should add elements to buffer', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.len()).toBe(3);
      expect(buffer.full()).toBe(true);
      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should overwrite oldest element when full', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      const evicted = buffer.push(4); // Should overwrite 1
      expect(buffer.len()).toBe(3);
      expect(evicted).toBe(1);
      expect(buffer.toArray()).toEqual([2, 3, 4]);
    });

    it('should handle multiple overwrites', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      const evicted1 = buffer.push(4); // Should overwrite 1
      expect(evicted1).toBe(1);
      const evicted2 = buffer.push(5); // Should overwrite 2
      expect(evicted2).toBe(2);
      expect(buffer.toArray()).toEqual([3, 4, 5]);
    });

    it('should return undefined when buffer not full', () => {
      const evicted1 = buffer.push(1);
      const evicted2 = buffer.push(2);
      expect(evicted1).toBeUndefined();
      expect(evicted2).toBeUndefined();
    });
  });

  describe('get', () => {
    it('should get elements by index', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.get(0)).toBe(1);
      expect(buffer.get(1)).toBe(2);
      expect(buffer.get(2)).toBe(3);
    });

    it('should return undefined for invalid index', () => {
      buffer.push(1);
      expect(buffer.get(-1)).toBeUndefined();
      expect(buffer.get(1)).toBeUndefined();
    });

    it('should work after overwrites', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      expect(buffer.get(0)).toBe(2);
      expect(buffer.get(1)).toBe(3);
      expect(buffer.get(2)).toBe(4);
    });
  });

  describe('first and last', () => {
    it('should get first and last elements', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.first()).toBe(1);
      expect(buffer.last()).toBe(3);
    });

    it('should return undefined for empty buffer', () => {
      expect(buffer.first()).toBeUndefined();
      expect(buffer.last()).toBeUndefined();
    });

    it('should work after overwrites', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      expect(buffer.first()).toBe(2);
      expect(buffer.last()).toBe(4);
    });
  });

  describe('toArray', () => {
    it('should return empty array for empty buffer', () => {
      expect(buffer.toArray()).toEqual([]);
    });

    it('should return all elements in order', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      expect(buffer.toArray()).toEqual([1, 2, 3]);
    });

    it('should maintain order after overwrites', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.toArray()).toEqual([3, 4, 5]);
    });
  });

  describe('clear', () => {
    it('should clear the buffer', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.clear();
      expect(buffer.empty()).toBe(true);
      expect(buffer.len()).toBe(0);
      expect(buffer.toArray()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle single element buffer', () => {
      const singleBuf = new RingBuf<number>(1);
      singleBuf.push(1);
      expect(singleBuf.toArray()).toEqual([1]);
      singleBuf.push(2);
      expect(singleBuf.toArray()).toEqual([2]);
    });

    it('should work with different data types', () => {
      const stringBuf = new RingBuf<string>(2);
      stringBuf.push('hello');
      stringBuf.push('world');
      stringBuf.push('!');
      expect(stringBuf.toArray()).toEqual(['world', '!']);
    });
  });
});

describe('StatsRingBuf', () => {
  let buffer: StatsRingBuf;

  beforeEach(() => {
    buffer = new StatsRingBuf(5);
  });

  describe('constructor', () => {
    it('should create a stats buffer with specified capacity', () => {
      const buf = new StatsRingBuf(3);
      expect(buf.cap()).toBe(3);
      expect(buf.len()).toBe(0);
      expect(buf.empty()).toBe(true);
      expect(buf.full()).toBe(false);
      expect(buf.sum()).toBe(0);
      expect(buf.avg()).toBe(0);
    });

    it('should throw error for invalid capacity', () => {
      expect(() => new StatsRingBuf(0)).toThrow('Ring buffer capacity must be greater than 0');
      expect(() => new StatsRingBuf(-1)).toThrow('Ring buffer capacity must be greater than 0');
    });
  });

  describe('push', () => {
    it('should add elements and update sum', () => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      expect(buffer.len()).toBe(3);
      expect(buffer.sum()).toBe(60);
      expect(buffer.avg()).toBe(20);
    });

    it('should handle evicted elements correctly', () => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      buffer.push(40);
      buffer.push(50);
      expect(buffer.len()).toBe(5);
      expect(buffer.sum()).toBe(150);
      expect(buffer.avg()).toBe(30);

      // Push one more to trigger eviction
      const evicted = buffer.push(60); // Should evict 10
      expect(evicted).toBe(10);
      expect(buffer.len()).toBe(5);
      expect(buffer.sum()).toBe(200); // 150 - 10 + 60 = 200
      expect(buffer.avg()).toBe(40);
    });

    it('should return undefined when buffer not full', () => {
      const evicted = buffer.push(100);
      expect(evicted).toBeUndefined();
      expect(buffer.sum()).toBe(100);
      expect(buffer.avg()).toBe(100);
    });
  });

  describe('sum', () => {
    it('should return correct sum for multiple elements', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.sum()).toBe(15);
    });

    it('should return 0 for empty buffer', () => {
      expect(buffer.sum()).toBe(0);
    });

    it('should handle negative numbers', () => {
      buffer.push(-5);
      buffer.push(10);
      buffer.push(-3);
      expect(buffer.sum()).toBe(2);
    });

    it('should update sum correctly after overwrites', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      buffer.push(5);
      expect(buffer.sum()).toBe(15);

      buffer.push(10); // Evicts 1
      expect(buffer.sum()).toBe(24); // 15 - 1 + 10 = 24

      buffer.push(20); // Evicts 2
      expect(buffer.sum()).toBe(42); // 24 - 2 + 20 = 42
    });
  });

  describe('avg', () => {
    it('should return correct average for multiple elements', () => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      expect(buffer.avg()).toBe(20);
    });

    it('should return 0 for empty buffer', () => {
      expect(buffer.avg()).toBe(0);
    });

    it('should handle decimal averages', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(4);
      expect(buffer.avg()).toBe(7 / 3);
    });

    it('should update average correctly after overwrites', () => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      expect(buffer.avg()).toBe(20);

      buffer.push(40); // Array: [10,20,30,40], avg = 25
      expect(buffer.avg()).toBe(25);

      buffer.push(50); // Array: [10,20,30,40,50], avg = 30
      expect(buffer.avg()).toBe(30);

      // Now test with overwrites
      buffer.push(60); // Evicts 10, leaving [20,30,40,50,60], avg = 40
      expect(buffer.avg()).toBe(40);

      buffer.push(70); // Evicts 20, leaving [30,40,50,60,70], avg = 50
      expect(buffer.avg()).toBe(50);
    });
  });

  describe('inheritance', () => {
    it('should inherit all RingBuf methods', () => {
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.first()).toBe(1);
      expect(buffer.last()).toBe(3);
      expect(buffer.get(1)).toBe(2);
      expect(buffer.toArray()).toEqual([1, 2, 3]);
      expect(buffer.len()).toBe(3);
      expect(buffer.cap()).toBe(5);
      expect(buffer.empty()).toBe(false);
      expect(buffer.full()).toBe(false);
    });

    it('should clear both data and statistics', () => {
      buffer.push(10);
      buffer.push(20);
      buffer.push(30);
      expect(buffer.sum()).toBe(60);
      expect(buffer.avg()).toBe(20);

      buffer.clear();
      expect(buffer.empty()).toBe(true);
      expect(buffer.sum()).toBe(0);
      expect(buffer.avg()).toBe(0);
    });
  });

  describe('use case: moving average calculations', () => {
    it('should efficiently calculate moving averages', () => {
      const prices = [100, 102, 101, 103, 104, 105, 106, 107];
      const movingAverages: number[] = [];

      prices.forEach(price => {
        buffer.push(price);
        if (buffer.full()) {
          movingAverages.push(buffer.avg());
        }
      });

      expect(buffer.toArray()).toEqual([103, 104, 105, 106, 107]);
      expect(buffer.avg()).toBe(105);
      expect(movingAverages).toEqual([102, 103, 103.8, 105]);
    });

    it('should handle price volatility calculations', () => {
      const volatilePrices = [100, 110, 95, 105, 120, 90, 115, 100];

      volatilePrices.forEach(price => {
        buffer.push(price);
      });

      expect(buffer.toArray()).toEqual([105, 120, 90, 115, 100]);
      expect(buffer.sum()).toBe(530);
      expect(buffer.avg()).toBe(106);
    });
  });
});
