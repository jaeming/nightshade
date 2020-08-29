import { HANDLERS, EACH, Options, Attribute } from './types'
import { uid } from './utils'

export class Render {
  el = null
  node = null
  index = 0

  constructor (
    public nodes,
    public component,
    public root,
    public options: Options = {}
  ) {
    while (this.index < this.nodes.length) {
      this.node = this.nodes[this.index]
      options.update ? this.update() : this.create()
      this.index++
    }
  }

  create () {
    this.node.tag === 'text' ? this.createTextNode() : this.createElement()
    this.append()
  }

  update () {
    // todo: deal with if's
    this.el = document.querySelector(`[data-ref="${this.node.id}"]`)
    if (this.node.tag === 'text') {
      this.updateTextNode()
    } else {
      this.setAttributes()
    }
  }

  createElement () {
    this.el = document.createElement(this.node.tag)
    this.setRef()
    this.setAttributes()
  }

  createTextNode () {
    this.el = document.createTextNode(this.interpolatedContent())
  }

  updateTextNode () {
    for (let n of this.parentEl.childNodes) {
      if (
        n.nodeName === '#text' &&
        n.nodeValue.includes(this.node.interpolatedContent)
      ) {
        n.nodeValue = this.interpolatedContent()
      }
    }
  }

  interpolatedContent () {
    const content = this.textContent(this.node.content)
    this.node.interpolatedContent = content
    return content
  }

  setAttributes () {
    this.node?.attributes?.forEach((attr: Attribute) => {
      if (HANDLERS.includes(attr.key)) return this.setHandler(attr)
      const bindings = this.bindMatches(attr.value)
      if (bindings) return this.setAttrBinding(attr, bindings)
      this.el?.setAttribute(attr.key, attr.value)
    })
  }

  setAttrBinding (attr, bindings) {
    const prop = this.unwrapMatch(bindings[0])
    this.trackDependency(prop)
    this.el.setAttribute(attr.key, this.component[prop])
  }

  setHandler (attr: Attribute) {
    if (attr.key === EACH) return this.setEach(attr)

    const [handlerType, handler] = this.deriveHandler(attr)
    this.el.addEventListener(handlerType, handler, false)
  }

  deriveHandler ({ key, value }) {
    const val = this.unwrapMatch(value)
    const handler = this.component[val].bind(this.component)
    const handlerType = HANDLERS.find(i => i === key)
    return [handlerType, handler]
  }

  append () {
    if (this.node.parent?.id) {
      this.parentEl.appendChild(this.el)
    } else if (this.root) {
      this.root.appendChild(this.el)
    }
  }

  textContent (content) {
    const bindings = this.bindMatches(content)
    if (!bindings) return content
    bindings.forEach(bound => {
      const prop = this.unwrapMatch(bound)
      this.trackDependency(prop)
      content = content.replace(bound, this.deriveBound(prop))
    })
    return content
  }

  deriveBound (propOrExpression: string) {
    return this.component.hasOwnProperty(propOrExpression)
      ? this.component[propOrExpression]
      : this.evaluate(propOrExpression)
  }

  evaluate (expression: string) {
    return new Function(`return ${expression}`)()
  }

  bindMatches (str: string) {
    // returns array of matches including the braces
    return str.match(/\{([^}]+)\}/g)
  }

  unwrapMatch (str: string) {
    // unwraps from curly braces
    return str.replace(/[{}]/g, '')
  }

  trackDependency (prop: string) {
    this.node.tracks
      ? this.node.tracks.add(prop)
      : (this.node.tracks = new Set([prop]))
  }

  setRef () {
    this.el.setAttribute('data-ref', this.node.id)
  }

  setEach (attr: Attribute) {
    const val = this.unwrapMatch(attr.value) // for less confusion accept bracewrap or not
    const [prop, item, index] = val.replace(/\s+/g, '').split(/as|,/)

    const nodes = this.component[prop].reduce((memo, item, index) => {
      if (index === 0) return memo // we get this first one for free on original render

      const node = this.cloneCurrentNode()
      memo = [...memo, node, ...node.children]
      return memo
    }, [])
    this.parentEl.innerHTML = ''
    new Render(nodes, this.component, null)
    this.index = this.index + (this.node.children.length - 1)

    this.trackDependency(prop)
  }

  cloneCurrentNode () {
    const id = uid()
    const attributes = this.node.attributes.filter(n => n.key !== EACH)
    const node = { ...this.node, id, attributes }
    node.children = node.children.map(child => ({
      ...child,
      id: uid(),
      parent: node
    }))
    return node
  }

  get parentEl () {
    return document.querySelector(`[data-ref="${this.node.parent.id}"]`)
  }

  get prevNode () {
    return this.nodes[this.index - 1]
  }
}
