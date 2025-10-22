import * as AST from '../ast/types';
import { ASTNodeType, BinaryOperator, AssignmentOperator, UnaryOperator, MarketDataKeyword } from '../ast/enums';
import { builtinFunctionsMap } from './functions';

// ========== 类型定义 ==========
export interface ExecutionContext {
  vars: Map<string, any>;
  marketData: MarketData;
  funcs: Map<string, BuiltinFunction>;
  output: any[];
  indicatorStates?: Map<string, any>; // For streaming indicator state management
}

export interface MarketData {
  O: number; // Open price
  H: number; // High price
  L: number; // Low price
  C: number; // Close price
  [key: string]: any; // Additional market data
}

export interface BuiltinFunction {
  name: string;
  execute: (args: any[], context: ExecutionContext) => any;
}

export interface ExecutionResult {
  value: any;
  output: any[];
  variables: Map<string, any>;
}

export interface ExecutionError {
  message: string;
  location?: AST.SourceLocation;
  type: 'RuntimeError' | 'TypeError' | 'ReferenceError' | 'BuiltinError';
}

// ========== 基础执行器 ==========
export class MaiExecutor {
  private context: ExecutionContext;

  constructor(marketData: MarketData = { O: 0, H: 0, L: 0, C: 0 }) {
    this.context = {
      vars: new Map(),
      marketData,
      funcs: builtinFunctionsMap,
      output: [],
      indicatorStates: new Map()
    };
  }

  execute(program: AST.Program): ExecutionResult {
    try {
      this.executeStatements(program.body);
      return {
        value: undefined,
        output: this.context.output,
        variables: new Map(this.context.vars)
      };
    } catch (error) {
      throw this.createExecutionError(error);
    }
  }

  private executeStatements(statements: (AST.Statement | AST.GlobalVariableDeclaration)[]): void {
    for (const statement of statements) {
      this.executeStatement(statement);
    }
  }

  private executeStatement(statement: AST.Statement | AST.GlobalVariableDeclaration): any {
    switch (statement.type) {
      case ASTNodeType.ExpressionStatement:
        const result = this.evaluateExpression(statement.expression);
        this.context.vars.set('__last', result);
        return result;
      case ASTNodeType.VariableDeclaration:
        return this.executeVariableDeclaration(statement);
      case ASTNodeType.GlobalVariableDeclaration:
        return this.executeGlobalVariableDeclaration(statement);
      case ASTNodeType.IfStatement:
        return this.executeIfStatement(statement);
      case ASTNodeType.BlockStatement:
        return this.executeBlockStatement(statement);
      case ASTNodeType.ReturnStatement:
        return this.executeReturnStatement(statement);
      default:
        const stmt = statement as any;
        throw new Error(`Unknown statement type: ${stmt.type || 'undefined'}`);
    }
  }

  private executeVariableDeclaration(node: AST.VariableDeclaration): void {
    for (const variable of node.variables) {
      const value = variable.init ? this.evaluateExpression(variable.init) : undefined;
      this.context.vars.set(variable.id.name, value);
    }
  }

  private executeGlobalVariableDeclaration(node: AST.GlobalVariableDeclaration): void {
    for (const variable of node.variables) {
      const value = variable.init ? this.evaluateExpression(variable.init) : undefined;
      this.context.vars.set(variable.id.name, value);
    }
  }

  private executeIfStatement(node: AST.IfStatement): void {
    const testResult = this.evaluateExpression(node.test);
    if (this.isTruthy(testResult)) {
      this.executeStatement(node.consequent);
    } else if (node.alternate) {
      this.executeStatement(node.alternate);
    }
  }

  private executeBlockStatement(node: AST.BlockStatement): void {
    this.executeStatements(node.body);
  }

  private executeReturnStatement(node: AST.ReturnStatement): void {
    if (node.argument) {
      const value = this.evaluateExpression(node.argument);
      this.context.vars.set('__return', value);
    }
  }

  private evaluateExpression(expression: AST.Expression): any {
    if (!expression || !expression.type) {
      throw new Error('Invalid expression: expression or type is undefined');
    }

    switch (expression.type) {
      case ASTNodeType.NumberLiteral:
        return (expression as AST.NumberLiteral).value;
      case ASTNodeType.StringLiteral:
        return (expression as AST.StringLiteral).value;
      case ASTNodeType.BooleanLiteral:
        return (expression as AST.BooleanLiteral).value;
      case ASTNodeType.Identifier:
        return this.evaluateIdentifier(expression as AST.Identifier);
      case ASTNodeType.BinaryExpression:
        return this.evaluateBinaryExpression(expression as AST.BinaryExpression);
      case ASTNodeType.AssignmentExpression:
        return this.evaluateAssignmentExpression(expression as AST.AssignmentExpression);
      case ASTNodeType.UnaryExpression:
        return this.evaluateUnaryExpression(expression as AST.UnaryExpression);
      case ASTNodeType.CallExpression:
        return this.evaluateCallExpression(expression as AST.CallExpression);
      case ASTNodeType.MemberExpression:
        return this.evaluateMemberExpression(expression as AST.MemberExpression);
      default:
        const expr = expression as any;
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
  }

  private evaluateIdentifier(node: AST.Identifier): any {
    const name = node.name;

    // Check market data
    if (name === MarketDataKeyword.Open || name === 'O') return this.context.marketData.O;
    if (name === MarketDataKeyword.High || name === 'H') return this.context.marketData.H;
    if (name === MarketDataKeyword.Low || name === 'L') return this.context.marketData.L;
    if (name === MarketDataKeyword.Close || name === 'C') return this.context.marketData.C;

    // Check variables
    if (this.context.vars.has(name)) {
      return this.context.vars.get(name);
    }

    throw new ReferenceError(`Variable "${name}" is not defined`);
  }

  private evaluateBinaryExpression(node: AST.BinaryExpression): any {
    const left = this.evaluateExpression(node.left);
    const right = this.evaluateExpression(node.right);

    switch (node.operator) {
      case BinaryOperator.Plus: return this.checkNumber(left) + this.checkNumber(right);
      case BinaryOperator.Minus: return this.checkNumber(left) - this.checkNumber(right);
      case BinaryOperator.Multiply: return this.checkNumber(left) * this.checkNumber(right);
      case BinaryOperator.Divide:
        const divisor = this.checkNumber(right);
        if (divisor === 0) throw new Error('Division by zero');
        return this.checkNumber(left) / divisor;
      case BinaryOperator.GreaterThan: return this.checkNumber(left) > this.checkNumber(right);
      case BinaryOperator.LessThan: return this.checkNumber(left) < this.checkNumber(right);
      case BinaryOperator.GreaterThanOrEqual: return this.checkNumber(left) >= this.checkNumber(right);
      case BinaryOperator.LessThanOrEqual: return this.checkNumber(left) <= this.checkNumber(right);
      case BinaryOperator.NotEqual: return left !== right;
      case BinaryOperator.Equal: return left === right;
      case BinaryOperator.LogicalAnd: return this.isTruthy(left) && this.isTruthy(right);
      case BinaryOperator.LogicalOr: return this.isTruthy(left) || this.isTruthy(right);
      default: throw new Error(`Unknown binary operator: ${node.operator}`);
    }
  }

  private evaluateAssignmentExpression(node: AST.AssignmentExpression): any {
    const rightValue = this.evaluateExpression(node.right);

    if (node.operator === AssignmentOperator.RangeOperator) {
      let start: number;
      if (node.left.type === ASTNodeType.Identifier) {
        start = this.evaluateIdentifier(node.left as AST.Identifier);
      } else if (node.left.type === ASTNodeType.NumberLiteral) {
        start = (node.left as AST.NumberLiteral).value;
      } else {
        start = this.checkNumber(this.evaluateExpression(node.left));
      }

      const end = this.checkNumber(rightValue);
      const range = [];
      if (start <= end) {
        for (let i = start; i <= end; i++) range.push(i);
      } else {
        for (let i = start; i >= end; i--) range.push(i);
      }
      return range;
    }

    if (node.left.type !== ASTNodeType.Identifier) {
      throw new Error('Left side of assignment must be an identifier');
    }

    const identifier = node.left as AST.Identifier;
    const varName = identifier.name;

    switch (node.operator) {
      case AssignmentOperator.Assign:
        this.context.vars.set(varName, rightValue);
        return rightValue;
      case AssignmentOperator.DisplayAssign:
        this.context.vars.set(varName, rightValue);
        this.context.output.push(rightValue);
        return rightValue;
      case AssignmentOperator.PowerAssign:
        const base = this.evaluateIdentifier(identifier);
        const result = Math.pow(this.checkNumber(base), this.checkNumber(rightValue));
        this.context.vars.set(varName, result);
        return result;
      default:
        throw new Error(`Unknown assignment operator: ${node.operator}`);
    }
  }

  private evaluateUnaryExpression(node: AST.UnaryExpression): any {
    const argument = this.evaluateExpression(node.argument);
    switch (node.operator) {
      case UnaryOperator.Plus: return +this.checkNumber(argument);
      case UnaryOperator.Minus: return -this.checkNumber(argument);
      default: throw new Error(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evaluateCallExpression(node: AST.CallExpression): any {
    if (typeof node.callee === 'object' && node.callee.type === ASTNodeType.Identifier) {
      const identifier = node.callee as AST.Identifier;
      const builtinFunc = this.context.funcs.get(identifier.name);

      if (builtinFunc) {
        const args = node.arguments.map(arg => this.evaluateExpression(arg));
        return builtinFunc.execute(args, this.context);
      }

      if (this.context.vars.has(identifier.name)) {
        const callee = this.context.vars.get(identifier.name);
        if (typeof callee === 'function') {
          const args = node.arguments.map(arg => this.evaluateExpression(arg));
          return callee(...args);
        }
      }

      throw new Error(`Cannot call non-function: ${identifier.name}`);
    }

    const callee = this.evaluateExpression(node.callee);
    const args = node.arguments.map(arg => this.evaluateExpression(arg));

    if (typeof callee === 'function') {
      return callee(...args);
    }

    throw new Error(`Cannot call non-function: ${callee}`);
  }

  private evaluateMemberExpression(node: AST.MemberExpression): any {
    const object = this.evaluateExpression(node.object);
    const property = node.property.name;

    if (object && typeof object === 'object') {
      return object[property];
    }

    throw new Error(`Cannot access property '${property}' of non-object: ${object}`);
  }

  private checkNumber(value: any): number {
    if (typeof value !== 'number') {
      throw new TypeError(`Expected number, got ${typeof value}`);
    }
    return value;
  }

  private isTruthy(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (value === null || value === undefined) return false;
    return true;
  }

  private createExecutionError(error: any): ExecutionError {
    return {
      message: error instanceof Error ? error.message : String(error),
      type: 'RuntimeError',
      location: undefined
    };
  }
}

// ========== 便利函数 ==========
export function executeMai(
  program: AST.Program,
  marketData: MarketData = { O: 0, H: 0, L: 0, C: 0 }
): ExecutionResult {
  const executor = new MaiExecutor(marketData);
  return executor.execute(program);
}

export function executeMaiSource(
  sourceCode: string,
  marketData: MarketData = { O: 0, H: 0, L: 0, C: 0 }
): ExecutionResult {
  const { parseMai } = require('../index');
  const parseResult = parseMai(sourceCode);

  if (parseResult.errors.length > 0) {
    throw new Error(`Parse errors: ${parseResult.errors.join(', ')}`);
  }

  return executeMai(parseResult.ast, marketData);
}
