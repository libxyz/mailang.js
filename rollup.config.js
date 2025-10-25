import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const typescriptPlugin = typescript({
  tsconfig: './tsconfig.json',
  declaration: false,
  module: 'ESNext',
  sourceMap: true,
});

export default [
  // UMD build for browsers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/mailang.umd.js',
      format: 'umd',
      name: 'mailang',
    },
    plugins: [resolve({ browser: true }), commonjs(), typescriptPlugin],
  },
  // Minified UMD build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/mailang.umd.min.js',
      format: 'umd',
      name: 'mailang',
    },
    plugins: [resolve({ browser: true }), commonjs(), typescriptPlugin, terser()],
  },
  // ES module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/mailang.esm.js',
      format: 'es',
    },
    plugins: [resolve({ browser: true }), commonjs(), typescriptPlugin],
  },
  // IIFE build for direct script tag use
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/browser/mailang.iife.js',
      format: 'iife',
      name: 'mailang',
    },
    plugins: [resolve({ browser: true }), commonjs(), typescriptPlugin],
  },
];

