import { IRGenerator } from '../ir/compile';
import { parseMai } from '..';
import { Program } from '../ast/types';
import { IRProgram, IRFunction, IRInstruction, IROpcode } from '../ir/types';
import { funcRegistry } from './functions';
import { MaiError, newError } from './err';
import { ErrorType } from '../ast/enums';
import { dump } from '../ir/helper';

export interface MarketData {
  O: number; // Open price
  H: number; // High price
  L: number; // Low price
  C: number; // Close price
}

export interface ExecutionResult {
  output: Record<string, any>;
  vars: Map<string | Symbol, any>;
  globalVars: Map<string, any>;
  lastResult?: any;
}

// Execution context utilities
export interface ExecCtx {
  vars: Map<string | Symbol, any>;
  globalVars: Map<string, any>;
  funcs: Map<string, any>;
  state: Record<string, any>;
  output: Record<string, any>;
  log: (...args: any[]) => void;
}

export interface ExecFunc<TArgs = any, Output = any> {
  name: string;
  execute: (args: TArgs, context: ExecCtx) => Output;
}

export class MaiVM {
  private ast: Program;
  private ir: IRProgram;
  private executor: IRInterpreter;

  constructor(program: string | Program) {
    if (typeof program === 'string') {
      const parseResult = parseMai(program);
      this.ast = parseResult.ast;
    } else {
      this.ast = program;
    }
    this.ir = new IRGenerator({
      optimize: true,
      debug: true,
      inlineBuiltinFunctions: true,
    }).gen(this.ast);
    this.executor = new IRInterpreter(this.ir);
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

export interface IRContext {
  stack: any[];
  locals: any[];
  globals: any[];
  output: Record<string, any>;
  constants: any[];
  program: IRProgram;
  pc: number; // program counter
}

export class IRInterpreter {
  private program: IRProgram;
  private context: IRContext;
  private round: number = 0;
  private states: Map<number, Record<string, any>> = new Map();
  private curInst: IRInstruction | undefined;

  constructor(program: IRProgram) {
    this.program = program;
    this.context = {
      stack: [],
      locals: [],
      globals: [],
      output: {},
      constants: program.constants,
      program,
      pc: 0,
    };

    // Initialize arrays with proper sizes
    this.context.locals = new Array(program.mainFunction.localsCount);
    this.context.globals = new Array(program.mainFunction.globalsCount);
  }

  execute(marketData: MarketData): ExecutionResult {
    // Reset execution state
    this.context.stack = [];
    this.context.output = {};
    this.context.pc = 0;
    this.round++;

    // Load market data into globals (only overwrite market data keys)
    for (const [key, value] of Object.entries(marketData)) {
      const index = this.program.gLookup.get(key);
      if (index !== undefined) {
        this.context.globals[index] = value;
      }
    }

    try {
      this.executeFunction(this.program.mainFunction);
      return {
        output: this.context.output,
        vars: this.createVarMap(this.context.locals, this.program.localNames),
        globalVars: this.createVarMap(this.context.globals, this.program.globalNames),
        lastResult: this.context.stack.length > 0 ? this.context.stack[this.context.stack.length - 1] : undefined,
      };
    } catch (error) {
      throw this.createExecutionError(error);
    }
  }

  private newError(type: ErrorType, message: string, context?: Record<string, any>): MaiError {
    return newError(type, message, this.curInst?.extra?.loc, context);
  }

  private executeFunction(func: IRFunction): void {
    while (this.context.pc < func.instructions.length) {
      const instruction = func.instructions[this.context.pc];

      try {
        this.executeInstruction(instruction);
      } catch (error) {
        if (error instanceof MaiError) {
          throw error;
        }
        throw this.newError(
          ErrorType.RUNTIME_ERROR,
          `Runtime error at instruction ${this.context.pc}: ${(error as Error).message}`,
          { instruction: instruction.opcode, operand: instruction.operand }
        );
      }

      this.context.pc++;
    }
  }

  private executeInstruction(instruction: IRInstruction): void {
    this.curInst = instruction;
    const { opcode, operand, extra } = instruction;

    switch (opcode) {
      // Load operations
      case IROpcode.LOAD_CONST:
        this.push(this.context.constants[operand]);
        break;

      case IROpcode.LOAD_VAR:
        this.push(this.context.locals[operand]);
        break;

      case IROpcode.LOAD_GLOBAL:
        this.push(this.context.globals[operand]);
        break;

      // Store operations
      case IROpcode.STORE_VAR:
        this.context.locals[operand] = this.pop();
        break;

      case IROpcode.INIT_GLOBAL:
        if (this.round > 1) break;
      case IROpcode.STORE_GLOBAL:
        this.context.globals[operand] = this.pop();
        break;

      case IROpcode.STORE_OUTPUT:
        const outputKey = extra?.operandName;
        if (outputKey) this.context.output[outputKey] = this.pop();
        break;

      case IROpcode.UNARY_MINUS:
      case IROpcode.UNARY_PLUS:
        const value = this.pop();
        if (value === null) {
          this.push(null);
          break;
        }
        this.push(opcode === IROpcode.UNARY_MINUS ? -this.checkNumber(value) : this.checkNumber(value));
        break;

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
          if (b === 0) throw this.newError(ErrorType.DIVISION_BY_ZERO, 'Division by zero');
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
          this.context.pc = this.resolveLabel(operand);
        }
        break;

      case IROpcode.JUMP_IF_TRUE:
        if (this.isTruthy(this.pop())) {
          this.context.pc = this.resolveLabel(operand);
        }
        break;

      case IROpcode.JUMP:
        this.context.pc = this.resolveLabel(operand);
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
          throw this.newError(ErrorType.INVALID_FUNCTION_CALL, `Cannot call non-function`);
        }

        let state = this.states.get(instruction.id);
        if (!state) {
          state = {};
          this.states.set(instruction.id, state);
        }

        const result = builtinFunc.execute(args, {
          vars: new Map(),
          globalVars: new Map(Object.entries(this.context.globals)),
          funcs: funcRegistry,
          state,
          output: this.context.output,
          log: console.log.bind(console),
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
          throw this.newError(ErrorType.INVALID_FUNCTION_CALL, `Cannot call non-function: ${func}`);
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
        this.context.pc = Number.MAX_SAFE_INTEGER;
        break;

      case IROpcode.NOP:
        // No operation
        break;

      default:
        throw this.newError(ErrorType.RUNTIME_ERROR, `Unknown opcode: ${opcode}`, { opcode });
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
    this.context.stack.push(value);
  }

  private pop(): any {
    if (this.context.stack.length === 0) {
      throw this.newError(ErrorType.RUNTIME_ERROR, 'Stack underflow');
    }
    return this.context.stack.pop();
  }

  private peek(): any {
    if (this.context.stack.length === 0) {
      throw this.newError(ErrorType.RUNTIME_ERROR, 'Stack underflow');
    }
    return this.context.stack[this.context.stack.length - 1];
  }

  // Utility methods
  private checkNumber(value: any): number {
    if (typeof value !== 'number') {
      throw this.newError(ErrorType.TYPE_ERROR, `Expected number, got ${typeof value}`, { value });
    }
    return value;
  }

  private isTruthy(value: any): boolean {
    return Boolean(value);
  }

  private resolveLabel(label: string): number {
    const labelInfo = this.program.labels.get(label);
    if (labelInfo === undefined) {
      throw this.newError(ErrorType.RUNTIME_ERROR, `Undefined label: ${label}`, { label });
    }
    return labelInfo.position;
  }

  private createExecutionError(error: any): MaiError {
    if (error instanceof MaiError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return this.newError(ErrorType.RUNTIME_ERROR, message);
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

// === Helpers ===

export function getVar(ctx: ExecCtx, name: string | Symbol): any {
  if (ctx.vars.has(name)) {
    return ctx.vars.get(name);
  }
  if (typeof name === 'string' && ctx.globalVars.has(name)) {
    return ctx.globalVars.get(name);
  }
  return undefined;
}

/**
 * Execute Mai source code using IR (Intermediate Representation)
 * This replaces the legacy AST walker with a more efficient IR-based execution
 */
export function executeMai(
  sourceCode: string,
  marketData: MarketData = { O: 0, H: 0, L: 0, C: 0 }
): ExecutionResult {
  const parseResult = parseMai(sourceCode);
  // Generate IR from AST with debug information enabled for better error reporting
  const irGenerator = new IRGenerator({
    optimize: true,
    debug: true, // Enable debug info for better error reporting
    inlineBuiltinFunctions: true,
  });

  const irProgram = irGenerator.gen(parseResult.ast);
  const irExecutor = new IRInterpreter(irProgram);
  return irExecutor.execute(marketData);
}
