// AST Node Type Enums
export enum ASTNodeType {
  Program = 'Program',

  // Statements
  ExpressionStatement = 'ExpressionStatement',
  VariableDeclaration = 'VariableDeclaration',
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

export const binaryOpSet: Set<string> = new Set(Object.values(BinaryOperator));

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

// Error Type Enums
export enum ErrorType {
  // Runtime Errors
  RUNTIME_ERROR = 'RuntimeError',
  TYPE_ERROR = 'TypeError',
  REFERENCE_ERROR = 'ReferenceError',
  BUILTIN_ERROR = 'BuiltinError',

  // Parse Errors
  SYNTAX_ERROR = 'SyntaxError',
  UNEXPECTED_TOKEN = 'UnexpectedToken',
  MISSING_TOKEN = 'MissingToken',

  // Semantic Errors
  UNDEFINED_VARIABLE = 'UndefinedVariable',
  INVALID_OPERATOR = 'InvalidOperator',
  INVALID_ASSIGNMENT = 'InvalidAssignment',
  INVALID_FUNCTION_CALL = 'InvalidFunctionCall',
  INVALID_MEMBER_ACCESS = 'InvalidMemberAccess',
  DIVISION_BY_ZERO = 'DivisionByZero',
  UNIMPLEMENTED_FEATURE = 'UnimplementedFeature',
}
