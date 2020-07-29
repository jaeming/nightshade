import { nodeParser, findParent } from './node_parser'

export const templateParser = (data, js) => {
  try {
    const vDom = data.reduce((memo, node, index) => {
      const element = nodeParser(node, js)
      if (!element) return memo

      element.parent = findParent(memo, element.indentation, index)

      if (!element.parent.visible) {
        element.visible = false
        element.deps = [...element.deps, ...element.parent.deps] // this is crappy but will mvp for now
      }

      memo.push(element)
      return memo
    }, [])
    return vDom
  } catch (e) {
    console.log("it's all gone very wrong...")
    console.log(e)
  }
}
