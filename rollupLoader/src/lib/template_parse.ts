// TODO:
// Handle self-closing tags (of both variations: "/>" and ">")
// add unique ID
// add isReflected key (eg: "{msg}")
// add attributes
//   detect special events/directives, eg:
//     onclick='handleClick', model='msg', if='foo===bar', each='items as item'
// track dependencies so we know what element to re-render when state changes

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
      if (this.opened) this.setTextNode()
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
      if (this.currentNode.tag === 'text') this.closeTextNode()
      this.setChild({})
    }
  }

  endTag () {
    if (this.opening) {
      this.setState(TagState.Opened)
      this.nodes.push(this.currentNode)
    }
    if (this.closing) {
      this.setState(TagState.Closed)
      this.currentNode = this.findOpenParent(this.currentNode)
    }
  }

  closingTag () {
    if (this.opening) {
      // discard current node since it was just a closing tag
      this.currentNode = this.currentNode.parent // go back to prev node
    }
    // TODO: handle self closing tags
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
      this.nodes.push(this.currentNode)
    }
    this.currentNode = this.currentNode.parent
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

  setTag () {
    this.currentNode.tag += this.buffer
  }

  setTextNode () {
    if (this.currentNode.tag === 'text') {
      // append to current text node
      this.currentNode.content += this.buffer.replace('\n', '')
    } else {
      this.setChild({ asTextNode: true })
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
