import { templateParser } from '../template_parser'
import Home from '../Home.js'
const fs = require('fs')

const APP_ROOT = '#root' // TODO make this dynamic
const EVENT_HANDLERS = ['click', 'input']

const data = fs.readFileSync('Home.js', 'utf8').split('\n')
const templateStartIndex = data.findIndex(i => i === "/*template")
const templateEndIndex = data.findIndex(i => i === "template*/")
const template = data.slice(templateStartIndex+1, templateEndIndex)

const home = new Proxy(new Home(), {
  set (obj, prop, val) {
    obj[prop] = val
    // nodes.filter(n => n.tracks.includes(prop)).forEach(i => {
    //   console.log('I found a depedency that needs to be re-rendered', prop, 'affects ', i.tag, i.id)
    // })
    return true
  }
})

const nodes = templateParser(template, Home)
nodes.map(i => build(i, home))

function build(node, js) {
  const el = document.createElement(node.tag)
  el.setAttribute('data-shade', node.id)
  Object.keys(node.attributes).map(key => {
    const binding = node.attributes[key].match(/{(.*)}/)
    if (binding) {
      if (EVENT_HANDLERS.includes(key)) {
        const originalHandler = js[binding[1]].bind(js)
        const handler = (e) => {
          originalHandler(e)
          setTimeout(() => update(js))
        }
        el.addEventListener(key, handler, false);
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
