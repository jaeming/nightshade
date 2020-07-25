import { templateParser } from '../template_parser'
import Home from '../Home.js'
import { buildNode } from './node_builder'
import { buildAttributes } from './attribute_builder'
const fs = require('fs')

export const APP_ROOT = '#root' // TODO make this dynamic
export const EVENT_HANDLERS = ['click', 'input', 'model']

const data = fs.readFileSync('Home.js', 'utf8').split('\n')
const templateStartIndex = data.findIndex(i => i === "/*template")
const templateEndIndex = data.findIndex(i => i === "template*/")
const template = data.slice(templateStartIndex + 1, templateEndIndex)

const home = new Proxy(new Home(), {
  set(obj, prop, val) {
    obj[prop] = val
    // nodes.filter(n => n.tracks.includes(prop)).forEach(i => {
    //   console.log('I found a depedency that needs to be re-rendered', prop, 'affects ', i.tag, i.id)
    // })
    return true
  }
})

const nodes = templateParser(template, Home)
nodes.forEach(i => build(i, home))

function build(node, js) {
  const el = document.createElement(node.tag)
  buildAttributes(node, el, js)
  buildNode(node, el, js)
}

export function update(js) {
  nodes.map(n => {
    const el = document.querySelector(`[data-shade="${n.id}"]`)
    Object.keys(n.attributes).map(key => {
      const binding = n.attributes[key].match(/{(.*)}/)
      if (binding && !EVENT_HANDLERS.includes(key)) {
        el.setAttribute(key, js[binding[1]])
      }
    })
    const binding = n.text.match(/{(.*)}/)
    if (binding) {
      el.textContent = js[binding[1]]
    }
  })
}
