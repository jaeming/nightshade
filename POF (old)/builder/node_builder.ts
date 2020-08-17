export function buildNode (node, el, component, root) {
  const binding = node.text.match(/{(.*)}/)
  if (binding) {
    el.textContent = interpolatedText(component, binding, node.text)
  } else {
    el.textContent = node.text
  }

  if (node.parent.tag === 'root') {
    const parentEl = document.querySelector(root)
    // preserve parent text node
    let parentText
    if (parentEl.childNodes?.length) {
      parentText = document.createTextNode(parentEl.childNodes[0].nodeValue)
    }
    // reset parent for re-render
    parentEl.innerHTML = ''
    // re-insert parent text before appending additional nodes
    if (parentText) parentEl.appendChild(parentText)
    // append additional node/s
    parentEl.appendChild(el)
  } else {
    const parentEl = document.querySelector(`[data-shade="${node.parent.id}"]`)
    parentEl.appendChild(el)
  }
  return el
}

export function interpolatedText (component, binding, text) {
  let replacementText = text
  binding.forEach((bound, index) => {
    if (index === 0) return
    const bindingVal = component[binding[1]]
    replacementText = replacementText.replace(`{${bound}}`, bindingVal)
  })
  return replacementText
}
