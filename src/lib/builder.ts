const uid = () =>
  Date.now().toString(36) +
  Math.random()
    .toString(36)
    .substr(2)

export class Builder {
  el = null
  constructor (public node, public component, public root, public handlers) {
    this.create()
  }

  create () {
    if (this.node.tag === 'text') {
      const content = this.textContent(this.node.content)
      this.el = document.createTextNode(content)
      this.append()
    } else {
      this.el = document.createElement(this.node.tag)
      this.setRef()
      this.setAttributes()
      this.append()
    }
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
    const val = this.unwrapMatch(bindings[0])
    this.el.setAttribute(attr.key, this.component[val])
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
      const parentEl = document.querySelector(
        `[data-ref="${this.node.parent.id}"]`
      )
      parentEl.appendChild(this.el)
    } else if (this.root) {
      this.root.appendChild(this.el)
    }
  }

  textContent (content) {
    const bindings = this.bindMatches(content)
    if (!bindings) return content
    bindings.forEach(bound => {
      content = content.replace(bound, this.deriveBound(bound))
    })
    return content
  }

  deriveBound (bound) {
    const val = this.unwrapMatch(bound)
    return this.component.hasOwnProperty(val)
      ? this.component[val]
      : this.evaluate(val)
  }

  evaluate (expression) {
    return new Function('return ' + expression)()
  }

  bindMatches (str: string) {
    // returns array of matches including the braces
    return str.match(/\{([^}]+)\}/g)
  }

  unwrapMatch (str: string) {
    // unwraps from curly braces
    return str.replace(/[{}]/g, '')
  }

  setRef () {
    this.node.id = uid()
    this.el.setAttribute('data-ref', this.node.id)
  }
}
