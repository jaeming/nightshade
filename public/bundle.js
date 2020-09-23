
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
    const ROUTE = 'route';
    const MODEL = 'model';
    const EACH = 'each';
    const HANDLERS = [CLICK, INPUT, MODEL, EACH];
    const ROUTER = 'Router';
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
        TagState["Comment"] = "Comment";
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

    // BIG TODO: handle html entities
    class TemplateParse {
        constructor(template) {
            this.nodes = [];
            this.template = '';
            this.buffer = '';
            this.currentNode = null;
            this.index = 0;
            this.template = template;
            this.parse();
        }
        get prevBuffer() {
            return this.template[this.index - 1];
        }
        get nextBuffer() {
            return this.template[this.index + 1];
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
            return this.currentNode?.state === TagState.Closing;
        }
        get isSelfClosing() {
            return VOID_ELEMENTS.includes(this.currentNode.tag);
        }
        get isComment() {
            return this.currentNode?.state === TagState.Comment;
        }
        get isBracket() {
            if (!BRACKETS.includes(this.buffer))
                return false;
            if (this.buffer === Bracket.Closing)
                return this.prevBuffer === Bracket.Open || this.nextBuffer === Bracket.End;
            return true;
        }
        parse() {
            for (let i = 0; i < this.template.length; i++) {
                this.index = i;
                this.buffer = this.template[i];
                this.process();
            }
        }
        process() {
            if (this.isBracket)
                return this.setBracketState();
            if (this.isOpening)
                this.setTag();
            if (this.isAttributes)
                this.setAttributes();
            if (this.isOpened)
                this.setTextNode();
        }
        setBracketState() {
            if (this.buffer === Bracket.Open && !this.isComment)
                this.openTag();
            if (this.buffer === Bracket.Closing && !this.isComment)
                this.closingTag();
            if (this.buffer === Bracket.End)
                this.endTag();
        }
        setTag() {
            const becomesComment = this.buffer === '!' && this.prevBuffer === Bracket.Open;
            if (becomesComment)
                return this.setState(TagState.Comment);
            if ([' ', '\n'].includes(this.buffer)) {
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
            if ([' ', '\n'].includes(statement))
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
            if (this.isComment) {
                const closingComment = this.prevBuffer === '-' && this.template[this.index - 2] === '-';
                if (closingComment) {
                    this.setState(TagState.Closed);
                    this.currentNode = this.findOpenParent(this.currentNode);
                }
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
                if (this.isConditional)
                    this.setIf();
                options.update ? this.update() : this.create();
                this.index++;
            }
        }
        create(opts = {}) {
            if (this.node.hidden)
                return;
            this.node.tag === 'text' ? this.createTextNode() : this.createElement();
            if (!this.isEach && !this.node.hidden)
                this.append(opts);
            if (this.isComponent)
                return this.createComponent();
        }
        update() {
            this.el = document.querySelector(`[data-ref="${this.node.id}"]`);
            const isText = this.node.tag === 'text';
            if (this.node.hidden) {
                if (this.el) {
                    this.parentEl.removeChild(this.el);
                }
                else {
                    return;
                }
            }
            else {
                if (!this.el && !isText)
                    return this.recreate();
            }
            if (isText) {
                this.updateTextNode();
            }
            else {
                this.setAttributes();
            }
            if (this.isComponent)
                this.updateComponent();
        }
        recreate() {
            if (!this.node.conditionalRoot)
                return this.create();
            // we need to append in the right order
            const index = this.node.parent.children.findIndex(i => i.id === this.node.id);
            this.create({ insertBefore: { position: index } });
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
            if (this.node.tag === ROUTER) {
                this.mountRoutedComponent();
            }
            else {
                const Component = this.component.components[this.node.tag];
                const instance = new this.Reflection();
                instance.mount(Component, `[data-ref="${this.node.id}"]`, this.node.props);
                this.node.component = instance.proxy;
            }
        }
        updateComponent() {
            if (this.options.prop in this.component.props) {
                //  update props
                this.node.component[this.options.prop] = this.component[this.options.prop];
            }
            if (this.options.prop === ROUTER.toLowerCase()) {
                console.log("we've re-routed");
                // dispose old component
                this.node.instance.dispose();
                // render new route
                this.mountRoutedComponent();
            }
        }
        mountRoutedComponent() {
            this.trackDependency(ROUTER.toLowerCase());
            const Component = this.component.router.currentComponent;
            const instance = new this.Reflection();
            console.log(this.component.router);
            instance.mount(Component, `[data-ref="${this.node.id}"]`, this.node.props);
            this.node.component = instance.proxy;
            this.node.instance = instance;
        }
        updateTextNode() {
            let foundText = false;
            for (let n of this.parentEl.childNodes) {
                if (n.nodeName === '#text' &&
                    n.nodeValue.includes(this.node.interpolatedContent)) {
                    foundText = true;
                    n.nodeValue = this.interpolatedContent();
                }
            }
            if (!foundText) {
                // this is necessary because of "if" statements
                this.createTextNode();
                this.append();
            }
        }
        interpolatedContent() {
            return (this.node.interpolatedContent = this.textContent(this.node.content));
        }
        setAttributes() {
            this.node?.attributes?.forEach((attr) => {
                if (attr.key === ROUTE)
                    return this.setRouteLink(attr);
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
        setRouteLink({ key, value }) {
            const [path, component] = this.component.router.routes.find(r => r[0] === value);
            this.el?.setAttribute(key, value);
            this.el?.setAttribute('href', path);
            this.node.routeTo = component;
            const handler = e => {
                e.preventDefault();
                const router = this.component.router;
                router.currentPath = path;
                this.component.router = router; // force reassignment so proxy picks up update
            };
            this.addListener(CLICK, handler);
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
            this.addListener(handlerType, handler);
            if (this.isComponent)
                this.setProp({ key: attr.key, value: handler });
        }
        deriveHandler({ key, value }) {
            const val = this.unwrapMatch(value);
            const handler = this.component[val].bind(this.component);
            const handlerType = HANDLERS.find(i => i === key);
            return [handlerType, handler];
        }
        addListener(handlerType, handler) {
            if (!this.node.listeners)
                this.node.listeners = {};
            const existing = this.node.listeners[handlerType];
            if (!existing) {
                this.el.addEventListener(handlerType, handler, false);
                this.node.listeners[handlerType] = true;
            }
        }
        append(opts = {}) {
            if (this.node.parent?.id) {
                opts.insertBefore
                    ? this.appendBefore(opts.insertBefore.position)
                    : this.parentEl.appendChild(this.el);
            }
            else if (this.root) {
                this.root.appendChild(this.el);
            }
        }
        appendBefore(position) {
            const nodes = this.node.parent.children;
            const findNextSibling = (index) => {
                index += 1;
                if (index - 2 > nodes.length)
                    return null; // no next sibling
                const id = nodes[index].id;
                const el = document.querySelector(`[data-ref="${id}"]`);
                return el ? el : findNextSibling(index);
            };
            const element = findNextSibling(position);
            element
                ? this.parentEl.insertBefore(this.el, element)
                : this.parentEl.appendChild(this.el);
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
            return propOrExpression in this.component
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
                let func = new Function(...Object.keys(this.component), `return ${expression}`);
                return func(...Object.values(this.component));
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
        trackDependency(propOrExpression) {
            const addDep = prop => {
                this.node.tracks
                    ? this.node.tracks.add(prop)
                    : (this.node.tracks = new Set([prop]));
            };
            if (propOrExpression in this.component)
                return addDep(propOrExpression);
            Object.keys(this.component).forEach(prop => {
                // still not perfect but less error-prone than regex solution
                if (propOrExpression.includes(prop))
                    addDep(prop);
            });
        }
        setRef() {
            this.el.setAttribute('data-ref', this.node.id);
        }
        setIf() {
            const { value } = (this.node.attributes || []).find(a => a.key === IF);
            const val = this.unwrapMatch(value);
            this.node.conditionalRoot = true;
            this.node.hidden = !this.deriveBound(val);
            this.trackDependency(val);
            this.node.children.forEach(n => {
                n.hidden = this.node.hidden;
                n.tracks ? n.tracks.add(val) : (n.tracks = new Set([val]));
            });
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
        get isConditional() {
            return (this.node.attributes || []).map(a => a.key).includes(IF);
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
            return this.components.includes(this.node.tag) || this.node.tag === ROUTER;
        }
    }

    class Router {
        constructor(routes) {
            this.routes = routes;
            this.currentPath = '/';
        }
        get currentComponent() {
            const [_, c] = this.routes.find(([path, component]) => this.currentPath === path);
            return c;
        }
    }

    class Reflection {
        constructor() {
            this.root = null;
            this.nodes = [];
            this.component = null;
            this.proxy = null;
            this.router = null;
        }
        mount(Component, element, props = {}) {
            this.root = document.querySelector(element);
            this.createComponent(Component, props);
            this.nodes = new TemplateParse(this.component.template).nodes;
            this.component.router = this.router;
            this.component.props = props;
            this.observe();
            new Render(Reflection, this.nodes, this.proxy, this.root);
            this.proxy.onMount && this.proxy.onMount();
        }
        dispose() {
            this.proxy.onDispose && this.proxy.onDispose();
            this.root.textContent = '';
            this.nodes = null;
            this.component = null;
            this.proxy = null;
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
            console.log(nodes);
            new Render(Reflection, nodes, this.proxy, this.root, {
                update: true,
                prop
            });
            // find all elements that track the prop as a dependency and update them
            // in the case of "if" we need to create a new elements, or remove them
        }
        createComponent(Component, props) {
            this.component = new Component(props);
            Object.entries(props).forEach(([k, v]) => {
                // add props if not undefined
                if (typeof v === 'function')
                    v = v.bind(props.parent);
                if (typeof v !== 'undefined')
                    this.component[k] = v;
            });
        }
    }

    class Layout {  template = "<main>\n  <h1>Layout: {msg}</h1>\n  <div>\n    <a route=\"/\">Home page</a>\n    <br />\n    <a route=\"/about\">About page</a>\n  </div>\n  <Router></Router>\n</main>\n\n\n"

        msg = 'layout'
      }

    class Home {  template = "<main>\n  <h1>HOME: {msg}</h1>\n</main>\n\n\n"

        msg = 'home'
      }

    class Child {  template = "<div>\n  <p>I am a child component now:</p>\n  <p>a prop: {foo}</p>\n  <p>prop count: {count}, {num}</p>\n  <small>another prop: *{hi}*</small>\n  <button click=\"{increase}\">increase num</button>\n  <!-- <this> <hr /> is a comment -->\n  <button click=\"{increment}\">increment parent's count</button>\n  <h2>dependency in an expression: {dep + dep}</h2>\n  <input type=\"text\" input=\"{changeDep}\" value=\"{dep}\" />\n  <p>good bye from child now...</p>\n</div>\n\n\n"

        count = 0
        num = 5
        foo = 'backup' // default value for prop if undefined
        dep = 'I am a dependency'

        // increment
        // ^ note you don't have to declare the prop if you don't need it for type-checking.

        constructor () {
          // note constructor is not reactive
          // Will likely have a dedicated lifecycle hook for mounted anyway
          this.greet();
        }

        greet () {
          this.count = 2;
          this.hi = 'bye';
          console.log(
            'prop is available on instance by default',
            this.hi,
            this.count
          );
          this.num += 100;
          this.increase();
        }

        increase () {
          this.num += 1;
          this.count += 5;
        }

        changeDep (e) {
          this.dep = e.target.value;
        }
      }

    class Foo {  template = "<main>\n  Main element here...\n  <p id=\"main-text\" class=\"foo bar moar\" small data-role=\"test\">\n    a paragraph...\n  </p>\n  <hr />\n  <p>this is a prop: {myProp}</p>\n  <p>we can mutate it locally but that will not sync upwards.</p>\n  <input type=\"text\" value=\"{myProp}\" input=\"{mutateProp}\" />\n  <hr />\n  <div>\n    some child...\n    <Child\n      hi=\"{msg}\"\n      increment=\"{increment}\"\n      count=\"{count}\"\n      foobar=\"foobar\"\n    ></Child>\n  </div>\n  <h2 class=\"{style}\">the count is {count}</h2>\n  <button click=\"{increment}\">increment count</button>\n  <button click=\"{decrement}\">decrement count</button>\n  <h3>{msg}, {question}... again: {msg}</h3>\n  <div>\n    <p>lets evaluate and expression:</p>\n    <p>2 + 2 = {2 + 2}</p>\n    <p>Should I stay or should I go? {true ? \"go\" : \"stay\"}</p>\n  </div>\n  <p>items: {msg}</p>\n  <ul>\n    <li each=\"{items as item, index}\" class=\"{style}\">\n      {index + 1}: hi to {item.name}\n    </li>\n  </ul>\n  <br />\n  <div large>\n    <input type=\"text\" value=\"{someText}\" input=\"{handleInput}\" />\n    <p>this is what you entered: {someText}</p>\n    <button click=\"{addText}\">add text to list</button>\n    <button click=\"{clearText}\">clear text</button>\n  </div>\n  <hr />\n  <div>\n    <h3>lets do some conditional rendering</h3>\n    <article if=\"{showArticle}\">~Now you see me~</article>\n    <br />\n    <button click=\"{toggleShow}\">toggle visibility</button>\n  </div>\n  <hr />\n  more main here!\n</main>\n\n\n"

        components = { Child }

        foo = 'oppppSSS!'
        msg = 'Hello World!'
        question = 'How are you tonight?'
        count = 1
        style = 'counter-class'
        someText = 'test'
        items = []
        showArticle = true

        onMount () {
          console.log('on mount', (this.count = 3));
        }

        onDispose () {
          console.log('on dispose', this.showArticle);
        }

        increment () {
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

        toggleShow () {
          this.showArticle = !this.showArticle;
        }
      }

    class About {  template = "<main>\n  <h1>ABOUT</h1>\n  <Test myProp=\"test Prop\"></Test>\n</main>\n\n\n"

        components = { Test: Foo }
        
        msg = 'about'
      }

    const router = new Router([
      ['/', Home],
      ['/about', About]
    ]);

    const app = new Reflection();

    app.router = router;
    app.mount(Layout, '#app', { myProp: 'Test Prop' });

}());
//# sourceMappingURL=bundle.js.map
