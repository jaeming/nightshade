import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import serve from 'rollup-plugin-serve'
import typescript from '@rollup/plugin-typescript'
const fs = require('fs')

class HtmlLoader {
  //extract this out into plugin later
  html = ''
  script = ''
  component = ''
  constructor (file) {
    this.file = file
    this.parseScript()
    this.parseHtml()
    this.injectTemplate()
  }

  parseScript () {
    const extracted = this.file.match(/<script>(.|\n)*?<\/script>/g)[0]
    this.script = this.stripScriptTags(extracted)
  }

  parseHtml () {
    const extracted = this.file.replace(this.script, '')
    this.html = this.stripScriptTags(extracted)
  }

  injectTemplate () {
    const exportLine = this.script.match(/export default(.)*?{/)[0]
    const injected = `${exportLine}  template = ${JSON.stringify(this.html)}\n`
    let component = this.script.replace(exportLine, injected)
    if (this.isTS) { 
      console.log('todo: handle TS') 
    }
    this.component = component
  }

  stripScriptTags (str) {
    return str.replace(/\<script\>|\<script type\="ts"\>|\<script type\='ts'\>|\<\/script\>/, '').replace('</script>', '')
  }

  get isTS() {
    return /\<script type\="ts"\>|\<script type\='ts'\>/.test(this.file)
  }
}

function reflection () {
  return {
    name: 'ReflectiveJS',
    resolveId (source) {
      if (source.endsWith('.reflect')) {
        return source // this signals that rollup should not ask other plugins or check the file system to find this id
      }
      return null // other ids should be handled as usually
    },
    load (id) {
      if (id.endsWith('.reflect')) {
        this.addWatchFile(`src/${id}`)
        const file = fs.readFileSync(`src/${id}`, 'utf8')
        return new HtmlLoader(file).component
      }
      return null // other ids should be handled as usually
    },
    watchChange (id) {
      if (id.endsWith('.reflect')) {
        console.log('changed')
      }
      return null
    }
  }
}

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH

export default {
  input: 'src/main.js',
  output: {
    file: 'public/bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    reflection(),
    typescript({ target: 'esnext' }),
    serve({
      contentBase: 'public',
      open: true,
      historyApiFallback: true,
      port: 1234,
    }),
    resolve(),
    commonjs(),
    production && terser() // minify, but only in production
  ]
}
