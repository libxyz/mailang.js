import * as AST from '../ast/types';
import { ASTNodeType, BinaryOperator, AssignmentOperator, UnaryOperator, ErrorType } from '../ast/enums';
import {
  IRProgram,
  IRFunction,
  IRInstruction,
  IROpcode,
  IRGeneratorContext,
  StackEffect,
  IRInstructionExtra,
} from './types';
import { MaiError } from '../interpreter/err';
import { KEYWORDS } from '../lexer/tokens';

const PROTECTED_WORDS = new Set<string>(['O', 'H', 'L', 'C'].concat(KEYWORDS.map(token => token.name)));

const DEFAULT_GLOBALS = ['O', 'H', 'L', 'C'];

export class IRGenerator {
  private ctx!: IRGeneratorContext; // Use definite assignment assertion
  private options: { optimize: boolean; debug: boolean };
  private curNode: AST.BaseNode | null = null; // Track current node for automatic location

  constructor(options: { optimize?: boolean; debug?: boolean } = {}) {
    this.options = {
      optimize: options.optimize ?? false,
      debug: options.debug ?? true,
    };
  }

  gen(program: AST.Program, extraGlobals: string[] = []): IRProgram {
    this.ctx = {
      instructions: [],
      constants: [],
      varLookup: new Map(),
      gVarLookup: new Map(),
      labels: [],
      builtinFuncs: new Set(),
      labelCounter: 0,
      maxStackDepth: 0,
      curStackDepth: 0,
    };

    DEFAULT_GLOBALS.concat(extraGlobals).forEach(globalVar => this.getOrAddGlobal(globalVar));

    // Generate IR for the main function
    this.compileProgram(program);

    const mainFunction: IRFunction = {
      name: 'main',
      instructions: this.ctx.instructions,
      localsCount: this.ctx.varLookup.size,
      globalsCount: this.ctx.gVarLookup.size,
      maxStackDepth: this.ctx.maxStackDepth,
    };

    return {
      labels: new Map(this.ctx.labels.map(label => [label.id, label])),
      gLookup: this.ctx.gVarLookup,
      constants: this.ctx.constants,
      functions: [mainFunction],
      main: mainFunction,
      localNames: this.createReverseMapping(this.ctx.varLookup),
      globalNames: this.createReverseMapping(this.ctx.gVarLookup),
    };
  }

  private createReverseMapping(nameToIndex: Map<string, number>): string[] {
    if (nameToIndex.size === 0) {
      return [];
    }
    const maxIndex = Math.max(...nameToIndex.values());
    const result = new Array(maxIndex + 1);
    for (const [name, index] of nameToIndex.entries()) {
      result[index] = name;
    }
    return result;
  }

  private compileProgram(program: AST.Program): void {
    for (let i = 0; i < program.body.length; i++) {
      const statement = program.body[i];
      const isLastStatement = i === program.body.length - 1;
      this.generateStatement(statement, isLastStatement);
    }
  }

  private generateStatement(statement: AST.Statement, isLastStatement: boolean = false): void {
    this.setCurNode(statement);
    switch (statement.type) {
      case ASTNodeType.ExpressionStatement:
        this.generateExpression(statement.expression);
        // Only pop if there's something on the stack and it's not the last statement
        if (!isLastStatement && this.ctx.curStackDepth > 0) {
          this.emit(IROpcode.POP); // Pop unused expression result
        }
        break;

      case ASTNodeType.VariableDeclaration:
        this.generateVariableDeclaration(statement);
        break;

      case ASTNodeType.IfStatement:
        this.generateIfStatement(statement);
        break;

      case ASTNodeType.BlockStatement:
        this.generateBlockStatement(statement);
        break;

      case ASTNodeType.ReturnStatement:
        this.generateReturnStatement(statement);
        break;

      default:
        throw new MaiError(
          ErrorType.RUNTIME_ERROR,
          `Unknown statement type: ${(statement as any).type}`,
          (statement as any).loc
        );
    }
  }

  private generateVariableDeclaration(node: AST.VariableDeclaration): void {
    this.setCurNode(node);
    for (const variable of node.variables) {
      const varName = variable.id.name;
      const varIndex = this.getOrAddGlobal(varName);
      const extra = { operandName: varName };

      if (variable.init) {
        // Initialize the variable (without existence check for now)
        this.generateExpression(variable.init);
      } else {
        // No initialization, just set to null
        this.emit(IROpcode.LOAD_CONST, null);
      }
      this.emit(IROpcode.INIT_GLOBAL, varIndex, extra);
    }
  }

  private generateIfStatement(node: AST.IfStatement): void {
    this.setCurNode(node);
    // Generate condition
    this.generateExpression(node.test);

    // Create labels for then/else branches
    const elseLabel = this.createLabel();
    const endLabel = this.createLabel();

    // Jump to else if condition is false
    this.emit(IROpcode.JUMP_IF_FALSE, elseLabel);

    // Generate then branch
    this.generateStatement(node.consequent);
    this.emit(IROpcode.JUMP, endLabel);

    // Generate else branch (if exists)
    this.placeLabel(elseLabel);
    if (node.alternate) {
      this.generateStatement(node.alternate);
    }

    this.placeLabel(endLabel);
  }

  private generateBlockStatement(node: AST.BlockStatement): void {
    for (let i = 0; i < node.body.length; i++) {
      const statement = node.body[i];
      this.generateStatement(statement);
    }
  }

  private generateReturnStatement(node: AST.ReturnStatement): void {
    this.setCurNode(node);
    if (node.argument) {
      this.generateExpression(node.argument);
    } else {
      this.emit(IROpcode.LOAD_CONST, undefined);
    }
    this.emit(IROpcode.RETURN, undefined);
  }

  private generateExpression(expression: AST.Expression): void {
    this.setCurNode(expression);
    switch (expression.type) {
      case ASTNodeType.NumberLiteral:
      case ASTNodeType.StringLiteral:
      case ASTNodeType.BooleanLiteral:
        this.emit(IROpcode.LOAD_CONST, expression.value);
        break;

      case ASTNodeType.Identifier:
        this.generateIdentifier(expression as AST.Identifier);
        break;

      case ASTNodeType.BinaryExpression:
        this.generateBinaryExpression(expression as AST.BinaryExpression);
        break;

      case ASTNodeType.AssignmentExpression:
        this.generateAssignmentExpression(expression as AST.AssignmentExpression);
        break;

      case ASTNodeType.UnaryExpression:
        this.generateUnaryExpression(expression as AST.UnaryExpression);
        break;

      case ASTNodeType.CallExpression:
        this.generateCallExpression(expression as AST.CallExpression);
        break;

      case ASTNodeType.MemberExpression:
        throw new MaiError(ErrorType.RUNTIME_ERROR, 'Cannot access property', expression.loc);

      default:
        throw new MaiError(
          ErrorType.RUNTIME_ERROR,
          `Unknown expression type: ${(expression as any).type}`,
          (expression as any).loc
        );
    }
  }

  private generateIdentifier(node: AST.Identifier): void {
    this.setCurNode(node);
    const name = node.name;
    const extra = { operandName: name };

    // Check if it's a local variable
    if (this.ctx.varLookup.has(name)) {
      const varIndex = this.ctx.varLookup.get(name)!;
      this.emit(IROpcode.LOAD_VAR, varIndex, extra);
      return;
    }

    // Check if it's a global variable
    if (this.ctx.gVarLookup.has(name)) {
      const varIndex = this.ctx.gVarLookup.get(name)!;
      this.emit(IROpcode.LOAD_GLOBAL, varIndex, extra);
      return;
    }

    throw new MaiError(ErrorType.UNDEFINED_VARIABLE, `Variable "${name}" is not defined`, node.loc);
  }

  private generateBinaryExpression(node: AST.BinaryExpression): void {
    this.setCurNode(node);
    // Generate left operand
    this.generateExpression(node.left);

    // Generate right operand
    this.generateExpression(node.right);

    // Apply operator
    switch (node.operator) {
      case BinaryOperator.Plus:
        this.emit(IROpcode.ADD);
        break;
      case BinaryOperator.Minus:
        this.emit(IROpcode.SUB);
        break;
      case BinaryOperator.Multiply:
        this.emit(IROpcode.MUL);
        break;
      case BinaryOperator.Divide:
        this.emit(IROpcode.DIV);
        break;
      case BinaryOperator.GreaterThan:
        this.emit(IROpcode.GT);
        break;
      case BinaryOperator.LessThan:
        this.emit(IROpcode.LT);
        break;
      case BinaryOperator.GreaterThanOrEqual:
        this.emit(IROpcode.GTE);
        break;
      case BinaryOperator.LessThanOrEqual:
        this.emit(IROpcode.LTE);
        break;
      case BinaryOperator.Equal:
        this.emit(IROpcode.EQ);
        break;
      case BinaryOperator.NotEqual:
        this.emit(IROpcode.NEQ);
        break;
      case BinaryOperator.LogicalAnd:
        this.emit(IROpcode.AND);
        break;
      case BinaryOperator.LogicalOr:
        this.emit(IROpcode.OR);
        break;
      default:
        throw new MaiError(ErrorType.INVALID_OPERATOR, `Unknown binary operator: ${node.operator}`, node.loc);
    }
  }

  private generateAssignmentExpression(node: AST.AssignmentExpression): void {
    this.setCurNode(node);
    if (node.left.type !== ASTNodeType.Identifier) {
      throw new MaiError(ErrorType.INVALID_ASSIGNMENT, 'Left side of assignment must be an identifier', node.left.loc);
    }

    const identifier = node.left as AST.Identifier;
    const varName = identifier.name;

    if (PROTECTED_WORDS.has(varName)) {
      throw new MaiError(ErrorType.INVALID_ASSIGNMENT, `Cannot assign to protected word "${varName}"`, node.left.loc);
    }

    // Generate right-hand side
    this.generateExpression(node.right);
    const extra = { operandName: varName };

    // Handle different assignment operators
    switch (node.operator) {
      case AssignmentOperator.Assign:
        if (this.ctx.gVarLookup.has(varName)) {
          const varIndex = this.ctx.gVarLookup.get(varName)!;
          this.emit(IROpcode.STORE_GLOBAL, varIndex, extra);
        } else {
          const varIndex = this.getOrAddLocal(varName);
          this.emit(IROpcode.STORE_VAR, varIndex, extra);
        }
        break;

      case AssignmentOperator.DisplayAssign: {
        // Also store in output (duplicate value first)
        this.emit(IROpcode.DUP);

        // Store the value
        if (this.ctx.gVarLookup.has(varName)) {
          const varIndex = this.ctx.gVarLookup.get(varName)!;
          this.emit(IROpcode.STORE_GLOBAL, varIndex, extra);
        } else {
          const varIndex = this.getOrAddLocal(varName);
          this.emit(IROpcode.STORE_VAR, varIndex, extra);
        }

        const outputIndex = this.getOrAddLocal(varName);
        this.emit(IROpcode.STORE_OUTPUT, outputIndex, extra);
        break;
      }

      default:
        throw new MaiError(ErrorType.UNIMPLEMENTED_FEATURE, `Unknown operator: ${node.operator}`, node.loc);
    }
  }

  private generateUnaryExpression(node: AST.UnaryExpression): void {
    this.setCurNode(node);
    this.generateExpression(node.argument);

    switch (node.operator) {
      case UnaryOperator.Plus:
        this.emit(IROpcode.UNARY_PLUS);
        break;
      case UnaryOperator.Minus:
        this.emit(IROpcode.UNARY_MINUS);
        break;
      default:
        throw new MaiError(ErrorType.INVALID_OPERATOR, `Unknown unary operator: ${node.operator}`, node.loc);
    }
  }

  private generateCallExpression(node: AST.CallExpression): void {
    this.setCurNode(node);
    if (node.callee.type === ASTNodeType.Identifier) {
      const identifier = node.callee as AST.Identifier;
      const funcName = identifier.name;

      // Generate arguments
      for (const arg of node.arguments) {
        this.generateExpression(arg);
      }

      // Check if it's a builtin function
      this.ctx.builtinFuncs.add(funcName);
      this.emit(IROpcode.CALL_BUILTIN, { name: funcName, argCount: node.arguments.length });
    } else {
      // Dynamic function call
      this.generateExpression(node.callee);

      // Generate arguments
      for (const arg of node.arguments) {
        this.generateExpression(arg);
      }

      this.emit(IROpcode.CALL_FUNC, node.arguments.length);
    }
  }

  // private generateMemberExpression(node: AST.MemberExpression): void {
  //   this.setCurNode(node);
  //   this.generateExpression(node.object);
  //   // For now, we'll handle member access at runtime
  //   // In a more sophisticated IR, we could generate specific instructions
  //   this.emit(IROpcode.LOAD_CONST, node.property.name);
  //   // This will be handled by the runtime with a special handler
  // }

  // Helper methods
  private setCurNode(node: AST.BaseNode | null): void {
    this.curNode = node;
  }

  private getLocationFromCurNode(): IRInstructionExtra | undefined {
    if (this.curNode && this.curNode.loc && this.options.debug) {
      return {
        loc: this.curNode.loc,
      };
    }
    return undefined;
  }

  private emit(opcode: IROpcode, operand?: any, extra?: IRInstructionExtra): void {
    // Get location from current node if available
    const locationExtra = this.getLocationFromCurNode();

    // Merge provided extra with location info
    extra = { ...locationExtra, ...extra };

    // Handle constants - store them in the constants array and use index as operand
    let finalOperand = operand;
    if (opcode === IROpcode.LOAD_CONST && operand !== undefined) {
      const constIndex = this.ctx.constants.length;
      this.ctx.constants.push(operand);
      finalOperand = constIndex;
    }

    const instruction: IRInstruction = {
      id: this.ctx.instructions.length,
      opcode,
      operand: finalOperand,
      extra,
    };

    this.ctx.instructions.push(instruction);
    this.updateStackDepth(opcode, finalOperand);
  }

  private updateStackDepth(opcode: IROpcode, operand?: any): void {
    const stackEffect = this.getStackEffect(opcode, operand);

    this.ctx.curStackDepth -= stackEffect.pop;
    this.ctx.curStackDepth += stackEffect.push;

    if (this.ctx.curStackDepth > this.ctx.maxStackDepth) {
      this.ctx.maxStackDepth = this.ctx.curStackDepth;
    }

    if (this.ctx.curStackDepth < 0) {
      throw new Error(`Stack underflow at instruction ${opcode}`);
    }
  }

  private getStackEffect(opcode: IROpcode, operand?: any): StackEffect {
    switch (opcode) {
      case IROpcode.LOAD_CONST:
        return { push: 1, pop: 0 };
      case IROpcode.LOAD_VAR:
      case IROpcode.LOAD_GLOBAL:
        return { push: 1, pop: 0 };
      case IROpcode.INIT_GLOBAL:
      case IROpcode.STORE_VAR:
      case IROpcode.STORE_GLOBAL:
      case IROpcode.STORE_OUTPUT:
        return { push: 0, pop: 1 };
      case IROpcode.ADD:
      case IROpcode.SUB:
      case IROpcode.MUL:
      case IROpcode.DIV:
      case IROpcode.GT:
      case IROpcode.LT:
      case IROpcode.GTE:
      case IROpcode.LTE:
      case IROpcode.EQ:
      case IROpcode.NEQ:
      case IROpcode.AND:
      case IROpcode.OR:
        return { push: 1, pop: 2 };
      case IROpcode.UNARY_PLUS:
      case IROpcode.UNARY_MINUS:
        return { push: 1, pop: 1 };
      case IROpcode.POP:
        return { push: 0, pop: 1 };
      case IROpcode.DUP:
        return { push: 2, pop: 1 };
      case IROpcode.SWAP:
        return { push: 2, pop: 2 };
      case IROpcode.CALL_BUILTIN: {
        const builtinCall = operand as { name: string; argCount: number };
        return { push: 1, pop: builtinCall.argCount };
      }
      case IROpcode.CALL_FUNC: {
        const argCount = operand as number;
        return { push: 1, pop: argCount + 1 }; // +1 for the function itself
      }
      case IROpcode.RETURN:
        return { push: 0, pop: 1 };
      case IROpcode.JUMP:
      case IROpcode.JUMP_IF_FALSE:
      case IROpcode.JUMP_IF_TRUE:
        return { push: 0, pop: opcode === IROpcode.JUMP ? 0 : 1 };
      default:
        return { push: 0, pop: 0 };
    }
  }

  private getOrAddLocal(name: string): number {
    if (!this.ctx.varLookup.has(name)) {
      const index = this.ctx.varLookup.size;
      this.ctx.varLookup.set(name, index);
      return index;
    }
    return this.ctx.varLookup.get(name)!;
  }

  private getOrAddGlobal(name: string): number {
    if (!this.ctx.gVarLookup.has(name)) {
      const index = this.ctx.gVarLookup.size;
      this.ctx.gVarLookup.set(name, index);
      return index;
    }
    return this.ctx.gVarLookup.get(name)!;
  }

  private createLabel(): string {
    return `L${this.ctx.labelCounter++}`;
  }

  private placeLabel(label: string): void {
    this.ctx.labels.push({ id: label, pos: this.ctx.instructions.length });
    this.emit(IROpcode.NOP, { label });
  }
}
