import { TemplateParse } from './template_parse'
import { Builder } from './builder'

export default class Reflection {
  root = null
  nodes = []
  component = null
  proxy = null

  mount (Component, element) {
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
}
