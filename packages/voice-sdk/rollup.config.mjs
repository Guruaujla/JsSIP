import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { defineConfig } from 'rollup';

export default defineConfig({
  input: 'src/index.ts',
  output: [
    { file: 'dist/index.mjs', format: 'esm', sourcemap: true },
    { file: 'dist/index.cjs', format: 'cjs', sourcemap: true },
    { file: 'dist/index.umd.js', format: 'umd', name: 'VoiceSDK', sourcemap: true }
  ],
  external: ['jssip'],
  plugins: [
    nodeResolve({ extensions: ['.ts', '.js'] }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' })
  ]
});
