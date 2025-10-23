# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based AST parser and execution engine for the Mai language - a domain-specific language used in financial/technical analysis. The system includes:

1. **Parser**: Uses Chevrotain for lexical analysis and parsing, converting Mai source code into a typed Abstract Syntax Tree (AST)
2. **Executor**: Evaluates the AST to execute Mai programs with support for variables, control flow, and built-in functions
3. **Built-in Functions**: Financial analysis functions like MA (Moving Average), EMA, MAX, MIN, etc.

## Common Development Commands

```bash
# Install dependencies (uses pnpm)
pnpm install

# Build TypeScript to JavaScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run dev

# Format code with Prettier
npm run format

# Clean build artifacts
npm run clean
```

## Architecture

### Parser Pipeline

1. **Lexical Analysis** (`src/lexer/tokens.ts`) - Tokenizes input using Chevrotain token definitions
2. **Parsing** (`src/parser/parser.ts`) - Creates Concrete Syntax Tree (CST) using Chevrotain grammar rules
3. **AST Building** (`src/ast/ast-builder.ts`) - Converts CST to typed AST nodes
4. **Public API** (`src/index.ts`) - Exports `parseMai()` function with error handling

### Execution Engine (`src/executor/`)

1. **Executor** (`executor.ts`) - Main execution engine that evaluates AST nodes
2. **Built-in Functions** (`builtin-functions.ts`) - Financial analysis functions
3. **Types** (`types.ts`) - Execution context and result types
4. **Market Data Support** - Built-in support for O, H, L, C (Open, High, Low, Close) price data

Key architectural decisions:

- Uses Chevrotain for parser generation (not a hand-written recursive descent parser)
- Maintains strict separation between CST (Chevrotain's output) and AST (our typed representation)
- All AST nodes are defined in `src/ast/types.ts` with corresponding enums in `src/ast/enums.ts`
- Error handling is centralized in the main parse function
- Execution engine supports variable scoping, control flow, and function calls

## Mai Language Features

### Parser Features

**Operator Precedence** (highest to lowest):

1. Multiplicative: `*`, `/`
2. Additive: `+`, `-`
3. Relational: `>`, `<`, `>=`, `<=`, `<>`, `=`
4. Logical AND: `&&`
5. Logical OR: `||`

**Special Assignment Operators**:

- `:=` - Regular assignment
- `:` - Display assignment (outputs value)
- `^^` - Power assignment
- `..` - Range operator (creates arrays)

**Market Data Keywords**: `O` (Open), `H` (High), `L` (Low), `C` (Close)

**Control Flow**: `IF`/`THEN`/`ELSE` with `BEGIN`/`END` blocks

### Execution Engine Features

- **Expression Evaluation**: Supports all parser expressions with proper type checking
- **Variable Management**: Scoped variable storage with assignment operators
- **Control Flow**: Full support for IF/THEN/ELSE statements
- **Built-in Functions**: Financial analysis functions (MA, SMA, EMA, MAX, MIN, SUM, COUNT, STDDEV, CROSS)
- **Market Data Integration**: Automatic resolution of O, H, L, C keywords to market data values
- **Error Handling**: Comprehensive error messages for runtime issues

## Usage Examples

### Basic Parsing

```typescript
import { parseMai } from 'mai-lang-parser';

const result = parseMai('x := 5 + 3;');
if (result.errors.length === 0) {
  console.log('AST:', result.ast);
}
```

### Execution with Market Data

```typescript
import { executeMaiSource } from 'mai-lang-parser';

const marketData = { O: 100, H: 105, L: 98, C: 102 };
const code = `
  price_range := H - L;
  price_change := C - O;
  RETURN price_change / price_range * 100;
`;

const result = executeMaiSource(code, marketData);
console.log('Variables:', result.variables);
console.log('Output:', result.output);
```

### Custom Execution Context

```typescript
import { MaiExecutor, MarketData } from 'mai-lang-parser';

const marketData: MarketData = { O: 100, H: 105, L: 98, C: 102 };
const executor = new MaiExecutor(marketData);

// Parse code first
const { parseMai } = require('mai-lang-parser');
const parseResult = parseMai('MA := MA(C, 20);');

// Execute parsed AST
const executionResult = executor.execute(parseResult.ast);
console.log('Execution result:', executionResult);
```

## Testing

Tests are located in:

- `src/__tests__/parser.test.ts` - Parser functionality tests
- `src/__tests__/executor.test.ts` - Execution engine tests

Test coverage includes:

- All expression types and operator precedence
- Variable declarations and assignments
- Control flow statements
- Built-in function execution
- Error conditions and edge cases
- Complex nested expressions
- Market data integration

To run a specific test:

```bash
npm test -- --testNamePattern="should parse arithmetic expressions"
```

## Known Limitations

1. **Parentheses in Expressions**: The AST builder has issues with parentheses in complex expressions. Use intermediate variables as a workaround.
2. **Array Literals**: Not currently supported in the parser. Functions requiring arrays (MA, SMA, etc.) work with multiple arguments instead.
3. **Function Variables**: User-defined functions are not supported, only built-in functions.

## Key Implementation Details

- The lexer defines all tokens including keywords, operators, and literals
- Parser rules handle precedence through Chevrotain's built-in precedence handling
- CST to AST conversion happens in `ast-builder.ts` with a visitor pattern
- Error messages include token positions for debugging
- The parser handles both line comments (`//`) and block comments (`/* */`)
- Execution engine maintains variable scope and supports all assignment operators
- Built-in functions validate argument types and provide meaningful error messages
