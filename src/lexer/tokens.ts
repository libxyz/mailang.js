import { createToken, Lexer } from 'chevrotain';

// 一张配置表
const tokenSpecs = [
  // Whitespace & Comments
  { name: 'WhiteSpace', pattern: /[ \t\r]+/, group: Lexer.SKIPPED },
  { name: 'NewLine', pattern: /\n+/, line_breaks: true },
  { name: 'LineComment', pattern: /\/\/.*/, group: Lexer.SKIPPED, line_breaks: true },
  { name: 'BlockComment', pattern: /\/\*[\s\S]*?\*\//, group: Lexer.SKIPPED },

  // Literals
  { name: 'NumberLiteral', pattern: /\d+(\.\d+)?([eE][+-]?\d+)?/ },
  { name: 'StringLiteral', pattern: /"([^"\\]|\\.)*"/ },

  // Keywords
  { name: 'VARIABLE', pattern: /\bVARIABLE\b/ },
  { name: 'IF', pattern: /\bIF\b/ },
  { name: 'THEN', pattern: /\bTHEN\b/ },
  { name: 'ELSE', pattern: /\bELSE\b/ },
  { name: 'BEGIN', pattern: /\bBEGIN\b/ },
  { name: 'END', pattern: /\bEND\b/ },
  { name: 'RETURN', pattern: /\bRETURN\b/ },

  // Identifiers
  { name: 'Identifier', pattern: /[a-zA-Z_][a-zA-Z0-9_]*/ },

  // Operators
  { name: 'Multiply', pattern: /\*/ },
  { name: 'Divide', pattern: /\// },
  { name: 'Plus', pattern: /\+/ },
  { name: 'Minus', pattern: /-/ },
  { name: 'NotEqual', pattern: /<>/ },
  { name: 'GreaterThanOrEqual', pattern: />=/ },
  { name: 'LessThanOrEqual', pattern: /<=/ },
  { name: 'GreaterThan', pattern: />/ },
  { name: 'LessThan', pattern: /</ },
  { name: 'Equal', pattern: /=/ },
  { name: 'LogicalAnd', pattern: /&&/ },
  { name: 'LogicalOr', pattern: /\|\|/ },
  { name: 'Assign', pattern: /:=/ },
  { name: 'PowerAssign', pattern: /\^\^/ },
  { name: 'RangeOperator', pattern: /\.\./ },
  { name: 'DisplayAssign', pattern: /:/ },

  // Punctuation
  { name: 'Semicolon', pattern: /;/ },
  { name: 'Comma', pattern: /,/ },
  { name: 'LParen', pattern: /\(/ },
  { name: 'RParen', pattern: /\)/ },
  { name: 'LBracket', pattern: /\[/ },
  { name: 'RBracket', pattern: /\]/ },
  { name: 'Dot', pattern: /\./ },
] as const;

// 类型安全地取名字
export type TokenName = (typeof tokenSpecs)[number]['name'];

// 自动创建 Token
export const allTokens = tokenSpecs.map(spec => createToken(spec));
export const Token = Object.fromEntries(allTokens.map(t => [t.name, t])) as {
  readonly [K in TokenName]: (typeof allTokens)[number];
};

// 生成 lexer
export const MaiLexer = new Lexer(allTokens, {
  positionTracking: 'full',
  ensureOptimizations: true,
});

// Export keywords for use in other modules
export const KEYWORDS = [Token.VARIABLE, Token.IF, Token.THEN, Token.ELSE, Token.BEGIN, Token.END, Token.RETURN];
