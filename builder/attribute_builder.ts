import { EVENT_HANDLERS } from './index'
import { update } from './updater'

export function buildAttributes(nodes, node, el, js) {
  el.setAttribute('data-shade', node.id)
  Object.keys(node.attributes).map(key => {
    const binding = node.attributes[key].match(/{(.*)}/)
    if (binding) {
      handleBoundAttrs(nodes, key, el, js, binding)
    }
    else {
      el.setAttribute(key, node.attributes[key])
    }
  })
}

function handleBoundAttrs(nodes, key: string, el, js, binding) {
  if (!EVENT_HANDLERS.includes(key)) return el.setAttribute(key, js[binding[1]])
  if (key === 'model') return setModel(nodes, el, js, binding, key)

  const originalHandler = js[binding[1]].bind(js)
  const handler = (e) => {
    originalHandler(e)
    setTimeout(() => update(nodes, js))
  }
  el.addEventListener(key, handler, false)
}

function setModel(nodes, el, js, binding, key: string) {
  el.value = js[binding[1]]
  key = 'input'
  const handler = (e) => {
    js[binding[1]] = e.target.value
    setTimeout(() => update(nodes, js))
  }
  el.addEventListener(key, handler, false)
}
