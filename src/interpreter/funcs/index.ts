/*
 * Defined functions for a technical analysis interpreter.
 * NOTE: the state in ExecCtx is persistent across function calls.
 * and it is independent per function call.
 */

import { ExecFunc, CallFuncCtx } from '../../utils';
import { RingBuf, StatsRingBuf } from '../../utils/ring-buffer';
import typia from 'typia';

type Nullable<T> = T | null;

const registry = new Map<string, ExecFunc>();
const identity = <T>(x: T): T => x;
const opts = {
  validateInput: typia.createAssert<number[]>(),
};

function F<I = any[], O = number | null>(
  name: string,
  func: (args: I, context: CallFuncCtx) => O,
  options?: { validateInput: (input: I) => I; alias?: string[] }
): ExecFunc {
  // Skip registration if function already exists (handles test environment)
  if (registry.has(name)) {
    return registry.get(name)!;
  }
  if (options?.alias?.some(alias => registry.has(alias))) {
    throw new Error(`One of the aliases for function ${name} is already registered.`);
  }

  const validateInput = options?.validateInput ?? identity;
  const ret = {
    name,
    execute: (args: I, context: CallFuncCtx) => {
      return func(validateInput(args), context);
    },
  };
  registry.set(name, ret);
  options?.alias?.forEach(alias => registry.set(alias, ret));
  return ret;
}

// === Helper Functions ===

function useRingBuf<T>(context: CallFuncCtx, period: number, key: string): RingBuf<T> {
  if (!context.state[key]) {
    context.state[key] = new RingBuf<T>(period);
  }
  return context.state[key] as RingBuf<T>;
}

function useStatsRingBuf(context: CallFuncCtx, period: number, key: string): StatsRingBuf {
  if (!context.state[key]) {
    context.state[key] = new StatsRingBuf(period);
  }
  return context.state[key] as StatsRingBuf;
}

function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

// === Basic Functions (from original functions.ts) ===

F<[number, number]>(
  'MA',
  (args, context) => {
    const data = args[0];
    const period = args[1];
    const buffer = useStatsRingBuf(context, period, 'maBuffer');
    buffer.push(data);
    if (!buffer.full()) {
      return null;
    }
    return buffer.avg();
  },
  {
    validateInput: typia.createAssert<[number, number]>(),
    alias: ['SMA'],
  }
);

type CrossArg = [Nullable<number>, Nullable<number>];
F<CrossArg>(
  'CROSS',
  (args, ctx) => {
    const [a, b] = args;
    if (a === null || b === null) return null;

    const s = a - b;
    const prevS = ctx.state?.prevCross as number;

    let ret = null;
    if (!isNullOrUndefined(prevS)) {
      if (prevS < 0 && s > 0) ret = 1; // Golden cross
    }
    ctx.state.prevCross = s;
    return ret;
  },
  {
    validateInput: typia.createAssert<CrossArg>(),
  }
);

F<CrossArg>(
  'CROSSDOWN',
  (args, ctx) => {
    const [a, b] = args;
    if (a === null || b === null) return null;

    const s = a - b;
    const prevS = ctx.state?.prevCross as number;

    let ret = null;
    if (!isNullOrUndefined(prevS)) {
      if (prevS > 0 && s < 0) ret = 1; // Golden cross
    }
    ctx.state.prevCross = s;
    return ret;
  },
  {
    validateInput: typia.createAssert<CrossArg>(),
  }
);

F<[any, any, any]>(
  'IFELSE',
  args => {
    const [cond, trueVal, falseVal] = args;
    return cond ? trueVal : falseVal;
  },
  {
    validateInput: typia.createAssert<[any, any, any]>(),
    alias: ['IFF'],
  }
);

F('PRINT', (args, context) => context.log(...args));
F('MAX', args => Math.max(...args), opts);
F('MIN', args => Math.min(...args), opts);
F('SUM', args => args.reduce((acc, val) => acc + val, 0), opts);

F<[Nullable<number>, number]>(
  'REF',
  (args, context) => {
    const data = args[0];
    const period = args[1];

    const buffer = useRingBuf<Nullable<number>>(context, period, 'refBuffer');
    const ret = buffer.get(buffer.len() - period) ?? null;
    // Add new data point to buffer
    buffer.push(data);
    // Return null if we don't have enough data yet
    if (!buffer.full()) {
      return null;
    }
    return ret;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// === Financial Statistical Functions ===

// BACKSET(X,N): If X condition is true, set values from current position to N periods back to 1
F<[Nullable<number>, number]>(
  'BACKSET',
  (args, context) => {
    const [condition, n] = args;
    const key = `backset_${n}`;

    if (!context.state[key]) {
      context.state[key] = new RingBuf<number>(n + 1);
    }
    const buffer = context.state[key] as RingBuf<number>;

    // Push current condition (0 or 1)
    buffer.push(condition ? 1 : 0);

    // If condition is true, set the last N periods to 1 (going backward)
    if (condition) {
      const startIdx = Math.max(0, buffer.len() - n - 1);
      const endIdx = buffer.len() - 1;
      for (let i = startIdx; i <= endIdx; i++) {
        buffer.set(i, 1);
      }
    }

    return buffer.get(buffer.len() - 1) ?? 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// BARSLAST(X): Find the number of periods since the last time X was true
F<[Nullable<number>]>(
  'BARSLAST',
  (args, context) => {
    const [condition] = args;
    const key = 'barslast_state';

    if (!context.state[key]) {
      context.state[key] = { lastTrueBar: -1, currentBar: 0 };
    }

    const state = context.state[key] as { lastTrueBar: number; currentBar: number };

    // Increment current bar counter
    state.currentBar++;

    if (condition) {
      state.lastTrueBar = state.currentBar;
      return 0; // 0 periods since last true
    }

    // If we've never had a true condition, return null
    if (state.lastTrueBar === -1) {
      return null;
    }

    // Return periods since last true condition
    return state.currentBar - state.lastTrueBar;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// COUNT(X,N): Count the number of periods where X is true in the last N periods
F<[Nullable<number>, number]>(
  'COUNT',
  (args, context) => {
    const [condition, n] = args;

    const buffer = useRingBuf<number>(context, n, 'countBuffer');
    buffer.push(condition ? 1 : 0);

    if (!buffer.full() && n > 0) {
      return null;
    }

    let count = 0;
    for (let i = 0; i < buffer.len(); i++) {
      count += buffer.get(i) ?? 0;
    }

    return count;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// DMA(X,A): Dynamic moving average with smoothing factor A
F<[Nullable<number>, number]>(
  'DMA',
  (args, context) => {
    const [x, a] = args;

    if (x === null) return null;
    if (a <= 0 || a >= 1) return null;

    if (!context.state.dmaValue) {
      context.state.dmaValue = x; // Initialize with first value
      return x;
    }

    const prevDMA = context.state.dmaValue as number;
    const currentDMA = prevDMA * (1 - a) + x * a;
    context.state.dmaValue = currentDMA;

    return currentDMA;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// EMA(X,N): Exponential moving average
F<[Nullable<number>, number]>(
  'EMA',
  (args, context) => {
    const [x, n] = args;

    if (x === null) return null;
    if (n <= 0) return null;

    if (!context.state.emaState) {
      context.state.emaState = { ema: x, count: 1 };
      return x;
    }

    const state = context.state.emaState as { ema: number; count: number };
    const multiplier = 2 / (n + 1);
    const newEMA = (x - state.ema) * multiplier + state.ema;

    state.ema = newEMA;
    state.count++;

    return newEMA;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// EMA2(X,N): Linear weighted moving average
F<[Nullable<number>, number]>(
  'EMA2',
  (args, context) => {
    const [x, n] = args;
    const key = `ema2_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < n; i++) {
      const weight = n - i;
      const value = buffer.get(i) ?? 0;
      weightedSum += weight * value;
      weightSum += weight;
    }

    return weightedSum / weightSum;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// HHV(X,N): Highest value in N periods
F<[Nullable<number>, number]>(
  'HHV',
  (args, context) => {
    const [x, n] = args;
    const key = `hhv_${n}`;

    if (x === null) return null;

    const buffer = useRingBuf<number>(context, n === 0 ? 1000 : n, key);
    buffer.push(x);

    if (buffer.len() === 0) return null;

    let max = buffer.get(0) ?? 0;
    for (let i = 1; i < buffer.len(); i++) {
      const val = buffer.get(i);
      if (val !== null && val !== undefined && val > max) {
        max = val;
      }
    }

    return max;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// HHVBARS(X,N): Bars since highest value in N periods
F<[Nullable<number>, number]>(
  'HHVBARS',
  (args, context) => {
    const [x, n] = args;
    const key = `hhvbars_${n}`;

    if (x === null) return null;

    const buffer = useRingBuf<number>(context, n === 0 ? 1000 : n, key);
    buffer.push(x);

    if (buffer.len() === 0) return null;

    let max = buffer.get(0) ?? 0;
    let maxIndex = 0;

    for (let i = 1; i < buffer.len(); i++) {
      const val = buffer.get(i);
      if (val !== null && val !== undefined && val > max) {
        max = val;
        maxIndex = i;
      }
    }

    return buffer.len() - 1 - maxIndex;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// LLV(X,N): Lowest value in N periods
F<[Nullable<number>, number]>(
  'LLV',
  (args, context) => {
    const [x, n] = args;
    const key = `llv_${n}`;

    if (x === null) return null;

    const buffer = useRingBuf<number>(context, n === 0 ? 1000 : n, key);
    buffer.push(x);

    if (buffer.len() === 0) return null;

    let min = buffer.get(0) ?? 0;
    for (let i = 1; i < buffer.len(); i++) {
      const val = buffer.get(i);
      if (val !== null && val !== undefined && val < min) {
        min = val;
      }
    }

    return min;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// LLVBARS(X,N): Bars since lowest value in N periods
F<[Nullable<number>, number]>(
  'LLVBARS',
  (args, context) => {
    const [x, n] = args;
    const key = `llvbars_${n}`;

    if (x === null) return null;

    const buffer = useRingBuf<number>(context, n === 0 ? 1000 : n, key);
    buffer.push(x);

    if (buffer.len() === 0) return null;

    let min = buffer.get(0) ?? 0;
    let minIndex = 0;

    for (let i = 1; i < buffer.len(); i++) {
      const val = buffer.get(i);
      if (val !== null && val !== undefined && val < min) {
        min = val;
        minIndex = i;
      }
    }

    return buffer.len() - 1 - minIndex;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// SAR(N,Step,Max): Parabolic Stop and Reverse
F<[number, number, number]>(
  'SAR',
  (args, context) => {
    const [n, step, maxStep] = args;
    const key = `sar_${n}_${step}_${maxStep}`;

    // Get market data for proper SAR calculation
    const high = context.marketData?.H;
    const low = context.marketData?.L;
    const close = context.marketData?.C;

    if (!context.state[key]) {
      context.state[key] = {
        sar: 0,
        ep: 0,
        af: step,
        trend: 1, // 1 for up, -1 for down
        prevHigh: high || 0,
        prevLow: low || 0,
        initialized: false,
      };
    }

    const state = context.state[key] as {
      sar: number;
      ep: number;
      af: number;
      trend: number;
      prevHigh: number;
      prevLow: number;
      initialized: boolean;
    };

    // Need high/low data for proper SAR calculation
    if (high === undefined || low === undefined) {
      return state.sar || close || 0;
    }

    if (!state.initialized) {
      // Initialize SAR
      if (state.trend === 1) {
        state.sar = low; // Start SAR at lowest low for uptrend
        state.ep = high; // Extreme point at highest high
      } else {
        state.sar = high; // Start SAR at highest high for downtrend
        state.ep = low; // Extreme point at lowest low
      }
      state.initialized = true;
      state.prevHigh = high;
      state.prevLow = low;
      return state.sar;
    }

    // Update extreme point and acceleration factor
    if (state.trend === 1) {
      // Uptrend
      if (high > state.ep) {
        state.ep = high;
        state.af = Math.min(state.af + step, maxStep);
      }
      // Update SAR for uptrend
      const newSar = state.sar + state.af * (state.ep - state.sar);

      // Check for trend reversal
      if (newSar > low) {
        // Trend reversal to downtrend
        state.trend = -1;
        state.sar = state.ep; // Set SAR to highest high
        state.ep = low; // New extreme point at lowest low
        state.af = step; // Reset acceleration factor
      } else {
        state.sar = newSar;
      }
    } else {
      // Downtrend
      if (low < state.ep) {
        state.ep = low;
        state.af = Math.min(state.af + step, maxStep);
      }
      // Update SAR for downtrend
      const newSar = state.sar + state.af * (state.ep - state.sar);

      // Check for trend reversal
      if (newSar < high) {
        // Trend reversal to uptrend
        state.trend = 1;
        state.sar = state.ep; // Set SAR to lowest low
        state.ep = high; // New extreme point at highest high
        state.af = step; // Reset acceleration factor
      } else {
        state.sar = newSar;
      }
    }

    state.prevHigh = high;
    state.prevLow = low;
    return state.sar;
  },
  {
    validateInput: typia.createAssert<[number, number, number]>(),
  }
);

// SMA(X,N,M): Smoothed moving average with weight M
F<[Nullable<number>, number, number]>(
  'SMA',
  (args, context) => {
    const [x, n, m] = args;
    const key = `sma_${n}_${m}`;

    if (x === null) return null;
    if (n <= 0 || m <= 0 || m > n) return null;

    if (!context.state[key]) {
      context.state[key] = x;
      return x;
    }

    const prevSMA = context.state[key] as number;
    const currentSMA = (prevSMA * (n - m)) / n + (x * m) / n;
    context.state[key] = currentSMA;

    return currentSMA;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number, number]>(),
  }
);

// SUM(X,N): Sum of X over N periods
F<[Nullable<number>, number]>(
  'SUM',
  (args, context) => {
    const [x, n] = args;
    const key = `sum_${n}`;

    if (x === null) return null;

    const buffer = useRingBuf<number>(context, n === 0 ? 1000 : n, key);
    buffer.push(x);

    if (n > 0 && !buffer.full()) {
      return null;
    }

    let sum = 0;
    for (let i = 0; i < buffer.len(); i++) {
      sum += buffer.get(i) ?? 0;
    }

    return sum;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// TRMA(X,N): Triangular moving average
F<[Nullable<number>, number]>(
  'TRMA',
  (args, context) => {
    const [x, n] = args;
    const key = `trma_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Simple triangular moving average implementation
    let sum = 0;
    let weightSum = 0;

    for (let i = 0; i < n; i++) {
      const weight = Math.min(i + 1, n - i);
      sum += (buffer.get(i) ?? 0) * weight;
      weightSum += weight;
    }

    return sum / weightSum;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// TSMA(X,N): Time series moving average
F<[Nullable<number>, number]>(
  'TSMA',
  (args, context) => {
    const [x, n] = args;

    if (x === null) return null;
    if (n <= 0) return null;

    // TSMA = FORCAST(X,N) + SLOPE(X,N)
    // This is a simplified implementation

    const key = `tsma_${n}`;
    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Simple linear regression prediction
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const y = buffer.get(i) ?? 0;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next value and add slope
    const forecast = slope * n + intercept;
    return forecast + slope;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// === Mathematical Statistical Functions ===

// AVEDEV(X,N): Average absolute deviation
F<[Nullable<number>, number]>(
  'AVEDEV',
  (args, context) => {
    const [x, n] = args;
    const key = `avedev_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate mean
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += buffer.get(i) ?? 0;
    }
    const mean = sum / n;

    // Calculate average absolute deviation
    let absDevSum = 0;
    for (let i = 0; i < n; i++) {
      absDevSum += Math.abs((buffer.get(i) ?? 0) - mean);
    }

    return absDevSum / n;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// DEVSQ(X,N): Sum of squared deviations
F<[Nullable<number>, number]>(
  'DEVSQ',
  (args, context) => {
    const [x, n] = args;
    const key = `devsq_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate mean
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += buffer.get(i) ?? 0;
    }
    const mean = sum / n;

    // Calculate sum of squared deviations
    let devSqSum = 0;
    for (let i = 0; i < n; i++) {
      const dev = (buffer.get(i) ?? 0) - mean;
      devSqSum += dev * dev;
    }

    return devSqSum;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// FORCAST(X,N): Linear regression forecast
F<[Nullable<number>, number]>(
  'FORCAST',
  (args, context) => {
    const [x, n] = args;
    const key = `forcast_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate linear regression coefficients
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const y = buffer.get(i) ?? 0;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / n;

    // Forecast next value (at position n)
    return slope * n + intercept;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// VAR(X,N): Sample variance
F<[Nullable<number>, number]>(
  'VAR',
  (args, context) => {
    const [x, n] = args;
    const key = `var_${n}`;

    if (x === null) return null;
    if (n <= 1) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate mean
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += buffer.get(i) ?? 0;
    }
    const mean = sum / n;

    // Calculate sample variance
    let devSqSum = 0;
    for (let i = 0; i < n; i++) {
      const dev = (buffer.get(i) ?? 0) - mean;
      devSqSum += dev * dev;
    }

    return devSqSum / (n - 1);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// VARP(X,N): Population variance
F<[Nullable<number>, number]>(
  'VARP',
  (args, context) => {
    const [x, n] = args;
    const key = `varp_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate mean
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += buffer.get(i) ?? 0;
    }
    const mean = sum / n;

    // Calculate population variance
    let devSqSum = 0;
    for (let i = 0; i < n; i++) {
      const dev = (buffer.get(i) ?? 0) - mean;
      devSqSum += dev * dev;
    }

    return devSqSum / n;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// SLOPE(X,N): Linear regression slope
F<[Nullable<number>, number]>(
  'SLOPE',
  (args, context) => {
    const [x, n] = args;
    const key = `slope_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate linear regression slope
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const y = buffer.get(i) ?? 0;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return null;

    return (n * sumXY - sumX * sumY) / denominator;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// STD(X,N): Sample standard deviation
F<[Nullable<number>, number]>(
  'STD',
  (args, context) => {
    const [x, n] = args;
    const key = `std_${n}`;

    if (x === null) return null;
    if (n <= 1) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate mean
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += buffer.get(i) ?? 0;
    }
    const mean = sum / n;

    // Calculate sample variance
    let devSqSum = 0;
    for (let i = 0; i < n; i++) {
      const dev = (buffer.get(i) ?? 0) - mean;
      devSqSum += dev * dev;
    }

    const variance = devSqSum / (n - 1);
    return Math.sqrt(variance);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// STDP(X,N): Population standard deviation
F<[Nullable<number>, number]>(
  'STDP',
  (args, context) => {
    const [x, n] = args;
    const key = `stdp_${n}`;

    if (x === null) return null;
    if (n <= 0) return null;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(x);

    if (!buffer.full()) {
      return null;
    }

    // Calculate mean
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += buffer.get(i) ?? 0;
    }
    const mean = sum / n;

    // Calculate population variance
    let devSqSum = 0;
    for (let i = 0; i < n; i++) {
      const dev = (buffer.get(i) ?? 0) - mean;
      devSqSum += dev * dev;
    }

    const variance = devSqSum / n;
    return Math.sqrt(variance);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// === Logical Functions ===

// BETWEEN(A,B,C): Returns 1 if A is between B and C, 0 otherwise
F<[Nullable<number>, Nullable<number>, Nullable<number>]>(
  'BETWEEN',
  args => {
    const [a, b, c] = args;

    if (a === null || b === null || c === null) return 0;

    const min = Math.min(b, c);
    const max = Math.max(b, c);

    return a >= min && a <= max ? 1 : 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>, Nullable<number>]>(),
  }
);

// CROSS(X,Y): Returns 1 if X crosses above Y, 0 otherwise
F<[Nullable<number>, Nullable<number>]>(
  'CROSS',
  (args, context) => {
    const [x, y] = args;
    const key = 'cross_state';

    if (x === null || y === null) return null;

    if (!context.state[key]) {
      context.state[key] = { prevX: x, prevY: y };
      return 0;
    }

    const state = context.state[key] as { prevX: number; prevY: number };
    const prevX = state.prevX;
    const prevY = state.prevY;

    // Check for cross: previous X <= previous Y and current X > current Y
    const cross = prevX <= prevY && x > y ? 1 : 0;

    // Update state
    state.prevX = x;
    state.prevY = y;

    return cross;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>]>(),
  }
);

// FILTER(COND,N): Filters consecutive signals, returns 1 only if COND is true and no signal in last N periods
F<[Nullable<number>, number]>(
  'FILTER',
  (args, context) => {
    const [cond, n] = args;
    const key = `filter_${n}`;

    if (cond === null) return 0;

    if (!context.state[key]) {
      context.state[key] = { lastSignal: -Infinity };
    }

    const state = context.state[key] as { lastSignal: number };
    const currentBar = context.state.barPos || 0;

    // Check if condition is true and enough time has passed since last signal
    if (cond && currentBar - state.lastSignal > n) {
      state.lastSignal = currentBar;
      return 1;
    }

    return 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// EXIST(COND,N): Returns 1 if COND was true at least once in the last N periods
F<[Nullable<number>, number]>(
  'EXIST',
  (args, context) => {
    const [cond, n] = args;
    const key = `exist_${n}`;

    if (cond === null) return 0;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(cond ? 1 : 0);

    if (!buffer.full() && n > 0) {
      return 0;
    }

    // Check if any condition was true in the buffer
    for (let i = 0; i < buffer.len(); i++) {
      if ((buffer.get(i) ?? 0) === 1) {
        return 1;
      }
    }

    return 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// EVERY(COND,N): Returns 1 if COND was true for all of the last N periods
F<[Nullable<number>, number]>(
  'EVERY',
  (args, context) => {
    const [cond, n] = args;
    const key = `every_${n}`;

    if (cond === null) return 0;

    const buffer = useRingBuf<number>(context, n, key);
    buffer.push(cond ? 1 : 0);

    if (!buffer.full() && n > 0) {
      return 0;
    }

    // Check if all conditions were true in the buffer
    for (let i = 0; i < buffer.len(); i++) {
      if ((buffer.get(i) ?? 0) === 0) {
        return 0;
      }
    }

    return 1;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number]>(),
  }
);

// LAST(COND,N1,N2): Returns 1 if COND was true continuously from N1 to N2 periods ago
F<[Nullable<number>, number, number]>(
  'LAST',
  (args, context) => {
    const [cond, n1, n2] = args;
    const key = `last_${n1}_${n2}`;

    if (cond === null) return 0;
    if (n1 < n2) return 0;

    const buffer = useRingBuf<number>(context, Math.max(n1, n2), key);
    buffer.push(cond ? 1 : 0);

    if (!buffer.full() && (n1 > 0 || n2 > 0)) {
      return 0;
    }

    // Check if condition was true from n1 to n2 periods ago
    for (let i = n2; i <= n1 && i < buffer.len(); i++) {
      if ((buffer.get(buffer.len() - 1 - i) ?? 0) === 0) {
        return 0;
      }
    }

    return 1;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, number, number]>(),
  }
);

// LONGCROSS(A,B,N): Returns 1 if A was below B for N periods and now crosses above B
F<[Nullable<number>, Nullable<number>, number]>(
  'LONGCROSS',
  (args, context) => {
    const [a, b, n] = args;
    const key = `longcross_${n}`;

    if (a === null || b === null) return 0;

    const buffer = useRingBuf<number>(context, n + 1, key);
    buffer.push(a < b ? 1 : 0);

    if (!buffer.full()) {
      return 0;
    }

    // Check if A was below B for the first N periods
    let wasBelow = true;
    for (let i = 0; i < n; i++) {
      if ((buffer.get(i) ?? 0) === 0) {
        wasBelow = false;
        break;
      }
    }

    // Check if A is now above B
    const nowAbove = (buffer.get(n) ?? 0) === 0;

    return wasBelow && nowAbove ? 1 : 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>, number]>(),
  }
);

// ISDOWN: Returns 1 if current bar is down (close < open)
F('ISDOWN', (args, context) => {
  const close = context.marketData?.C;
  const open = context.marketData?.O;

  if (close === undefined || open === undefined) return 0;

  return close < open ? 1 : 0;
});

// ISEQUAL: Returns 1 if current bar is flat (close = open)
F('ISEQUAL', (args, context) => {
  const close = context.marketData?.C;
  const open = context.marketData?.O;

  if (close === undefined || open === undefined) return 0;

  return close === open ? 1 : 0;
});

// ISUP: Returns 1 if current bar is up (close > open)
F('ISUP', (args, context) => {
  const close = context.marketData?.C;
  const open = context.marketData?.O;

  if (close === undefined || open === undefined) return 0;

  return close > open ? 1 : 0;
});

// VALUEWHEN(COND,DATA): Returns DATA value when COND was last true
F<[Nullable<number>, Nullable<number>]>(
  'VALUEWHEN',
  (args, context) => {
    const [cond, data] = args;
    const key = 'valuewhen_state';

    if (cond === null || data === null) return null;

    if (!context.state[key]) {
      context.state[key] = { lastValue: null };
    }

    const state = context.state[key] as { lastValue: Nullable<number> };

    if (cond) {
      state.lastValue = data;
    }

    return state.lastValue;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>]>(),
  }
);

// === Mathematical Functions ===

// ABS(X): Absolute value
F<[Nullable<number>]>(
  'ABS',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.abs(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// ACOS(X): Arc cosine
F<[Nullable<number>]>(
  'ACOS',
  args => {
    const [x] = args;
    if (x === null) return null;
    if (x < -1 || x > 1) return null;
    return Math.acos(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// ASIN(X): Arc sine
F<[Nullable<number>]>(
  'ASIN',
  args => {
    const [x] = args;
    if (x === null) return null;
    if (x < -1 || x > 1) return null;
    return Math.asin(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// ATAN(X): Arc tangent
F<[Nullable<number>]>(
  'ATAN',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.atan(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// COS(X): Cosine
F<[Nullable<number>]>(
  'COS',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.cos(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// EXP(X): Exponential function (e^x)
F<[Nullable<number>]>(
  'EXP',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.exp(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// CUBE(X): Cube of X
F<[Nullable<number>]>(
  'CUBE',
  args => {
    const [x] = args;
    if (x === null) return null;
    return x * x * x;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// CEILING(X): Round up to nearest integer
F<[Nullable<number>]>(
  'CEILING',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.ceil(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// FLOOR(X): Round down to nearest integer
F<[Nullable<number>]>(
  'FLOOR',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.floor(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// INTPART(X): Integer part (truncate towards zero)
F<[Nullable<number>]>(
  'INTPART',
  args => {
    const [x] = args;
    if (x === null) return null;
    return x >= 0 ? Math.floor(x) : Math.ceil(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// LN(X): Natural logarithm
F<[Nullable<number>]>(
  'LN',
  args => {
    const [x] = args;
    if (x === null) return null;
    if (x <= 0) return null;
    return Math.log(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// LOG(X): Base-10 logarithm
F<[Nullable<number>]>(
  'LOG',
  args => {
    const [x] = args;
    if (x === null) return null;
    if (x <= 0) return null;
    return Math.log10(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// MAX(A,B): Maximum of two values
F<[Nullable<number>, Nullable<number>]>(
  'MAX2',
  args => {
    const [a, b] = args;
    if (a === null || b === null) return null;
    return Math.max(a, b);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>]>(),
  }
);

// MIN(A,B): Minimum of two values
F<[Nullable<number>, Nullable<number>]>(
  'MIN2',
  args => {
    const [a, b] = args;
    if (a === null || b === null) return null;
    return Math.min(a, b);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>]>(),
  }
);

// MOD(A,B): Modulo operation
F<[Nullable<number>, Nullable<number>]>(
  'MOD',
  args => {
    const [a, b] = args;
    if (a === null || b === null) return null;
    if (b === 0) return null;
    return a % b;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>]>(),
  }
);

// NOT(X): Logical NOT (returns 1 if X is 0, 0 otherwise)
F<[Nullable<number>]>(
  'NOT',
  args => {
    const [x] = args;
    if (x === null) return 0;
    return x === 0 ? 1 : 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// POW(A,B): Power function (A^B)
F<[Nullable<number>, Nullable<number>]>(
  'POW',
  args => {
    const [a, b] = args;
    if (a === null || b === null) return null;
    return Math.pow(a, b);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>]>(),
  }
);

// REVERSE(X): Returns -X
F<[Nullable<number>]>(
  'REVERSE',
  args => {
    const [x] = args;
    if (x === null) return null;
    return -x;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// RANGE(A,B,C): Returns 1 if A > B and A < C, 0 otherwise
F<[Nullable<number>, Nullable<number>, Nullable<number>]>(
  'RANGE',
  args => {
    const [a, b, c] = args;
    if (a === null || b === null || c === null) return 0;
    return a > b && a < c ? 1 : 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>, Nullable<number>, Nullable<number>]>(),
  }
);

// SGN(X): Sign function (returns 1 if X > 0, -1 if X < 0, 0 if X = 0)
F<[Nullable<number>]>(
  'SGN',
  args => {
    const [x] = args;
    if (x === null) return 0;
    if (x > 0) return 1;
    if (x < 0) return -1;
    return 0;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// SIN(X): Sine function
F<[Nullable<number>]>(
  'SIN',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.sin(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// SQRT(X): Square root
F<[Nullable<number>]>(
  'SQRT',
  args => {
    const [x] = args;
    if (x === null) return null;
    if (x < 0) return null;
    return Math.sqrt(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// SQUARE(X): Square of X
F<[Nullable<number>]>(
  'SQUARE',
  args => {
    const [x] = args;
    if (x === null) return null;
    return x * x;
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

// TAN(X): Tangent function
F<[Nullable<number>]>(
  'TAN',
  args => {
    const [x] = args;
    if (x === null) return null;
    return Math.tan(x);
  },
  {
    validateInput: typia.createAssert<[Nullable<number>]>(),
  }
);

export { registry };
