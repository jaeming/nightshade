
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

    const uid = () => Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substr(2);
    class Builder {
        constructor(node, component, root, handlers) {
            this.node = node;
            this.component = component;
            this.root = root;
            this.handlers = handlers;
            this.el = null;
            this.create();
        }
        create() {
            if (this.node.tag === 'text') {
                const content = this.textContent(this.node.content);
                this.el = document.createTextNode(content);
                this.append();
            }
            else {
                this.el = document.createElement(this.node.tag);
                this.setRef();
                this.setAttributes();
                this.append();
            }
        }
        setAttributes() {
            this.node?.attributes?.forEach(attr => {
                const bindings = this.bindMatches(attr.value);
                const isHandler = Object.values(this.handlers).includes(attr.key);
                if (isHandler && bindings)
                    return this.setHandler(attr);
                if (bindings)
                    return this.setAttrBinding(attr, bindings);
                this.el.setAttribute(attr.key, attr.value);
            });
        }
        setAttrBinding(attr, bindings) {
            const val = this.unwrapMatch(bindings[0]);
            this.el.setAttribute(attr.key, this.component[val]);
        }
        setHandler(attr) {
            const [handlerType, handler] = this.deriveHandler(attr);
            this.el.addEventListener(handlerType, handler, false);
        }
        deriveHandler({ key, value }) {
            const val = this.unwrapMatch(value);
            const handler = this.component[val].bind(this.component);
            const handlerIndex = Object.values(this.handlers).findIndex(i => i === key);
            const handlerType = Object.keys(this.handlers)[handlerIndex];
            return [handlerType, handler];
        }
        append() {
            if (this.node.parent?.id) {
                const parentEl = document.querySelector(`[data-ref="${this.node.parent.id}"]`);
                parentEl.appendChild(this.el);
            }
            else if (this.root) {
                this.root.appendChild(this.el);
            }
        }
        textContent(content) {
            const bindings = this.bindMatches(content);
            if (!bindings)
                return content;
            bindings.forEach(bound => {
                content = content.replace(bound, this.deriveBound(bound));
            });
            return content;
        }
        deriveBound(bound) {
            const val = this.unwrapMatch(bound);
            return this.component.hasOwnProperty(val)
                ? this.component[val]
                : this.evaluate(val);
        }
        evaluate(expression) {
            return new Function('return ' + expression)();
        }
        bindMatches(str) {
            // returns array of matches including the braces
            return str.match(/\{([^}]+)\}/g);
        }
        unwrapMatch(str) {
            // unwraps from curly braces
            return str.replace(/[{}]/g, '');
        }
        setRef() {
            this.node.id = uid();
            this.el.setAttribute('data-ref', this.node.id);
        }
    }

    var Handler;
    (function (Handler) {
        Handler["click"] = "click";
        Handler["if"] = "if";
        Handler["input"] = "input";
        Handler["model"] = "model";
    })(Handler || (Handler = {}));
    class Reflection {
        constructor() {
            this.root = null;
            this.nodes = [];
            this.component = null;
            this.proxy = null;
            this.handlers = { ...Handler };
        }
        mount(Component, element, options = {}) {
            this.setOptions(options);
            this.root = document.querySelector(element);
            this.component = new Component();
            this.nodes = new TemplateParse(this.component.template).nodes;
            this.reflect();
            this.nodes.forEach(n => this.build(n));
        }
        reflect() {
            const update = this.update.bind(this);
            this.proxy = new Proxy(this.component, {
                set(obj, prop, val, receiver) {
                    obj[prop] = val;
                    update(obj, prop, receiver);
                    return true;
                }
            });
        }
        update(obj, prop, receiver, val) {
            // todo
            console.log(`prop: ${String(prop)} wants to update to value: ${receiver.count}`);
        }
        build(node) {
            new Builder(node, this.proxy, this.root, this.handlers);
        }
        setOptions(opts) {
            if (opts.handlers)
                this.handlers = { ...Handler, ...opts.handlers };
        }
    }

    const foo = 'bar';

      class Foo {
      template = "<main>\n  Main element here...\n  <p id=\"main-text\" class=\"foo bar moar\" small data-role=\"test\">\n    a paragraph...\n  </p>\n  <h2 class=\"{style}\">the count is {count}</h2>\n  <button click=\"{increment}\">increment count</button>\n  <h3>{msg}, {question}... again: {msg}</h3>\n  <p>lets evaluate and expression:</p>\n  <p>2 + 2 = {2 + 2}</p>\n  <p>Should I stay or should I go? {true ? \"go\" : \"stay\"}</p>\n  <br />\n  <div large>\n    <ul>\n      <li>\n        item one\n        <input type=\"password\" placeholder=\"enter a password\" />\n      </li>\n      <li>item two</li>\n    </ul>\n  </div>\n  more main here!\n</main>\n\n\n"
        msg = 'Hello World!'
        question = 'How are you tonight?'
        count = 0
        style = 'counter-class'

        increment () {
          console.log('increment');
          this.count++;
        }

        sayFoo () {
          return foo
        }
      }

    const app = new Reflection();

    app.mount(Foo, '#app');

}());
//# sourceMappingURL=bundle.js.map
