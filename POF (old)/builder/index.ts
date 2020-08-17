import { templateParser } from '../template_parser'
import { buildNode } from './node_builder'
import { buildAttributes } from './attribute_builder'
import { update } from './updater'

export const EVENT_HANDLERS = ['click', 'input', 'model']

export function Nightshade (Component, root) {
  const component = new Component()
  const nodes = templateParser(component)
  const proxyComponent = new Proxy(component, {
    set (obj, prop, val, receiver) {
      obj[prop] = val
      update(obj, prop, nodes, receiver)
      return true
    }
  })
  nodes.forEach(i => build(i, proxyComponent, root))
}

export function build (node, component, root) {
  if (!node.visible) return

  if (node.component) {
    return Nightshade(node.component, `[data-shade="${node.parent.id}"]`)
  } else {
    const el = document.createElement(node.tag)
    buildAttributes(node, el, component)
    return buildNode(node, el, component, root)
  }
}
