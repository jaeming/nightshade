import { attributeParser } from './attribute_parser'
import { nanoid } from 'nanoid'

const ROOT = { tag: "root", attributes: { id: "root" } }

export const nodeParser = (node) => {
  const tag = node.split('(')[0].trim()
  if (!tag.length) return

  const text = node.split(') ')[1] || ''
  const attributes = attributeParser(node.match(/\((.*)\)/))
  const indentation = node.search(/\S|$/)
  const id = nanoid()
  
  return { tag, attributes, text, indentation, id, parent: null }
}

export const findParent = (memo, indentation, index) => {
  if (index === 0) {
    return ROOT
  } else {
    for (let i=index; i >= 1; i--) {
      if (memo[i-1].indentation < indentation) {
        return memo[i-1]
      }
    }
  }
}
