
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    const uid = () => Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substr(2);

    // render
    const CLICK = 'click';
    const INPUT = 'input';
    const IF = 'if';
    const MODEL = 'model';
    const EACH = 'each';
    const HANDLERS = [CLICK, INPUT, IF, MODEL, EACH];
    // parser
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
                this.saveNode();
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
                this.saveNode();
            }
            this.currentNode = this.currentNode.parent;
        }
        setSelfClosing() {
            this.setState(TagState.Closed);
            this.removeEmptyAttrs();
            this.saveNode();
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
        saveNode() {
            this.currentNode.id = uid();
            this.nodes.push(this.currentNode);
            const p = this.currentNode.parent;
            p.children?.length
                ? p.children.push(this.currentNode)
                : (p.children = [this.currentNode]);
        }
    }

    class Render {
        constructor(nodes, component, root, options = {}) {
            this.nodes = nodes;
            this.component = component;
            this.root = root;
            this.options = options;
            this.el = null;
            this.node = null;
            this.index = 0;
            while (this.index < this.nodes.length) {
                this.node = this.nodes[this.index];
                options.update ? this.update() : this.create();
                this.index++;
            }
        }
        create() {
            this.node.tag === 'text' ? this.createTextNode() : this.createElement();
            if (!this.isEach)
                this.append();
        }
        update() {
            // todo: deal with if's
            this.el = document.querySelector(`[data-ref="${this.node.id}"]`);
            if (this.node.tag === 'text') {
                this.updateTextNode();
            }
            else {
                this.setAttributes();
            }
        }
        createElement() {
            this.el = document.createElement(this.node.tag);
            this.setRef();
            this.setAttributes();
        }
        createTextNode() {
            this.el = document.createTextNode(this.interpolatedContent());
        }
        updateTextNode() {
            for (let n of this.parentEl.childNodes) {
                if (n.nodeName === '#text' &&
                    n.nodeValue.includes(this.node.interpolatedContent)) {
                    n.nodeValue = this.interpolatedContent();
                }
            }
        }
        interpolatedContent() {
            const content = this.textContent(this.node.content);
            this.node.interpolatedContent = content;
            return content;
        }
        setAttributes() {
            this.node?.attributes?.forEach((attr) => {
                if (HANDLERS.includes(attr.key))
                    return this.setHandler(attr);
                const bindings = this.bindMatches(attr.value);
                if (bindings)
                    return this.setAttrBinding(attr, bindings);
                this.el?.setAttribute(attr.key, attr.value);
            });
        }
        setAttrBinding(attr, bindings) {
            const prop = this.unwrapMatch(bindings[0]);
            this.trackDependency(prop);
            this.el.setAttribute(attr.key, this.component[prop]);
        }
        setHandler(attr) {
            if (attr.key === EACH)
                return this.setEach(attr);
            const [handlerType, handler] = this.deriveHandler(attr);
            this.el.addEventListener(handlerType, handler, false);
        }
        deriveHandler({ key, value }) {
            const val = this.unwrapMatch(value);
            const handler = this.component[val].bind(this.component);
            const handlerType = HANDLERS.find(i => i === key);
            return [handlerType, handler];
        }
        append() {
            if (this.node.parent?.id) {
                this.parentEl.appendChild(this.el);
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
                const prop = this.unwrapMatch(bound);
                this.trackDependency(prop);
                content = content.replace(bound, this.deriveBound(prop));
            });
            return content;
        }
        deriveBound(propOrExpression) {
            return this.component.hasOwnProperty(propOrExpression)
                ? this.component[propOrExpression]
                : this.evaluate(propOrExpression);
        }
        evaluate(expression) {
            // const scopes = Object.getOwnPropertyNames(this.component)
            // console.log(scopes)
            // also need to give scope to the component somwhow... https://stackoverflow.com/questions/31054910/get-functions-methods-of-a-class
            if (this.node.eachProps) {
                const { indexVar, itemVar, prop, index } = this.node.eachProps;
                let func = new Function(`${itemVar}`, `${indexVar}`, `return ${expression}`);
                return func(this.component[prop][index], index);
            }
            else {
                return new Function(`return ${expression}`);
            }
        }
        bindMatches(str) {
            // returns array of matches including the braces
            return str.match(/\{([^}]+)\}/g);
        }
        unwrapMatch(str) {
            // unwraps from curly braces
            return str.replace(/[{}]/g, '');
        }
        trackDependency(prop) {
            this.node.tracks
                ? this.node.tracks.add(prop)
                : (this.node.tracks = new Set([prop]));
        }
        setRef() {
            this.el.setAttribute('data-ref', this.node.id);
        }
        setEach(attr) {
            const val = this.unwrapMatch(attr.value); // accept either bracewrap or not
            const eachArgs = val.replace(/\s+/g, '').split(/as|,/);
            const [prop, ..._] = eachArgs;
            // create each node iterations
            const nodes = this.component[prop].reduce((memo, _, index) => {
                const node = this.cloneEachNode(eachArgs, index);
                // node.children.forEach(c => {
                //   if (c.tag === 'text') {
                //     const matches = this.bindMatches(c.content)
                //     matches.forEach(match => {
                //       c.content = c.content.replace(match, `{${prop}[${index}]}`)
                //     })
                //     console.log(c.content)
                //   }
                // })
                memo = [...memo, node, ...node.children];
                return memo;
            }, []);
            this.parentEl.innerHTML = ''; // TODO: update each efficiently instead of re-rendering the entire list
            new Render(nodes, this.component, null);
            this.index = this.index + this.node.children.length; // fast-forward to next node after each decendants
            this.trackDependency(prop);
        }
        get isEach() {
            return this.node.attributes?.map(n => n.key)?.includes(EACH);
        }
        cloneEachNode(eachProps, index) {
            const id = uid();
            const attributes = this.node.attributes.filter(n => n.key !== EACH);
            const node = { ...this.node, id, attributes };
            this.setEachProps(node, eachProps, index);
            node.children = node.children.map(child => {
                this.setEachProps(child, eachProps, index);
                return {
                    ...child,
                    id: uid(),
                    parent: node
                };
            });
            return node;
        }
        setEachProps(node, [prop, itemVar, indexVar], index) {
            node.eachProps = { prop, itemVar, indexVar, index };
        }
        get parentEl() {
            return document.querySelector(`[data-ref="${this.node.parent.id}"]`);
        }
        get prevNode() {
            return this.nodes[this.index - 1];
        }
    }

    class Reflection {
        constructor() {
            this.root = null;
            this.nodes = [];
            this.component = null;
            this.proxy = null;
        }
        mount(Component, element, options = {}) {
            this.root = document.querySelector(element);
            this.component = new Component();
            this.nodes = new TemplateParse(this.component.template).nodes;
            this.observe();
            new Render(this.nodes, this.proxy, this.root);
        }
        observe() {
            const update = this.update.bind(this);
            this.proxy = new Proxy(this.component, {
                set(obj, prop, val, receiver) {
                    obj[prop] = val;
                    update(prop, receiver);
                    return true;
                }
            });
        }
        update(prop, receiver) {
            console.log('update', String(prop), receiver[prop]);
            const nodes = this.nodes.filter(n => n.tracks?.has(prop));
            new Render(nodes, this.proxy, this.root, { update: true, prop });
            // find all elements that track the prop as a dependency and update them
            // in the case of "if" we need to create a new elements, or remove them
        }
    }

    class Foo {
      template = "<main>\n  Main element here...\n  <p id=\"main-text\" class=\"foo bar moar\" small data-role=\"test\">\n    a paragraph...\n  </p>\n  <h2 class=\"{style}\">the count is {count}</h2>\n  <button click=\"{increment}\">increment count</button>\n  <button click=\"{decrement}\">decrement count</button>\n  <h3>{msg}, {question}... again: {msg}</h3>\n  <div>\n    <p>lets evaluate and expression:</p>\n    <p>2 + 2 = {2 + 2}</p>\n    <p>Should I stay or should I go? {true ? \"go\" : \"stay\"}</p>\n  </div>\n  <p>items: {msg}</p>\n  <ul>\n    <li each=\"{items as item, index}\" class=\"nice\">\n      {index + 1}: hi to {item.name}\n    </li>\n  </ul>\n  <br />\n  <div large>\n    <input type=\"text\" value=\"{someText}\" input=\"{handleInput}\" />\n    <p>this is what you entered: {someText}</p>\n    <button click=\"{addText}\">add text to list</button>\n    <button click=\"{clearText}\">clear text</button>\n  </div>\n  more main here!\n</main>\n\n\n"
        msg = 'Hello World!'
        question = 'How are you tonight?'
        count = 0
        style = 'counter-class'
        someText = 'test'
        items = []

        increment () {
          this.count++;
        }

        decrement () {
          this.count--;
        }

        handleInput (e) {
          this.someText = e.target.value;
        }

        addText () {
          this.items = [...this.items, { name: this.someText }];
        }

        clearText () {
          this.someText = '';
        }
      }

    const app = new Reflection();

    app.mount(Foo, '#app');

}());
//# sourceMappingURL=bundle.js.map
