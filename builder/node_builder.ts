export function buildNode (node, el, js, root) {
  const binding = node.text.match(/{(.*)}/)
  if (binding) {
    el.textContent = js[binding[1]]
  } else {
    el.textContent = node.text
  }
  if (node.parent.tag === 'root') {
    const parentEl = document.querySelector(root)
    parentEl.innerHTML = ''
    parentEl.appendChild(el)
  } else {
    const parentEl = document.querySelector(`[data-shade="${node.parent.id}"]`)
    parentEl.appendChild(el)
  }
  return el
}
