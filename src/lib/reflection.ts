import { TemplateParse } from './template_parse'
import { Builder } from './builder'

enum Handler {
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
    this.proxy = new Proxy(this.component, {
      set (obj, prop, val, receiver) {
        obj[prop] = val
        this.update(obj, prop, receiver)
        return true
      }
    })
  }

  update (obj, prop, receiver) {
    // todo
  }

  build (node) {
    new Builder(node, this.proxy, this.root)
  }

  setOptions (opts) {
    if (opts.handlers) this.handlers = { ...Handler, ...opts.handlers }
  }
}
