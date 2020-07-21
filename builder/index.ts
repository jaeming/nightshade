import { parser } from '../parser'

const APP_ROOT = '#root' // TODO make this dynamic

const build = (node) => {
  const el = document.createElement(node.tag)
  el.setAttribute('data-shade', node.id)
  Object.keys(node.attributes).map(key => {
    el.setAttribute(key, node.attributes[key])
  })
  el.textContent = node.text
  if (node.parent.tag === 'root') {
    const parentEl = document.querySelector(APP_ROOT)
    parentEl.innerHTML = ''
    parentEl.appendChild(el)
  } else {
    const parentEl = document.querySelector(`[data-shade="${node.parent.id}"]`)
    parentEl.appendChild(el)
  }
  return el
}

const nodes = parser('Home.shade')
const html = nodes.map(i => build(i))
console.log(html)