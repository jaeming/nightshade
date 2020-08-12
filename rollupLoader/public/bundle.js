
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    var Bracket;
    (function (Bracket) {
        Bracket["Open"] = "<";
        Bracket["End"] = ">";
        Bracket["Closing"] = "/";
    })(Bracket || (Bracket = {}));
    const BRACKETS = [Bracket.Open, Bracket.End, Bracket.Closing];
    var TagState;
    (function (TagState) {
        TagState["Opening"] = "Opening";
        TagState["Attributes"] = "Attributes";
        TagState["Opened"] = "Opened";
        TagState["Closing"] = "Closing";
        TagState["Closed"] = "Closed";
    })(TagState || (TagState = {}));
    class TemplateParse {
        constructor(template) {
            this.nodes = [];
            this.template = '';
            this.buffer = '';
            // currentParent = null
            this.currentNode = null;
            this.template = template;
            this.parse();
        }
        parse() {
            for (let i = 0; i < this.template.length; i++) {
                this.buffer = this.template[i];
                this.process();
            }
        }
        process() {
            if (BRACKETS.includes(this.buffer)) {
                this.setBracketState();
            }
            else {
                if (this.opening)
                    this.currentNode.tag += this.buffer;
                if (this.opened) {
                    this.currentNode.text = this.currentNode.text || '';
                    this.currentNode.text += this.buffer.replace('\n', '');
                }
            }
        }
        setBracketState() {
            if (this.buffer === Bracket.Open)
                this.openTag();
            if (this.buffer === Bracket.End)
                this.endTag();
            if (this.buffer === Bracket.Closing)
                this.setState(TagState.Closing);
        }
        setState(state) {
            this.currentNode.state = state;
        }
        openTag() {
            if (!this.currentNode) {
                // root node
                this.currentNode = { tag: '' };
                this.currentNode.parent = { tag: 'ROOT', state: TagState.Opened };
                this.setState(TagState.Opening);
            }
            else if (this.opened) {
                // child
                const parent = this.currentNode;
                this.currentNode = { state: TagState.Opening, parent, tag: '' };
            }
            this.nodes.push(this.currentNode);
        }
        endTag() {
            if (this.opening)
                this.setState(TagState.Opened);
            if (this.closing) {
                this.setState(TagState.Closed);
                this.currentNode = this.currentNode.parent;
            }
        }
        get closing() {
            return this.currentNode.state === TagState.Closing;
        }
        get opened() {
            return this.currentNode.state === TagState.Opened;
        }
        get opening() {
            return (this.currentNode.state === TagState.Opening ||
                this.currentNode.state === TagState.Attributes);
        }
    }

    class Reflection {
        constructor() {
            this.root = null;
        }
        mount(Component, element) {
            this.root = document.querySelector(element);
            const component = new Component();
            const nodes = new TemplateParse(component.template).nodes;
            console.log(nodes);
        }
    }

    const foo = 'bar';

      class Foo {
      template = "<div>\n  Main Div here...\n  <p>\n    a paragraph...\n  </p>\n  <h3>{msg}</h3>\n  <div>\n    <ul>\n      <li>item one</li>\n      <li>item two</li>\n    </ul>\n  </div>\n</div>\n\n\n"
        msg = 'Hello World!'

        sayFoo () {
          return foo
        }
      }

    const app = new Reflection();

    app.mount(Foo, '#app');

}());
//# sourceMappingURL=bundle.js.map
