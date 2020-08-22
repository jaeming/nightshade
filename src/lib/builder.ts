import { HANDLERS, EACH } from './types'

const uid = () =>
  Date.now().toString(36) +
  Math.random()
    .toString(36)
    .substr(2)

interface Attribute {
  key: string
  value: string
}

export class Builder {
  el = null
  constructor (
    public node,
    public index,
    public nodes,
    public component,
    public root,
    public options: { update?: boolean; prop?: string } = {}
  ) {
    options.update ? this.update() : this.create()
  }

  create () {
    this.inherit()
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
    this.node?.attributes?.forEach((attr: Attribute) => {
      if (HANDLERS.includes(attr.key)) return this.setHandler(attr)
      const bindings = this.bindMatches(attr.value)
      if (bindings) return this.setAttrBinding(attr, bindings)
      this.el.setAttribute(attr.key, attr.value)
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
    this.node.id = uid()
    this.el.setAttribute('data-ref', this.node.id)
  }

  setEach (attr: Attribute) {
    const val = this.unwrapMatch(attr.value) // for less confusion accept bracewrap or not
    const [list, item, index] = val.replace(/\s+/g, '').split(/as|,/)
    this.node.each = {
      prop: list,
      variable: item,
      indexVar: index,
      index: 0,
      root: true
    }
    this.trackDependency(list)
  }

  inherit () {
    this.inheritEach()
  }

  inheritEach () {
    const { each } = this.node.parent
    if (this.prevNode?.each && !each) {
      const root = parent => (parent?.each ? root(parent.parent) : parent)
      const rootEachNode = root(this.prevNode)
      const eachNodes = this.nodes.slice(
        this.nodes.findIndex(i => i.id === rootEachNode.id) + 1,
        this.index
      )

      eachNodes.forEach((n, i) => {
        const scopedEach = {
          [n.each.indexVar]: i + 1,
          [n.each.variable]: this.component[n.each.prop][i + 1]
        }
        const obj = { ...this.component, ...scopedEach }
        new Builder(n, i + 1, this.nodes, obj, null)
      })

      // find root each and call build on a slice of nodes representing the each iteration, appending to parent
      // see if the last each.index was length-1 (&& return if so)
      // increment the each.indexVar, set the each.variable
    }

    if (this.node.parent.each) {
      // const index = each.index + 1
      this.node.each = { ...each, root: false }
      Object.assign(this.component, {
        [each.indexVar]: each.index,
        [each.variable]: this.component[each.prop][each.index]
      })
    }
  }

  get parentEl () {
    return document.querySelector(`[data-ref="${this.node.parent.id}"]`)
  }

  get prevNode () {
    return this.nodes[this.index - 1]
  }
}
