export { MaiLexer } from './lexer/tokens';

// Simplified executor architecture (main export)
// Be selective to avoid conflicts with legacy exports
export {
  // Core types and classes
  ExecCtx as ExecutionContext,
  MarketData,
  ExecFunc as BuiltinFunction,
  ExecutionResult,
  ExecutionError,
  MaiExecutor,
} from './executor';

import { parse } from './parser/parser';
import { buildAST } from './ast/ast-builder';
import * as AST from './ast/types';

interface ParseResult {
  ast: AST.Program;
}

export function parseMai(sourceCode: string): ParseResult {
  const { cst } = parse(sourceCode);
  const ast = buildAST(cst);
  return { ast };
}
