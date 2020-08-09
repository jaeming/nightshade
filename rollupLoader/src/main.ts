import HTML from 'html-parse-stringify'
import script, { html } from './test.ms'
console.log(script)
console.log(html)

const template = HTML.parse(html)

console.log('html as objects:', template)
