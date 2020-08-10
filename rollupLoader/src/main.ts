import HTML from 'html-parse-stringify'
import Test from './test.ms'
const test = new Test()

console.log(test)

const template = HTML.parse(test.template)

console.log('html as objects:', template)
