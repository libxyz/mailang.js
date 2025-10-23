import * as mai from '../src';

const script = `
VARIABLE: x := 0, CNT := 1;
CNT := CNT + 1;
PRINT("[g] x", x, "CNT", CNT);

MA3 := MA(C, 3);
MA5 := MA(C, 5);
PRINT("MA3:", MA3, "MA5", MA5);
`;

const engine = new mai.MaiExecutor(script.trim());
let result = engine.push({
  O: 100,
  H: 110,
  L: 90,
  C: 105,
});

result = engine.push({
  O: 106,
  H: 112,
  L: 95,
  C: 108,
});

result = engine.push({
  O: 107,
  H: 115,
  L: 100,
  C: 110,
});

result = engine.push({
  O: 109,
  H: 118,
  L: 102,
  C: 112,
});

result = engine.push({
  O: 111,
  H: 120,
  L: 105,
  C: 115,
});

console.log(result);
