import { templateParser } from '../template_parser'
import { buildNode } from './node_builder'
import { buildAttributes } from './attribute_builder'
import { update } from './updater'

export const EVENT_HANDLERS = ['click', 'input', 'model']

export function Shade (Klass, template, root) {
  const klass = new Proxy(new Klass(), {
    set (obj, prop, val, receiver) {
      obj[prop] = val

      nodes
        .filter(n => n.conditionals.includes(prop))
        .forEach(i => {
          i.visible = i.conditionals.every(c => obj[c])
        })
      update(nodes, receiver)
      return true
    }
  })

  const nodes = templateParser(template, klass)
  console.log(nodes)
  nodes.forEach(i => build(i, klass, root))
}

export function build (node, js, root) {
  if (!node.visible) return

  const el = document.createElement(node.tag)
  buildAttributes(node, el, js)
  return buildNode(node, el, js, root)
}
