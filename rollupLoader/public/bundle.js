
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
  'use strict';

  /**
   * This file automatically generated from `pre-publish.js`.
   * Do not manually edit.
   */

  var voidElements = {
    "area": true,
    "base": true,
    "br": true,
    "col": true,
    "embed": true,
    "hr": true,
    "img": true,
    "input": true,
    "link": true,
    "meta": true,
    "param": true,
    "source": true,
    "track": true,
    "wbr": true
  };

  var t=/\s([^'"/\s><]+?)[\s/>]|([^\s=]+)=\s?(".*?"|'.*?')/g;function n(n){var r={type:"tag",name:"",voidElement:!1,attrs:{},children:[]},i=n.match(/<\/?([^\s]+?)[/\s>]/);if(i&&(r.name=i[1],(voidElements[i[1].toLowerCase()]||"/"===n.charAt(n.length-2))&&(r.voidElement=!0),r.name.startsWith("!--"))){var s=n.indexOf("--\x3e");return {type:"comment",comment:-1!==s?n.slice(4,s):""}}for(var a=new RegExp(t),c=null;null!==(c=a.exec(n));)if(c[0].trim())if(c[1]){var o=c[1].trim(),m=[o,""];o.indexOf("=")>-1&&(m=o.split("=")),r.attrs[m[0]]=m[1],a.lastIndex--;}else c[2]&&(r.attrs[c[2]]=c[3].trim().substring(1,c[3].length-1));return r}var r=/<[a-zA-Z\-\!\/](?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])*>/g,i=Object.create(null);function s(e,t){switch(t.type){case"text":return e+t.content;case"tag":return e+="<"+t.name+(t.attrs?function(e){var t=[];for(var n in e)t.push(n+'="'+e[n]+'"');return t.length?" "+t.join(" "):""}(t.attrs):"")+(t.voidElement?"/>":">"),t.voidElement?e:e+t.children.reduce(s,"")+"</"+t.name+">";case"comment":return e+"\x3c!--"+t.comment+"--\x3e"}}var a={parse:function(e,t){t||(t={}),t.components||(t.components=i);var s,a=[],c=[],o=-1,m=!1;if(0!==e.indexOf("<")){var u=e.indexOf("<");a.push({type:"text",content:-1===u?e:e.substring(0,u)});}return e.replace(r,function(r,i){if(m){if(r!=="</"+s.name+">")return;m=!1;}var u,l="/"!==r.charAt(1),f=r.startsWith("\x3c!--"),p=i+r.length,d=e.charAt(p);if(f){var h=n(r);return o<0?(a.push(h),a):((u=c[o]).children.push(h),a)}if(l&&(o++,"tag"===(s=n(r)).type&&t.components[s.name]&&(s.type="component",m=!0),s.voidElement||m||!d||"<"===d||s.children.push({type:"text",content:e.slice(p,e.indexOf("<",p))}),0===o&&a.push(s),(u=c[o-1])&&u.children.push(s),c[o]=s),(!l||s.voidElement)&&(o>-1&&(s.voidElement||s.name===r.slice(2,-1))&&o--,!m&&"<"!==d&&d)){u=-1===o?a:c[o].children;var v=e.indexOf("<",p),x=e.slice(p,-1===v?void 0:v);/^\s*$/.test(x)||u.push({type:"text",content:x});}}),a},stringify:function(e){return e.reduce(function(e,t){return e+s("",t)},"")}};

  class Reflective {
    mount (Component, element) {
      const component = new Component();
      const appRoot = document.querySelector(element);

      const template = a.parse(component.template);
      console.log('html as objects:', template);
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

  const app = new Reflective();

  app.mount(Foo, '#app');

}());
//# sourceMappingURL=bundle.js.map
