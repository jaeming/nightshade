
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    // TODO:
    // Handle self-closing tags (of both variations: "/>" and ">")
    // add unique ID
    // add isReflected key (eg: "{msg}")
    // add attributes
    //   detect special events/directives, eg:
    //     onclick='handleClick', model='msg', if='foo===bar', each='items as item'
    // track dependencies so we know what element to re-render when state changes
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
    const VOID_ELEMENTS = [
        'img',
        'br',
        'input',
        'area',
        'base',
        'col',
        'embed',
        'hr',
        'link',
        'meta',
        'param',
        'source',
        'track',
        'wbr'
    ];
    class TemplateParse {
        constructor(template) {
            this.nodes = [];
            this.template = '';
            this.buffer = '';
            this.currentNode = null;
            this.template = template;
            console.log(template);
            this.parse();
        }
        get isOpening() {
            return this.currentNode.state === TagState.Opening;
        }
        get isOpened() {
            return this.currentNode.state === TagState.Opened;
        }
        get isAttributes() {
            return this.currentNode.state === TagState.Attributes;
        }
        get isClosing() {
            return this.currentNode.state === TagState.Closing;
        }
        get isSelfClosing() {
            return VOID_ELEMENTS.includes(this.currentNode.tag);
        }
        parse() {
            for (let i = 0; i < this.template.length; i++) {
                this.buffer = this.template[i];
                this.process();
            }
        }
        process() {
            if (BRACKETS.includes(this.buffer)) {
                return this.setBracketState();
            }
            if (this.isOpening)
                this.setTag();
            if (this.isAttributes)
                this.setAttributes();
            if (this.isOpened)
                this.setTextNode();
        }
        setBracketState() {
            if (this.buffer === Bracket.Open)
                this.openTag();
            if (this.buffer === Bracket.Closing)
                this.closingTag();
            if (this.buffer === Bracket.End)
                this.endTag();
        }
        setTag() {
            if (this.buffer === ' ') {
                this.setState(TagState.Attributes);
                this.setAttributes();
            }
            else {
                this.currentNode.tag += this.buffer;
            }
        }
        setTextNode() {
            if (this.currentNode.tag === 'text') {
                // append to current text node
                this.currentNode.content += this.buffer.replace('\n', '');
            }
            else {
                this.setChild({ asTextNode: true });
            }
        }
        setAttributes() {
            if (!this.attributes) {
                this.currentNode.attributes = [{ statement: '', key: '', value: '' }];
            }
            let { statement, key, value } = this.currentAttribute;
            let finishAttr = false;
            statement += this.buffer;
            if (statement === ' ')
                return; // ignore space seperator
            if (this.buffer === '=')
                return this.updateCurrentAttr({ statement }); // update and move on to key
            const setValue = () => {
                const index = statement.indexOf('=') + 1;
                const isQuote = this.buffer === statement[index];
                const isClosingQuote = statement.length - 1 > index;
                if (isQuote && isClosingQuote) {
                    finishAttr = true;
                }
                else {
                    value += this.buffer;
                }
            };
            const setKey = () => {
                if (this.buffer === ' ') {
                    // no-assignment attribute
                    statement = key;
                    finishAttr = true;
                }
                else {
                    const keyFinished = this.buffer === "'" || this.buffer === '"';
                    if (!keyFinished)
                        key += this.buffer;
                }
            };
            statement.includes('=') ? setValue() : setKey();
            this.updateCurrentAttr({ statement, key, value });
            if (finishAttr) {
                value = value.replace(/"/g, ''); // remove escaped quotes
                this.updateCurrentAttr({ value });
                this.currentNode.attributes.push({ statement: '', key: '', value: '' });
            }
        }
        get attributes() {
            return this.currentNode.attributes;
        }
        get currentAttribute() {
            if (!this.attributes)
                return;
            return this.attributes[this.attributes.length - 1];
        }
        removeEmptyAttrs() {
            if (this.currentAttribute?.statement === '') {
                this.currentNode.attributes.splice(this.currentNode.attributes.length - 1);
            }
        }
        updateCurrentAttr(val) {
            this.attributes[this.attributes.length - 1] = {
                ...this.attributes[this.attributes.length - 1],
                ...val
            };
        }
        openTag() {
            if (!this.currentNode) {
                this.setRoot();
            }
            else if (this.isOpened) {
                if (this.currentNode.tag === 'text')
                    this.closeTextNode();
                this.setChild({});
            }
        }
        endTag() {
            if ((this.isOpening || this.isAttributes) && !this.isSelfClosing) {
                this.setState(TagState.Opened);
                this.removeEmptyAttrs();
                this.nodes.push(this.currentNode);
            }
            // refactor dupe logic
            if ((this.isOpening || this.isAttributes) && this.isSelfClosing) {
                this.setSelfClosing();
                this.currentNode = this.findOpenParent(this.currentNode);
            }
            if (this.isClosing) {
                this.setState(TagState.Closed);
                this.currentNode = this.findOpenParent(this.currentNode);
            }
        }
        closingTag() {
            if ((this.isOpening || this.isAttributes) && this.isSelfClosing) {
                this.setSelfClosing();
            }
            if (this.isOpening && !this.isSelfClosing) {
                // discard current node since it was just a closing tag
                this.currentNode = this.currentNode.parent; // go back to prev node
            }
            this.setState(TagState.Closing);
        }
        findOpenParent(node) {
            // find closest open parent
            const parent = node.parent;
            // if (!parent) return node // no more parents open
            return parent.state.Closed ? this.findOpenParent(node) : parent;
        }
        closeTextNode() {
            this.setState(TagState.Closed);
            if (this.currentNode.content.replace(/ /g, '').length) {
                this.currentNode.content = this.currentNode.content.trim();
                this.nodes.push(this.currentNode);
            }
            this.currentNode = this.currentNode.parent;
        }
        setSelfClosing() {
            this.setState(TagState.Closed);
            this.removeEmptyAttrs();
            this.nodes.push(this.currentNode);
        }
        setState(state) {
            this.currentNode.state = state;
        }
        setRoot() {
            this.currentNode = { tag: '' };
            this.currentNode.parent = { tag: 'ROOT', state: TagState.Opened };
            this.setState(TagState.Opening);
        }
        setChild({ asTextNode }) {
            const parent = this.currentNode;
            this.currentNode = asTextNode
                ? {
                    state: TagState.Opened,
                    tag: 'text',
                    content: this.buffer.replace('\n', ''),
                    parent
                }
                : { state: TagState.Opening, tag: '', parent };
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
      template = "<main>\n  Main element here...\n  <p id=\"main-text\" class=\"foo bar moar\" small data-role=\"test\">\n    a paragraph...\n  </p>\n  <h3>{msg}</h3>\n  <br />\n  <div large>\n    <ul>\n      <li>\n        item one\n        <input type=\"password\" placeholder=\"enter a password\">\n      </li>\n      <li>item two</li>\n    </ul>\n  </div>\n  more main here!\n</main>\n\n\n"
        msg = 'Hello World!'

        sayFoo () {
          return foo
        }
      }

    const app = new Reflection();

    app.mount(Foo, '#app');

}());
//# sourceMappingURL=bundle.js.map
