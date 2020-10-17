import {
  HANDLERS,
  CLICK,
  EACH,
  IF,
  ROUTE,
  Options,
  Attribute,
  ROUTER
} from './types'
import { uid } from './utils'

export class Render {
  el = null
  node = null
  index = 0

  constructor (
    public Reflection,
    public nodes,
    public component,
    public root,
    public options: Options = {}
  ) {
    while (this.index < this.nodes.length) {
      this.node = this.nodes[this.index]
      if (this.isConditional) this.setIf()
      options.update ? this.update() : this.create()
      this.index++
    }
  }

  create (opts = {}) {
    if (this.node.hidden) return
    this.node.tag === 'text' ? this.createTextNode() : this.createElement()
    if (!this.isEach && !this.node.hidden) this.append(opts)
    if (this.isComponent) return this.createComponent()
  }

  update () {
    this.el = document.querySelector(`[data-ref="${this.node.id}"]`)
    const isText = this.node.tag === 'text'

    if (this.node.hidden) {
      if (this.el) {
        this.parentEl.removeChild(this.el)
      } else {
        return
      }
    } else {
      if (!this.el && !isText) return this.recreate()
    }

    if (isText) {
      this.updateTextNode()
    } else {
      this.setAttributes()
    }
    if (this.isComponent) this.updateComponent()
  }

  recreate () {
    if (!this.node.conditionalRoot) return this.create()
    // we need to append in the right order
    const index = this.node.parent.children.findIndex(
      i => i.id === this.node.id
    )

    this.create({ insertBefore: { position: index } })
  }

  createElement () {
    this.el = document.createElement(this.node.tag)
    this.setRef()
    this.setAttributes()
  }

  createTextNode () {
    this.el = document.createTextNode(this.interpolatedContent())
  }

  createComponent () {
    if (this.node.tag === ROUTER) {
      this.mountRoutedComponent()
    } else {
      const Component = this.component.components[this.node.tag]
      const instance = new this.Reflection()
      instance.mount(Component, `[data-ref="${this.node.id}"]`, this.node.props)
      this.node.component = instance.proxy
    }
  }

  updateComponent () {
    if (this.options.prop in this.component.props) {
      //  update props
      this.node.component[this.options.prop] = this.component[this.options.prop]
    }
    if (this.options.prop === ROUTER.toLowerCase()) {
      console.log("we've re-routed")
      // dispose old component
      this.node.instance.dispose()
      // render new route
      this.mountRoutedComponent()
    }
  }

  mountRoutedComponent () {
    this.trackDependency(ROUTER.toLowerCase())
    const Component = this.component.router.currentComponent
    this.component.router.updateHistory()
    const instance = new this.Reflection()
    instance.router = this.component.router
    instance.mount(Component, `[data-ref="${this.node.id}"]`, this.node.props)
    this.node.component = instance.proxy
    this.node.instance = instance
  }

  updateTextNode () {
    let foundText = false
    for (let n of this.parentEl.childNodes) {
      if (
        n.nodeName === '#text' &&
        n.nodeValue.includes(this.node.interpolatedContent)
      ) {
        foundText = true
        n.nodeValue = this.interpolatedContent()
      }
    }
    if (!foundText) {
      // this is necessary because of "if" statements
      this.createTextNode()
      this.append()
    }
  }

  interpolatedContent () {
    return (this.node.interpolatedContent = this.textContent(this.node.content))
  }

  setAttributes () {
    this.node?.attributes?.forEach((attr: Attribute) => {
      if (attr.key === ROUTE) return this.setRouteLink(attr)

      if (HANDLERS.includes(attr.key)) return this.setHandler(attr)

      const bindings = this.bindMatches(attr.value)
      if (bindings) return this.setAttrBinding(attr, bindings)

      this.el?.setAttribute(attr.key, attr.value)
      if (this.isComponent) this.setProp(attr)
    })
  }

  setRouteLink ({ key, value }) {
    const [_, component] = this.component.router.find(value)
    this.el?.setAttribute(key, value)
    this.el?.setAttribute('href', value)
    const handler = e => {
      e.preventDefault()
      const router = this.component.router
      router.currentPath = value
      this.component.router = router // force reassignment so proxy picks up update
    }
    this.addListener(CLICK, handler)
  }

  setProp ({ key, value }) {
    const prop = { [key]: value }
    const props = this.node.props
    const parent = this.component
    this.node.props = props ? { ...props, ...prop } : { ...prop, parent }
  }

  setAttrBinding (attr: Attribute, bindings) {
    if (!this.el) return // because we are re-building "each" nodes instead of updating, we have to avoid this

    const prop = this.unwrapMatch(bindings[0])
    this.trackDependency(prop)
    this.el.setAttribute(attr.key, this.component[prop])
    if (this.isComponent)
      this.setProp({ key: attr.key, value: this.component[prop] })
  }

  setHandler (attr: Attribute) {
    if (attr.key === EACH) return this.setEach(attr)

    const [handlerType, handler] = this.deriveHandler(attr)
    this.addListener(handlerType, handler)
    if (this.isComponent) this.setProp({ key: attr.key, value: handler })
  }

  deriveHandler ({ key, value }) {
    const val = this.unwrapMatch(value)
    const handler = this.component[val].bind(this.component)
    const handlerType = HANDLERS.find(i => i === key)
    return [handlerType, handler]
  }

  addListener (handlerType, handler) {
    if (!this.node.listeners) this.node.listeners = {}
    const existing = this.node.listeners[handlerType]
    if (!existing) {
      this.el.addEventListener(handlerType, handler, false)
      this.node.listeners[handlerType] = true
    }
  }

  append (opts: { insertBefore?: { position: number } } = {}) {
    if (this.node.parent?.id) {
      opts.insertBefore
        ? this.appendBefore(opts.insertBefore.position)
        : this.parentEl.appendChild(this.el)
    } else if (this.root) {
      this.root.appendChild(this.el)
    }
  }

  appendBefore (position) {
    const nodes = this.node.parent.children
    const findNextSibling = (index: number) => {
      index += 1
      if (index - 2 > nodes.length) return null // no next sibling

      const id = nodes[index].id
      const el = document.querySelector(`[data-ref="${id}"]`)
      return el ? el : findNextSibling(index)
    }
    const element = findNextSibling(position)
    element
      ? this.parentEl.insertBefore(this.el, element)
      : this.parentEl.appendChild(this.el)
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
    return propOrExpression in this.component
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
      let func = new Function(
        ...Object.keys(this.component),
        `return ${expression}`
      )
      return func(...Object.values(this.component))
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

  trackDependency (propOrExpression: string) {
    const addDep = prop => {
      this.node.tracks
        ? this.node.tracks.add(prop)
        : (this.node.tracks = new Set([prop]))
    }

    if (propOrExpression in this.component) return addDep(propOrExpression)

    Object.keys(this.component).forEach(prop => {
      // still not perfect but less error-prone than regex solution
      if (propOrExpression.includes(prop)) addDep(prop)
    })
  }

  setRef () {
    this.el.setAttribute('data-ref', this.node.id)
  }

  setIf () {
    const { value } = (this.node.attributes || []).find(a => a.key === IF)
    const val = this.unwrapMatch(value)
    this.node.conditionalRoot = true
    this.node.hidden = !this.deriveBound(val)
    this.trackDependency(val)
    this.node.children.forEach(n => {
      n.hidden = this.node.hidden
      n.tracks ? n.tracks.add(val) : (n.tracks = new Set([val]))
    })
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
    new Render(this.Reflection, nodes, this.component, null)

    this.index = this.index + this.node.children.length // fast-forward to next node after each decendants
    this.trackDependency(prop)
  }

  get isEach () {
    return this.node.attributes?.map(n => n.key)?.includes(EACH)
  }

  get isConditional () {
    return (this.node.attributes || []).map(a => a.key).includes(IF)
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

  get components () {
    const obj = this.component?.components || {}
    return Object.keys(obj)
  }

  get isComponent () {
    return this.components.includes(this.node.tag) || this.node.tag === ROUTER
  }
}
