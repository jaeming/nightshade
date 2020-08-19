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

  update (obj, prop, receiver, val) {
    // todo
    console.log(
      `prop: ${String(prop)} wants to update to value: ${receiver.count}`
    )
  }

  build (node) {
    new Builder(node, this.proxy, this.root, this.handlers)
  }

  setOptions (opts) {
    if (opts.handlers) this.handlers = { ...Handler, ...opts.handlers }
  }
}
