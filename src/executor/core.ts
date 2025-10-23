import * as AST from '../ast/types';
import {
  ASTNodeType,
  BinaryOperator,
  AssignmentOperator,
  UnaryOperator,
  MarketDataKeyword,
  ErrorType,
} from '../ast/enums';
import { functionStore } from './functions';
import { parseMai } from '..';
import { MaiError } from './err';

// ========== 内部符号常量 ==========
const LAST_RESULT = Symbol('lastResult');
const RETURN_VALUE = Symbol('returnValue');

const PROTECTED_WORDS = new Set<string>(['O', 'H', 'L', 'C', 'IF', 'THEN', 'ELSE', 'BEGIN', 'END', 'RETURN']);

// ========== 类型定义 ==========
interface ScopedState {
  [key: string]: any;
}

export interface ExecCtx {
  vars: Map<string | Symbol, any>;
  globalVars: Map<string, any>;
  funcs: Map<string, ExecFunc>;

  state: ScopedState;
  output: Record<string, any>;
  log: (...args: any[]) => void;
}

export function getVar(ctx: ExecCtx, name: string | Symbol): any {
  if (ctx.vars.has(name)) {
    return ctx.vars.get(name);
  }
  if (typeof name === 'string' && ctx.globalVars.has(name)) {
    return ctx.globalVars.get(name);
  }
}

export interface MarketData {
  O: number; // Open price
  H: number; // High price
  L: number; // Low price
  C: number; // Close price
}

export interface ExecFunc<TArgs = any, Output = any> {
  name: string;
  execute: (args: TArgs, context: ExecCtx) => Output;
}

export interface ExecutionResult {
  output: Record<string, any>;
  vars: Map<string | Symbol, any>;
  globalVars: Map<string, any>;
  lastResult?: any;
  returnValue?: any;
}

export class MaiExecutor {
  private context: ExecCtx;
  private program: AST.Program;
  private states: Map<any, ScopedState>;
  private round = 0;

  constructor(program: AST.Program | string) {
    let parsedProgram: AST.Program;
    if (typeof program === 'string') {
      parsedProgram = parseMai(program).ast;
    } else {
      parsedProgram = program;
    }

    this.states = new Map();
    this.program = parsedProgram;
    this.context = {
      vars: new Map(),
      globalVars: new Map(),
      funcs: functionStore,
      state: {},
      output: {},
      log: console.log.bind(console),
    };
  }

  push(marketData: MarketData): ExecutionResult {
    this.context.vars.clear(); // Clear local vars before execution
    this.context.output = {};
    this.round += 1;

    for (const [key, value] of Object.entries(marketData)) {
      this.context.vars.set(key, value);
    }

    try {
      this.executeStatements(this.program.body);
      return {
        output: this.context.output,
        vars: this.context.vars,
        globalVars: this.context.globalVars,
        lastResult: this.getLastResult(),
        returnValue: this.getReturnValue(),
      };
    } catch (error) {
      throw this.createExecutionError(error);
    }
  }

  private executeStatements(statements: AST.Statement[]): void {
    for (const statement of statements) {
      this.executeStatement(statement);
    }
  }

  private executeStatement(statement: AST.Statement): any {
    try {
      switch (statement.type) {
        case ASTNodeType.ExpressionStatement:
          const result = this.evaluateExpression(statement.expression);
          this.context.vars.set(LAST_RESULT, result);
          return result;
        case ASTNodeType.VariableDeclaration:
          return this.executeVariableDeclaration(statement);
        case ASTNodeType.IfStatement:
          return this.executeIfStatement(statement);
        case ASTNodeType.BlockStatement:
          return this.executeBlockStatement(statement);
        case ASTNodeType.ReturnStatement:
          return this.executeReturnStatement(statement);
        default:
          const stmt = statement as any;
          throw this.createError(
            ErrorType.RUNTIME_ERROR,
            `Unknown statement type: ${stmt.type || 'undefined'}`,
            statement
          );
      }
    } catch (error) {
      if (error instanceof MaiError) {
        throw error;
      }
      throw this.createExecutionError(error, statement);
    }
  }

  // 全局变量只在第一轮执行时初始化
  private executeVariableDeclaration(node: AST.VariableDeclaration): void {
    if (this.round > 1) return;
    for (const variable of node.variables) {
      const value = variable.init ? this.evaluateExpression(variable.init) : null;
      this.context.globalVars.set(variable.id.name, value);
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
      this.context.vars.set(RETURN_VALUE, value);
    }
  }

  private evaluateExpression(expression: AST.Expression): any {
    if (!expression || !expression.type) {
      throw this.createError(
        ErrorType.RUNTIME_ERROR,
        'Invalid expression: expression or type is undefined',
        expression
      );
    }

    try {
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
          throw this.createError(ErrorType.RUNTIME_ERROR, `Unknown expression type: ${expr.type}`, expression);
      }
    } catch (error) {
      if (error instanceof MaiError) {
        throw error;
      }
      throw this.createExecutionError(error, expression);
    }
  }

  private evaluateIdentifier(node: AST.Identifier): any {
    const name = node.name;
    const v = getVar(this.context, name);
    if (v !== undefined) {
      return v;
    }
    throw this.createReferenceError(name, node);
  }

  private evaluateBinaryExpression(node: AST.BinaryExpression): any {
    const left = this.evaluateExpression(node.left);
    const right = this.evaluateExpression(node.right);

    // broadcast nulls
    if (left === null || right === null) {
      return null;
    }

    switch (node.operator) {
      case BinaryOperator.Plus:
        return this.checkNumber(left, node.left) + this.checkNumber(right, node.right);
      case BinaryOperator.Minus:
        return this.checkNumber(left, node.left) - this.checkNumber(right, node.right);
      case BinaryOperator.Multiply:
        return this.checkNumber(left, node.left) * this.checkNumber(right, node.right);
      case BinaryOperator.Divide:
        const divisor = this.checkNumber(right, node.right);
        if (divisor === 0) {
          throw this.createError(ErrorType.DIVISION_BY_ZERO, 'Division by zero', node, {
            operator: node.operator,
            left,
            right,
          });
        }
        return this.checkNumber(left, node.left) / divisor;
      case BinaryOperator.GreaterThan:
        return this.checkNumber(left, node.left) > this.checkNumber(right, node.right);
      case BinaryOperator.LessThan:
        return this.checkNumber(left, node.left) < this.checkNumber(right, node.right);
      case BinaryOperator.GreaterThanOrEqual:
        return this.checkNumber(left, node.left) >= this.checkNumber(right, node.right);
      case BinaryOperator.LessThanOrEqual:
        return this.checkNumber(left, node.left) <= this.checkNumber(right, node.right);
      case BinaryOperator.NotEqual:
        return left !== right;
      case BinaryOperator.Equal:
        return left === right;
      case BinaryOperator.LogicalAnd:
        return this.isTruthy(left) && this.isTruthy(right);
      case BinaryOperator.LogicalOr:
        return this.isTruthy(left) || this.isTruthy(right);
      default:
        throw this.createOperatorError(node.operator, node);
    }
  }

  private evaluateAssignmentExpression(node: AST.AssignmentExpression): any {
    const rightValue = this.evaluateExpression(node.right);

    if (node.left.type !== ASTNodeType.Identifier) {
      throw this.createError(ErrorType.INVALID_ASSIGNMENT, 'Left side of assignment must be an identifier', node.left, {
        nodeType: node.left.type,
      });
    }

    const identifier = node.left as AST.Identifier;
    const varName = identifier.name;
    if (PROTECTED_WORDS.has(varName)) {
      throw this.createError(ErrorType.INVALID_ASSIGNMENT, `Cannot assign to protected word: "${varName}"`, node.left, {
        identifier: varName,
      });
    }

    switch (node.operator) {
      case AssignmentOperator.Assign:
        if (this.context.globalVars.has(varName)) {
          this.context.globalVars.set(varName, rightValue);
        } else {
          this.context.vars.set(varName, rightValue);
        }
        return rightValue;
      case AssignmentOperator.DisplayAssign:
        if (this.context.globalVars.has(varName)) {
          this.context.globalVars.set(varName, rightValue);
        } else {
          this.context.vars.set(varName, rightValue);
        }
        this.context.output[varName] = rightValue;
        return rightValue;
      case (AssignmentOperator.PowerAssign, AssignmentOperator.RangeOperator):
        throw this.createError(
          ErrorType.UNIMPLEMENTED_FEATURE,
          `"${node.operator}" operator is not implemented yet`,
          node,
          { operator: node.operator }
        );
      default:
        throw this.createOperatorError(node.operator, node);
    }
  }

  private evaluateUnaryExpression(node: AST.UnaryExpression): any {
    const argument = this.evaluateExpression(node.argument);
    switch (node.operator) {
      case UnaryOperator.Plus:
        return +this.checkNumber(argument, node.argument);
      case UnaryOperator.Minus:
        return -this.checkNumber(argument, node.argument);
      default:
        throw this.createOperatorError(node.operator, node);
    }
  }

  private evaluateCallExpression(node: AST.CallExpression): any {
    if (typeof node.callee === 'object' && node.callee.type === ASTNodeType.Identifier) {
      const identifier = node.callee as AST.Identifier;
      const builtinFunc = this.context.funcs.get(identifier.name);

      if (builtinFunc) {
        const args = node.arguments.map(arg => this.evaluateExpression(arg));
        if (!this.states.has(node)) {
          this.states.set(node, {});
        }
        // console.debug(this.context);
        return builtinFunc.execute(args, { ...this.context, state: this.states.get(node)! });
      }

      if (this.context.vars.has(identifier.name)) {
        const callee = this.context.vars.get(identifier.name);
        if (typeof callee === 'function') {
          const args = node.arguments.map(arg => this.evaluateExpression(arg));
          return callee(...args);
        }
      }

      throw this.createError(
        ErrorType.INVALID_FUNCTION_CALL,
        `Cannot call non-function: ${identifier.name}`,
        node.callee,
        { identifier: identifier.name }
      );
    }

    const callee = this.evaluateExpression(node.callee);
    const args = node.arguments.map(arg => this.evaluateExpression(arg));

    if (typeof callee === 'function') {
      return callee(...args);
    }

    throw this.createError(ErrorType.INVALID_FUNCTION_CALL, `Cannot call non-function: ${callee}`, node.callee, {
      callee: String(callee),
    });
  }

  private evaluateMemberExpression(node: AST.MemberExpression): any {
    const object = this.evaluateExpression(node.object);
    const property = node.property.name;

    if (object && typeof object === 'object') {
      return object[property];
    }

    throw this.createError(
      ErrorType.INVALID_MEMBER_ACCESS,
      `Cannot access property '${property}' of non-object: ${object}`,
      node.object,
      { property, object: String(object) }
    );
  }

  private checkNumber(value: any, node?: AST.BaseNode): number {
    if (typeof value !== 'number') {
      throw this.createTypeError(`Expected number, got ${typeof value}`, 'number', typeof value, value, node);
    }
    return value;
  }

  private isTruthy(value: any): boolean {
    return Boolean(value);
  }

  // ========== 错误处理辅助函数 ==========
  private createError(type: ErrorType, message: string, node?: AST.BaseNode, context?: Record<string, any>): MaiError {
    return new MaiError(type, message, node?.loc, context);
  }

  private createTypeError(
    message: string,
    expectedType: string,
    actualType: string,
    value: any,
    node?: AST.BaseNode
  ): MaiError {
    return this.createError(ErrorType.TYPE_ERROR, message, node, {
      expectedType,
      actualType,
      value,
      nodeType: node?.type,
    });
  }

  private createReferenceError(identifier: string, node?: AST.BaseNode): MaiError {
    return this.createError(ErrorType.UNDEFINED_VARIABLE, `Variable "${identifier}" is not defined`, node, {
      identifier,
      nodeType: node?.type,
    });
  }

  private createOperatorError(operator: string, node?: AST.BaseNode): MaiError {
    return this.createError(ErrorType.INVALID_OPERATOR, `Unknown operator: ${operator}`, node, {
      operator,
      nodeType: node?.type,
    });
  }

  private createExecutionError(error: any, node?: AST.BaseNode): MaiError {
    if (error instanceof MaiError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return this.createError(ErrorType.RUNTIME_ERROR, message, node);
  }

  // ========== 特殊变量访问方法 ==========
  getLastResult(): any {
    return this.context.vars.get(LAST_RESULT);
  }

  getReturnValue(): any {
    return this.context.vars.get(RETURN_VALUE);
  }
}

// ========== 便利函数 ==========
export function executeMai(program: AST.Program, marketData: MarketData = { O: 0, H: 0, L: 0, C: 0 }): ExecutionResult {
  const executor = new MaiExecutor(program);
  return executor.push(marketData);
}

export function executeMaiSource(
  sourceCode: string,
  marketData: MarketData = { O: 0, H: 0, L: 0, C: 0 }
): ExecutionResult {
  const parseResult = parseMai(sourceCode);
  return executeMai(parseResult.ast, marketData);
}
