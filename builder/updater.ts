import { EVENT_HANDLERS } from './index'

export function update(nodes, js) {
    nodes.map(n => {
      const el = document.querySelector(`[data-shade="${n.id}"]`)
      Object.keys(n.attributes).map(key => {
        const binding = n.attributes[key].match(/{(.*)}/)
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