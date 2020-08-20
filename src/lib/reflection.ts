import { TemplateParse } from './template_parse'
import { Builder } from './builder'

export enum Handler {
  click = 'click',
  if = 'if',
  input = 'input',
  model = 'model'
}

export default class Reflection {
  root = null
  nodes = []
  component = null
  proxy = null
  handlers = { ...Handler }

  mount (Component, element, options = {}) {
    this.setOptions(options)
    this.root = document.querySelector(element)
    this.component = new Component()
    this.nodes = new TemplateParse(this.component.template).nodes
    this.reflect()
    this.nodes.forEach(n => this.build(n))
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

  update (obj, prop, receiver) {
    // todo
    console.log(
      `prop: ${String(prop)} wants to update to value: ${receiver.count}`
    )
    this.nodes
      .filter(n => n.tracks?.has(prop))
      .forEach(n => this.build(n, { update: true, prop }))
    // find all elements that track the prop as a dependency and update them
    // in the case of "if" we need to create a new elements, or remove them
  }

  build (node, opts = {}) {
    new Builder(node, this.proxy, this.root, this.handlers, opts)
  }

  setOptions (opts) {
    if (opts.handlers) this.handlers = { ...Handler, ...opts.handlers }
  }
}
