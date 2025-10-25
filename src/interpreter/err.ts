import * as AST from '../ast/types';
import { ErrorType } from '../ast/enums';

export interface ExecutionError {
  type: ErrorType;
  message: string;
  location?: AST.SourceLocation;
  context?: {
    nodeType?: string;
    operator?: string;
    identifier?: string;
    expectedType?: string;
    actualType?: string;
    value?: any;
  };
  stack?: string;
}

export class MaiError extends Error {
  public readonly type: ErrorType;
  public readonly location?: AST.SourceLocation;
  public readonly context?: Record<string, any>;

  constructor(type: ErrorType, message: string, location?: AST.SourceLocation, context?: Record<string, any>) {
    super(message);
    this.type = type;
    this.location = location;
    this.context = context;
  }

  toString(): string {
    let result = `[${this.type}] ${this.message}`;

    if (this.location) {
      const { start, end } = this.location;
      result += ` at line ${start.line}, column ${start.column}`;
      if (end && (end.line !== start.line || end.column !== start.column)) {
        result += ` to line ${end.line}, column ${end.column}`;
      }
    }

    if (this.context && Object.keys(this.context).length > 0) {
      result += ' {';
      const contextEntries = Object.entries(this.context)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join(', ');
      result += contextEntries + '}';
    }

    return result;
  }

  toJSON() {
    return {
      type: this.type,
      message: this.message,
      location: this.location,
      context: this.context,
      stack: this.stack,
    };
  }
}

export function newError(
  type: ErrorType,
  message: string,
  location?: AST.SourceLocation,
  context?: Record<string, any>
): MaiError {
  return new MaiError(type, message, location, context);
}
