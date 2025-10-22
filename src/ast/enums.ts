// AST Node Type Enums
export enum ASTNodeType {
  Program = 'Program',

  // Statements
  ExpressionStatement = 'ExpressionStatement',
  VariableDeclaration = 'VariableDeclaration',
  GlobalVariableDeclaration = 'GlobalVariableDeclaration',
  IfStatement = 'IfStatement',
  BlockStatement = 'BlockStatement',
  ReturnStatement = 'ReturnStatement',

  // Expressions
  BinaryExpression = 'BinaryExpression',
  AssignmentExpression = 'AssignmentExpression',
  UnaryExpression = 'UnaryExpression',
  CallExpression = 'CallExpression',
  MemberExpression = 'MemberExpression',

  // Literals and Identifiers
  Identifier = 'Identifier',
  NumberLiteral = 'NumberLiteral',
  StringLiteral = 'StringLiteral',
  BooleanLiteral = 'BooleanLiteral',
}

// Operator Enums
export enum BinaryOperator {
  Plus = '+',
  Minus = '-',
  Multiply = '*',
  Divide = '/',
  GreaterThan = '>',
  LessThan = '<',
  GreaterThanOrEqual = '>=',
  LessThanOrEqual = '<=',
  NotEqual = '<>',
  Equal = '=',
  LogicalAnd = '&&',
  LogicalOr = '||',
}

export enum AssignmentOperator {
  Assign = ':=',
  DisplayAssign = ':',
  PowerAssign = '^^',
  RangeOperator = '..',
}

export enum UnaryOperator {
  Plus = '+',
  Minus = '-',
}

// Literal Enums
export enum LiteralType {
  Number = 'NumberLiteral',
  String = 'StringLiteral',
  Boolean = 'BooleanLiteral',
}

// Market Data Keywords
export enum MarketDataKeyword {
  Open = 'O',
  High = 'H',
  Low = 'L',
  Close = 'C',
}

// Statement Type Enums
export enum StatementType {
  Expression = 'ExpressionStatement',
  Variable = 'VariableDeclaration',
  GlobalVariable = 'GlobalVariableDeclaration',
  If = 'IfStatement',
  Block = 'BlockStatement',
  Return = 'ReturnStatement',
}

// Expression Type Enums
export enum ExpressionType {
  Binary = 'BinaryExpression',
  Assignment = 'AssignmentExpression',
  Unary = 'UnaryExpression',
  Call = 'CallExpression',
  Member = 'MemberExpression',
  Identifier = 'Identifier',
  Literal = 'Literal',
}
