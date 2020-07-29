import { EVENT_HANDLERS } from './index'
import { build } from './index'

export function update (nodes, js) {
  nodes.map(n => {
    let el = document.querySelector(`[data-shade="${n.id}"]`) || build(n, js)
    if (el && !n.visible) el.parentElement.removeChild(el)

    Object.keys(n.attributes).map(key => {
      const binding = n.attributes[key]?.match(/{(.*)}/)
      if (binding && !EVENT_HANDLERS.includes(key)) {
        el.setAttribute(key, js[binding[1]])
      }
    })
    const binding = n.text.match(/{(.*)}/)
    if (binding) {
      el.textContent = js[binding[1]]
    }
  })
}
