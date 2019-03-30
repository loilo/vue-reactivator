import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/reactivator.js',
  output: {
    file: 'dist/reactivator.esm.js',
    format: 'es',
    sourcemap: true
  },
  plugins: [terser()]
}
