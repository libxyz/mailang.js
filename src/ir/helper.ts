import { IRInstruction, IROpcode, IRProgram } from './types';

export function dump(program: IRProgram): string {
  const inst = program.main.instructions;
  return inst.map(dumpInst).join('\n');
}

function dumpInst(i: IRInstruction): string {
  const parts = [IROpcode[i.opcode]];
  if (i.operand !== undefined) {
    parts.push(JSON.stringify(i.operand));
  }
  if (i.extra) {
    parts.push('//');
    parts.push(`${JSON.stringify(i.extra)}`);
  }
  return parts.join(' ');
}
