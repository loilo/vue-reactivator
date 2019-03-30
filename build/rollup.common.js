import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/reactivator.js',
  output: {
    file: 'dist/reactivator.common.js',
    format: 'cjs',
    sourcemap: true
  },
  plugins: [terser()]
}
