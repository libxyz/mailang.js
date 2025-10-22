// Core execution engine
export * from './core';

// Unified functions (standard + streaming) - be selective to avoid duplicates
export {
  builtinFunctions,
  builtinFunctionsMap,
  allFunctions,

  // Standard functions
  maFunction,
  smaFunction,
  emaFunction,
  maxFunction,
  minFunction,
  sumFunction,
  countFunction,
  stddevFunction,
  absFunction,
  crossFunction,
} from './functions';
