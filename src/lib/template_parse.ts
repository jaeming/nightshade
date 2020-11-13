import { uid } from './utils'
import { TagState, VOID_ELEMENTS, BRACKETS, Bracket } from './types'

// BIG TODO: handle html entities

export class TemplateParse {
  nodes = []
  template = ''
  buffer = ''
  currentNode = null
  index = 0

  constructor (template) {
    this.template = template
    this.parse()
  }

  get prevBuffer () {
    return this.template[this.index - 1]
  }

  get nextBuffer () {
    return this.template[this.index + 1]
  }

  get isOpening () {
    return this.currentNode.state === TagState.Opening
  }

  get isOpened () {
    return this.currentNode.state === TagState.Opened
  }

  get isAttributes () {
    return this.currentNode.state === TagState.Attributes
  }

  get isClosing () {
    return this.currentNode?.state === TagState.Closing
  }

  get isSelfClosing () {
    return VOID_ELEMENTS.includes(this.currentNode.tag)
  }

  get isComment () {
    return this.currentNode?.state === TagState.Comment
  }

  get isBracket () {
    if (!BRACKETS.includes(this.buffer as Bracket)) return false

    if (this.buffer === Bracket.Closing)
      return this.prevBuffer === Bracket.Open || this.nextBuffer === Bracket.End

    return true
  }

  parse () {
    for (let i = 0; i < this.template.length; i++) {
      this.index = i
      this.buffer = this.template[i]
      this.process()
    }
  }

  process () {
    if (this.isBracket) return this.setBracketState()

    if (this.isOpening) this.setTag()
    if (this.isAttributes) this.setAttributes()
    if (this.isOpened) this.setTextNode()
  }

  setBracketState () {
    if (this.buffer === Bracket.Open && !this.isComment) this.openTag()
    if (this.buffer === Bracket.Closing && !this.isComment) this.closingTag()
    if (this.buffer === Bracket.End) this.endTag()
  }

  setTag () {
    const becomesComment =
      this.buffer === '!' && this.prevBuffer === Bracket.Open
    if (becomesComment) return this.setState(TagState.Comment)

    if ([' ', '\n'].includes(this.buffer)) {
      this.setState(TagState.Attributes)
      this.setAttributes()
    } else {
      this.currentNode.tag += this.buffer
    }
  }

  setTextNode () {
    if (this.currentNode.tag === 'text') {
      // append to current text node
      this.currentNode.content += this.buffer.replace('\n', '')
    } else {
      this.setChild({ asTextNode: true })
    }
  }

  setAttributes () {
    if (!this.attributes) {
      this.currentNode.attributes = [{ statement: '', key: '', value: '' }]
    }
    let { statement, key, value } = this.currentAttribute
    let finishAttr = false
    statement += this.buffer

    if ([' ', '\n'].includes(statement)) return // ignore space seperator
    if (this.buffer === '=') return this.updateCurrentAttr({ statement }) // update and move on to key

    const setValue = () => {
      const index = statement.indexOf('=') + 1
      const isQuote = this.buffer === statement[index]
      const isClosingQuote = statement.length - 1 > index
      if (isQuote && isClosingQuote) {
        finishAttr = true
      } else {
        value += this.buffer
      }
    }
    const setKey = () => {
      if (this.buffer === ' ') {
        // no-assignment attribute
        statement = key
        finishAttr = true
      } else {
        const keyFinished = this.buffer === "'" || this.buffer === '"'
        if (!keyFinished) key += this.buffer
      }
    }

    statement.includes('=') ? setValue() : setKey()
    this.updateCurrentAttr({ statement, key, value })

    if (finishAttr) {
      value = value.replace(/"|'/g, '') // remove escaped quotes
      this.updateCurrentAttr({ value })
      this.currentNode.attributes.push({ statement: '', key: '', value: '' })
    }
  }

  get attributes () {
    return this.currentNode.attributes
  }

  get currentAttribute () {
    if (!this.attributes) return
    return this.attributes[this.attributes.length - 1]
  }

  removeEmptyAttrs () {
    if (this.currentAttribute?.statement === '') {
      this.currentNode.attributes.splice(this.currentNode.attributes.length - 1)
    }
  }

  updateCurrentAttr (val) {
    this.attributes[this.attributes.length - 1] = {
      ...this.attributes[this.attributes.length - 1],
      ...val
    }
  }

  openTag () {
    if (!this.currentNode) {
      this.setRoot()
    } else if (this.isOpened) {
      if (this.currentNode.tag === 'text') this.closeTextNode()
      this.setChild({})
    }
  }

  endTag () {
    if ((this.isOpening || this.isAttributes) && !this.isSelfClosing) {
      this.setState(TagState.Opened)
      this.removeEmptyAttrs()
      this.saveNode()
    }
    // refactor dupe logic
    if ((this.isOpening || this.isAttributes) && this.isSelfClosing) {
      this.setSelfClosing()
      this.currentNode = this.findOpenParent(this.currentNode)
    }
    if (this.isComment) {
      const closingComment =
        this.prevBuffer === '-' && this.template[this.index - 2] === '-'
      if (closingComment) {
        this.setState(TagState.Closed)
        this.currentNode = this.findOpenParent(this.currentNode)
      }
    }
    if (this.isClosing) {
      this.setState(TagState.Closed)
      this.currentNode = this.findOpenParent(this.currentNode)
    }
  }

  closingTag () {
    if ((this.isOpening || this.isAttributes) && this.isSelfClosing) {
      this.setSelfClosing()
    }
    if (this.isOpening && !this.isSelfClosing) {
      // discard current node since it was just a closing tag
      this.currentNode = this.currentNode.parent // go back to prev node
    }
    this.setState(TagState.Closing)
  }

  findOpenParent (node) {
    // find closest open parent
    const parent = node.parent
    // if (!parent) return node // no more parents open
    return parent.state.Closed ? this.findOpenParent(node) : parent
  }

  closeTextNode () {
    this.setState(TagState.Closed)
    if (this.currentNode.content.replace(/ /g, '').length) {
      this.currentNode.content = this.currentNode.content.trim()
      this.saveNode()
    }
    this.currentNode = this.currentNode.parent
  }

  setSelfClosing () {
    this.setState(TagState.Closed)
    this.removeEmptyAttrs()
    this.saveNode()
  }

  setState (state: TagState) {
    this.currentNode.state = state
  }

  setRoot () {
    this.currentNode = { tag: '' }
    this.currentNode.parent = { tag: 'ROOT', state: TagState.Opened }
    this.setState(TagState.Opening)
  }

  setChild ({ asTextNode }: { asTextNode?: boolean }) {
    const parent = this.currentNode
    this.currentNode = asTextNode
      ? {
          state: TagState.Opened,
          tag: 'text',
          content: this.buffer.replace('\n', ''),
          parent
        }
      : { state: TagState.Opening, tag: '', parent }
  }

  saveNode () {
    this.currentNode.id = uid()
    this.nodes.push(this.currentNode)
    const p = this.currentNode.parent
    p.children?.length
      ? p.children.push(this.currentNode)
      : (p.children = [this.currentNode])
  }
}
