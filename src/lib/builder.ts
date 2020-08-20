const uid = () =>
  Date.now().toString(36) +
  Math.random()
    .toString(36)
    .substr(2)

export class Builder {
  el = null
  constructor (
    public node,
    public component,
    public root,
    public handlers,
    public options: { update?: boolean; prop?: string } = {}
  ) {
    options.update ? this.update() : this.create()
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
      if (n.nodeValue.includes(this.node.interpolatedContent)) {
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
    this.node?.attributes?.forEach(attr => {
      const bindings = this.bindMatches(attr.value)
      const isHandler = Object.values(this.handlers).includes(attr.key)
      if (isHandler && bindings) return this.setHandler(attr)
      if (bindings) return this.setAttrBinding(attr, bindings)
      this.el.setAttribute(attr.key, attr.value)
    })
  }

  setAttrBinding (attr, bindings) {
    const prop = this.unwrapMatch(bindings[0])
    this.trackDependency(prop)
    this.el.setAttribute(attr.key, this.component[prop])
  }

  setHandler (attr) {
    const [handlerType, handler] = this.deriveHandler(attr)
    this.el.addEventListener(handlerType, handler, false)
  }

  deriveHandler ({ key, value }) {
    const val = this.unwrapMatch(value)
    const handler = this.component[val].bind(this.component)
    const handlerIndex = Object.values(this.handlers).findIndex(i => i === key)
    const handlerType = Object.keys(this.handlers)[handlerIndex]
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
    this.node.id = uid()
    this.el.setAttribute('data-ref', this.node.id)
  }

  get parentEl () {
    return document.querySelector(`[data-ref="${this.node.parent.id}"]`)
  }
}
