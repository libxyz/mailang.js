import * as mai from '../src';
import { MaiError } from '../src/interpreter';

const script = `
VARIABLE: x := 0, CNT := 0;
PRINT("[g] x", x, "CNT", CNT);
CNT := CNT + 1;

IF CNT <= 1 THEN BEGIN
  x := x + 10;
  PRINT("Inside IF [g] x", x, "CNT", CNT);
END 
ELSE IF CNT <= 2 THEN BEGIN
  x := x + 100;
  PRINT("Inside ELSE IF [g] x", x, "CNT", CNT);
END
ELSE BEGIN
  x := x + 1000;
  PRINT("Inside ELSE [g] x", x, "CNT", CNT);
END
PRINT("After IF [g] x", x, "CNT", CNT);

MA3 := MA(C, 3);
MA5 := MA(C, 5);
PRINT("MA3:", MA3, "MA5", MA5, "MA3+MA5", MA3 + MA5, "\n");

K: MA3;
`;

try {
  const engine = new mai.MaiExecutor(script.trim());
  // console.log('Generated IR Program:', JSON.stringify(engine.getIRProgram(), null, 2));
  let result = engine.execute({
    O: 100,
    H: 110,
    L: 90,
    C: 105,
  });

  result = engine.execute({
    O: 106,
    H: 112,
    L: 95,
    C: 108,
  });

  result = engine.execute({
    O: 107,
    H: 115,
    L: 100,
    C: 110,
  });

  result = engine.execute({
    O: 109,
    H: 118,
    L: 102,
    C: 112,
  });

  result = engine.execute({
    O: 111,
    H: 120,
    L: 105,
    C: 115,
  });

  console.log(result);
} catch (e) {
  const err = e as MaiError;
  console.log(err.toString());
  process.exit(1);
}
