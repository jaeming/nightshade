import { attributeParser } from './attribute_parser'
import { Shade } from '../builder'
import { nanoid } from 'nanoid'

const ROOT = { tag: 'root', attributes: { id: 'root' }, visible: true }

export const nodeParser = (node, js) => {
  const tag = node.split('(')[0].trim()
  const nodeArgs = node.match(/\((.*)\)/)
  if (!tag.length) return

  const text = node.split(') ')[1] || ''
  const attributes = attributeParser(nodeArgs)
  const boundText = text.match(/{(.*)}/) ? text.match(/{(.*)}/)[1] : []
  const boundAttrs = Object.keys(attributes)
    .map(i => {
      const bound = attributes[i] && attributes[i].match(/{(.*)}/)
      return bound && bound[1]
    })
    .filter(i => i)
  const boundCondition = tag === 'if' ? [nodeArgs[1]] : []
  const reactive = !!(
    boundText.length ||
    boundAttrs.length ||
    boundCondition.length
  )

  return {
    tag,
    text,
    reactive,
    attributes,
    component: js.components[tag],
    conditionals: boundCondition,
    deps: [...boundText, ...boundAttrs], // will use this to selectively re-render at some point
    indentation: node.search(/\S|$/),
    id: nanoid(),
    visible: tag === 'if' ? js[nodeArgs[1]] : true,
    parent: null
  }
}

export const findParent = (memo, indentation, index) => {
  if (index === 0) {
    return ROOT
  } else {
    for (let i = index; i >= 1; i--) {
      if (memo[i - 1].indentation < indentation) {
        return memo[i - 1]
      }
    }
  }
}
