import HTML from 'html-parse-stringify'

export default class Reflective {
  mount (Component, element) {
    const component = new Component()
    const appRoot = document.querySelector(element)

    const template = HTML.parse(component.template)
    console.log('html as objects:', template)
  }
}
