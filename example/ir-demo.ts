import * as mai from '../src';

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

const engine = new mai.MaiExecutor(script.trim());
console.log(engine.dumpIR());
