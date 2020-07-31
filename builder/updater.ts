import { EVENT_HANDLERS } from './index'
import { build } from './index'

export function update (obj, prop, nodes, component) {
  nodes.map(n => {
    if (n.conditionals.includes(prop)) {
      n.visible = n.conditionals.every(c => obj[c])
    }

    let el =
      document.querySelector(`[data-shade="${n.id}"]`) ||
      build(n, component, `[data-shade="${n.parent.id}"]`)

    if (el && !n.visible) el.parentElement.removeChild(el)

    Object.keys(n.attributes).map(key => {
      const binding = n.attributes[key]?.match(/{(.*)}/)
      if (binding && !EVENT_HANDLERS.includes(key)) {
        el.setAttribute(key, component[binding[1]])
      }
    })
    const binding = n.text.match(/{(.*)}/)
    if (binding) {
      el.textContent = component[binding[1]]
    }
  })
}
