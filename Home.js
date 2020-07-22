/*template
  div(id=yolo class="main") this is the main div
    hr()
    h2() section:
      span(class="em-title")  home
      span()  page...
    br()
    button(onclick={increment}) increment
    p() {count}
    div()
      img(src="https://chuckanddons.com/media/wysiwyg/kitten_blog.jpg")
    ul()
      li() Item 1
      li(class="foo") item 2
      li()
        div()
          span() something extra goes here!
          span()  ~ a lovely item 3
template*/

export default {
  count: 1,
  
  increment() {
    this.count++
  }
}



