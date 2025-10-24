// IR (Intermediate Representation) Types for Mai Language

import { SourceLocation } from '../ast/types';

export enum IROpcode {
  // Literals
  LOAD_CONST,
  LOAD_VAR,
  LOAD_GLOBAL,

  // Store operations
  INIT_GLOBAL,
  STORE_VAR,
  STORE_GLOBAL,
  STORE_OUTPUT,

  // Arithmetic operations
  ADD,
  SUB,
  MUL,
  DIV,
  UNARY_PLUS,
  UNARY_MINUS,

  // Comparison operations
  GT,
  LT,
  GTE,
  LTE,
  EQ,
  NEQ,

  // Logical operations
  AND,
  OR,

  // Control flow
  JUMP,
  JUMP_IF_FALSE,
  JUMP_IF_TRUE,

  // Function calls
  CALL_BUILTIN,
  CALL_FUNC,

  // Stack operations
  POP,
  DUP,
  SWAP,

  // Special operations
  RETURN,
  NOP,
}

export interface IRInstructionExtra {
  loc?: SourceLocation;
  operandName?: string;
}

export interface IRInstruction {
  id: number;
  opcode: IROpcode;
  operand?: any;
  extra?: IRInstructionExtra;
}

export interface IRFunction {
  name: string;
  instructions: IRInstruction[];
  localsCount: number;
  globalsCount: number;
  maxStackDepth: number;
}

export interface IRProgram {
  functions: IRFunction[];
  main: IRFunction;
  constants: any[];
  labels: Map<string, IRLabel>;
  gLookup: Map<string, number>;
  localNames?: string[]; // Index to name mapping for locals
  globalNames?: string[]; // Index to name mapping for globals
}

export interface IRGeneratorContext {
  instructions: IRInstruction[];
  constants: any[];
  varLookup: Map<string, number>;
  gVarLookup: Map<string, number>;
  builtinFuncs: Set<string>;
  labelCounter: number;
  maxStackDepth: number;
  curStackDepth: number;
  labels: IRLabel[];
}

export interface IRLabel {
  id: string;
  pos: number;
}

// Helper type for tracking stack depth changes
export interface StackEffect {
  push: number;
  pop: number;
}

// IR generation options
export interface IRGeneratorOptions {
  optimize?: boolean;
  debug?: boolean;
}
