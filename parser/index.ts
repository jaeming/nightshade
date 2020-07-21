const fs = require('fs')
import { nodeParser, findParent } from './node_parser'

export const parser = (file) => {
  try {
    const data = fs.readFileSync('Home.shade', 'utf8').split('\n')
    const vDom = data.reduce((memo, node, index) => {
      const element = nodeParser(node)
      if (!element) return memo

      element.parent = findParent(memo, element.indentation, index)    
      memo.push(element)
      return memo
    }, [])

    return vDom
  } catch (e) {
    console.log('it\'s all gone very wrong...')
    console.log(e)
  }
}
