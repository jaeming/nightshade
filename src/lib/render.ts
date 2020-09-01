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
    if (!this.isEach) this.append()
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
    if (!this.el) return // because we are re-building "each" nodes instead of updating, we have to avoid this

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
    if (this.node.eachProps) {
      const { indexVar, itemVar, prop, index } = this.node.eachProps
      let func = new Function(
        `${itemVar}`,
        `${indexVar}`,
        `return ${expression}`
      )
      return func(this.component[prop][index], index)
    } else {
      return new Function(`return ${expression}`)
    }
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
    const val = this.unwrapMatch(attr.value) // accept either bracewrap or not
    const eachArgs = val.replace(/\s+/g, '').split(/as|,/)
    const [prop, ..._] = eachArgs
    // create each node iterations
    const nodes = this.component[prop].reduce((memo, _, index) => {
      const node = this.cloneEachNode(eachArgs, index)
      memo = [...memo, node, ...node.children]
      return memo
    }, [])

    // TODO: update each efficiently instead of re-rendering the entire list
    this.parentEl.innerHTML = '' // hack to flush each nodes until we have proper updating
    // When we 'update' this is completly rebuilding the 'each' nodes and children instead of updating the existing ones.
    // Will need to do something more efficient later
    new Render(nodes, this.component, null)

    this.index = this.index + this.node.children.length // fast-forward to next node after each decendants
    this.trackDependency(prop)
  }

  get isEach () {
    return this.node.attributes?.map(n => n.key)?.includes(EACH)
  }

  cloneEachNode (eachProps, index) {
    const id = uid()
    const attributes = this.node.attributes.filter(n => n.key !== EACH)
    const node = { ...this.node, id, attributes }
    this.setEachProps(node, eachProps, index)
    node.children = node.children.map(child => {
      this.setEachProps(child, eachProps, index)
      return {
        ...child,
        id: uid(),
        parent: node
      }
    })
    return node
  }

  setEachProps (node, [prop, itemVar, indexVar], index) {
    node.eachProps = { prop, itemVar, indexVar, index }
  }

  get parentEl () {
    return document.querySelector(`[data-ref="${this.node.parent.id}"]`)
  }

  get prevNode () {
    return this.nodes[this.index - 1]
  }
}
