import { APP_ROOT } from './index'

export function buildNode(node, el, js) {
    const binding = node.text.match(/{(.*)}/)
    if (binding) {
      el.textContent = js[binding[1]]
    }
    else {
      el.textContent = node.text
    }
    if (node.parent.tag === 'root') {
      const parentEl = document.querySelector(APP_ROOT)
      parentEl.innerHTML = ''
      parentEl.appendChild(el)
    }
    else {
      const parentEl = document.querySelector(`[data-shade="${node.parent.id}"]`)
      parentEl.appendChild(el)
    }
  }