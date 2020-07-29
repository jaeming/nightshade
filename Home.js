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
    if(showList)
      ul()
        li() Item 1
        li(class="foo") item 2
        li()
          div()
            span() something extra goes here!
            span()  ~ a lovely item 3
      button(click={toggleListTwo}) toggle the other list
      if(otherList)
        h2() I wonder if I'll see this
template*/

export default class Home {
  count = 1
  name = 'Guest'
  showList = false
  otherList = false

  increment () {
    this.count++
  }

  toggleList () {
    this.showList = !this.showList
  }

  toggleListTwo () {
    this.otherList = !this.otherList
  }
}
