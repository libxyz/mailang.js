import { BuiltinFunction, ExecutionContext } from './core';

// ========== 标准内置函数 ==========

/**
 * Moving Average function
 */
export const maFunction: BuiltinFunction = {
  name: 'MA',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length !== 2) {
      throw new Error('MA function requires exactly 2 arguments: MA(data, period)');
    }

    const data = args[0];
    const period = args[1];

    if (!Array.isArray(data)) {
      throw new Error('MA function first argument must be an array');
    }

    if (typeof period !== 'number' || period <= 0) {
      throw new Error('MA function second argument must be a positive number');
    }

    if (data.length < period) {
      throw new Error('Insufficient data for the specified period');
    }

    const sum = data.slice(-period).reduce((acc: number, val: number) => acc + val, 0);
    return sum / period;
  },
};

/**
 * Simple Moving Average function (alias for MA)
 */
export const smaFunction: BuiltinFunction = {
  name: 'SMA',
  execute: (args: any[], context: ExecutionContext) => maFunction.execute(args, context),
};

/**
 * Exponential Moving Average function
 */
export const emaFunction: BuiltinFunction = {
  name: 'EMA',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length !== 2) {
      throw new Error('EMA function requires exactly 2 arguments: EMA(data, period)');
    }

    const data = args[0];
    const period = args[1];

    if (!Array.isArray(data)) {
      throw new Error('EMA function first argument must be an array');
    }

    if (typeof period !== 'number' || period <= 0) {
      throw new Error('EMA function second argument must be a positive number');
    }

    if (data.length < period) {
      throw new Error('Insufficient data for the specified period');
    }

    const multiplier = 2 / (period + 1);
    let ema = data[0];

    for (let i = 1; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }

    return ema;
  },
};

/**
 * Maximum function
 */
export const maxFunction: BuiltinFunction = {
  name: 'MAX',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length === 0) {
      throw new Error('MAX function requires at least 1 argument');
    }

    if (args.length === 1 && Array.isArray(args[0])) {
      const arr = args[0].filter(x => typeof x === 'number');
      if (arr.length === 0) return undefined;
      return Math.max(...arr);
    } else {
      const numbers = args.filter(x => typeof x === 'number');
      if (numbers.length === 0) return undefined;
      return Math.max(...numbers);
    }
  },
};

/**
 * Minimum function
 */
export const minFunction: BuiltinFunction = {
  name: 'MIN',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length === 0) {
      throw new Error('MIN function requires at least 1 argument');
    }

    if (args.length === 1 && Array.isArray(args[0])) {
      const arr = args[0].filter(x => typeof x === 'number');
      if (arr.length === 0) return undefined;
      return Math.min(...arr);
    } else {
      const numbers = args.filter(x => typeof x === 'number');
      if (numbers.length === 0) return undefined;
      return Math.min(...numbers);
    }
  },
};

/**
 * Sum function
 */
export const sumFunction: BuiltinFunction = {
  name: 'SUM',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length !== 1) {
      throw new Error('SUM function requires exactly 1 argument: SUM(array)');
    }

    const data = args[0];
    if (!Array.isArray(data)) {
      throw new Error('SUM function argument must be an array');
    }

    return data.filter(x => typeof x === 'number').reduce((acc, val) => acc + val, 0);
  },
};

/**
 * Count function
 */
export const countFunction: BuiltinFunction = {
  name: 'COUNT',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length !== 1) {
      throw new Error('COUNT function requires exactly 1 argument: COUNT(array)');
    }

    const data = args[0];
    if (!Array.isArray(data)) {
      throw new Error('COUNT function argument must be an array');
    }

    return data.length;
  },
};

/**
 * Standard Deviation function
 */
export const stddevFunction: BuiltinFunction = {
  name: 'STDDEV',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length !== 1) {
      throw new Error('STDDEV function requires exactly 1 argument: STDDEV(array)');
    }

    const data = args[0];
    if (!Array.isArray(data)) {
      throw new Error('STDDEV function argument must be an array');
    }

    const numbers = data.filter(x => typeof x === 'number');
    if (numbers.length < 2) return 0;

    const mean = numbers.reduce((acc, val) => acc + val, 0) / numbers.length;
    const squaredDiffs = numbers.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / numbers.length;

    return Math.sqrt(variance);
  },
};

/**
 * Absolute value function
 */
export const absFunction: BuiltinFunction = {
  name: 'ABS',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length !== 1) {
      throw new Error('ABS function requires exactly 1 argument: ABS(number)');
    }

    const value = args[0];
    if (typeof value !== 'number') {
      throw new Error('ABS function argument must be a number');
    }

    return Math.abs(value);
  },
};

/**
 * Cross function - checks if two series cross
 */
export const crossFunction: BuiltinFunction = {
  name: 'CROSS',
  execute: (args: any[], context: ExecutionContext) => {
    if (args.length !== 2) {
      throw new Error('CROSS function requires exactly 2 arguments: CROSS(series1, series2)');
    }

    const series1 = args[0];
    const series2 = args[1];

    if (!Array.isArray(series1) || !Array.isArray(series2)) {
      throw new Error('CROSS function arguments must be arrays');
    }

    if (series1.length !== series2.length || series1.length < 2) {
      throw new Error(
        'CROSS function requires two arrays of equal length with at least 2 elements'
      );
    }

    const prev1 = series1[series1.length - 2];
    const curr1 = series1[series1.length - 1];
    const prev2 = series2[series2.length - 2];
    const curr2 = series2[series2.length - 1];

    return prev1 <= prev2 && curr1 > curr2;
  },
};

// ========== 流式函数 ==========

/**
 * Helper function to ensure indicatorStates exists in context
 */
function ensureIndicatorStates(context: ExecutionContext): void {
  if (!context.indicatorStates) {
    context.indicatorStates = new Map();
  }
}

// ========== 函数集合 ==========

/**
 * All standard builtin functions
 */
export const builtinFunctions: BuiltinFunction[] = [
  absFunction,
  maFunction,
  smaFunction,
  emaFunction,
  maxFunction,
  minFunction,
  sumFunction,
  countFunction,
  stddevFunction,
  crossFunction,
];

/**
 * Combined functions
 */
export const allFunctions: BuiltinFunction[] = [...builtinFunctions];

/**
 * Function maps for quick lookup
 */
export const builtinFunctionsMap = new Map(allFunctions.map(func => [func.name, func]));

