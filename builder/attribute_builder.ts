import { update, EVENT_HANDLERS } from './index'

export function buildAttributes(node: any, el: any, js: any) {
  el.setAttribute('data-shade', node.id)
  Object.keys(node.attributes).map(key => {
    const binding = node.attributes[key].match(/{(.*)}/)
    if (binding) {
      handleBoundAttrs(key, el, js, binding)
    }
    else {
      el.setAttribute(key, node.attributes[key])
    }
  })
}

function handleBoundAttrs(key: string, el: any, js: any, binding: any) {
  if (!EVENT_HANDLERS.includes(key)) return el.setAttribute(key, js[binding[1]])
  if (key === 'model') return setModel(el, js, binding, key)

  const originalHandler = js[binding[1]].bind(js)
  const handler = (e) => {
    originalHandler(e)
    setTimeout(() => update(js))
  }
  el.addEventListener(key, handler, false)
}

function setModel(el: any, js: any, binding: any, key: string) {
  el.value = js[binding[1]]
  key = 'input'
  const handler = (e) => {
    js[binding[1]] = e.target.value
    setTimeout(() => update(js))
  }
  el.addEventListener(key, handler, false)
}
