import { CstParser, IToken, CstNode, tokenMatcher, Lexer } from 'chevrotain';

import {
  allTokens,
  MaiLexer,
  NumberLiteral,
  StringLiteral,
  Identifier,
  O,
  H,
  L,
  C,
  VARIABLE,
  IF,
  THEN,
  ELSE,
  BEGIN,
  END,
  RETURN,
  Multiply,
  Divide,
  Plus,
  Minus,
  GreaterThan,
  LessThan,
  GreaterThanOrEqual,
  LessThanOrEqual,
  NotEqual,
  Equal,
  LogicalAnd,
  LogicalOr,
  Assign,
  DisplayAssign,
  PowerAssign,
  RangeOperator,
  Semicolon,
  Comma,
  Colon,
  LParen,
  RParen,
  LBracket,
  RBracket,
  Dot,
} from '../lexer/tokens';

// Parser rule names
export const RULE_NAMES = {
  program: 'program',
  statement: 'statement',
  semicolonStatement: 'semicolonStatement',
  noSemicolonStatement: 'noSemicolonStatement',
  expression: 'expression',
  assignmentExpression: 'assignmentExpression',
  logicalORExpression: 'logicalORExpression',
  logicalANDExpression: 'logicalANDExpression',
  relationalExpression: 'relationalExpression',
  additiveExpression: 'additiveExpression',
  multiplicativeExpression: 'multiplicativeExpression',
  unaryExpression: 'unaryExpression',
  postfixExpression: 'postfixExpression',
  primaryExpression: 'primaryExpression',
  variableDeclaration: 'variableDeclaration',
  globalVariableDeclaration: 'globalVariableDeclaration',
  ifStatement: 'ifStatement',
  blockStatement: 'blockStatement',
  returnStatement: 'returnStatement',
  expressionStatement: 'expressionStatement',
  callExpression: 'callExpression',
  memberExpression: 'memberExpression',
  argumentList: 'argumentList',
  variableList: 'variableList',
} as const;

class MaiParser extends CstParser {
  constructor() {
    super(allTokens, {
      recoveryEnabled: true,
      nodeLocationTracking: 'full',
    });

    this.performSelfAnalysis();
  }

  // Program rule
  public program = this.RULE(RULE_NAMES.program, () => {
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
  });

  // Statement rules
  public statement = this.RULE(RULE_NAMES.statement, () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.semicolonStatement) },
      { ALT: () => this.SUBRULE(this.noSemicolonStatement) },
    ]);
  });

  public semicolonStatement = this.RULE(RULE_NAMES.semicolonStatement, () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.variableDeclaration) },
      { ALT: () => this.SUBRULE(this.returnStatement) },
      { ALT: () => this.SUBRULE(this.expressionStatement) },
    ]);
    this.CONSUME(Semicolon);
  });

  public noSemicolonStatement = this.RULE(RULE_NAMES.noSemicolonStatement, () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.ifStatement) },
      { ALT: () => this.SUBRULE(this.blockStatement) },
    ]);
  });

  public variableDeclaration = this.RULE(RULE_NAMES.variableDeclaration, () => {
    this.CONSUME(VARIABLE);
    this.CONSUME(DisplayAssign);
    this.SUBRULE(this.variableList);
  });

  // Global variable declaration is the same as regular variable declaration in syntax

  public variableList = this.RULE(RULE_NAMES.variableList, () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Comma,
      DEF: () => {
        this.CONSUME(Identifier);
        this.OPTION(() => {
          this.CONSUME(Assign);
          this.SUBRULE(this.expression);
        });
      },
    });
  });

  public ifStatement = this.RULE(RULE_NAMES.ifStatement, () => {
    this.CONSUME(IF);
    this.SUBRULE(this.expression);
    this.CONSUME(THEN);
    this.CONSUME(BEGIN);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(END);
    this.OPTION(() => {
      this.CONSUME(ELSE);
      this.CONSUME2(BEGIN);
      this.MANY2(() => {
        this.SUBRULE2(this.statement);
      });
      this.CONSUME2(END);
    });
  });

  public blockStatement = this.RULE(RULE_NAMES.blockStatement, () => {
    this.CONSUME(BEGIN);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(END);
  });

  public returnStatement = this.RULE(RULE_NAMES.returnStatement, () => {
    this.CONSUME(RETURN);
    this.OPTION(() => {
      this.SUBRULE(this.expression);
    });
  });

  public expressionStatement = this.RULE(RULE_NAMES.expressionStatement, () => {
    this.SUBRULE(this.expression);
  });

  // Expression rules (following operator precedence)
  public expression = this.RULE(RULE_NAMES.expression, () => {
    this.SUBRULE(this.assignmentExpression);
  });

  public assignmentExpression = this.RULE(RULE_NAMES.assignmentExpression, () => {
    this.SUBRULE(this.logicalORExpression);
    this.OPTION(() => {
      this.OR([
        { ALT: () => this.CONSUME(Assign) },
        { ALT: () => this.CONSUME(DisplayAssign) },
        { ALT: () => this.CONSUME(PowerAssign) },
        { ALT: () => this.CONSUME(RangeOperator) },
      ]);
      this.SUBRULE2(this.assignmentExpression);
    });
  });

  public logicalORExpression = this.RULE(RULE_NAMES.logicalORExpression, () => {
    this.SUBRULE(this.logicalANDExpression);
    this.MANY(() => {
      this.CONSUME(LogicalOr);
      this.SUBRULE2(this.logicalANDExpression);
    });
  });

  public logicalANDExpression = this.RULE(RULE_NAMES.logicalANDExpression, () => {
    this.SUBRULE(this.relationalExpression);
    this.MANY(() => {
      this.CONSUME(LogicalAnd);
      this.SUBRULE2(this.relationalExpression);
    });
  });

  public relationalExpression = this.RULE(RULE_NAMES.relationalExpression, () => {
    this.SUBRULE(this.additiveExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(GreaterThan) },
        { ALT: () => this.CONSUME(LessThan) },
        { ALT: () => this.CONSUME(GreaterThanOrEqual) },
        { ALT: () => this.CONSUME(LessThanOrEqual) },
        { ALT: () => this.CONSUME(NotEqual) },
        { ALT: () => this.CONSUME(Equal) },
      ]);
      this.SUBRULE2(this.additiveExpression);
    });
  });

  public additiveExpression = this.RULE(RULE_NAMES.additiveExpression, () => {
    this.SUBRULE(this.multiplicativeExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Plus) }, { ALT: () => this.CONSUME(Minus) }]);
      this.SUBRULE2(this.multiplicativeExpression);
    });
  });

  public multiplicativeExpression = this.RULE(RULE_NAMES.multiplicativeExpression, () => {
    this.SUBRULE(this.unaryExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Multiply) }, { ALT: () => this.CONSUME(Divide) }]);
      this.SUBRULE2(this.unaryExpression);
    });
  });

  public unaryExpression = this.RULE(RULE_NAMES.unaryExpression, () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Plus);
          this.SUBRULE(this.unaryExpression);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Minus);
          this.SUBRULE2(this.unaryExpression);
        },
      },
      { ALT: () => this.SUBRULE(this.postfixExpression) },
    ]);
  });

  public postfixExpression = this.RULE(RULE_NAMES.postfixExpression, () => {
    this.SUBRULE(this.primaryExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.SUBRULE(this.callExpression) },
        { ALT: () => this.SUBRULE(this.memberExpression) },
      ]);
    });
  });

  public primaryExpression = this.RULE(RULE_NAMES.primaryExpression, () => {
    this.OR([
      { ALT: () => this.CONSUME(NumberLiteral) },
      { ALT: () => this.CONSUME(StringLiteral) },
      { ALT: () => this.CONSUME(Identifier) },
      { ALT: () => this.CONSUME(O) },
      { ALT: () => this.CONSUME(H) },
      { ALT: () => this.CONSUME(L) },
      { ALT: () => this.CONSUME(C) },
      {
        ALT: () => {
          this.CONSUME(LParen);
          this.SUBRULE(this.expression);
          this.CONSUME(RParen);
        },
      },
    ]);
  });

  public callExpression = this.RULE(RULE_NAMES.callExpression, () => {
    this.CONSUME(LParen);
    this.OPTION(() => {
      this.SUBRULE(this.argumentList);
    });
    this.CONSUME(RParen);
  });

  public memberExpression = this.RULE(RULE_NAMES.memberExpression, () => {
    this.CONSUME(Dot);
    this.CONSUME(Identifier);
  });

  public argumentList = this.RULE(RULE_NAMES.argumentList, () => {
    this.SUBRULE(this.expression);
    this.MANY(() => {
      this.CONSUME(Comma);
      this.SUBRULE2(this.expression);
    });
  });
}

// Create parser instance
export const parser = new MaiParser();

// CST visitor for traversing the parse tree
export interface CstVisitor {
  visit(node: CstNode | IToken[]): any;
  visitProgram?(ctx: any): any;
  visitStatement?(ctx: any): any;
  visitExpression?(ctx: any): any;
  visitAssignmentExpression?(ctx: any): any;
  visitLogicalORExpression?(ctx: any): any;
  visitLogicalANDExpression?(ctx: any): any;
  visitRelationalExpression?(ctx: any): any;
  visitAdditiveExpression?(ctx: any): any;
  visitMultiplicativeExpression?(ctx: any): any;
  visitUnaryExpression?(ctx: any): any;
  visitPostfixExpression?(ctx: any): any;
  visitPrimaryExpression?(ctx: any): any;
  visitVariableDeclaration?(ctx: any): any;
  visitGlobalVariableDeclaration?(ctx: any): any;
  visitIfStatement?(ctx: any): any;
  visitBlockStatement?(ctx: any): any;
  visitReturnStatement?(ctx: any): any;
  visitExpressionStatement?(ctx: any): any;
  visitCallExpression?(ctx: any): any;
  visitMemberExpression?(ctx: any): any;
}

// Helper function to parse input
export function parse(inputText: string) {
  const lexResult = MaiLexer.tokenize(inputText);

  if (lexResult.errors.length > 0) {
    throw new Error('Lexing errors: ' + lexResult.errors.map(e => e.message).join(', '));
  }

  parser.input = lexResult.tokens;
  const cst = parser.program();

  if (parser.errors.length > 0) {
    throw new Error('Parsing errors: ' + parser.errors.map(e => e.message).join(', '));
  }

  return {
    cst,
    lexResult,
    parserErrors: parser.errors,
  };
}
