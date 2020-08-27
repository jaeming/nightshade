import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import livereload from 'rollup-plugin-livereload'
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
    const exportLine = this.script.match(/export default(.)*?\n/g)[0]
    const injected = `${exportLine}  template = ${JSON.stringify(this.html)}\n`
    this.component = this.script.replace(exportLine, injected)
  }

  stripScriptTags (str) {
    return str.replace('<script>', '').replace('</script>', '')
  }
}

function reflection () {
  return {
    name: 'ReflectiveJS', // this name will show up in warnings and errors
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
    typescript({ target: 'esnext' }),
    livereload(),
    reflection(),
    resolve(), // tells Rollup how to find date-fns in node_modules
    commonjs(), // converts date-fns to ES modules
    production && terser() // minify, but only in production
  ]
}