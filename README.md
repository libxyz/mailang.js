# Mai Language AST Parser

A TypeScript-based AST parser for the Mai language using Chevrotain. This parser implements the complete syntax specification for Mai, a domain-specific language used in financial/technical analysis.

## Features

- ✅ Complete Mai language syntax support
- ✅ Operator precedence and associativity
- ✅ Comments (line and block)
- ✅ Variable declarations with initialization
- ✅ Control flow (if-then-else with BEGIN/END blocks)
- ✅ Function calls and member access
- ✅ Assignment operators (`:=`, `:`, `^^`, `..`)
- ✅ Reserved market data keywords (O, H, L, C)
- ✅ Comprehensive error handling
- ✅ Full TypeScript support with type definitions

## Installation

```bash
npm install mai-lang-parser
```

## Usage

```typescript
import { parseMai } from 'mai-lang-parser';

const sourceCode = `
VARIABLE: price := C, ma5 := MA(C, 5), ma20 := MA(C, 20);

IF ma5 > ma20 THEN BEGIN
    signal := 1;
    price ^^ 2;
END ELSE BEGIN
    signal := -1;
    price := C * 0.95;
END

RETURN signal;
`;

const result = parseMai(sourceCode);

if (result.errors.length === 0) {
  console.log('AST:', JSON.stringify(result.ast, null, 2));
} else {
  console.error('Parse errors:', result.errors);
}
```

## Language Features

### Operators (by precedence)

1. **Multiplicative**: `*`, `/`
2. **Additive**: `+`, `-`
3. **Relational**: `>`, `<`, `>=`, `<=`, `<>`, `=`
4. **Logical AND**: `&&`
5. **Logical OR**: `||`

### Assignment Operators

- `:=` - Regular assignment
- `:` - Display assignment
- `^^` - Power assignment
- `..` - Range operator

### Reserved Keywords

- **Market Data**: `O` (Open), `H` (High), `L` (Low), `C` (Close)
- **Control Flow**: `IF`, `THEN`, `ELSE`, `BEGIN`, `END`
- **Declarations**: `VARIABLE`
- **Functions**: `RETURN`

### Comments

```mai
// Line comment
/* Block comment
   spanning multiple lines */
```

## AST Node Types

The parser produces a typed AST with the following main node types:

- `Program` - Root node containing all statements
- `ExpressionStatement` - Expressions used as statements
- `VariableDeclaration` - Variable declarations
- `GlobalVariableDeclaration` - Global variable declarations
- `IfStatement` - If-then-else statements
- `BlockStatement` - BEGIN/END blocks
- `ReturnStatement` - Return statements
- `BinaryExpression` - Binary operations
- `AssignmentExpression` - Assignment operations
- `UnaryExpression` - Unary operations
- `CallExpression` - Function calls
- `MemberExpression` - Property access
- `Identifier` - Variable names
- `NumberLiteral` - Numeric literals
- `StringLiteral` - String literals

## Error Handling

The parser provides detailed error messages for:

- Lexical errors (invalid tokens)
- Syntax errors (invalid grammar)
- Missing semicolons
- Unclosed blocks
- Invalid expressions

```typescript
const result = parseMai('invalid syntax');
if (result.errors.length > 0) {
  console.log('Parse errors:', result.errors);
  // Output: Parse errors: ["Parsing errors: Unexpected token: found 'invalid' but expected one of: ..."]
}
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
