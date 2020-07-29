/*template
  div(id=yolo class="main") this is the main div
    hr()
    h2() section:
      span(class="em-title")  home
      span()  page...
    br()
    button(click={increment}) increment
    p() {count}
    input(type="text" model={name})
    p() {name}
    div()
      button(click={toggleList}) toggle list
    ul(if={showList})
      li() Item 1
      li(class="foo") item 2
      li()
        div()
          span() something extra goes here!
          span()  ~ a lovely item 3
template*/

export default class Home {
  count = 1
  name = "Guest"
  showList = false
  
  increment() {
    this.count++
  }

  toggleList() {
    this.showList = !this.showList
  }
}



