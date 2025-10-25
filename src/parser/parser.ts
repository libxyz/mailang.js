import { CstNode, CstParser, IToken } from 'chevrotain';
import { allTokens, TokenName, Token, MaiLexer } from '../lexer/tokens';

function defineRules<T extends readonly string[]>(...names: T) {
  return Object.fromEntries(names.map(n => [n, n])) as {
    readonly [K in T[number]]: K;
  };
}

export const RULE_NAMES = defineRules(
  'program',
  'statement',
  'semicolonStatement',
  'noSemicolonStatement',
  'expression',
  'assignmentExpression',
  'logicalORExpression',
  'logicalANDExpression',
  'relationalExpression',
  'additiveExpression',
  'multiplicativeExpression',
  'unaryExpression',
  'postfixExpression',
  'primaryExpression',
  'variableDeclaration',
  'globalVariableDeclaration',
  'ifStatement',
  'blockStatement',
  'returnStatement',
  'expressionStatement',
  'callExpression',
  'memberExpression',
  'argumentList',
  'variableList',
  'statementSeparator'
);

export type RuleType = (typeof RULE_NAMES)[keyof typeof RULE_NAMES] | TokenName;

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
      { ALT: () => this.SUBRULE(this.statementSeparator) }, // Allow empty statements
    ]);
  });

  public semicolonStatement = this.RULE(RULE_NAMES.semicolonStatement, () => {
    this.OR([
      { ALT: () => this.SUBRULE(this.variableDeclaration) },
      { ALT: () => this.SUBRULE(this.returnStatement) },
      { ALT: () => this.SUBRULE(this.expressionStatement) },
    ]);
    this.SUBRULE(this.statementSeparator);
  });

  public statementSeparator = this.RULE(RULE_NAMES.statementSeparator, () => {
    this.OR([{ ALT: () => this.CONSUME(Token.Semicolon) }, { ALT: () => this.CONSUME(Token.NewLine) }]);
  });

  public noSemicolonStatement = this.RULE(RULE_NAMES.noSemicolonStatement, () => {
    this.OR([{ ALT: () => this.SUBRULE(this.ifStatement) }, { ALT: () => this.SUBRULE(this.blockStatement) }]);
  });

  public variableDeclaration = this.RULE(RULE_NAMES.variableDeclaration, () => {
    this.CONSUME(Token.VARIABLE);
    this.CONSUME(Token.DisplayAssign);
    this.SUBRULE(this.variableList);
  });

  // Global variable declaration is the same as regular variable declaration in syntax

  public variableList = this.RULE(RULE_NAMES.variableList, () => {
    this.AT_LEAST_ONE_SEP({
      SEP: Token.Comma,
      DEF: () => {
        this.CONSUME(Token.Identifier);
        this.OPTION(() => {
          this.CONSUME(Token.Assign);
          this.SUBRULE(this.expression);
        });
      },
    });
  });

  public ifStatement = this.RULE(RULE_NAMES.ifStatement, () => {
    this.CONSUME(Token.IF);
    this.SUBRULE(this.expression);
    this.CONSUME(Token.THEN);

    this.SUBRULE(this.blockStatement);

    this.OPTION(() => {
      this.CONSUME(Token.ELSE);
      this.OR([{ ALT: () => this.SUBRULE(this.ifStatement) }, { ALT: () => this.SUBRULE2(this.blockStatement) }]);
    });
  });

  public blockStatement = this.RULE(RULE_NAMES.blockStatement, () => {
    this.CONSUME(Token.BEGIN);
    this.MANY(() => {
      this.SUBRULE(this.statement);
    });
    this.CONSUME(Token.END);
    this.OPTION(() => {
      this.SUBRULE(this.statementSeparator);
    });
  });

  public returnStatement = this.RULE(RULE_NAMES.returnStatement, () => {
    this.CONSUME(Token.RETURN);
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
        { ALT: () => this.CONSUME(Token.Assign) },
        { ALT: () => this.CONSUME(Token.DisplayAssign) },
        { ALT: () => this.CONSUME(Token.PowerAssign) },
        { ALT: () => this.CONSUME(Token.RangeOperator) },
      ]);
      this.SUBRULE2(this.assignmentExpression);
    });
  });

  public logicalORExpression = this.RULE(RULE_NAMES.logicalORExpression, () => {
    this.SUBRULE(this.logicalANDExpression);
    this.MANY(() => {
      this.CONSUME(Token.LogicalOr);
      this.SUBRULE2(this.logicalANDExpression);
    });
  });

  public logicalANDExpression = this.RULE(RULE_NAMES.logicalANDExpression, () => {
    this.SUBRULE(this.relationalExpression);
    this.MANY(() => {
      this.CONSUME(Token.LogicalAnd);
      this.SUBRULE2(this.relationalExpression);
    });
  });

  public relationalExpression = this.RULE(RULE_NAMES.relationalExpression, () => {
    this.SUBRULE(this.additiveExpression);
    this.MANY(() => {
      this.OR([
        { ALT: () => this.CONSUME(Token.GreaterThan) },
        { ALT: () => this.CONSUME(Token.LessThan) },
        { ALT: () => this.CONSUME(Token.GreaterThanOrEqual) },
        { ALT: () => this.CONSUME(Token.LessThanOrEqual) },
        { ALT: () => this.CONSUME(Token.NotEqual) },
        { ALT: () => this.CONSUME(Token.Equal) },
      ]);
      this.SUBRULE2(this.additiveExpression);
    });
  });

  public additiveExpression = this.RULE(RULE_NAMES.additiveExpression, () => {
    this.SUBRULE(this.multiplicativeExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Token.Plus) }, { ALT: () => this.CONSUME(Token.Minus) }]);
      this.SUBRULE2(this.multiplicativeExpression);
    });
  });

  public multiplicativeExpression = this.RULE(RULE_NAMES.multiplicativeExpression, () => {
    this.SUBRULE(this.unaryExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.CONSUME(Token.Multiply) }, { ALT: () => this.CONSUME(Token.Divide) }]);
      this.SUBRULE2(this.unaryExpression);
    });
  });

  public unaryExpression = this.RULE(RULE_NAMES.unaryExpression, () => {
    this.OR([
      {
        ALT: () => {
          this.CONSUME(Token.Plus);
          this.SUBRULE(this.unaryExpression);
        },
      },
      {
        ALT: () => {
          this.CONSUME(Token.Minus);
          this.SUBRULE2(this.unaryExpression);
        },
      },
      { ALT: () => this.SUBRULE(this.postfixExpression) },
    ]);
  });

  public postfixExpression = this.RULE(RULE_NAMES.postfixExpression, () => {
    this.SUBRULE(this.primaryExpression);
    this.MANY(() => {
      this.OR([{ ALT: () => this.SUBRULE(this.callExpression) }, { ALT: () => this.SUBRULE(this.memberExpression) }]);
    });
  });

  public primaryExpression = this.RULE(RULE_NAMES.primaryExpression, () => {
    this.OR([
      { ALT: () => this.CONSUME(Token.NumberLiteral) },
      { ALT: () => this.CONSUME(Token.StringLiteral) },
      { ALT: () => this.CONSUME(Token.Identifier) },
      {
        ALT: () => {
          this.CONSUME(Token.LParen);
          this.SUBRULE(this.expression);
          this.CONSUME(Token.RParen);
        },
      },
    ]);
  });

  public callExpression = this.RULE(RULE_NAMES.callExpression, () => {
    this.CONSUME(Token.LParen);
    this.OPTION(() => {
      this.SUBRULE(this.argumentList);
    });
    this.CONSUME(Token.RParen);
  });

  public memberExpression = this.RULE(RULE_NAMES.memberExpression, () => {
    this.CONSUME(Token.Dot);
    this.CONSUME(Token.Identifier);
  });

  public argumentList = this.RULE(RULE_NAMES.argumentList, () => {
    this.SUBRULE(this.expression);
    this.MANY(() => {
      this.CONSUME(Token.Comma);
      this.SUBRULE2(this.expression);
    });
  });
}

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

// Create parser instance
const parser = new MaiParser();

// Helper function to parse input
export function parse(inputText: string) {
  inputText = inputText + '\n';
  const lexResult = MaiLexer.tokenize(inputText);

  if (lexResult.errors.length > 0) {
    throw new Error('[LexingErr] ' + lexResult.errors.map(e => e.message).join('\n'));
  }

  parser.input = lexResult.tokens;
  const cst = parser.program();

  if (parser.errors.length > 0) {
    throw new Error('[ParsingErr] ' + parser.errors.join('\n'));
  }

  return {
    cst,
    lexResult,
  };
}
