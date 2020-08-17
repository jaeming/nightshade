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
      const el = document.createTextNode(this.node.content)
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
}
