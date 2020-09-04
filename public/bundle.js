
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

    // import Reflection from '../lib/reflection'
    class Render {
        constructor(Reflection, nodes, component, root, options = {}) {
            this.Reflection = Reflection;
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
            if (this.isComponent)
                return this.createComponent();
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
        createComponent() {
            const comp = new this.Reflection();
            comp.mount(this.component.components[this.node.tag], `[data-ref="${this.node.id}"]`, this.node.props);
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
                if (this.isComponent)
                    this.setProp(attr);
            });
        }
        setProp({ key, value }) {
            const prop = { [key]: value };
            const props = this.node.props;
            const parent = this.component;
            this.node.props = props ? { ...props, ...prop } : { ...prop, parent };
        }
        setAttrBinding(attr, bindings) {
            if (!this.el)
                return; // because we are re-building "each" nodes instead of updating, we have to avoid this
            const prop = this.unwrapMatch(bindings[0]);
            this.trackDependency(prop);
            this.el.setAttribute(attr.key, this.component[prop]);
            if (this.isComponent)
                this.setProp({ key: attr.key, value: this.component[prop] });
        }
        setHandler(attr) {
            if (attr.key === EACH)
                return this.setEach(attr);
            const [handlerType, handler] = this.deriveHandler(attr);
            this.el.addEventListener(handlerType, handler, false);
            if (this.isComponent)
                this.setProp({ key: attr.key, value: handler });
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
                memo = [...memo, node, ...node.children];
                return memo;
            }, []);
            // TODO: update each efficiently instead of re-rendering the entire list
            this.parentEl.innerHTML = ''; // hack to flush each nodes until we have proper updating
            // When we 'update' this is completly rebuilding the 'each' nodes and children instead of updating the existing ones.
            // Will need to do something more efficient later
            new Render(this.Reflection, nodes, this.component, null);
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
        get components() {
            const obj = this.component?.components || {};
            return Object.keys(obj);
        }
        get isComponent() {
            return this.components.includes(this.node.tag);
        }
    }

    class Reflection {
        constructor() {
            this.root = null;
            this.nodes = [];
            this.component = null;
            this.proxy = null;
            this.props = {};
        }
        mount(Component, element, props = {}) {
            this.root = document.querySelector(element);
            this.props = props;
            this.component = new Component(props);
            this.setProps(props);
            this.nodes = new TemplateParse(this.component.template).nodes;
            this.observe();
            new Render(Reflection, this.nodes, this.proxy, this.root);
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
            new Render(Reflection, nodes, this.proxy, this.root, { update: true, prop });
            // find all elements that track the prop as a dependency and update them
            // in the case of "if" we need to create a new elements, or remove them
        }
        setProps(props) {
            Object.entries(props).forEach(([k, v]) => {
                if (this.component.hasOwnProperty(k)) {
                    if (typeof v === 'function') {
                        // bind to parent context
                        this.component[k] = v.bind(props.parent);
                    }
                    else {
                        this.component[k] = v;
                    }
                }
            });
        }
    }

    class Child {
      template = "<div>\n  <p>I am a child component: {msg}</p>\n  <p>a prop: {someProp}</p>\n  <small>another prop: *{hello}*</small>\n  <button click=\"{increment}\">increment parent's count</button>\n</div>\n\n\n"
        msg = 'CHILD HERE'

        // props can declared this way too
        hello
        increment

        // or they can be set in the constructor
        constructor ({ someProp }) {
          Object.assign(this, { someProp });
        }
      }

    class Foo {
      template = "<main>\n  Main element here...\n  <p id=\"main-text\" class=\"foo bar moar\" small data-role=\"test\">\n    a paragraph...\n  </p>\n  <hr />\n  <p>this is a prop: {myProp}</p>\n  <p>we can mutate it locally but that will not sync upwards.</p>\n  <input type=\"text\" value=\"{myProp}\" input=\"{mutateProp}\" />\n  <hr />\n  <div>\n    some child...\n    <Child someProp=\"Foobar\" hello=\"{msg}\" increment=\"{increment}\"></Child>\n  </div>\n  <h2 class=\"{style}\">the count is {count}</h2>\n  <button click=\"{increment}\">increment count</button>\n  <button click=\"{decrement}\">decrement count</button>\n  <h3>{msg}, {question}... again: {msg}</h3>\n  <div>\n    <p>lets evaluate and expression:</p>\n    <p>2 + 2 = {2 + 2}</p>\n    <p>Should I stay or should I go? {true ? \"go\" : \"stay\"}</p>\n  </div>\n  <p>items: {msg}</p>\n  <ul>\n    <li each=\"{items as item, index}\" class=\"{style}\">\n      {index + 1}: hi to {item.name}\n    </li>\n  </ul>\n  <br />\n  <div large>\n    <input type=\"text\" value=\"{someText}\" input=\"{handleInput}\" />\n    <p>this is what you entered: {someText}</p>\n    <button click=\"{addText}\">add text to list</button>\n    <button click=\"{clearText}\">clear text</button>\n  </div>\n  more main here!\n</main>\n\n\n"
        components = {
          Child
        }

        msg = 'Hello World!'
        question = 'How are you tonight?'
        count = 0
        style = 'counter-class'
        someText = 'test'
        items = []

        constructor ({ myProp }) {
          this.myProp = myProp;
        }

        increment () {
          console.log(this);
          this.count++;
        }

        decrement () {
          this.count--;
        }

        handleInput (e) {
          this.someText = e.target.value;
        }

        mutateProp (e) {
          this.myProp = e.target.value;
        }

        addText () {
          this.items = [...this.items, { name: this.someText }];
        }

        clearText () {
          this.someText = '';
        }
      }

    const app = new Reflection();

    let myProp = 'Test Prop';

    app.mount(Foo, '#app', { myProp });

}());
//# sourceMappingURL=bundle.js.map
