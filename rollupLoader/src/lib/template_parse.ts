enum Bracket {
  Open = '<',
  End = '>',
  Closing = '/'
}

const BRACKETS = [Bracket.Open, Bracket.End, Bracket.Closing]

enum TagState {
  Opening = 'Opening',
  Attributes = 'Attributes',
  Opened = 'Opened',
  Closing = 'Closing',
  Closed = 'Closed'
}

export class TemplateParse {
  nodes = []
  template = ''
  buffer = ''
  currentNode = null

  constructor (template) {
    this.template = template
    console.log(template)
    this.parse()
  }

  parse () {
    for (let i = 0; i < this.template.length; i++) {
      this.buffer = this.template[i]
      this.process()
    }
  }

  process () {
    if (BRACKETS.includes(this.buffer as Bracket)) {
      this.setBracketState()
    } else {
      if (this.opening) this.setTag()
      if (this.opened) this.setText()
    }
  }

  setBracketState () {
    if (this.buffer === Bracket.Open) this.openTag()
    if (this.buffer === Bracket.Closing) this.closingTag()
    if (this.buffer === Bracket.End) this.endTag()
  }

  openTag () {
    if (!this.currentNode) {
      this.setRoot()
    } else if (this.opened) {
      this.setChild()
    }
  }

  endTag () {
    if (this.opening) {
      this.setState(TagState.Opened)
      this.nodes.push(this.currentNode)
    }
    if (this.closing) {
      this.currentNode = this.findOpenParent(this.currentNode)
    }
  }

  closingTag () {
    this.setState(TagState.Closing)
  }

  findOpenParent (node) {
    // find closest open parent
    const parent = node.parent
    // if (!parent) return node // no more parents open

    return parent.state.Closed ? this.findOpenParent(node) : parent
  }

  setState (state: TagState) {
    this.currentNode.state = state
  }

  setRoot () {
    this.currentNode = { tag: '' }
    this.currentNode.parent = { tag: 'ROOT', state: TagState.Opened }
    this.setState(TagState.Opening)
  }

  setChild () {
    const parent = this.currentNode
    this.currentNode = { state: TagState.Opening, parent, tag: '' }
  }

  setTag () {
    this.currentNode.tag += this.buffer
  }

  setText () {
    // need to actually support text node instead of doing this...
    this.currentNode.text = this.currentNode.text || ''
    this.currentNode.text += this.buffer.replace('\n', '')
  }

  get closing () {
    return this.currentNode.state === TagState.Closing
  }

  get opened () {
    return this.currentNode.state === TagState.Opened
  }

  get opening () {
    return (
      this.currentNode.state === TagState.Opening ||
      this.currentNode.state === TagState.Attributes
    )
  }
}
