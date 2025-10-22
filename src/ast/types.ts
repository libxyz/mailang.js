import { ASTNodeType, BinaryOperator, AssignmentOperator, UnaryOperator } from './enums';

export interface Position {
  line: number;
  column: number;
}

export interface SourceLocation {
  start: Position;
  end: Position;
}

export interface BaseNode {
  type: ASTNodeType;
  loc?: SourceLocation;
}

// Literals
export interface NumberLiteral extends BaseNode {
  type: ASTNodeType.NumberLiteral;
  value: number;
}

export interface StringLiteral extends BaseNode {
  type: ASTNodeType.StringLiteral;
  value: string;
}

export interface BooleanLiteral extends BaseNode {
  type: ASTNodeType.BooleanLiteral;
  value: boolean;
}

export type Literal = NumberLiteral | StringLiteral | BooleanLiteral;

// Identifiers and Variables
export interface Identifier extends BaseNode {
  type: ASTNodeType.Identifier;
  name: string;
}

export interface VariableDeclaration extends BaseNode {
  type: ASTNodeType.VariableDeclaration;
  variables: Array<{
    id: Identifier;
    init?: Expression;
  }>;
}

// Expressions
export interface BinaryExpression extends BaseNode {
  type: ASTNodeType.BinaryExpression;
  operator: BinaryOperator;
  left: Expression;
  right: Expression;
}

export interface AssignmentExpression extends BaseNode {
  type: ASTNodeType.AssignmentExpression;
  operator: AssignmentOperator;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: ASTNodeType.UnaryExpression;
  operator: UnaryOperator;
  argument: Expression;
}

export interface CallExpression extends BaseNode {
  type: ASTNodeType.CallExpression;
  callee: Expression;
  arguments: Expression[];
}

export interface MemberExpression extends BaseNode {
  type: ASTNodeType.MemberExpression;
  object: Expression;
  property: Identifier;
  computed: boolean;
}

export type Expression =
  | Literal
  | Identifier
  | BinaryExpression
  | AssignmentExpression
  | UnaryExpression
  | CallExpression
  | MemberExpression;

// Statements
export interface ExpressionStatement extends BaseNode {
  type: ASTNodeType.ExpressionStatement;
  expression: Expression;
}

export interface BlockStatement extends BaseNode {
  type: ASTNodeType.BlockStatement;
  body: Statement[];
}

export interface IfStatement extends BaseNode {
  type: ASTNodeType.IfStatement;
  test: Expression;
  consequent: Statement;
  alternate?: Statement;
}

export interface ReturnStatement extends BaseNode {
  type: ASTNodeType.ReturnStatement;
  argument?: Expression;
}

export type Statement =
  | ExpressionStatement
  | BlockStatement
  | IfStatement
  | ReturnStatement
  | VariableDeclaration;

// Special Mai language constructs
export interface GlobalVariableDeclaration extends BaseNode {
  type: ASTNodeType.GlobalVariableDeclaration;
  variables: Array<{
    id: Identifier;
    init?: Expression;
  }>;
}

// Reserved keywords for market data
export const RESERVED_KEYWORDS = ['O', 'H', 'L', 'C']; // Open, High, Low, Close prices

// Program (root node)
export interface Program extends BaseNode {
  type: ASTNodeType.Program;
  body: Statement[];
}

export type ASTNode = Program | Statement | Expression | Literal | Identifier;
