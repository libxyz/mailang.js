import { parseMai } from '../index';
import * as AST from '../ast/types';
import { ASTNodeType, BinaryOperator, AssignmentOperator, UnaryOperator } from '../ast/enums';

function getExpression(statement: AST.Statement): AST.Expression {
  if (statement.type === ASTNodeType.ExpressionStatement) {
    return statement.expression;
  }
  throw new Error('Statement is not an ExpressionStatement');
}

function expectExpression(result: any, index: number, expected: any) {
  const stmt = result.ast.body[index];
  expect(stmt.type).toBe(ASTNodeType.ExpressionStatement);
  expect(getExpression(stmt)).toMatchObject(expected);
}

describe('Mai Language Parser', () => {
  describe('Basic Expressions', () => {
    test('should parse number literals', () => {
      const result = parseMai('42;');
      expect(result.ast.body).toHaveLength(1);
      expect(result.ast.body[0]).toMatchObject({
        type: ASTNodeType.ExpressionStatement,
      });
      expectExpression(result, 0, {
        type: ASTNodeType.NumberLiteral,
        value: 42,
      });
    });

    test('should parse string literals', () => {
      const result = parseMai('"hello world";');
      expect(result.ast.body).toHaveLength(1);
      expectExpression(result, 0, {
        type: ASTNodeType.StringLiteral,
        value: 'hello world',
      });
    });

    test('should parse identifiers', () => {
      const result = parseMai('myVariable;');
      expect(result.ast.body).toHaveLength(1);
      expectExpression(result, 0, {
        type: ASTNodeType.Identifier,
        name: 'myVariable',
      });
    });

    test('should parse reserved market data keywords', () => {
      const result = parseMai('O; H; L; C;');
      expect(result.ast.body).toHaveLength(4);
      expectExpression(result, 0, {
        type: 'Identifier',
        name: 'O',
      });
      expectExpression(result, 1, {
        type: 'Identifier',
        name: 'H',
      });
      expectExpression(result, 2, {
        type: 'Identifier',
        name: 'L',
      });
      expectExpression(result, 3, {
        type: 'Identifier',
        name: 'C',
      });
    });
  });

  describe('Arithmetic Expressions', () => {
    test('should parse addition', () => {
      const result = parseMai('1 + 2;');
      expectExpression(result, 0, {
        type: ASTNodeType.BinaryExpression,
        operator: BinaryOperator.Plus,
        left: { type: ASTNodeType.NumberLiteral, value: 1 },
        right: { type: ASTNodeType.NumberLiteral, value: 2 },
      });
    });

    test('should parse subtraction', () => {
      const result = parseMai('5 - 3;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '-',
        left: { type: 'NumberLiteral', value: 5 },
        right: { type: 'NumberLiteral', value: 3 },
      });
    });

    test('should parse multiplication', () => {
      const result = parseMai('4 * 3;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '*',
        left: { type: 'NumberLiteral', value: 4 },
        right: { type: 'NumberLiteral', value: 3 },
      });
    });

    test('should parse division', () => {
      const result = parseMai('10 / 2;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '/',
        left: { type: 'NumberLiteral', value: 10 },
        right: { type: 'NumberLiteral', value: 2 },
      });
    });

    test('should respect operator precedence', () => {
      const result = parseMai('2 + 3 * 4;');
      const expr = getExpression(result.ast.body[0]);
      expect(expr).toMatchObject({
        type: 'BinaryExpression',
        operator: '+',
        left: { type: 'NumberLiteral', value: 2 },
        right: {
          type: 'BinaryExpression',
          operator: '*',
          left: { type: 'NumberLiteral', value: 3 },
          right: { type: 'NumberLiteral', value: 4 },
        },
      });
    });

    test('should parse unary operators', () => {
      const result = parseMai('-5; +3;');
      expect(result.ast.body).toHaveLength(2);
      expectExpression(result, 0, {
        type: ASTNodeType.UnaryExpression,
        operator: UnaryOperator.Minus,
        argument: { type: ASTNodeType.NumberLiteral, value: 5 },
      });
      expectExpression(result, 1, {
        type: ASTNodeType.UnaryExpression,
        operator: UnaryOperator.Plus,
        argument: { type: ASTNodeType.NumberLiteral, value: 3 },
      });
    });
  });

  describe('Relational Expressions', () => {
    test('should parse greater than', () => {
      const result = parseMai('5 > 3;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '>',
        left: { type: 'NumberLiteral', value: 5 },
        right: { type: 'NumberLiteral', value: 3 },
      });
    });

    test('should parse less than', () => {
      const result = parseMai('3 < 5;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '<',
        left: { type: 'NumberLiteral', value: 3 },
        right: { type: 'NumberLiteral', value: 5 },
      });
    });

    test('should parse greater than or equal', () => {
      const result = parseMai('5 >= 5;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '>=',
        left: { type: 'NumberLiteral', value: 5 },
        right: { type: 'NumberLiteral', value: 5 },
      });
    });

    test('should parse less than or equal', () => {
      const result = parseMai('3 <= 5;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '<=',
        left: { type: 'NumberLiteral', value: 3 },
        right: { type: 'NumberLiteral', value: 5 },
      });
    });

    test('should parse not equal', () => {
      const result = parseMai('5 <> 3;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '<>',
        left: { type: 'NumberLiteral', value: 5 },
        right: { type: 'NumberLiteral', value: 3 },
      });
    });

    test('should parse equal', () => {
      const result = parseMai('5 = 5;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '=',
        left: { type: 'NumberLiteral', value: 5 },
        right: { type: 'NumberLiteral', value: 5 },
      });
    });
  });

  describe('Logical Expressions', () => {
    test('should parse logical AND', () => {
      const result = parseMai('true && false;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '&&',
        left: { type: 'Identifier', name: 'true' },
        right: { type: 'Identifier', name: 'false' },
      });
    });

    test('should parse logical OR', () => {
      const result = parseMai('true || false;');
      expectExpression(result, 0, {
        type: 'BinaryExpression',
        operator: '||',
        left: { type: 'Identifier', name: 'true' },
        right: { type: 'Identifier', name: 'false' },
      });
    });

    test('should respect logical operator precedence', () => {
      const result = parseMai('a || b && c;');
      const expr = getExpression(result.ast.body[0]);
      expect(expr).toMatchObject({
        type: 'BinaryExpression',
        operator: '||',
        left: { type: 'Identifier', name: 'a' },
        right: {
          type: 'BinaryExpression',
          operator: '&&',
          left: { type: 'Identifier', name: 'b' },
          right: { type: 'Identifier', name: 'c' },
        },
      });
    });
  });

  describe('Assignment Expressions', () => {
    test('should parse assignment', () => {
      const result = parseMai('x := 5;');
      expectExpression(result, 0, {
        type: ASTNodeType.AssignmentExpression,
        operator: AssignmentOperator.Assign,
        left: { type: ASTNodeType.Identifier, name: 'x' },
        right: { type: ASTNodeType.NumberLiteral, value: 5 },
      });
    });

    test('should parse display assignment', () => {
      const result = parseMai('x : 5;');
      expectExpression(result, 0, {
        type: 'AssignmentExpression',
        operator: AssignmentOperator.DisplayAssign,
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 5 },
      });
    });

    test('should parse power assignment', () => {
      const result = parseMai('x ^^ 2;');
      expectExpression(result, 0, {
        type: 'AssignmentExpression',
        operator: AssignmentOperator.PowerAssign,
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 2 },
      });
    });

    test('should parse range operator', () => {
      const result = parseMai('1..10;');
      expectExpression(result, 0, {
        type: 'AssignmentExpression',
        operator: AssignmentOperator.RangeOperator,
        left: { type: 'NumberLiteral', value: 1 },
        right: { type: 'NumberLiteral', value: 10 },
      });
    });
  });

  describe('Variable Declarations', () => {
    test('should parse variable declaration', () => {
      const result = parseMai('VARIABLE: x, y, z;');
      expect(result.ast.body[0]).toMatchObject({
        type: 'VariableDeclaration',
        variables: [
          { id: { name: 'x' }, init: undefined },
          { id: { name: 'y' }, init: undefined },
          { id: { name: 'z' }, init: undefined },
        ],
      });
    });

    test('should parse variable declaration with initialization', () => {
      const result = parseMai('VARIABLE: x := 5, y := 10;');
      expect(result.ast.body[0]).toMatchObject({
        type: 'VariableDeclaration',
        variables: [
          { id: { name: 'x' }, init: { type: 'NumberLiteral', value: 5 } },
          { id: { name: 'y' }, init: { type: 'NumberLiteral', value: 10 } },
        ],
      });
    });
  });

  describe('If Statements', () => {
    test('should parse if statement', () => {
      const result = parseMai('IF x > 0 THEN BEGIN y := 1; END');
      expect(result.ast.body[0]).toMatchObject({
        type: 'IfStatement',
        test: {
          type: 'BinaryExpression',
          operator: '>',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'NumberLiteral', value: 0 },
        },
        consequent: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'AssignmentExpression',
                operator: ':=',
                left: { type: 'Identifier', name: 'y' },
                right: { type: 'NumberLiteral', value: 1 },
              },
            },
          ],
        },
      });
    });

    test('should parse if-else statement', () => {
      const result = parseMai('IF x > 0 THEN BEGIN y := 1; END ELSE BEGIN y := -1; END');
      expect(result.ast.body[0]).toMatchObject({
        type: 'IfStatement',
        test: {
          type: 'BinaryExpression',
          operator: '>',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'NumberLiteral', value: 0 },
        },
        consequent: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'AssignmentExpression',
                operator: ':=',
                left: { type: 'Identifier', name: 'y' },
                right: { type: 'NumberLiteral', value: 1 },
              },
            },
          ],
        },
        alternate: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ExpressionStatement',
              expression: {
                type: 'AssignmentExpression',
                operator: ':=',
                left: { type: 'Identifier', name: 'y' },
                right: {
                  type: 'UnaryExpression',
                  operator: '-',
                  argument: { type: 'NumberLiteral', value: 1 },
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('Return Statements', () => {
    test('should parse return statement', () => {
      const result = parseMai('RETURN x;');
      expect(result.ast.body[0]).toMatchObject({
        type: 'ReturnStatement',
        argument: { type: 'Identifier', name: 'x' },
      });
    });

    test('should parse return statement without argument', () => {
      const result = parseMai('RETURN;');
      expect(result.ast.body[0]).toMatchObject({
        type: 'ReturnStatement',
        argument: undefined,
      });
    });
  });

  describe('Block Statements', () => {
    test('should parse block statement', () => {
      const result = parseMai('BEGIN x := 1; y := 2; END');
      expect(result.ast.body[0]).toMatchObject({
        type: 'BlockStatement',
        body: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'AssignmentExpression',
              operator: ':=',
              left: { type: 'Identifier', name: 'x' },
              right: { type: 'NumberLiteral', value: 1 },
            },
          },
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'AssignmentExpression',
              operator: ':=',
              left: { type: 'Identifier', name: 'y' },
              right: { type: 'NumberLiteral', value: 2 },
            },
          },
        ],
      });
    });
  });

  describe('Comments', () => {
    test('should ignore line comments', () => {
      const result = parseMai('// This is a comment\nx := 5;');
      expect(result.ast.body).toHaveLength(1);
      expect(result.ast.body[0]).toMatchObject({
        type: 'ExpressionStatement',
      });
      expectExpression(result, 0, {
        type: 'AssignmentExpression',
        operator: ':=',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 5 },
      });
    });

    test('should ignore block comments', () => {
      const result = parseMai('/* This is a\n   block comment */\nx := 5;');
      expect(result.ast.body).toHaveLength(1);
      expect(result.ast.body[0]).toMatchObject({
        type: 'ExpressionStatement',
      });
      expectExpression(result, 0, {
        type: 'AssignmentExpression',
        operator: ':=',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 5 },
      });
    });
  });

  describe('Function Calls', () => {
    test('should parse function calls', () => {
      const result = parseMai('myFunction(1, 2, 3);');
      expectExpression(result, 0, {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'myFunction' },
        arguments: [
          { type: 'NumberLiteral', value: 1 },
          { type: 'NumberLiteral', value: 2 },
          { type: 'NumberLiteral', value: 3 },
        ],
      });
    });

    test('should parse function calls without arguments', () => {
      const result = parseMai('myFunction();');
      expectExpression(result, 0, {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: 'myFunction' },
        arguments: [],
      });
    });
  });

  describe('Member Expressions', () => {
    test('should parse member access', () => {
      const result = parseMai('obj.property;');
      expectExpression(result, 0, {
        type: 'MemberExpression',
        object: { type: 'Identifier', name: 'obj' },
        property: { type: 'Identifier', name: 'property' },
        computed: false,
      });
    });
  });

  describe('Complex Expressions', () => {
    test('should parse complex nested expressions', () => {
      const result = parseMai('(price - SMA(price, 20)) / SMA(price, 20) * 100;');
      expect(result.ast.body).toHaveLength(1);
      expect(result.ast.body[0].type).toBe('ExpressionStatement');
    });

    test('should parse technical indicator expressions', () => {
      const result = parseMai('MA(C, 5) > MA(C, 10) && MA(C, 5) > MA(C, 20);');
      expect(result.ast.body).toHaveLength(1);
      expect(result.ast.body[0].type).toBe('ExpressionStatement');
    });
  });

  describe('Error Handling', () => {
    test('should throw syntax errors', () => {
      expect(() => {
        parseMai('x := ;');
      }).toThrow();
    });

    test('should not throw missing semicolon', () => {
      expect(() => {
        parseMai('x := 5');
      }).not.toThrow();
    });

    test('should throw unclosed block', () => {
      expect(() => {
        parseMai('BEGIN x := 1;');
      }).toThrow();
    });
  });
});
