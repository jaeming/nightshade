import { templateParser } from '../template_parser'
import Home from '../Home.js'
const fs = require('fs')

const APP_ROOT = '#root' // TODO make this dynamic

const data = fs.readFileSync('Home.js', 'utf8').split('\n')
const templateStartIndex = data.findIndex(i => i === "/*template")
const templateEndIndex = data.findIndex(i => i === "template*/")
const template = data.slice(templateStartIndex+1, templateEndIndex)

const nodes = templateParser(template, Home)
nodes.map(i => build(i, Home))

function build(node, js) {
  const el = document.createElement(node.tag)
  el.setAttribute('data-shade', node.id)
  Object.keys(node.attributes).map(key => {
    const binding = node.attributes[key].match(/{(.*)}/)
    if (binding) {
      if (key === 'onclick') {
        const originalHandler = js[binding[1]].bind(js)
        const handler = () => {
          originalHandler()
          setTimeout(() => update(js))
        }
        el.addEventListener("click", handler, false);
      } else {
        el.setAttribute(key, js[binding[1]])
      }
    } else {
      el.setAttribute(key, node.attributes[key])
    }      
  })
  const binding = node.text.match(/{(.*)}/)
  if (binding) {
    el.textContent = js[binding[1]]
  } else {
    el.textContent = node.text
  }
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

function update(js) {
  nodes.map(i => build(i, js))
}
