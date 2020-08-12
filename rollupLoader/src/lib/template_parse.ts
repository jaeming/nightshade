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
  // currentParent = null
  currentNode = null

  constructor (template) {
    this.template = template
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
      if (this.opening) this.currentNode.tag += this.buffer
      if (this.opened) {
        this.currentNode.text = this.currentNode.text || ''
        this.currentNode.text += this.buffer.replace('\n', '')
      }
    }
  }

  setBracketState () {
    if (this.buffer === Bracket.Open) this.openTag()
    if (this.buffer === Bracket.End) this.endTag()
    if (this.buffer === Bracket.Closing) this.setState(TagState.Closing)
  }

  setState (state: TagState) {
    this.currentNode.state = state
  }

  openTag () {
    if (!this.currentNode) {
      // root node
      this.currentNode = { tag: '' }
      this.currentNode.parent = { tag: 'ROOT', state: TagState.Opened }
      this.setState(TagState.Opening)
    } else if (this.opened) {
      // child
      const parent = this.currentNode
      this.currentNode = { state: TagState.Opening, parent, tag: '' }
    }
    this.nodes.push(this.currentNode)
  }

  endTag () {
    if (this.opening) this.setState(TagState.Opened)
    if (this.closing) {
      this.setState(TagState.Closed)
      this.currentNode = this.currentNode.parent
    }
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
