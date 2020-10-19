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
            this.component.router.updateHistory();
            const instance = new this.Reflection();
            instance.router = this.component.router;
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
            const [_, component] = this.component.router.find(value);
            this.el?.setAttribute(key, value);
            this.el?.setAttribute('href', value);
            const handler = e => {
                e.preventDefault();
                const router = this.component.router;
                if (this.component.router.isChild(value)) {
                    console.log('I am a nested route...TODO');
                }
                else {
                    router.currentPath = value;
                }
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

    var has = Object.prototype.hasOwnProperty;
    var isArray = Array.isArray;

    var hexTable = (function () {
        var array = [];
        for (var i = 0; i < 256; ++i) {
            array.push('%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase());
        }

        return array;
    }());

    var compactQueue = function compactQueue(queue) {
        while (queue.length > 1) {
            var item = queue.pop();
            var obj = item.obj[item.prop];

            if (isArray(obj)) {
                var compacted = [];

                for (var j = 0; j < obj.length; ++j) {
                    if (typeof obj[j] !== 'undefined') {
                        compacted.push(obj[j]);
                    }
                }

                item.obj[item.prop] = compacted;
            }
        }
    };

    var arrayToObject = function arrayToObject(source, options) {
        var obj = options && options.plainObjects ? Object.create(null) : {};
        for (var i = 0; i < source.length; ++i) {
            if (typeof source[i] !== 'undefined') {
                obj[i] = source[i];
            }
        }

        return obj;
    };

    var merge = function merge(target, source, options) {
        /* eslint no-param-reassign: 0 */
        if (!source) {
            return target;
        }

        if (typeof source !== 'object') {
            if (isArray(target)) {
                target.push(source);
            } else if (target && typeof target === 'object') {
                if ((options && (options.plainObjects || options.allowPrototypes)) || !has.call(Object.prototype, source)) {
                    target[source] = true;
                }
            } else {
                return [target, source];
            }

            return target;
        }

        if (!target || typeof target !== 'object') {
            return [target].concat(source);
        }

        var mergeTarget = target;
        if (isArray(target) && !isArray(source)) {
            mergeTarget = arrayToObject(target, options);
        }

        if (isArray(target) && isArray(source)) {
            source.forEach(function (item, i) {
                if (has.call(target, i)) {
                    var targetItem = target[i];
                    if (targetItem && typeof targetItem === 'object' && item && typeof item === 'object') {
                        target[i] = merge(targetItem, item, options);
                    } else {
                        target.push(item);
                    }
                } else {
                    target[i] = item;
                }
            });
            return target;
        }

        return Object.keys(source).reduce(function (acc, key) {
            var value = source[key];

            if (has.call(acc, key)) {
                acc[key] = merge(acc[key], value, options);
            } else {
                acc[key] = value;
            }
            return acc;
        }, mergeTarget);
    };

    var assign = function assignSingleSource(target, source) {
        return Object.keys(source).reduce(function (acc, key) {
            acc[key] = source[key];
            return acc;
        }, target);
    };

    var decode = function (str, decoder, charset) {
        var strWithoutPlus = str.replace(/\+/g, ' ');
        if (charset === 'iso-8859-1') {
            // unescape never throws, no try...catch needed:
            return strWithoutPlus.replace(/%[0-9a-f]{2}/gi, unescape);
        }
        // utf-8
        try {
            return decodeURIComponent(strWithoutPlus);
        } catch (e) {
            return strWithoutPlus;
        }
    };

    var encode = function encode(str, defaultEncoder, charset) {
        // This code was originally written by Brian White (mscdex) for the io.js core querystring library.
        // It has been adapted here for stricter adherence to RFC 3986
        if (str.length === 0) {
            return str;
        }

        var string = str;
        if (typeof str === 'symbol') {
            string = Symbol.prototype.toString.call(str);
        } else if (typeof str !== 'string') {
            string = String(str);
        }

        if (charset === 'iso-8859-1') {
            return escape(string).replace(/%u[0-9a-f]{4}/gi, function ($0) {
                return '%26%23' + parseInt($0.slice(2), 16) + '%3B';
            });
        }

        var out = '';
        for (var i = 0; i < string.length; ++i) {
            var c = string.charCodeAt(i);

            if (
                c === 0x2D // -
                || c === 0x2E // .
                || c === 0x5F // _
                || c === 0x7E // ~
                || (c >= 0x30 && c <= 0x39) // 0-9
                || (c >= 0x41 && c <= 0x5A) // a-z
                || (c >= 0x61 && c <= 0x7A) // A-Z
            ) {
                out += string.charAt(i);
                continue;
            }

            if (c < 0x80) {
                out = out + hexTable[c];
                continue;
            }

            if (c < 0x800) {
                out = out + (hexTable[0xC0 | (c >> 6)] + hexTable[0x80 | (c & 0x3F)]);
                continue;
            }

            if (c < 0xD800 || c >= 0xE000) {
                out = out + (hexTable[0xE0 | (c >> 12)] + hexTable[0x80 | ((c >> 6) & 0x3F)] + hexTable[0x80 | (c & 0x3F)]);
                continue;
            }

            i += 1;
            c = 0x10000 + (((c & 0x3FF) << 10) | (string.charCodeAt(i) & 0x3FF));
            out += hexTable[0xF0 | (c >> 18)]
                + hexTable[0x80 | ((c >> 12) & 0x3F)]
                + hexTable[0x80 | ((c >> 6) & 0x3F)]
                + hexTable[0x80 | (c & 0x3F)];
        }

        return out;
    };

    var compact = function compact(value) {
        var queue = [{ obj: { o: value }, prop: 'o' }];
        var refs = [];

        for (var i = 0; i < queue.length; ++i) {
            var item = queue[i];
            var obj = item.obj[item.prop];

            var keys = Object.keys(obj);
            for (var j = 0; j < keys.length; ++j) {
                var key = keys[j];
                var val = obj[key];
                if (typeof val === 'object' && val !== null && refs.indexOf(val) === -1) {
                    queue.push({ obj: obj, prop: key });
                    refs.push(val);
                }
            }
        }

        compactQueue(queue);

        return value;
    };

    var isRegExp = function isRegExp(obj) {
        return Object.prototype.toString.call(obj) === '[object RegExp]';
    };

    var isBuffer = function isBuffer(obj) {
        if (!obj || typeof obj !== 'object') {
            return false;
        }

        return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
    };

    var combine = function combine(a, b) {
        return [].concat(a, b);
    };

    var maybeMap = function maybeMap(val, fn) {
        if (isArray(val)) {
            var mapped = [];
            for (var i = 0; i < val.length; i += 1) {
                mapped.push(fn(val[i]));
            }
            return mapped;
        }
        return fn(val);
    };

    var utils = {
        arrayToObject: arrayToObject,
        assign: assign,
        combine: combine,
        compact: compact,
        decode: decode,
        encode: encode,
        isBuffer: isBuffer,
        isRegExp: isRegExp,
        maybeMap: maybeMap,
        merge: merge
    };

    var replace = String.prototype.replace;
    var percentTwenties = /%20/g;



    var Format = {
        RFC1738: 'RFC1738',
        RFC3986: 'RFC3986'
    };

    var formats = utils.assign(
        {
            'default': Format.RFC3986,
            formatters: {
                RFC1738: function (value) {
                    return replace.call(value, percentTwenties, '+');
                },
                RFC3986: function (value) {
                    return String(value);
                }
            }
        },
        Format
    );

    var has$1 = Object.prototype.hasOwnProperty;

    var arrayPrefixGenerators = {
        brackets: function brackets(prefix) {
            return prefix + '[]';
        },
        comma: 'comma',
        indices: function indices(prefix, key) {
            return prefix + '[' + key + ']';
        },
        repeat: function repeat(prefix) {
            return prefix;
        }
    };

    var isArray$1 = Array.isArray;
    var push = Array.prototype.push;
    var pushToArray = function (arr, valueOrArray) {
        push.apply(arr, isArray$1(valueOrArray) ? valueOrArray : [valueOrArray]);
    };

    var toISO = Date.prototype.toISOString;

    var defaultFormat = formats['default'];
    var defaults = {
        addQueryPrefix: false,
        allowDots: false,
        charset: 'utf-8',
        charsetSentinel: false,
        delimiter: '&',
        encode: true,
        encoder: utils.encode,
        encodeValuesOnly: false,
        format: defaultFormat,
        formatter: formats.formatters[defaultFormat],
        // deprecated
        indices: false,
        serializeDate: function serializeDate(date) {
            return toISO.call(date);
        },
        skipNulls: false,
        strictNullHandling: false
    };

    var isNonNullishPrimitive = function isNonNullishPrimitive(v) {
        return typeof v === 'string'
            || typeof v === 'number'
            || typeof v === 'boolean'
            || typeof v === 'symbol'
            || typeof v === 'bigint';
    };

    var stringify = function stringify(
        object,
        prefix,
        generateArrayPrefix,
        strictNullHandling,
        skipNulls,
        encoder,
        filter,
        sort,
        allowDots,
        serializeDate,
        formatter,
        encodeValuesOnly,
        charset
    ) {
        var obj = object;
        if (typeof filter === 'function') {
            obj = filter(prefix, obj);
        } else if (obj instanceof Date) {
            obj = serializeDate(obj);
        } else if (generateArrayPrefix === 'comma' && isArray$1(obj)) {
            obj = utils.maybeMap(obj, function (value) {
                if (value instanceof Date) {
                    return serializeDate(value);
                }
                return value;
            }).join(',');
        }

        if (obj === null) {
            if (strictNullHandling) {
                return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder, charset, 'key') : prefix;
            }

            obj = '';
        }

        if (isNonNullishPrimitive(obj) || utils.isBuffer(obj)) {
            if (encoder) {
                var keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder, charset, 'key');
                return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder, charset, 'value'))];
            }
            return [formatter(prefix) + '=' + formatter(String(obj))];
        }

        var values = [];

        if (typeof obj === 'undefined') {
            return values;
        }

        var objKeys;
        if (isArray$1(filter)) {
            objKeys = filter;
        } else {
            var keys = Object.keys(obj);
            objKeys = sort ? keys.sort(sort) : keys;
        }

        for (var i = 0; i < objKeys.length; ++i) {
            var key = objKeys[i];
            var value = obj[key];

            if (skipNulls && value === null) {
                continue;
            }

            var keyPrefix = isArray$1(obj)
                ? typeof generateArrayPrefix === 'function' ? generateArrayPrefix(prefix, key) : prefix
                : prefix + (allowDots ? '.' + key : '[' + key + ']');

            pushToArray(values, stringify(
                value,
                keyPrefix,
                generateArrayPrefix,
                strictNullHandling,
                skipNulls,
                encoder,
                filter,
                sort,
                allowDots,
                serializeDate,
                formatter,
                encodeValuesOnly,
                charset
            ));
        }

        return values;
    };

    var normalizeStringifyOptions = function normalizeStringifyOptions(opts) {
        if (!opts) {
            return defaults;
        }

        if (opts.encoder !== null && opts.encoder !== undefined && typeof opts.encoder !== 'function') {
            throw new TypeError('Encoder has to be a function.');
        }

        var charset = opts.charset || defaults.charset;
        if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
            throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
        }

        var format = formats['default'];
        if (typeof opts.format !== 'undefined') {
            if (!has$1.call(formats.formatters, opts.format)) {
                throw new TypeError('Unknown format option provided.');
            }
            format = opts.format;
        }
        var formatter = formats.formatters[format];

        var filter = defaults.filter;
        if (typeof opts.filter === 'function' || isArray$1(opts.filter)) {
            filter = opts.filter;
        }

        return {
            addQueryPrefix: typeof opts.addQueryPrefix === 'boolean' ? opts.addQueryPrefix : defaults.addQueryPrefix,
            allowDots: typeof opts.allowDots === 'undefined' ? defaults.allowDots : !!opts.allowDots,
            charset: charset,
            charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults.charsetSentinel,
            delimiter: typeof opts.delimiter === 'undefined' ? defaults.delimiter : opts.delimiter,
            encode: typeof opts.encode === 'boolean' ? opts.encode : defaults.encode,
            encoder: typeof opts.encoder === 'function' ? opts.encoder : defaults.encoder,
            encodeValuesOnly: typeof opts.encodeValuesOnly === 'boolean' ? opts.encodeValuesOnly : defaults.encodeValuesOnly,
            filter: filter,
            formatter: formatter,
            serializeDate: typeof opts.serializeDate === 'function' ? opts.serializeDate : defaults.serializeDate,
            skipNulls: typeof opts.skipNulls === 'boolean' ? opts.skipNulls : defaults.skipNulls,
            sort: typeof opts.sort === 'function' ? opts.sort : null,
            strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults.strictNullHandling
        };
    };

    var stringify_1 = function (object, opts) {
        var obj = object;
        var options = normalizeStringifyOptions(opts);

        var objKeys;
        var filter;

        if (typeof options.filter === 'function') {
            filter = options.filter;
            obj = filter('', obj);
        } else if (isArray$1(options.filter)) {
            filter = options.filter;
            objKeys = filter;
        }

        var keys = [];

        if (typeof obj !== 'object' || obj === null) {
            return '';
        }

        var arrayFormat;
        if (opts && opts.arrayFormat in arrayPrefixGenerators) {
            arrayFormat = opts.arrayFormat;
        } else if (opts && 'indices' in opts) {
            arrayFormat = opts.indices ? 'indices' : 'repeat';
        } else {
            arrayFormat = 'indices';
        }

        var generateArrayPrefix = arrayPrefixGenerators[arrayFormat];

        if (!objKeys) {
            objKeys = Object.keys(obj);
        }

        if (options.sort) {
            objKeys.sort(options.sort);
        }

        for (var i = 0; i < objKeys.length; ++i) {
            var key = objKeys[i];

            if (options.skipNulls && obj[key] === null) {
                continue;
            }
            pushToArray(keys, stringify(
                obj[key],
                key,
                generateArrayPrefix,
                options.strictNullHandling,
                options.skipNulls,
                options.encode ? options.encoder : null,
                options.filter,
                options.sort,
                options.allowDots,
                options.serializeDate,
                options.formatter,
                options.encodeValuesOnly,
                options.charset
            ));
        }

        var joined = keys.join(options.delimiter);
        var prefix = options.addQueryPrefix === true ? '?' : '';

        if (options.charsetSentinel) {
            if (options.charset === 'iso-8859-1') {
                // encodeURIComponent('&#10003;'), the "numeric entity" representation of a checkmark
                prefix += 'utf8=%26%2310003%3B&';
            } else {
                // encodeURIComponent('✓')
                prefix += 'utf8=%E2%9C%93&';
            }
        }

        return joined.length > 0 ? prefix + joined : '';
    };

    var has$2 = Object.prototype.hasOwnProperty;
    var isArray$2 = Array.isArray;

    var defaults$1 = {
        allowDots: false,
        allowPrototypes: false,
        arrayLimit: 20,
        charset: 'utf-8',
        charsetSentinel: false,
        comma: false,
        decoder: utils.decode,
        delimiter: '&',
        depth: 5,
        ignoreQueryPrefix: false,
        interpretNumericEntities: false,
        parameterLimit: 1000,
        parseArrays: true,
        plainObjects: false,
        strictNullHandling: false
    };

    var interpretNumericEntities = function (str) {
        return str.replace(/&#(\d+);/g, function ($0, numberStr) {
            return String.fromCharCode(parseInt(numberStr, 10));
        });
    };

    var parseArrayValue = function (val, options) {
        if (val && typeof val === 'string' && options.comma && val.indexOf(',') > -1) {
            return val.split(',');
        }

        return val;
    };

    // This is what browsers will submit when the ✓ character occurs in an
    // application/x-www-form-urlencoded body and the encoding of the page containing
    // the form is iso-8859-1, or when the submitted form has an accept-charset
    // attribute of iso-8859-1. Presumably also with other charsets that do not contain
    // the ✓ character, such as us-ascii.
    var isoSentinel = 'utf8=%26%2310003%3B'; // encodeURIComponent('&#10003;')

    // These are the percent-encoded utf-8 octets representing a checkmark, indicating that the request actually is utf-8 encoded.
    var charsetSentinel = 'utf8=%E2%9C%93'; // encodeURIComponent('✓')

    var parseValues = function parseQueryStringValues(str, options) {
        var obj = {};
        var cleanStr = options.ignoreQueryPrefix ? str.replace(/^\?/, '') : str;
        var limit = options.parameterLimit === Infinity ? undefined : options.parameterLimit;
        var parts = cleanStr.split(options.delimiter, limit);
        var skipIndex = -1; // Keep track of where the utf8 sentinel was found
        var i;

        var charset = options.charset;
        if (options.charsetSentinel) {
            for (i = 0; i < parts.length; ++i) {
                if (parts[i].indexOf('utf8=') === 0) {
                    if (parts[i] === charsetSentinel) {
                        charset = 'utf-8';
                    } else if (parts[i] === isoSentinel) {
                        charset = 'iso-8859-1';
                    }
                    skipIndex = i;
                    i = parts.length; // The eslint settings do not allow break;
                }
            }
        }

        for (i = 0; i < parts.length; ++i) {
            if (i === skipIndex) {
                continue;
            }
            var part = parts[i];

            var bracketEqualsPos = part.indexOf(']=');
            var pos = bracketEqualsPos === -1 ? part.indexOf('=') : bracketEqualsPos + 1;

            var key, val;
            if (pos === -1) {
                key = options.decoder(part, defaults$1.decoder, charset, 'key');
                val = options.strictNullHandling ? null : '';
            } else {
                key = options.decoder(part.slice(0, pos), defaults$1.decoder, charset, 'key');
                val = utils.maybeMap(
                    parseArrayValue(part.slice(pos + 1), options),
                    function (encodedVal) {
                        return options.decoder(encodedVal, defaults$1.decoder, charset, 'value');
                    }
                );
            }

            if (val && options.interpretNumericEntities && charset === 'iso-8859-1') {
                val = interpretNumericEntities(val);
            }

            if (part.indexOf('[]=') > -1) {
                val = isArray$2(val) ? [val] : val;
            }

            if (has$2.call(obj, key)) {
                obj[key] = utils.combine(obj[key], val);
            } else {
                obj[key] = val;
            }
        }

        return obj;
    };

    var parseObject = function (chain, val, options, valuesParsed) {
        var leaf = valuesParsed ? val : parseArrayValue(val, options);

        for (var i = chain.length - 1; i >= 0; --i) {
            var obj;
            var root = chain[i];

            if (root === '[]' && options.parseArrays) {
                obj = [].concat(leaf);
            } else {
                obj = options.plainObjects ? Object.create(null) : {};
                var cleanRoot = root.charAt(0) === '[' && root.charAt(root.length - 1) === ']' ? root.slice(1, -1) : root;
                var index = parseInt(cleanRoot, 10);
                if (!options.parseArrays && cleanRoot === '') {
                    obj = { 0: leaf };
                } else if (
                    !isNaN(index)
                    && root !== cleanRoot
                    && String(index) === cleanRoot
                    && index >= 0
                    && (options.parseArrays && index <= options.arrayLimit)
                ) {
                    obj = [];
                    obj[index] = leaf;
                } else {
                    obj[cleanRoot] = leaf;
                }
            }

            leaf = obj; // eslint-disable-line no-param-reassign
        }

        return leaf;
    };

    var parseKeys = function parseQueryStringKeys(givenKey, val, options, valuesParsed) {
        if (!givenKey) {
            return;
        }

        // Transform dot notation to bracket notation
        var key = options.allowDots ? givenKey.replace(/\.([^.[]+)/g, '[$1]') : givenKey;

        // The regex chunks

        var brackets = /(\[[^[\]]*])/;
        var child = /(\[[^[\]]*])/g;

        // Get the parent

        var segment = options.depth > 0 && brackets.exec(key);
        var parent = segment ? key.slice(0, segment.index) : key;

        // Stash the parent if it exists

        var keys = [];
        if (parent) {
            // If we aren't using plain objects, optionally prefix keys that would overwrite object prototype properties
            if (!options.plainObjects && has$2.call(Object.prototype, parent)) {
                if (!options.allowPrototypes) {
                    return;
                }
            }

            keys.push(parent);
        }

        // Loop through children appending to the array until we hit depth

        var i = 0;
        while (options.depth > 0 && (segment = child.exec(key)) !== null && i < options.depth) {
            i += 1;
            if (!options.plainObjects && has$2.call(Object.prototype, segment[1].slice(1, -1))) {
                if (!options.allowPrototypes) {
                    return;
                }
            }
            keys.push(segment[1]);
        }

        // If there's a remainder, just add whatever is left

        if (segment) {
            keys.push('[' + key.slice(segment.index) + ']');
        }

        return parseObject(keys, val, options, valuesParsed);
    };

    var normalizeParseOptions = function normalizeParseOptions(opts) {
        if (!opts) {
            return defaults$1;
        }

        if (opts.decoder !== null && opts.decoder !== undefined && typeof opts.decoder !== 'function') {
            throw new TypeError('Decoder has to be a function.');
        }

        if (typeof opts.charset !== 'undefined' && opts.charset !== 'utf-8' && opts.charset !== 'iso-8859-1') {
            throw new TypeError('The charset option must be either utf-8, iso-8859-1, or undefined');
        }
        var charset = typeof opts.charset === 'undefined' ? defaults$1.charset : opts.charset;

        return {
            allowDots: typeof opts.allowDots === 'undefined' ? defaults$1.allowDots : !!opts.allowDots,
            allowPrototypes: typeof opts.allowPrototypes === 'boolean' ? opts.allowPrototypes : defaults$1.allowPrototypes,
            arrayLimit: typeof opts.arrayLimit === 'number' ? opts.arrayLimit : defaults$1.arrayLimit,
            charset: charset,
            charsetSentinel: typeof opts.charsetSentinel === 'boolean' ? opts.charsetSentinel : defaults$1.charsetSentinel,
            comma: typeof opts.comma === 'boolean' ? opts.comma : defaults$1.comma,
            decoder: typeof opts.decoder === 'function' ? opts.decoder : defaults$1.decoder,
            delimiter: typeof opts.delimiter === 'string' || utils.isRegExp(opts.delimiter) ? opts.delimiter : defaults$1.delimiter,
            // eslint-disable-next-line no-implicit-coercion, no-extra-parens
            depth: (typeof opts.depth === 'number' || opts.depth === false) ? +opts.depth : defaults$1.depth,
            ignoreQueryPrefix: opts.ignoreQueryPrefix === true,
            interpretNumericEntities: typeof opts.interpretNumericEntities === 'boolean' ? opts.interpretNumericEntities : defaults$1.interpretNumericEntities,
            parameterLimit: typeof opts.parameterLimit === 'number' ? opts.parameterLimit : defaults$1.parameterLimit,
            parseArrays: opts.parseArrays !== false,
            plainObjects: typeof opts.plainObjects === 'boolean' ? opts.plainObjects : defaults$1.plainObjects,
            strictNullHandling: typeof opts.strictNullHandling === 'boolean' ? opts.strictNullHandling : defaults$1.strictNullHandling
        };
    };

    var parse = function (str, opts) {
        var options = normalizeParseOptions(opts);

        if (str === '' || str === null || typeof str === 'undefined') {
            return options.plainObjects ? Object.create(null) : {};
        }

        var tempObj = typeof str === 'string' ? parseValues(str, options) : str;
        var obj = options.plainObjects ? Object.create(null) : {};

        // Iterate over the keys and setup the new object

        var keys = Object.keys(tempObj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            var newObj = parseKeys(key, tempObj[key], options, typeof str === 'string');
            obj = utils.merge(obj, newObj, options);
        }

        return utils.compact(obj);
    };

    var lib = {
        formats: formats,
        parse: parse,
        stringify: stringify_1
    };

    class Router {
        constructor(routes) {
            this.routes = routes;
            this.currentPath = '/';
        }
        get currentComponent() {
            const [_, component] = this.currentRoute;
            return component;
        }
        get path() {
            const [path, _] = this.currentRoute;
            return path;
        }
        get currentRoute() {
            return this.find(this.currentPath);
        }
        find(path) {
            return this.routes.find(([p, _c]) => p === path || this.patternMatch(p, path)) || this.isChild(path);
        }
        updateHistory() {
            const state = {};
            const title = "";
            const url = this.currentPath;
            history.pushState(state, title, url);
        }
        patternMatch(path, comparePath) {
            const identifiers = path.split('/').filter(i => i[0] !== ':' && i !== '');
            if (!identifiers.length)
                return;
            return identifiers.every(i => comparePath.includes(i));
        }
        isChild(path) {
            const [_p, _c, childRoutes] = this.currentRoute;
            if (!childRoutes)
                return;
            return childRoutes.find(([p, _c]) => p === path || this.patternMatch(p, path));
        }
        get params() {
            if (!this.path.includes(':'))
                return {};
            const currentPathParts = this.currentPath.split('/');
            return this.path.split('/').reduce((memo, part, index) => {
                if (part[0] === ':')
                    memo[part.substring(1)] = currentPathParts[index].split('?')[0];
                return memo;
            }, {});
        }
        get query() {
            console.log('locate', location.search);
            return lib.parse(location.search, { ignoreQueryPrefix: true });
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
            if (this.router)
                this.router.currentPath = location.pathname + location.search;
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
            // console.log('update', String(prop), receiver[prop])
            const nodes = this.nodes.filter(n => n.tracks?.has(prop));
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

    class Layout {  template = "<main>\n  <h1>Layout: {msg}</h1>\n  <div>\n    <a route=\"/\">Home page</a>\n    <br />\n    <a route=\"/about\">About page</a>\n    <br />\n    <a route=\"/hello/Benji/Zie\">Say Hello</a>\n    <br />\n    <a route=\"/posts\">posts</a>   \n  </div>\n  <Router></Router>\n  <footer>footer</footer>\n</main>\n\n\n"

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

        onMount() {
          console.log(this.router.query);
        }
      }

    class Hello {  template = "<main>\n  <h1>Dynamic hello route</h1>\n  <p>Hello {title} {router.params.name}</p>\n</main>\n\n\n"

        onMount() {
          console.log(this.router.params);
        }

        get title () {
          return this.router.params.title
        }
      }

    class PostsLayout {  template = "<main>\n  <h1>Posts Layout: {msg}</h1>\n  <a route=\"/post\">post</a>\n</main>\n\n\n"

        msg = 'posts is here...'
      }

    class Post {  template = "<main>\n  <h1>Post Page: {msg}</h1>\n</main>\n\n\n"

        msg = 'I\'m nested in posts layout'
      }

    const router = new Router([
      ['/', Home],
      ['/about', About],
      ['/hello/:name/:title', Hello],
      ['/posts', PostsLayout, [
        ['/post', Post]
      ]]
    ]);

    const app = new Reflection();

    app.router = router;
    app.mount(Layout, '#app', { myProp: 'Test Prop' });

}());
//# sourceMappingURL=bundle.js.map
