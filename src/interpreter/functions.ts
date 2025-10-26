import { ExecFunc, ExecCtx } from '../utils';
import { RingBuf, StatsRingBuf } from '../utils/ring-buffer';
import typia from 'typia';

type Nullable<T> = T | null;

const registry = new Map<string, ExecFunc>();
const identity = <T>(x: T): T => x;
const opts = {
  validateInput: typia.createAssert<number[]>(),
};

function F<I = any[], O = number | null>(
  name: string,
  func: (args: I, context: ExecCtx) => O,
  options?: { validateInput: (input: I) => I; alias?: string[] }
): ExecFunc {
  if (registry.has(name)) {
    throw new Error(`Function ${name} is already registered.`);
  }
  if (options?.alias?.some(alias => registry.has(alias))) {
    throw new Error(`One of the aliases for function ${name} is already registered.`);
  }

  const validateInput = options?.validateInput ?? identity;
  const ret = {
    name,
    execute: (args: I, context: ExecCtx) => {
      return func(validateInput(args), context);
    },
  };
  registry.set(name, ret);
  options?.alias?.forEach(alias => registry.set(alias, ret));
  return ret;
}

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
    ctx.state.s = s;
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
    ctx.state.s = s;
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

// === Helper Functions ===

function useRingBuf<T>(context: ExecCtx, period: number, key: string): RingBuf<T> {
  if (!context.state[key]) {
    context.state[key] = new RingBuf<T>(period);
  }
  return context.state[key] as RingBuf<T>;
}

function useStatsRingBuf(context: ExecCtx, period: number, key: string): StatsRingBuf {
  if (!context.state[key]) {
    context.state[key] = new StatsRingBuf(period);
  }
  return context.state[key] as StatsRingBuf;
}

function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}
export const funcRegistry = registry;
