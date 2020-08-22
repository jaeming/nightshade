import { TemplateParse } from './template_parse'
import { Builder } from './builder'

export default class Reflection {
  root = null
  nodes = []
  component = null
  proxy = null

  mount (Component, element, options = {}) {
    this.root = document.querySelector(element)
    this.component = new Component()
    this.nodes = new TemplateParse(this.component.template).nodes
    this.reflect()
    this.nodes.forEach((n, i) => this.build(n, i))
  }

  reflect () {
    const update = this.update.bind(this)
    this.proxy = new Proxy(this.component, {
      set (obj, prop, val, receiver) {
        obj[prop] = val
        update(obj, prop, receiver)
        return true
      }
    })
  }

  update (prop, receiver) {
    // todo
    console.log(
      `prop: ${String(prop)} wants to update to value: ${receiver[prop]}`
    )
    this.nodes
      .filter(n => n.tracks?.has(prop))
      .forEach((n, i) => this.build(n, i, { update: true, prop }))
    // find all elements that track the prop as a dependency and update them
    // in the case of "if" we need to create a new elements, or remove them
  }

  build (node, index, opts = {}) {
    new Builder(node, index, this.nodes, this.proxy, this.root, opts)
  }
}
