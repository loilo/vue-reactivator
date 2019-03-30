import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/reactivator.js',
  output: {
    file: 'dist/reactivator.umd.js',
    format: 'umd',
    name: 'vueReactivator',
    sourcemap: true
  },
  plugins: [terser()]
}
