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

export {
  ExecutionResult,
  ExecutionError,
  MaiVM as MaiExecutor, // Now uses IR internally for backward compatibility
} from './interpreter';
