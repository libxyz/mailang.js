import { CstNode, IToken, CstElement, tokenMatcher } from 'chevrotain';
import * as AST from './types';
import { ASTNodeType, BinaryOperator, AssignmentOperator, UnaryOperator } from './enums';
import {
  Plus,
  Minus,
  Multiply,
  Divide,
  GreaterThan,
  LessThan,
  GreaterThanOrEqual,
  LessThanOrEqual,
  NotEqual,
  Equal,
  LogicalAnd,
  LogicalOr,
} from '../lexer/tokens';

function getLocation(token: IToken): AST.SourceLocation {
  return {
    start: {
      line: token.startLine ?? 1,
      column: token.startColumn ?? 1,
    },
    end: {
      line: token.endLine ?? 1,
      column: token.endColumn ?? 1,
    },
  };
}

function getNodeLocation(node: CstNode): AST.SourceLocation | undefined {
  if (!node.location) return undefined;

  return {
    start: {
      line: node.location.startLine ?? 1,
      column: node.location.startColumn ?? 1,
    },
    end: {
      line: node.location.endLine ?? 1,
      column: node.location.endColumn ?? 1,
    },
  };
}

function isToken(element: CstElement): element is IToken {
  return 'image' in element && 'tokenType' in element;
}

function isCstNode(element: CstElement): element is CstNode {
  return 'name' in element && 'children' in element;
}

export class ASTBuilder {
  private getOperatorImage(operator: CstElement): BinaryOperator {
    if (!isToken(operator)) throw new Error('Expected token');

    // Use tokenMatcher to check token types directly - much more reliable than string matching
    if (tokenMatcher(operator, Plus)) return BinaryOperator.Plus;
    if (tokenMatcher(operator, Minus)) return BinaryOperator.Minus;
    if (tokenMatcher(operator, Multiply)) return BinaryOperator.Multiply;
    if (tokenMatcher(operator, Divide)) return BinaryOperator.Divide;
    if (tokenMatcher(operator, GreaterThan)) return BinaryOperator.GreaterThan;
    if (tokenMatcher(operator, LessThan)) return BinaryOperator.LessThan;
    if (tokenMatcher(operator, GreaterThanOrEqual)) return BinaryOperator.GreaterThanOrEqual;
    if (tokenMatcher(operator, LessThanOrEqual)) return BinaryOperator.LessThanOrEqual;
    if (tokenMatcher(operator, NotEqual)) return BinaryOperator.NotEqual;
    if (tokenMatcher(operator, Equal)) return BinaryOperator.Equal;
    if (tokenMatcher(operator, LogicalAnd)) return BinaryOperator.LogicalAnd;
    if (tokenMatcher(operator, LogicalOr)) return BinaryOperator.LogicalOr;

    throw new Error(`Unknown binary operator token: ${operator.tokenType.name}`);
  }

  private visit(ctx: any): any {
    if (Array.isArray(ctx)) {
      return ctx.map(item => this.visit(item));
    }

    if (!ctx || typeof ctx !== 'object') {
      return ctx;
    }

    const nodeName = ctx.name;
    if (!nodeName) {
      return ctx;
    }

    const visitorMethod = (this as any)[`visit${nodeName}`];
    if (visitorMethod) {
      return visitorMethod.call(this, ctx);
    }

    // Default handling for tokens
    if (ctx.tokenType) {
      return this.visitToken(ctx);
    }

    // For unknown CST nodes, try to visit their children
    if (ctx.children) {
      return this.visit(ctx.children);
    }

    return ctx;
  }

  private visitToken(token: IToken): any {
    return token;
  }

  public visitProgram(ctx: CstNode): AST.Program {
    const statements =
      ctx.children.statement
        ?.map((stmt: CstElement) => {
          if (isCstNode(stmt)) {
            return this.visitStatement(stmt);
          }
          return null;
        })
        .filter((stmt): stmt is AST.Statement => stmt !== null) || [];

    return {
      type: ASTNodeType.Program,
      body: statements,
      loc: getNodeLocation(ctx),
    };
  }

  public visitStatement(ctx: CstNode): AST.Statement {
    // Try each statement type
    if (ctx.children.semicolonStatement) {
      const stmtElement = ctx.children.semicolonStatement[0];
      if (!isCstNode(stmtElement)) throw new Error('Expected CST node');
      return this.visitSemicolonStatement(stmtElement);
    }
    if (ctx.children.noSemicolonStatement) {
      const stmtElement = ctx.children.noSemicolonStatement[0];
      if (!isCstNode(stmtElement)) throw new Error('Expected CST node');
      return this.visitNoSemicolonStatement(stmtElement);
    }

    throw new Error('Unknown statement type');
  }

  public visitSemicolonStatement(ctx: CstNode): AST.Statement {
    // Try each semicolon statement type
    if (ctx.children.variableDeclaration) {
      const varDeclElement = ctx.children.variableDeclaration[0];
      if (!isCstNode(varDeclElement)) throw new Error('Expected CST node');
      return this.visitVariableDeclaration(varDeclElement);
    }
    if (ctx.children.returnStatement) {
      const returnStmtElement = ctx.children.returnStatement[0];
      if (!isCstNode(returnStmtElement)) throw new Error('Expected CST node');
      return this.visitReturnStatement(returnStmtElement);
    }
    if (ctx.children.expressionStatement) {
      const exprStmtElement = ctx.children.expressionStatement[0];
      if (!isCstNode(exprStmtElement)) throw new Error('Expected CST node');
      return this.visitExpressionStatement(exprStmtElement);
    }

    throw new Error('Unknown semicolon statement type');
  }

  public visitNoSemicolonStatement(ctx: CstNode): AST.Statement {
    // Try each no-semicolon statement type
    if (ctx.children.ifStatement) {
      const ifStmtElement = ctx.children.ifStatement[0];
      if (!isCstNode(ifStmtElement)) throw new Error('Expected CST node');
      return this.visitIfStatement(ifStmtElement);
    }
    if (ctx.children.blockStatement) {
      const blockStmtElement = ctx.children.blockStatement[0];
      if (!isCstNode(blockStmtElement)) throw new Error('Expected CST node');
      return this.visitBlockStatement(blockStmtElement);
    }

    throw new Error('Unknown no-semicolon statement type');
  }

  public visitVariableDeclaration(ctx: CstNode): AST.VariableDeclaration {
    const varListElement = ctx.children.variableList![0];
    if (!isCstNode(varListElement)) throw new Error('Expected CST node');
    const variables = this.visitVariableList(varListElement);

    return {
      type: ASTNodeType.VariableDeclaration,
      variables,
      loc: getNodeLocation(ctx),
    };
  }

  public visitVariableList(ctx: CstNode): Array<{ id: AST.Identifier; init?: AST.Expression }> {
    const variables: Array<{ id: AST.Identifier; init?: AST.Expression }> = [];
    const identifiers = ctx.children.Identifier || [];
    const expressions = ctx.children.expression || [];

    for (let i = 0; i < identifiers.length; i++) {
      const idElement = identifiers[i];
      if (!isToken(idElement)) continue;

      const id: AST.Identifier = {
        type: ASTNodeType.Identifier,
        name: idElement.image,
        loc: getLocation(idElement),
      };

      let init: AST.Expression | undefined;
      if (ctx.children.Assign && i < expressions.length) {
        const exprElement = expressions[i];
        if (isCstNode(exprElement)) {
          init = this.visitExpression(exprElement);
        }
      }

      variables.push({ id, init });
    }

    return variables;
  }

  public visitIfStatement(ctx: CstNode): AST.IfStatement {
    const testElement = ctx.children.expression![0];
    if (!isCstNode(testElement)) throw new Error('Expected CST node');
    const test = this.visitExpression(testElement);

    // Extract statements for consequent (between THEN and END/ELSE)
    const statements = ctx.children.statement || [];
    let consequent: AST.BlockStatement;

    if (statements.length === 1) {
      // Single statement case
      const stmtElement = statements[0];
      if (!isCstNode(stmtElement)) throw new Error('Expected statement');
      const stmt = this.visitStatement(stmtElement);
      consequent = {
        type: ASTNodeType.BlockStatement,
        body: [stmt],
        loc: getNodeLocation(ctx),
      };
    } else if (statements.length > 1) {
      // Multiple statements case - need to determine which are consequent vs alternate
      let consequentEnd = statements.length;
      if (ctx.children.ELSE) {
        // Split statements between consequent and alternate
        consequentEnd = Math.floor(statements.length / 2);
      }

      const consequentStatements = statements.slice(0, consequentEnd).map((stmt: CstElement) => {
        if (!isCstNode(stmt)) throw new Error('Expected statement');
        return this.visitStatement(stmt);
      });

      consequent = {
        type: ASTNodeType.BlockStatement,
        body: consequentStatements,
        loc: getNodeLocation(ctx),
      };
    } else {
      // No statements
      consequent = {
        type: ASTNodeType.BlockStatement,
        body: [],
        loc: getNodeLocation(ctx),
      };
    }

    let alternate: AST.Statement | undefined;
    if (ctx.children.ELSE) {
      // Extract statements for alternate (after ELSE)
      let alternateStatements: AST.Statement[];

      if (statements.length > 1) {
        const alternateStart = Math.floor(statements.length / 2);
        alternateStatements = statements.slice(alternateStart).map((stmt: CstElement) => {
          if (!isCstNode(stmt)) throw new Error('Expected statement');
          return this.visitStatement(stmt);
        });
      } else {
        // If there's an ELSE but only one statement, this might be an error in grammar
        alternateStatements = [];
      }

      alternate = {
        type: ASTNodeType.BlockStatement,
        body: alternateStatements,
        loc: getNodeLocation(ctx),
      };
    }

    return {
      type: ASTNodeType.IfStatement,
      test,
      consequent,
      alternate,
      loc: getNodeLocation(ctx),
    };
  }

  public visitBlockStatement(ctx: CstNode): AST.BlockStatement {
    const statements =
      ctx.children.statement?.map((stmt: CstElement) => {
        if (isCstNode(stmt)) {
          return this.visitStatement(stmt);
        }
        throw new Error('Expected CST node');
      }) || [];

    return {
      type: ASTNodeType.BlockStatement,
      body: statements,
      loc: getNodeLocation(ctx),
    };
  }

  public visitReturnStatement(ctx: CstNode): AST.ReturnStatement {
    let argument: AST.Expression | undefined;
    if (ctx.children.expression) {
      const exprElement = ctx.children.expression[0];
      if (!isCstNode(exprElement)) throw new Error('Expected CST node');
      argument = this.visitExpression(exprElement);
    }

    return {
      type: ASTNodeType.ReturnStatement,
      argument,
      loc: getNodeLocation(ctx),
    };
  }

  public visitExpressionStatement(ctx: CstNode): AST.ExpressionStatement {
    const exprElement = ctx.children.expression![0];
    if (!isCstNode(exprElement)) throw new Error('Expected CST node');
    const expression = this.visitExpression(exprElement);

    return {
      type: ASTNodeType.ExpressionStatement,
      expression,
      loc: getNodeLocation(ctx),
    };
  }

  public visitExpression(ctx: CstNode): AST.Expression {
    const exprElement = ctx.children.assignmentExpression![0];
    if (!isCstNode(exprElement)) throw new Error('Expected CST node');
    return this.visitAssignmentExpression(exprElement);
  }

  public visitAssignmentExpression(ctx: CstNode): AST.Expression {
    const leftElement = ctx.children.logicalORExpression![0];
    if (!isCstNode(leftElement)) throw new Error('Expected CST node');
    const left = this.visitLogicalORExpression(leftElement);

    if (ctx.children.Assign || ctx.children.DisplayAssign || ctx.children.PowerAssign || ctx.children.RangeOperator) {
      const operator =
        ctx.children.Assign?.[0] ||
        ctx.children.DisplayAssign?.[0] ||
        ctx.children.PowerAssign?.[0] ||
        ctx.children.RangeOperator?.[0];
      if (!operator || !isToken(operator)) throw new Error('Expected token');

      const rightElement = ctx.children.assignmentExpression![0];
      if (!isCstNode(rightElement)) throw new Error('Expected CST node');
      const right = this.visitAssignmentExpression(rightElement);

      return {
        type: ASTNodeType.AssignmentExpression,
        operator: operator.image as AssignmentOperator,
        left,
        right,
        loc: getNodeLocation(ctx),
      };
    }

    return left;
  }

  public visitLogicalORExpression(ctx: CstNode): AST.Expression {
    const leftElement = ctx.children.logicalANDExpression![0];
    if (!isCstNode(leftElement)) throw new Error('Expected CST node');
    let left = this.visitLogicalANDExpression(leftElement);

    if (ctx.children.LogicalOr) {
      for (let i = 0; i < ctx.children.LogicalOr.length; i++) {
        const operatorElement = ctx.children.LogicalOr[i];
        if (!isToken(operatorElement)) throw new Error('Expected token');
        const rightElement = ctx.children.logicalANDExpression![i + 1];
        if (!isCstNode(rightElement)) throw new Error('Expected CST node');
        const right = this.visitLogicalANDExpression(rightElement);

        left = {
          type: ASTNodeType.BinaryExpression,
          operator: BinaryOperator.LogicalOr,
          left,
          right,
          loc: getNodeLocation(ctx),
        };
      }
    }

    return left;
  }

  public visitLogicalANDExpression(ctx: CstNode): AST.Expression {
    const leftElement = ctx.children.relationalExpression![0];
    if (!isCstNode(leftElement)) throw new Error('Expected CST node');
    let left = this.visitRelationalExpression(leftElement);

    if (ctx.children.LogicalAnd) {
      for (let i = 0; i < ctx.children.LogicalAnd.length; i++) {
        const operatorElement = ctx.children.LogicalAnd[i];
        if (!isToken(operatorElement)) throw new Error('Expected token');
        const rightElement = ctx.children.relationalExpression![i + 1];
        if (!isCstNode(rightElement)) throw new Error('Expected CST node');
        const right = this.visitRelationalExpression(rightElement);

        left = {
          type: ASTNodeType.BinaryExpression,
          operator: BinaryOperator.LogicalAnd,
          left,
          right,
          loc: getNodeLocation(ctx),
        };
      }
    }

    return left;
  }

  public visitRelationalExpression(ctx: CstNode): AST.Expression {
    const leftElement = ctx.children.additiveExpression![0];
    if (!isCstNode(leftElement)) throw new Error('Expected CST node');
    let left = this.visitAdditiveExpression(leftElement);

    const operators = [
      ...(ctx.children.GreaterThan || []),
      ...(ctx.children.LessThan || []),
      ...(ctx.children.GreaterThanOrEqual || []),
      ...(ctx.children.LessThanOrEqual || []),
      ...(ctx.children.NotEqual || []),
      ...(ctx.children.Equal || []),
    ];

    if (operators.length > 0) {
      for (let i = 0; i < operators.length; i++) {
        const operator = operators[i];
        const operatorImage = this.getOperatorImage(operator);
        const rightElement = ctx.children.additiveExpression![i + 1];
        if (!isCstNode(rightElement)) throw new Error('Expected CST node');
        const right = this.visitAdditiveExpression(rightElement);

        left = {
          type: ASTNodeType.BinaryExpression,
          operator: operatorImage,
          left,
          right,
          loc: getNodeLocation(ctx),
        };
      }
    }

    return left;
  }

  public visitAdditiveExpression(ctx: CstNode): AST.Expression {
    const leftElement = ctx.children.multiplicativeExpression![0];
    if (!isCstNode(leftElement)) throw new Error('Expected CST node');
    let left = this.visitMultiplicativeExpression(leftElement);

    if (ctx.children.Plus || ctx.children.Minus) {
      const operators = [...(ctx.children.Plus || []), ...(ctx.children.Minus || [])].sort((a, b) => {
        const aToken = isToken(a) ? a.startOffset || 0 : 0;
        const bToken = isToken(b) ? b.startOffset || 0 : 0;
        return aToken - bToken;
      });

      for (let i = 0; i < operators.length; i++) {
        const operator = operators[i];
        const operatorImage = this.getOperatorImage(operator);
        const rightElement = ctx.children.multiplicativeExpression![i + 1];
        if (!isCstNode(rightElement)) throw new Error('Expected CST node');
        const right = this.visitMultiplicativeExpression(rightElement);

        left = {
          type: ASTNodeType.BinaryExpression,
          operator: operatorImage,
          left,
          right,
          loc: getNodeLocation(ctx),
        };
      }
    }

    return left;
  }

  public visitMultiplicativeExpression(ctx: CstNode): AST.Expression {
    const leftElement = ctx.children.unaryExpression![0];
    if (!isCstNode(leftElement)) throw new Error('Expected CST node');
    let left = this.visitUnaryExpression(leftElement);

    if (ctx.children.Multiply || ctx.children.Divide) {
      const operators = [...(ctx.children.Multiply || []), ...(ctx.children.Divide || [])].sort((a, b) => {
        const aToken = isToken(a) ? a.startOffset || 0 : 0;
        const bToken = isToken(b) ? b.startOffset || 0 : 0;
        return aToken - bToken;
      });

      for (let i = 0; i < operators.length; i++) {
        const operator = operators[i];
        const operatorImage = this.getOperatorImage(operator);
        const rightElement = ctx.children.unaryExpression![i + 1];
        if (!isCstNode(rightElement)) throw new Error('Expected CST node');
        const right = this.visitUnaryExpression(rightElement);

        left = {
          type: ASTNodeType.BinaryExpression,
          operator: operatorImage,
          left,
          right,
          loc: getNodeLocation(ctx),
        };
      }
    }

    return left;
  }

  public visitUnaryExpression(ctx: CstNode): AST.Expression {
    if (ctx.children.Plus || ctx.children.Minus) {
      const operatorElement = ctx.children.Plus?.[0] || ctx.children.Minus?.[0];
      if (!isToken(operatorElement)) throw new Error('Expected token');
      const argElement = ctx.children.unaryExpression![0];
      if (!isCstNode(argElement)) throw new Error('Expected CST node');
      const argument = this.visitUnaryExpression(argElement);

      const operator = operatorElement.image === '+' ? UnaryOperator.Plus : UnaryOperator.Minus;

      return {
        type: ASTNodeType.UnaryExpression,
        operator: operator,
        argument,
        loc: getNodeLocation(ctx),
      };
    }

    const postfixElement = ctx.children.postfixExpression![0];
    if (!isCstNode(postfixElement)) throw new Error('Expected CST node');
    return this.visitPostfixExpression(postfixElement);
  }

  public visitPostfixExpression(ctx: CstNode): AST.Expression {
    const primaryElement = ctx.children.primaryExpression![0];
    if (!isCstNode(primaryElement)) throw new Error('Expected CST node');
    let expr = this.visitPrimaryExpression(primaryElement);

    if (ctx.children.callExpression) {
      for (const callCtx of ctx.children.callExpression) {
        if (isCstNode(callCtx)) {
          expr = this.visitCallExpression(callCtx, expr);
        }
      }
    }

    if (ctx.children.memberExpression) {
      for (const memberCtx of ctx.children.memberExpression) {
        if (isCstNode(memberCtx)) {
          expr = this.visitMemberExpression(memberCtx, expr);
        }
      }
    }

    return expr;
  }

  public visitPrimaryExpression(ctx: CstNode): AST.Expression {
    if (ctx.children.NumberLiteral) {
      const element = ctx.children.NumberLiteral[0];
      if (!isToken(element)) throw new Error('Expected token');
      return {
        type: ASTNodeType.NumberLiteral,
        value: parseFloat(element.image),
        loc: getLocation(element),
      };
    }

    if (ctx.children.StringLiteral) {
      const element = ctx.children.StringLiteral[0];
      if (!isToken(element)) throw new Error('Expected token');
      return {
        type: ASTNodeType.StringLiteral,
        value: element.image.slice(1, -1), // Remove quotes
        loc: getLocation(element),
      };
    }

    if (ctx.children.Identifier) {
      const element = ctx.children.Identifier[0];
      if (!isToken(element)) throw new Error('Expected token');
      return {
        type: ASTNodeType.Identifier,
        name: element.image,
        loc: getLocation(element),
      };
    }

    // Reserved keywords O, H, L, C
    const reservedTokens = ['O', 'H', 'L', 'C'];
    for (const reserved of reservedTokens) {
      if (ctx.children[reserved]) {
        const element = ctx.children[reserved][0];
        if (!isToken(element)) continue;
        return {
          type: ASTNodeType.Identifier,
          name: element.image,
          loc: getLocation(element),
        };
      }
    }

    if (ctx.children.expression) {
      const element = ctx.children.expression[0];
      if (isCstNode(element)) {
        return this.visitExpression(element);
      }
    }

    throw new Error('Unknown primary expression');
  }

  public visitCallExpression(ctx: CstNode, callee: AST.Expression): AST.CallExpression {
    const args = ctx.children.argumentList ? this.visitArgumentList(ctx.children.argumentList[0] as CstNode) : [];

    return {
      type: ASTNodeType.CallExpression,
      callee,
      arguments: args,
      loc: getNodeLocation(ctx),
    };
  }

  public visitMemberExpression(ctx: CstNode, object: AST.Expression): AST.MemberExpression {
    const propertyElement = ctx.children.Identifier![0];
    if (!isToken(propertyElement)) throw new Error('Expected token');
    const property: AST.Identifier = {
      type: ASTNodeType.Identifier,
      name: propertyElement.image,
      loc: getLocation(propertyElement),
    };

    return {
      type: ASTNodeType.MemberExpression,
      object,
      property,
      computed: false,
      loc: getNodeLocation(ctx),
    };
  }

  public visitArgumentList(ctx: CstNode): AST.Expression[] {
    return (
      ctx.children.expression?.map((expr: CstElement) => {
        if (isCstNode(expr)) {
          return this.visitExpression(expr);
        }
        throw new Error('Expected CST node');
      }) || []
    );
  }

  public build(cst: CstNode): AST.Program {
    return this.visitProgram(cst);
  }
}

export function buildAST(cst: CstNode): AST.Program {
  const builder = new ASTBuilder();
  return builder.build(cst);
}
