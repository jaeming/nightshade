import { EVENT_HANDLERS } from './index'

export function buildAttributes (node, el, js) {
  el.setAttribute('data-shade', node.id)
  Object.keys(node.attributes).map(key => {
    const binding = node.attributes[key]?.match(/{(.*)}/)
    if (binding) {
      handleBoundAttr(key, el, js, binding)
    } else {
      el.setAttribute(key, node.attributes[key])
    }
  })
}

function handleBoundAttr (key: string, el, js, binding) {
  if (!EVENT_HANDLERS.includes(key)) return el.setAttribute(key, js[binding[1]])

  if (key === 'model') return setModel(el, js, binding, key)

  const handler = js[binding[1]].bind(js)
  el.addEventListener(key, handler, false)
}

function setModel (el, js, binding, key: string) {
  el.value = js[binding[1]]
  key = 'input'
  const handler = e => {
    js[binding[1]] = e.target.value
  }
  el.addEventListener(key, handler, false)
}
