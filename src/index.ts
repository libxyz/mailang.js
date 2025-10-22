export * from './ast/types';
export * from './ast/enums';
export * from './ast/ast-builder';
export { parse } from './parser/parser';
export { MaiLexer } from './lexer/tokens';

import { parse } from './parser/parser';
import { buildAST } from './ast/ast-builder';
import * as AST from './ast/types';
import { ASTNodeType } from './ast/enums';

export interface ParseResult {
  ast: AST.Program;
  errors: string[];
}

export function parseMai(sourceCode: string): ParseResult {
  try {
    const { cst, lexResult, parserErrors } = parse(sourceCode);

    const errors: string[] = [];

    if (lexResult.errors.length > 0) {
      errors.push(...lexResult.errors.map(e => e.message));
    }

    if (parserErrors.length > 0) {
      errors.push(...parserErrors.map(e => e.message));
    }

    if (errors.length > 0) {
      return { ast: { type: ASTNodeType.Program, body: [] }, errors };
    }

    const ast = buildAST(cst);
    return { ast, errors: [] };
  } catch (error) {
    return {
      ast: { type: ASTNodeType.Program, body: [] },
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
