import { TemplateParse } from './template_parse'
import { Render } from './render'

export default class Reflection {
  root = null
  nodes = []
  component = null
  proxy = null
  props = {}

  mount (Component, element, props = {}) {
    this.root = document.querySelector(element)
    this.props = props
    this.component = new Component(props)
    this.nodes = new TemplateParse(this.component.template).nodes
    this.observe()
    new Render(this.nodes, this.proxy, this.root)
  }

  observe () {
    const update = this.update.bind(this)
    this.proxy = new Proxy(this.component, {
      set (obj, prop, val, receiver) {
        obj[prop] = val
        update(prop, receiver)
        return true
      }
    })
  }

  update (prop, receiver) {
    console.log('update', String(prop), receiver[prop])
    const nodes = this.nodes.filter(n => n.tracks?.has(prop))
    new Render(nodes, this.proxy, this.root, { update: true, prop })
    // find all elements that track the prop as a dependency and update them
    // in the case of "if" we need to create a new elements, or remove them
  }
}
