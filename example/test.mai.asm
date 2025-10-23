LOAD_CONST 0 // {"loc":{"start":{"line":1,"column":16},"end":{"line":1,"column":16}}}
INIT_GLOBAL 4 // {"loc":{"start":{"line":1,"column":1},"end":{"line":1,"column":26}}}
LOAD_CONST 1 // {"loc":{"start":{"line":1,"column":26},"end":{"line":1,"column":26}}}
INIT_GLOBAL 5 // {"loc":{"start":{"line":1,"column":1},"end":{"line":1,"column":26}}}
LOAD_CONST 2 // {"loc":{"start":{"line":2,"column":7},"end":{"line":2,"column":13}}}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":2,"column":16},"end":{"line":2,"column":16}}}
LOAD_CONST 3 // {"loc":{"start":{"line":2,"column":19},"end":{"line":2,"column":23}}}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":2,"column":26},"end":{"line":2,"column":28}}}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":2,"column":6},"end":{"line":2,"column":29}}}
POP // {"loc":{"start":{"line":2,"column":1},"end":{"line":2,"column":29}}}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":3,"column":8},"end":{"line":3,"column":10}}}
LOAD_CONST 4 // {"loc":{"start":{"line":3,"column":14},"end":{"line":3,"column":14}}}
ADD // {"loc":{"start":{"line":3,"column":8},"end":{"line":3,"column":14}}}
STORE_GLOBAL 5 // {"loc":{"start":{"line":3,"column":1},"end":{"line":3,"column":14}}}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":5,"column":4},"end":{"line":5,"column":6}}}
LOAD_CONST 5 // {"loc":{"start":{"line":5,"column":11},"end":{"line":5,"column":11}}}
LTE // {"loc":{"start":{"line":5,"column":4},"end":{"line":5,"column":11}}}
JUMP_IF_FALSE "L0" // {"loc":{"start":{"line":5,"column":1},"end":{"line":16,"column":3}}}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":6,"column":8},"end":{"line":6,"column":8}}}
LOAD_CONST 6 // {"loc":{"start":{"line":6,"column":12},"end":{"line":6,"column":13}}}
ADD // {"loc":{"start":{"line":6,"column":8},"end":{"line":6,"column":13}}}
STORE_GLOBAL 4 // {"loc":{"start":{"line":6,"column":3},"end":{"line":6,"column":13}}}
LOAD_CONST 7 // {"loc":{"start":{"line":7,"column":9},"end":{"line":7,"column":25}}}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":7,"column":28},"end":{"line":7,"column":28}}}
LOAD_CONST 8 // {"loc":{"start":{"line":7,"column":31},"end":{"line":7,"column":35}}}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":7,"column":38},"end":{"line":7,"column":40}}}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":7,"column":8},"end":{"line":7,"column":41}}}
JUMP "L1" // {"loc":{"start":{"line":5,"column":1},"end":{"line":16,"column":3}}}
NOP {"label":"L0"}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":9,"column":9},"end":{"line":9,"column":11}}}
LOAD_CONST 9 // {"loc":{"start":{"line":9,"column":16},"end":{"line":9,"column":16}}}
LTE // {"loc":{"start":{"line":9,"column":9},"end":{"line":9,"column":16}}}
JUMP_IF_FALSE "L2" // {"loc":{"start":{"line":9,"column":6},"end":{"line":16,"column":3}}}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":10,"column":8},"end":{"line":10,"column":8}}}
LOAD_CONST 10 // {"loc":{"start":{"line":10,"column":12},"end":{"line":10,"column":14}}}
ADD // {"loc":{"start":{"line":10,"column":8},"end":{"line":10,"column":14}}}
STORE_GLOBAL 4 // {"loc":{"start":{"line":10,"column":3},"end":{"line":10,"column":14}}}
POP // {"loc":{"start":{"line":10,"column":3},"end":{"line":10,"column":14}}}
LOAD_CONST 11 // {"loc":{"start":{"line":11,"column":9},"end":{"line":11,"column":30}}}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":11,"column":33},"end":{"line":11,"column":33}}}
LOAD_CONST 12 // {"loc":{"start":{"line":11,"column":36},"end":{"line":11,"column":40}}}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":11,"column":43},"end":{"line":11,"column":45}}}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":11,"column":8},"end":{"line":11,"column":46}}}
JUMP "L3" // {"loc":{"start":{"line":9,"column":6},"end":{"line":16,"column":3}}}
NOP {"label":"L2"}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":14,"column":8},"end":{"line":14,"column":8}}}
LOAD_CONST 13 // {"loc":{"start":{"line":14,"column":12},"end":{"line":14,"column":15}}}
ADD // {"loc":{"start":{"line":14,"column":8},"end":{"line":14,"column":15}}}
STORE_GLOBAL 4 // {"loc":{"start":{"line":14,"column":3},"end":{"line":14,"column":15}}}
POP // {"loc":{"start":{"line":14,"column":3},"end":{"line":14,"column":15}}}
LOAD_CONST 14 // {"loc":{"start":{"line":15,"column":9},"end":{"line":15,"column":27}}}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":15,"column":30},"end":{"line":15,"column":30}}}
LOAD_CONST 15 // {"loc":{"start":{"line":15,"column":33},"end":{"line":15,"column":37}}}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":15,"column":40},"end":{"line":15,"column":42}}}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":15,"column":8},"end":{"line":15,"column":43}}}
NOP {"label":"L3"}
NOP {"label":"L1"}
LOAD_CONST 16 // {"loc":{"start":{"line":17,"column":7},"end":{"line":17,"column":22}}}
LOAD_GLOBAL 4 // {"loc":{"start":{"line":17,"column":25},"end":{"line":17,"column":25}}}
LOAD_CONST 17 // {"loc":{"start":{"line":17,"column":28},"end":{"line":17,"column":32}}}
LOAD_GLOBAL 5 // {"loc":{"start":{"line":17,"column":35},"end":{"line":17,"column":37}}}
CALL_BUILTIN {"name":"PRINT","argCount":4} // {"loc":{"start":{"line":17,"column":6},"end":{"line":17,"column":38}}}
POP // {"loc":{"start":{"line":17,"column":1},"end":{"line":17,"column":38}}}
LOAD_GLOBAL 3 // {"loc":{"start":{"line":19,"column":11},"end":{"line":19,"column":11}}}
LOAD_CONST 18 // {"loc":{"start":{"line":19,"column":14},"end":{"line":19,"column":14}}}
CALL_BUILTIN {"name":"MA","argCount":2} // {"loc":{"start":{"line":19,"column":10},"end":{"line":19,"column":15}}}
STORE_VAR 0 // {"loc":{"start":{"line":19,"column":1},"end":{"line":19,"column":15}}}
POP // {"loc":{"start":{"line":19,"column":1},"end":{"line":19,"column":15}}}
LOAD_GLOBAL 3 // {"loc":{"start":{"line":20,"column":11},"end":{"line":20,"column":11}}}
LOAD_CONST 19 // {"loc":{"start":{"line":20,"column":14},"end":{"line":20,"column":14}}}
CALL_BUILTIN {"name":"MA","argCount":2} // {"loc":{"start":{"line":20,"column":10},"end":{"line":20,"column":15}}}
STORE_VAR 1 // {"loc":{"start":{"line":20,"column":1},"end":{"line":20,"column":15}}}
LOAD_CONST 20 // {"loc":{"start":{"line":21,"column":7},"end":{"line":21,"column":12}}}
LOAD_VAR 0 // {"loc":{"start":{"line":21,"column":15},"end":{"line":21,"column":17}}}
LOAD_CONST 21 // {"loc":{"start":{"line":21,"column":20},"end":{"line":21,"column":24}}}
LOAD_VAR 1 // {"loc":{"start":{"line":21,"column":27},"end":{"line":21,"column":29}}}
LOAD_CONST 22 // {"loc":{"start":{"line":21,"column":32},"end":{"line":21,"column":40}}}
LOAD_VAR 0 // {"loc":{"start":{"line":21,"column":43},"end":{"line":21,"column":45}}}
LOAD_VAR 1 // {"loc":{"start":{"line":21,"column":49},"end":{"line":21,"column":51}}}
ADD // {"loc":{"start":{"line":21,"column":43},"end":{"line":21,"column":51}}}
LOAD_CONST 23 // {"loc":{"start":{"line":21,"column":54},"end":{"line":22,"column":1}}}
CALL_BUILTIN {"name":"PRINT","argCount":7} // {"loc":{"start":{"line":21,"column":6},"end":{"line":22,"column":2}}}
POP // {"loc":{"start":{"line":21,"column":1},"end":{"line":22,"column":2}}}
LOAD_VAR 0 // {"loc":{"start":{"line":24,"column":4},"end":{"line":24,"column":6}}}
DUP // {"loc":{"start":{"line":24,"column":1},"end":{"line":24,"column":6}}}
STORE_VAR 2
STORE_OUTPUT 2 // {"loc":{"start":{"line":24,"column":1},"end":{"line":24,"column":6}},"operandName":"K"}
