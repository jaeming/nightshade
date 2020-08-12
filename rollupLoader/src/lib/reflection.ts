import { TemplateParse } from './template_parse'

export default class Reflection {
  root = null

  mount (Component, element) {
    this.root = document.querySelector(element)
    const component = new Component()
    const nodes = new TemplateParse(component.template).nodes
    console.log(nodes)
  }
}
