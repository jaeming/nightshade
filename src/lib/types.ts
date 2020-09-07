// render

const CLICK = 'click'
const INPUT = 'input'
export const IF = 'if'
export const MODEL = 'model'
export const EACH = 'each'

export const HANDLERS = [CLICK, INPUT, MODEL, EACH]

export interface Options {
  update?: boolean
  prop?: string
}
export interface Attribute {
  key: string
  value: string
}

// parser
export enum Bracket {
  Open = '<',
  End = '>',
  Closing = '/'
}

export const BRACKETS = [Bracket.Open, Bracket.End, Bracket.Closing]

export enum TagState {
  Opening = 'Opening',
  Attributes = 'Attributes',
  Opened = 'Opened',
  Closing = 'Closing',
  Closed = 'Closed',
  Comment = 'Comment'
}

export const VOID_ELEMENTS = [
  'img',
  'br',
  'input',
  'area',
  'base',
  'col',
  'embed',
  'hr',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]
