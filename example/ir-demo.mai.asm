LOAD_CONST 0 // {"loc":{"start":{"line":1,"column":16},"end":{"line":1,"column":16}}}
INIT_GLOBAL 10 // {"loc":{"start":{"line":1,"column":16},"end":{"line":1,"column":16}},"operandName":"x"}
LOAD_CONST 1 // {"loc":{"start":{"line":1,"column":26},"end":{"line":1,"column":26}}}
INIT_GLOBAL 11 // {"loc":{"start":{"line":1,"column":26},"end":{"line":1,"column":26}},"operandName":"CNT"}
LOAD_CONST 2 // {"loc":{"start":{"line":2,"column":7},"end":{"line":2,"column":13}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":2,"column":16},"end":{"line":2,"column":16}},"operandName":"x"}
LOAD_CONST 3 // {"loc":{"start":{"line":2,"column":19},"end":{"line":2,"column":23}}}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":2,"column":26},"end":{"line":2,"column":28}},"operandName":"CNT"}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":2,"column":26},"end":{"line":2,"column":28}}}
POP // {"loc":{"start":{"line":2,"column":26},"end":{"line":2,"column":28}}}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":3,"column":8},"end":{"line":3,"column":10}},"operandName":"CNT"}
LOAD_CONST 4 // {"loc":{"start":{"line":3,"column":14},"end":{"line":3,"column":14}}}
ADD // {"loc":{"start":{"line":3,"column":14},"end":{"line":3,"column":14}}}
STORE_GLOBAL 11 // {"loc":{"start":{"line":3,"column":14},"end":{"line":3,"column":14}},"operandName":"CNT"}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":5,"column":4},"end":{"line":5,"column":6}},"operandName":"CNT"}
LOAD_CONST 5 // {"loc":{"start":{"line":5,"column":11},"end":{"line":5,"column":11}}}
LTE // {"loc":{"start":{"line":5,"column":11},"end":{"line":5,"column":11}}}
JUMP_IF_FALSE "L0" // {"loc":{"start":{"line":5,"column":11},"end":{"line":5,"column":11}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":6,"column":8},"end":{"line":6,"column":8}},"operandName":"x"}
LOAD_CONST 6 // {"loc":{"start":{"line":6,"column":12},"end":{"line":6,"column":13}}}
ADD // {"loc":{"start":{"line":6,"column":12},"end":{"line":6,"column":13}}}
STORE_GLOBAL 10 // {"loc":{"start":{"line":6,"column":12},"end":{"line":6,"column":13}},"operandName":"x"}
LOAD_CONST 7 // {"loc":{"start":{"line":7,"column":9},"end":{"line":7,"column":25}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":7,"column":28},"end":{"line":7,"column":28}},"operandName":"x"}
LOAD_CONST 8 // {"loc":{"start":{"line":7,"column":31},"end":{"line":7,"column":35}}}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":7,"column":38},"end":{"line":7,"column":40}},"operandName":"CNT"}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":7,"column":38},"end":{"line":7,"column":40}}}
POP // {"loc":{"start":{"line":7,"column":38},"end":{"line":7,"column":40}}}
JUMP "L1" // {"loc":{"start":{"line":7,"column":38},"end":{"line":7,"column":40}}}
NOP {"label":"L0"} // {"loc":{"start":{"line":7,"column":38},"end":{"line":7,"column":40}}}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":9,"column":9},"end":{"line":9,"column":11}},"operandName":"CNT"}
LOAD_CONST 9 // {"loc":{"start":{"line":9,"column":16},"end":{"line":9,"column":16}}}
LTE // {"loc":{"start":{"line":9,"column":16},"end":{"line":9,"column":16}}}
JUMP_IF_FALSE "L2" // {"loc":{"start":{"line":9,"column":16},"end":{"line":9,"column":16}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":10,"column":8},"end":{"line":10,"column":8}},"operandName":"x"}
LOAD_CONST 10 // {"loc":{"start":{"line":10,"column":12},"end":{"line":10,"column":14}}}
ADD // {"loc":{"start":{"line":10,"column":12},"end":{"line":10,"column":14}}}
STORE_GLOBAL 10 // {"loc":{"start":{"line":10,"column":12},"end":{"line":10,"column":14}},"operandName":"x"}
LOAD_CONST 11 // {"loc":{"start":{"line":11,"column":9},"end":{"line":11,"column":30}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":11,"column":33},"end":{"line":11,"column":33}},"operandName":"x"}
LOAD_CONST 12 // {"loc":{"start":{"line":11,"column":36},"end":{"line":11,"column":40}}}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":11,"column":43},"end":{"line":11,"column":45}},"operandName":"CNT"}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":11,"column":43},"end":{"line":11,"column":45}}}
POP // {"loc":{"start":{"line":11,"column":43},"end":{"line":11,"column":45}}}
JUMP "L3" // {"loc":{"start":{"line":11,"column":43},"end":{"line":11,"column":45}}}
NOP {"label":"L2"} // {"loc":{"start":{"line":11,"column":43},"end":{"line":11,"column":45}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":14,"column":8},"end":{"line":14,"column":8}},"operandName":"x"}
LOAD_CONST 13 // {"loc":{"start":{"line":14,"column":12},"end":{"line":14,"column":15}}}
ADD // {"loc":{"start":{"line":14,"column":12},"end":{"line":14,"column":15}}}
STORE_GLOBAL 10 // {"loc":{"start":{"line":14,"column":12},"end":{"line":14,"column":15}},"operandName":"x"}
LOAD_CONST 14 // {"loc":{"start":{"line":15,"column":9},"end":{"line":15,"column":27}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":15,"column":30},"end":{"line":15,"column":30}},"operandName":"x"}
LOAD_CONST 15 // {"loc":{"start":{"line":15,"column":33},"end":{"line":15,"column":37}}}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":15,"column":40},"end":{"line":15,"column":42}},"operandName":"CNT"}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":15,"column":40},"end":{"line":15,"column":42}}}
POP // {"loc":{"start":{"line":15,"column":40},"end":{"line":15,"column":42}}}
NOP {"label":"L3"} // {"loc":{"start":{"line":15,"column":40},"end":{"line":15,"column":42}}}
NOP {"label":"L1"} // {"loc":{"start":{"line":15,"column":40},"end":{"line":15,"column":42}}}
LOAD_CONST 16 // {"loc":{"start":{"line":17,"column":7},"end":{"line":17,"column":22}}}
LOAD_GLOBAL 10 // {"loc":{"start":{"line":17,"column":25},"end":{"line":17,"column":25}},"operandName":"x"}
LOAD_CONST 17 // {"loc":{"start":{"line":17,"column":28},"end":{"line":17,"column":32}}}
LOAD_GLOBAL 11 // {"loc":{"start":{"line":17,"column":35},"end":{"line":17,"column":37}},"operandName":"CNT"}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":17,"column":35},"end":{"line":17,"column":37}}}
POP // {"loc":{"start":{"line":17,"column":35},"end":{"line":17,"column":37}}}
LOAD_GLOBAL 3 // {"loc":{"start":{"line":19,"column":11},"end":{"line":19,"column":11}},"operandName":"C"}
LOAD_CONST 18 // {"loc":{"start":{"line":19,"column":14},"end":{"line":19,"column":14}}}
CALL_BUILTIN {"name":"MA","argCount":2} // {"loc":{"start":{"line":19,"column":14},"end":{"line":19,"column":14}}}
STORE_VAR 0 // {"loc":{"start":{"line":19,"column":14},"end":{"line":19,"column":14}},"operandName":"MA3"}
LOAD_GLOBAL 3 // {"loc":{"start":{"line":20,"column":11},"end":{"line":20,"column":11}},"operandName":"C"}
LOAD_CONST 19 // {"loc":{"start":{"line":20,"column":14},"end":{"line":20,"column":14}}}
CALL_BUILTIN {"name":"MA","argCount":2} // {"loc":{"start":{"line":20,"column":14},"end":{"line":20,"column":14}}}
STORE_VAR 1 // {"loc":{"start":{"line":20,"column":14},"end":{"line":20,"column":14}},"operandName":"MA5"}
LOAD_CONST 20 // {"loc":{"start":{"line":21,"column":7},"end":{"line":21,"column":12}}}
LOAD_VAR 0 // {"loc":{"start":{"line":21,"column":15},"end":{"line":21,"column":17}},"operandName":"MA3"}
LOAD_CONST 21 // {"loc":{"start":{"line":21,"column":20},"end":{"line":21,"column":24}}}
LOAD_VAR 1 // {"loc":{"start":{"line":21,"column":27},"end":{"line":21,"column":29}},"operandName":"MA5"}
LOAD_CONST 22 // {"loc":{"start":{"line":21,"column":32},"end":{"line":21,"column":40}}}
LOAD_VAR 0 // {"loc":{"start":{"line":21,"column":43},"end":{"line":21,"column":45}},"operandName":"MA3"}
LOAD_VAR 1 // {"loc":{"start":{"line":21,"column":49},"end":{"line":21,"column":51}},"operandName":"MA5"}
ADD // {"loc":{"start":{"line":21,"column":49},"end":{"line":21,"column":51}}}
LOAD_CONST 23 // {"loc":{"start":{"line":21,"column":54},"end":{"line":22,"column":1}}}
CALL_BUILTIN {"name":"PRINT","argCount":7} // {"loc":{"start":{"line":21,"column":54},"end":{"line":22,"column":1}}}
POP // {"loc":{"start":{"line":21,"column":54},"end":{"line":22,"column":1}}}
LOAD_VAR 0 // {"loc":{"start":{"line":24,"column":4},"end":{"line":24,"column":6}},"operandName":"MA3"}
DUP // {"loc":{"start":{"line":24,"column":4},"end":{"line":24,"column":6}}}
STORE_VAR 2 // {"loc":{"start":{"line":24,"column":4},"end":{"line":24,"column":6}},"operandName":"K"}
STORE_OUTPUT 2 // {"loc":{"start":{"line":24,"column":4},"end":{"line":24,"column":6}},"operandName":"K"}
