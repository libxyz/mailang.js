import { createToken, TokenType, Lexer } from 'chevrotain';

// Whitespace and Comments
export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /[ \t\n\r]+/,
  group: Lexer.SKIPPED,
});

export const LineComment = createToken({
  name: 'LineComment',
  pattern: /\/\/.*/,
  group: Lexer.SKIPPED,
  line_breaks: true,
});

export const BlockComment = createToken({
  name: 'BlockComment',
  pattern: /\/\*[\s\S]*?\*\//,
  group: Lexer.SKIPPED,
});

// Literals
export const NumberLiteral = createToken({
  name: 'NumberLiteral',
  pattern: /\d+(\.\d+)?([eE][+-]?\d+)?/,
});

export const StringLiteral = createToken({
  name: 'StringLiteral',
  pattern: /"([^"\\]|\\.)*"/,
});

// Identifiers and Keywords
export const Identifier = createToken({
  name: 'Identifier',
  pattern: /[a-zA-Z_][a-zA-Z0-9_]*/,
});

// Reserved market data keywords
export const O = createToken({ name: 'O', pattern: /O/ });
export const H = createToken({ name: 'H', pattern: /H/ });
export const L = createToken({ name: 'L', pattern: /L/ });
export const C = createToken({ name: 'C', pattern: /C/ });

// Keywords
export const VARIABLE = createToken({ name: 'VARIABLE', pattern: /VARIABLE/ });
export const IF = createToken({ name: 'IF', pattern: /IF/ });
export const THEN = createToken({ name: 'THEN', pattern: /THEN/ });
export const ELSE = createToken({ name: 'ELSE', pattern: /ELSE/ });
export const BEGIN = createToken({ name: 'BEGIN', pattern: /BEGIN/ });
export const END = createToken({ name: 'END', pattern: /END/ });
export const RETURN = createToken({ name: 'RETURN', pattern: /RETURN/ });

// Operators (ordered by precedence)
export const MultiplicativeOp = createToken({
  name: 'MultiplicativeOp',
  pattern: Lexer.NA,
});
export const Multiply = createToken({
  name: 'Multiply',
  pattern: /\*/,
  categories: [MultiplicativeOp],
});
export const Divide = createToken({
  name: 'Divide',
  pattern: /\//,
  categories: [MultiplicativeOp],
});

export const AdditiveOp = createToken({
  name: 'AdditiveOp',
  pattern: Lexer.NA,
});
export const Plus = createToken({
  name: 'Plus',
  pattern: /\+/,
  categories: [AdditiveOp],
});
export const Minus = createToken({
  name: 'Minus',
  pattern: /-/,
  categories: [AdditiveOp],
});

export const RelationalOp = createToken({
  name: 'RelationalOp',
  pattern: Lexer.NA,
});
export const NotEqual = createToken({
  name: 'NotEqual',
  pattern: /<>/,
  categories: [RelationalOp],
});
export const GreaterThanOrEqual = createToken({
  name: 'GreaterThanOrEqual',
  pattern: />=/,
  categories: [RelationalOp],
});
export const LessThanOrEqual = createToken({
  name: 'LessThanOrEqual',
  pattern: /<=/,
  categories: [RelationalOp],
});
export const GreaterThan = createToken({
  name: 'GreaterThan',
  pattern: />/,
  longer_alt: GreaterThanOrEqual,
  categories: [RelationalOp],
});
export const LessThan = createToken({
  name: 'LessThan',
  pattern: /</,
  longer_alt: LessThanOrEqual,
  categories: [RelationalOp],
});
export const Equal = createToken({
  name: 'Equal',
  pattern: /=/,
  categories: [RelationalOp],
});

export const LogicalAnd = createToken({
  name: 'LogicalAnd',
  pattern: /&&/,
});

export const LogicalOr = createToken({
  name: 'LogicalOr',
  pattern: /\|\|/,
});

// Assignment operators
export const Assign = createToken({
  name: 'Assign',
  pattern: /:=/,
});

export const DisplayAssign = createToken({
  name: 'DisplayAssign',
  pattern: /:/,
  longer_alt: Assign,
});

export const PowerAssign = createToken({
  name: 'PowerAssign',
  pattern: /\^\^/,
});

export const RangeOperator = createToken({
  name: 'RangeOperator',
  pattern: /\.\./,
});

// Punctuation
export const Semicolon = createToken({ name: 'Semicolon', pattern: /;/ });
export const Comma = createToken({ name: 'Comma', pattern: /,/ });
export const Colon = createToken({ name: 'Colon', pattern: /:/ });
export const LParen = createToken({ name: 'LParen', pattern: /\(/ });
export const RParen = createToken({ name: 'RParen', pattern: /\)/ });
export const LBracket = createToken({ name: 'LBracket', pattern: /\[/ });
export const RBracket = createToken({ name: 'RBracket', pattern: /\]/ });
export const Dot = createToken({ name: 'Dot', pattern: /\./ });

// Export tokens in order of precedence (highest to lowest)
export const allTokens = [
  // Comments and whitespace (skipped)
  WhiteSpace,
  LineComment,
  BlockComment,

  // Literals
  NumberLiteral,
  StringLiteral,

  // Reserved keywords
  O,
  H,
  L,
  C,

  // Keywords
  VARIABLE,
  IF,
  THEN,
  ELSE,
  BEGIN,
  END,
  RETURN,

  // Identifiers (must come after keywords to avoid conflicts)
  Identifier,

  // Operators (in precedence order)
  // Multiplicative
  Multiply,
  Divide,

  // Additive
  Plus,
  Minus,

  // Relational (more specific patterns first)
  NotEqual,
  GreaterThanOrEqual,
  LessThanOrEqual,
  GreaterThan,
  LessThan,
  Equal,

  // Logical
  LogicalAnd,
  LogicalOr,

  // Assignment (more specific patterns first)
  Assign,
  PowerAssign,
  RangeOperator,
  DisplayAssign, // This handles ':' pattern

  // Punctuation
  Semicolon,
  Comma,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Dot,
];

export const MaiLexer = new Lexer(allTokens, {
  positionTracking: 'full',
  ensureOptimizations: true,
});
