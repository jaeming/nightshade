const uid = () =>
  Date.now().toString(36) +
  Math.random()
    .toString(36)
    .substr(2)

export class Builder {
  constructor (public node, public component, public root) {
    this.create()
  }

  create () {
    if (this.node.tag === 'text') {
      const content = this.textContent(this.node.content)
      const el = document.createTextNode(content)
      this.append(el)
    } else {
      const el = document.createElement(this.node.tag)
      this.setAttributes(el)
      this.append(el)
    }
  }

  setAttributes (el) {
    this.node.id = uid()
    el.setAttribute('data-ref', this.node.id)
    this.node?.attributes?.forEach(a => el.setAttribute(a.key, a.value))
  }

  append (el) {
    if (this.node.parent?.id) {
      const parentEl = document.querySelector(
        `[data-ref="${this.node.parent.id}"]`
      )
      parentEl.appendChild(el)
    } else if (this.root) {
      this.root.appendChild(el)
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
    const expression = this.unwrapMatch(bound)
    const property = this.component[expression]
    return property || this.evaluate(expression)
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
}
