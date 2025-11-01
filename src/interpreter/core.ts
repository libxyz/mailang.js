import { IRGenerator } from '../ir/compile';
import { parseMai } from '..';
import { Program } from '../ast/types';
import { IRProgram, IRFunction, IRInstruction, IROpcode } from '../ir/types';
import { funcRegistry } from './functions';
import { MaiError, newError } from './err';
import { ErrorType } from '../ast/enums';
import { dump } from '../ir/helper';

const DEBUG = false;

export interface MarketData {
  T: number; // Timestamp
  O: number; // Open price
  H: number; // High price
  L: number; // Low price
  C: number; // Close price
  [key: string]: number | null; // Additional market data fields
}

function marketDataAlias(k: keyof MarketData): string | undefined {
  switch (k) {
    case 'O':
      return 'OPEN';
    case 'H':
      return 'HIGH';
    case 'L':
      return 'LOW';
    case 'C':
      return 'CLOSE';
    case 'V':
      return 'VOL';
  }
}

export interface ExecutionResult {
  output: Record<string, any>;
  vars: Map<string | symbol, any>;
  globalVars: Map<string, any>;
  lastResult?: any;
}

// Execution context utilities
export interface ExecFuncCtx {
  marketTs: number;
  state: Record<string, any>;
  log: (...args: any[]) => void;
}

export interface ExecFunc<TArgs = any, Output = any> {
  name: string;
  execute: (args: TArgs, context: ExecFuncCtx) => Output;
}

export interface VMOptions {
  logger?: (...args: any[]) => void;
  userGlobals?: { name: string; value: any }[];
}

export class MaiVM {
  private ast: Program;
  private ir: IRProgram;
  private executor: Interpreter;

  constructor(program: string | Program, options?: VMOptions) {
    if (typeof program === 'string') {
      const parseResult = parseMai(program);
      this.ast = parseResult.ast;
    } else {
      this.ast = program;
    }
    const userGlobals = options?.userGlobals || [];
    this.ir = new IRGenerator({ optimize: true, debug: true }).gen(
      this.ast,
      userGlobals.map(g => g.name)
    );
    this.executor = new Interpreter(this.ir, options);
  }

  execute(marketData: MarketData): ExecutionResult {
    return this.executor.execute(marketData);
  }

  dumpIR() {
    return dump(this.ir);
  }

  getIRProgram(): IRProgram {
    return this.ir;
  }
}

export interface VMContext {
  stack: any[];
  locals: any[];
  globals: any[];
  output: Record<string, any>;
  constants: any[];
  instructions: IRInstruction[];
  pc: number; // program counter
}

export class Interpreter {
  private program: IRProgram;
  private ctx: VMContext;
  private round: number = 0;
  private localStates: Map<number, Record<string, any>> = new Map();
  private options?: VMOptions;
  private marketTs?: number;

  maxStackSize: number = 1000; // Limit stack size to prevent overflow

  constructor(program: IRProgram, options?: VMOptions) {
    this.program = program;
    this.options = options;
    this.ctx = {
      stack: [],
      locals: [],
      globals: [],
      output: {},
      constants: program.constants,
      instructions: program.main.instructions,
      pc: 0,
    };

    // Initialize arrays with proper sizes
    this.ctx.locals = new Array(program.main.localsCount);
    this.ctx.globals = new Array(program.main.globalsCount);

    for (const userGlobal of options?.userGlobals || []) {
      const index = this.program.gLookup.get(userGlobal.name);
      if (index !== undefined) {
        this.ctx.globals[index] = userGlobal.value;
      }
    }
  }

  execute(marketData: MarketData): ExecutionResult {
    // Reset execution state
    this.ctx.stack = [];
    this.ctx.output = {};
    this.ctx.pc = 0;
    this.round++;

    // Load market data into globals (only overwrite market data keys)
    for (const [key, value] of Object.entries(marketData)) {
      const index = this.program.gLookup.get(key);
      if (index !== undefined) {
        this.ctx.globals[index] = value;
        const alias = marketDataAlias(key);
        if (alias) {
          const aliasIndex = this.program.gLookup.get(alias);
          if (aliasIndex !== undefined) {
            this.ctx.globals[aliasIndex] = value;
          }
        }
      }
    }
    this.marketTs = marketData.T;

    try {
      this.executeFunction(this.program.main);
      return {
        output: this.ctx.output,
        vars: this.createVarMap(this.ctx.locals, this.program.localNames),
        globalVars: this.createVarMap(this.ctx.globals, this.program.globalNames),
        lastResult: this.ctx.stack.length > 0 ? this.ctx.stack[this.ctx.stack.length - 1] : undefined,
      };
    } catch (error) {
      throw this.createExecutionError(error);
    }
  }

  private newErr(type: ErrorType, message: string): MaiError {
    const inst = this.ctx.instructions[this.ctx.pc];
    const context: Record<string, any> = {
      instId: inst?.id,
      op: IROpcode[inst.opcode],
    };
    if (inst.extra?.operandName) {
      context['operand'] = inst.extra.operandName;
    }

    return newError(type, message, inst?.extra?.loc, context);
  }

  private executeFunction(func: IRFunction): void {
    while (this.ctx.pc < func.instructions.length) {
      const instruction = func.instructions[this.ctx.pc];

      try {
        this.executeInstruction(instruction);
      } catch (error) {
        if (error instanceof MaiError) {
          throw error;
        }
        throw this.newErr(ErrorType.RUNTIME_ERROR, `${(error as Error).message}`);
      }

      this.ctx.pc++;
    }
  }

  private executeInstruction(instruction: IRInstruction): void {
    if (DEBUG)
      console.debug(
        `PC=${this.ctx.pc} OP=${IROpcode[this.ctx.instructions[this.ctx.pc].opcode]} EXECUTING.`,
        'STACK:',
        this.ctx.stack,
        'LINE',
        this.ctx.instructions[this.ctx.pc].extra?.loc?.start.line
      );
    const { opcode, operand, extra } = instruction;

    switch (opcode) {
      // Load operations
      case IROpcode.LOAD_CONST:
        this.push(this.ctx.constants[operand]);
        break;

      case IROpcode.LOAD_VAR:
        this.push(this.ctx.locals[operand]);
        break;

      case IROpcode.LOAD_GLOBAL:
        this.push(this.ctx.globals[operand]);
        break;

      // Store operations
      case IROpcode.STORE_VAR:
        this.ctx.locals[operand] = this.pop();
        break;

      case IROpcode.INIT_GLOBAL:
        if (this.round > 1) break;
        this.ctx.globals[operand] = this.pop();
        break;

      case IROpcode.STORE_GLOBAL:
        this.ctx.globals[operand] = this.pop();
        break;

      case IROpcode.STORE_OUTPUT: {
        const outputKey = extra?.operandName;
        if (outputKey) this.ctx.output[outputKey] = this.pop();
        break;
      }

      case IROpcode.UNARY_MINUS:
      case IROpcode.UNARY_PLUS: {
        const value = this.pop();
        if (value === null) {
          this.push(null);
          break;
        }
        this.push(opcode === IROpcode.UNARY_MINUS ? -this.checkNumber(value) : this.checkNumber(value));
        break;
      }

      // binary operations
      case IROpcode.ADD:
        this.binaryOp((a, b) => a + b);
        break;
      case IROpcode.SUB:
        this.binaryOp((a, b) => a - b);
        break;
      case IROpcode.MUL:
        this.binaryOp((a, b) => a * b);
        break;
      case IROpcode.DIV:
        this.binaryOp((a, b) => {
          if (b === 0) throw this.newErr(ErrorType.DIVISION_BY_ZERO, 'Division by zero');
          return a / b;
        });
        break;
      case IROpcode.GT:
        this.binaryOp((a, b) => a > b);
        break;
      case IROpcode.LT:
        this.binaryOp((a, b) => a < b);
        break;
      case IROpcode.GTE:
        this.binaryOp((a, b) => a >= b);
        break;
      case IROpcode.LTE:
        this.binaryOp((a, b) => a <= b);
        break;

      case IROpcode.EQ: {
        const b = this.pop();
        const a = this.pop();
        this.push(a === b);
        break;
      }

      case IROpcode.NEQ: {
        const b = this.pop();
        const a = this.pop();
        this.push(a !== b);
        break;
      }

      // Logical operations
      case IROpcode.AND: {
        const b = this.pop();
        const a = this.pop();
        this.push(this.isTruthy(a) && this.isTruthy(b));
        break;
      }

      case IROpcode.OR: {
        const b = this.pop();
        const a = this.pop();
        this.push(this.isTruthy(a) || this.isTruthy(b));
        break;
      }

      // Control flow
      case IROpcode.JUMP_IF_FALSE:
        if (!this.isTruthy(this.pop())) {
          this.ctx.pc = this.resolveLabel(operand);
        }
        break;

      case IROpcode.JUMP_IF_TRUE:
        if (this.isTruthy(this.pop())) {
          this.ctx.pc = this.resolveLabel(operand);
        }
        break;

      case IROpcode.JUMP:
        this.ctx.pc = this.resolveLabel(operand);
        break;

      // Function calls
      case IROpcode.CALL_BUILTIN: {
        const { name, argCount } = operand;
        const args = [];
        for (let i = 0; i < argCount; i++) {
          args.unshift(this.pop());
        }

        const builtinFunc = funcRegistry.get(name);
        if (!builtinFunc) {
          throw this.newErr(ErrorType.INVALID_FUNCTION_CALL, `Cannot call non-function`);
        }

        let state = this.localStates.get(instruction.id);
        if (!state) {
          state = {};
          this.localStates.set(instruction.id, state);
        }

        const result = builtinFunc.execute(args, {
          state,
          marketTs: this.marketTs!,
          log: this.options?.logger || console.log,
        });

        this.push(result);
        break;
      }

      case IROpcode.CALL_FUNC: {
        const argCount = operand;
        const args = [];
        for (let i = 0; i < argCount; i++) {
          args.unshift(this.pop());
        }
        const func = this.pop();

        if (typeof func !== 'function') {
          throw this.newErr(ErrorType.INVALID_FUNCTION_CALL, `Cannot call non-function: ${func}`);
        }

        const result = func(...args);
        this.push(result);
        break;
      }

      // Stack operations
      case IROpcode.POP:
        this.pop();
        break;

      case IROpcode.DUP: {
        const value = this.peek();
        this.push(value);
        break;
      }

      case IROpcode.SWAP: {
        const b = this.pop();
        const a = this.pop();
        this.push(b);
        this.push(a);
        break;
      }

      case IROpcode.RETURN:
        this.ctx.pc = Number.MAX_SAFE_INTEGER;
        break;

      case IROpcode.NOP:
        // No operation
        break;

      default:
        throw this.newErr(ErrorType.RUNTIME_ERROR, `Unknown opcode: ${opcode}`);
    }
  }

  private binaryOp(op: (a: number, b: number) => number | boolean) {
    const b = this.pop();
    const a = this.pop();
    if (a === null || b === null) {
      this.push(null);
      return;
    }
    this.push(op(this.checkNumber(a), this.checkNumber(b)));
  }

  // Stack manipulation helpers
  private push(value: any): void {
    this.ctx.stack.push(value);
    if (this.ctx.stack.length > this.maxStackSize) {
      throw this.newErr(ErrorType.RUNTIME_ERROR, 'Stack overflow');
    }
  }

  private pop(): any {
    if (this.ctx.stack.length === 0) {
      throw this.newErr(ErrorType.RUNTIME_ERROR, 'Stack underflow');
    }
    return this.ctx.stack.pop();
  }

  private peek(): any {
    if (this.ctx.stack.length === 0) {
      throw this.newErr(ErrorType.RUNTIME_ERROR, 'Stack underflow');
    }
    return this.ctx.stack[this.ctx.stack.length - 1];
  }

  // Utility methods
  private checkNumber(value: any): number {
    if (typeof value !== 'number') {
      throw this.newErr(ErrorType.TYPE_ERROR, `Expected number, got ${typeof value}`);
    }
    return value;
  }

  private isTruthy(value: any): boolean {
    return Boolean(value);
  }

  private resolveLabel(label: string): number {
    const labelInfo = this.program.labels.get(label);
    if (labelInfo === undefined) {
      throw this.newErr(ErrorType.RUNTIME_ERROR, `Undefined label: ${label}`);
    }
    return labelInfo.pos;
  }

  private createExecutionError(error: any): MaiError {
    if (error instanceof MaiError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return this.newErr(ErrorType.RUNTIME_ERROR, message);
  }

  private createVarMap(values: any[], names?: string[]): Map<string, any> {
    const map = new Map<string, any>();
    if (names) {
      for (let i = 0; i < values.length; i++) {
        if (names[i] !== undefined) {
          map.set(names[i], values[i]);
        }
      }
    }
    return map;
  }
}

/**
 * Execute Mai source code using IR (Intermediate Representation)
 * This replaces the legacy AST walker with a more efficient IR-based execution
 */
export function executeMai(sourceCode: string, marketData: MarketData): ExecutionResult {
  const parseResult = parseMai(sourceCode);
  // Generate IR from AST with debug information enabled for better error reporting
  const irGenerator = new IRGenerator({
    optimize: true,
    debug: true, // Enable debug info for better error reporting
  });

  const irProgram = irGenerator.gen(parseResult.ast);
  const irExecutor = new Interpreter(irProgram);
  return irExecutor.execute(marketData);
}
