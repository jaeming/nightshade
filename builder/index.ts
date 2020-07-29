import { templateParser } from '../template_parser'
import Home from '../Home.js'
import { buildNode } from './node_builder'
import { buildAttributes } from './attribute_builder'
import { update } from './updater'
const fs = require('fs')

export const APP_ROOT = '#root' // TODO make this dynamic
export const EVENT_HANDLERS = ['click', 'input', 'model']

const data = fs.readFileSync('Home.js', 'utf8').split('\n')
const templateStartIndex = data.findIndex(i => i === '/*template')
const templateEndIndex = data.findIndex(i => i === 'template*/')
const template = data.slice(templateStartIndex + 1, templateEndIndex)

const home = new Proxy(new Home(), {
  set (obj, prop, val) {
    obj[prop] = val
    nodes
      .filter(n => n.deps.includes(prop))
      .forEach(i => {
        i.visible = i.tag === 'if' ? obj[prop] : i.parent.visible
      })
    update(nodes, obj)
    return true
  }
})

const nodes = templateParser(template, home)
nodes.forEach(i => build(i, home))

export function build (node, js) {
  if (!node.visible) return

  const el = document.createElement(node.tag)
  buildAttributes(node, el, js)
  return buildNode(node, el, js)
}
