import { TemplateParse } from './template_parse'
import { Render } from './render'
export { Router } from './router'

export default class Reflection {
  root = null
  nodes = []
  component = null
  proxy = null
  router = null

  mount (Component, element, props = {}) {
    if (this.router) this.router.currentPath = location.pathname + location.search
    this.root = document.querySelector(element)
    this.createComponent(Component, props)
    this.nodes = new TemplateParse(this.component.template).nodes
    this.component.router = this.router
    this.component.props = props
    this.observe()
    new Render(Reflection, this.nodes, this.proxy, this.root)
    this.proxy.onMount && this.proxy.onMount()
  }

  dispose () {
    this.proxy.onDispose && this.proxy.onDispose()
    this.root.textContent = ''
    this.nodes = null
    this.component = null
    this.proxy = null
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
    // console.log('update', String(prop), receiver[prop])
    const nodes = this.nodes.filter(n => n.tracks?.has(prop))
    new Render(Reflection, nodes, this.proxy, this.root, {
      update: true,
      prop
    })
    // find all elements that track the prop as a dependency and update them
    // in the case of "if" we need to create a new elements, or remove them
  }

  createComponent (Component, props) {
    this.component = new Component(props)
    Object.entries(props).forEach(([k, v]) => {
      // add props if not undefined
      if (typeof v === 'function') v = (v as Function).bind(props.parent)
      if (typeof v !== 'undefined') this.component[k] = v
    })
  }
}
