const e=require("./utils-y9H3sLL0.cjs"),t=e=>e!=null,n=e=>e.filter(t);function r(e){return(...t)=>{for(let n of e)n&&n(...t)}}const i=e=>typeof e==`function`&&!e.length?e():e,a=e=>Array.isArray(e)?e:e?[e]:[];function o(e,...t){return typeof e==`function`?e(...t):e}const s=e.X;function c(e,t,n,r){let i=e.length,a=t.length,o=0;if(!a){for(;o<i;o++)n(e[o]);return}if(!i){for(;o<a;o++)r(t[o]);return}for(;o<a&&t[o]===e[o];o++);let s,c;t=t.slice(o),e=e.slice(o);for(s of t)e.includes(s)||r(s);for(c of e)t.includes(c)||n(c)}function l(t){let[n,r]=e.W(),i=t?.throw?(e,t)=>{throw r(e instanceof Error?e:Error(t)),e}:(e,t)=>{r(e instanceof Error?e:Error(t))},a=t?.api?Array.isArray(t.api)?t.api:[t.api]:[globalThis.localStorage].filter(Boolean),o=t?.prefix?`${t.prefix}.`:``,s=/* @__PURE__ */ new Map,c=new Proxy({},{get(n,r){let c=s.get(r);c||(c=e.W(void 0,{equals:!1}),s.set(r,c)),c[0]();let l=a.reduce((e,t)=>{if(e!==null||!t)return e;try{return t.getItem(`${o}${r}`)}catch(e){return i(e,`Error reading ${o}${r} from ${t.name}`),null}},null);return l!==null&&t?.deserializer?t.deserializer(l,r,t.options):l}});return t?.sync!==!1&&e.Z(()=>{let t=e=>{let t=!1;a.forEach(n=>{try{n!==e.storageArea&&e.key&&e.newValue!==n.getItem(e.key)&&(e.newValue?n.setItem(e.key,e.newValue):n.removeItem(e.key),t=!0)}catch(t){i(t,`Error synching api ${n.name} from storage event (${e.key}=${e.newValue})`)}}),t&&e.key&&s.get(e.key)?.[1]()};`addEventListener`in globalThis?(globalThis.addEventListener(`storage`,t),e.X(()=>globalThis.removeEventListener(`storage`,t))):(a.forEach(e=>e.addEventListener?.(`storage`,t)),e.X(()=>a.forEach(e=>e.removeEventListener?.(`storage`,t))))}),[c,(e,n,r)=>{let c=t?.serializer?t.serializer(n,e,r??t.options):n,l=`${o}${e}`;a.forEach(t=>{try{t.getItem(l)!==c&&t.setItem(l,c)}catch(n){i(n,`Error setting ${o}${e} to ${c} in ${t.name}`)}});let u=s.get(e);u&&u[1]()},{clear:()=>a.forEach(e=>{try{e.clear()}catch(t){i(t,`Error clearing ${e.name}`)}}),error:n,remove:e=>a.forEach(t=>{try{t.removeItem(`${o}${e}`)}catch(n){i(n,`Error removing ${o}${e} from ${t.name}`)}}),toJSON:()=>{let e={},n=(n,r)=>{if(!e.hasOwnProperty(n)){let i=r&&t?.deserializer?t.deserializer(r,n,t.options):r;i&&(e[n]=i)}};return a.forEach(t=>{if(typeof t.getAll==`function`){let e;try{e=t.getAll()}catch(e){i(e,`Error getting all values from in ${t.name}`)}for(let t of e)n(t,e[t])}else{let r=0,a;try{for(;a=t.key(r++);)e.hasOwnProperty(a)||n(a,t.getItem(a))}catch(e){i(e,`Error getting all values from ${t.name}`)}}}),e}}]}var u=l,d=e=>(typeof e.clear==`function`||(e.clear=()=>{let t;for(;t=e.key(0);)e.removeItem(t)}),e),f=e=>{if(!e)return``;let t=``;for(let n in e){if(!e.hasOwnProperty(n))continue;let r=e[n];t+=r instanceof Date?`; ${n}=${r.toUTCString()}`:typeof r==`boolean`?`; ${n}`:`; ${n}=${r}`}return t},p=d({_cookies:[globalThis.document,`cookie`],getItem:e=>p._cookies[0][p._cookies[1]].match(`(^|;)\\s*`+e+`\\s*=\\s*([^;]+)`)?.pop()??null,setItem:(e,t,n)=>{let r=p.getItem(e);p._cookies[0][p._cookies[1]]=`${e}=${t}${f(n)}`;let i=Object.assign(new Event(`storage`),{key:e,oldValue:r,newValue:t,url:globalThis.document.URL,storageArea:p});window.dispatchEvent(i)},removeItem:e=>{p._cookies[0][p._cookies[1]]=`${e}=deleted${f({expires:/* @__PURE__ */ new Date(0)})}`},key:e=>{let t=null,n=0;return p._cookies[0][p._cookies[1]].replace(/(?:^|;)\s*(.+?)\s*=\s*[^;]+/g,(r,i)=>(!t&&i&&n++===e&&(t=i),``)),t},get length(){let e=0;return p._cookies[0][p._cookies[1]].replace(/(?:^|;)\s*.+?\s*=\s*[^;]+/g,t=>(e+=+!!t,``)),e}});const m={À:`A`,Á:`A`,Â:`A`,Ã:`A`,Ä:`A`,Å:`A`,Ấ:`A`,Ắ:`A`,Ẳ:`A`,Ẵ:`A`,Ặ:`A`,Æ:`AE`,Ầ:`A`,Ằ:`A`,Ȃ:`A`,Ç:`C`,Ḉ:`C`,È:`E`,É:`E`,Ê:`E`,Ë:`E`,Ế:`E`,Ḗ:`E`,Ề:`E`,Ḕ:`E`,Ḝ:`E`,Ȇ:`E`,Ì:`I`,Í:`I`,Î:`I`,Ï:`I`,Ḯ:`I`,Ȋ:`I`,Ð:`D`,Ñ:`N`,Ò:`O`,Ó:`O`,Ô:`O`,Õ:`O`,Ö:`O`,Ø:`O`,Ố:`O`,Ṍ:`O`,Ṓ:`O`,Ȏ:`O`,Ù:`U`,Ú:`U`,Û:`U`,Ü:`U`,Ý:`Y`,à:`a`,á:`a`,â:`a`,ã:`a`,ä:`a`,å:`a`,ấ:`a`,ắ:`a`,ẳ:`a`,ẵ:`a`,ặ:`a`,æ:`ae`,ầ:`a`,ằ:`a`,ȃ:`a`,ç:`c`,ḉ:`c`,è:`e`,é:`e`,ê:`e`,ë:`e`,ế:`e`,ḗ:`e`,ề:`e`,ḕ:`e`,ḝ:`e`,ȇ:`e`,ì:`i`,í:`i`,î:`i`,ï:`i`,ḯ:`i`,ȋ:`i`,ð:`d`,ñ:`n`,ò:`o`,ó:`o`,ô:`o`,õ:`o`,ö:`o`,ø:`o`,ố:`o`,ṍ:`o`,ṓ:`o`,ȏ:`o`,ù:`u`,ú:`u`,û:`u`,ü:`u`,ý:`y`,ÿ:`y`,Ā:`A`,ā:`a`,Ă:`A`,ă:`a`,Ą:`A`,ą:`a`,Ć:`C`,ć:`c`,Ĉ:`C`,ĉ:`c`,Ċ:`C`,ċ:`c`,Č:`C`,č:`c`,C̆:`C`,c̆:`c`,Ď:`D`,ď:`d`,Đ:`D`,đ:`d`,Ē:`E`,ē:`e`,Ĕ:`E`,ĕ:`e`,Ė:`E`,ė:`e`,Ę:`E`,ę:`e`,Ě:`E`,ě:`e`,Ĝ:`G`,Ǵ:`G`,ĝ:`g`,ǵ:`g`,Ğ:`G`,ğ:`g`,Ġ:`G`,ġ:`g`,Ģ:`G`,ģ:`g`,Ĥ:`H`,ĥ:`h`,Ħ:`H`,ħ:`h`,Ḫ:`H`,ḫ:`h`,Ĩ:`I`,ĩ:`i`,Ī:`I`,ī:`i`,Ĭ:`I`,ĭ:`i`,Į:`I`,į:`i`,İ:`I`,ı:`i`,Ĳ:`IJ`,ĳ:`ij`,Ĵ:`J`,ĵ:`j`,Ķ:`K`,ķ:`k`,Ḱ:`K`,ḱ:`k`,K̆:`K`,k̆:`k`,Ĺ:`L`,ĺ:`l`,Ļ:`L`,ļ:`l`,Ľ:`L`,ľ:`l`,Ŀ:`L`,ŀ:`l`,Ł:`l`,ł:`l`,Ḿ:`M`,ḿ:`m`,M̆:`M`,m̆:`m`,Ń:`N`,ń:`n`,Ņ:`N`,ņ:`n`,Ň:`N`,ň:`n`,ŉ:`n`,N̆:`N`,n̆:`n`,Ō:`O`,ō:`o`,Ŏ:`O`,ŏ:`o`,Ő:`O`,ő:`o`,Œ:`OE`,œ:`oe`,P̆:`P`,p̆:`p`,Ŕ:`R`,ŕ:`r`,Ŗ:`R`,ŗ:`r`,Ř:`R`,ř:`r`,R̆:`R`,r̆:`r`,Ȓ:`R`,ȓ:`r`,Ś:`S`,ś:`s`,Ŝ:`S`,ŝ:`s`,Ş:`S`,Ș:`S`,ș:`s`,ş:`s`,Š:`S`,š:`s`,Ţ:`T`,ţ:`t`,ț:`t`,Ț:`T`,Ť:`T`,ť:`t`,Ŧ:`T`,ŧ:`t`,T̆:`T`,t̆:`t`,Ũ:`U`,ũ:`u`,Ū:`U`,ū:`u`,Ŭ:`U`,ŭ:`u`,Ů:`U`,ů:`u`,Ű:`U`,ű:`u`,Ų:`U`,ų:`u`,Ȗ:`U`,ȗ:`u`,V̆:`V`,v̆:`v`,Ŵ:`W`,ŵ:`w`,Ẃ:`W`,ẃ:`w`,X̆:`X`,x̆:`x`,Ŷ:`Y`,ŷ:`y`,Ÿ:`Y`,Y̆:`Y`,y̆:`y`,Ź:`Z`,ź:`z`,Ż:`Z`,ż:`z`,Ž:`Z`,ž:`z`,ſ:`s`,ƒ:`f`,Ơ:`O`,ơ:`o`,Ư:`U`,ư:`u`,Ǎ:`A`,ǎ:`a`,Ǐ:`I`,ǐ:`i`,Ǒ:`O`,ǒ:`o`,Ǔ:`U`,ǔ:`u`,Ǖ:`U`,ǖ:`u`,Ǘ:`U`,ǘ:`u`,Ǚ:`U`,ǚ:`u`,Ǜ:`U`,ǜ:`u`,Ứ:`U`,ứ:`u`,Ṹ:`U`,ṹ:`u`,Ǻ:`A`,ǻ:`a`,Ǽ:`AE`,ǽ:`ae`,Ǿ:`O`,ǿ:`o`,Þ:`TH`,þ:`th`,Ṕ:`P`,ṕ:`p`,Ṥ:`S`,ṥ:`s`,X́:`X`,x́:`x`,Ѓ:`Г`,ѓ:`г`,Ќ:`К`,ќ:`к`,A̋:`A`,a̋:`a`,E̋:`E`,e̋:`e`,I̋:`I`,i̋:`i`,Ǹ:`N`,ǹ:`n`,Ồ:`O`,ồ:`o`,Ṑ:`O`,ṑ:`o`,Ừ:`U`,ừ:`u`,Ẁ:`W`,ẁ:`w`,Ỳ:`Y`,ỳ:`y`,Ȁ:`A`,ȁ:`a`,Ȅ:`E`,ȅ:`e`,Ȉ:`I`,ȉ:`i`,Ȍ:`O`,ȍ:`o`,Ȑ:`R`,ȑ:`r`,Ȕ:`U`,ȕ:`u`,B̌:`B`,b̌:`b`,Č̣:`C`,č̣:`c`,Ê̌:`E`,ê̌:`e`,F̌:`F`,f̌:`f`,Ǧ:`G`,ǧ:`g`,Ȟ:`H`,ȟ:`h`,J̌:`J`,ǰ:`j`,Ǩ:`K`,ǩ:`k`,M̌:`M`,m̌:`m`,P̌:`P`,p̌:`p`,Q̌:`Q`,q̌:`q`,Ř̩:`R`,ř̩:`r`,Ṧ:`S`,ṧ:`s`,V̌:`V`,v̌:`v`,W̌:`W`,w̌:`w`,X̌:`X`,x̌:`x`,Y̌:`Y`,y̌:`y`,A̧:`A`,a̧:`a`,B̧:`B`,b̧:`b`,Ḑ:`D`,ḑ:`d`,Ȩ:`E`,ȩ:`e`,Ɛ̧:`E`,ɛ̧:`e`,Ḩ:`H`,ḩ:`h`,I̧:`I`,i̧:`i`,Ɨ̧:`I`,ɨ̧:`i`,M̧:`M`,m̧:`m`,O̧:`O`,o̧:`o`,Q̧:`Q`,q̧:`q`,U̧:`U`,u̧:`u`,X̧:`X`,x̧:`x`,Z̧:`Z`,z̧:`z`},h=Object.keys(m).join(`|`),g=new RegExp(h,`g`);function _(e){return e.replace(g,e=>m[e])}
/**
* @name match-sorter
* @license MIT license.
* @copyright (c) 2099 Kent C. Dodds
* @author Kent C. Dodds <me@kentcdodds.com> (https://kentcdodds.com)
*/
const v={CASE_SENSITIVE_EQUAL:7,EQUAL:6,STARTS_WITH:5,WORD_STARTS_WITH:4,CONTAINS:3,ACRONYM:2,MATCHES:1,NO_MATCH:0};function y(e,t,n){if(n||={},n.threshold=n.threshold??v.MATCHES,!n.accessors){let r=b(e,t,n);return{rankedValue:e,rank:r,accessorIndex:-1,accessorThreshold:n.threshold,passed:r>=n.threshold}}let r=T(e,n.accessors),i={rankedValue:e,rank:v.NO_MATCH,accessorIndex:-1,accessorThreshold:n.threshold,passed:!1};for(let e=0;e<r.length;e++){let a=r[e],o=b(a.itemValue,t,n),{minRanking:s,maxRanking:c,threshold:l=n.threshold}=a.attributes;o<s&&o>=v.MATCHES?o=s:o>c&&(o=c),o=Math.min(o,c),o>=l&&o>i.rank&&(i.rank=o,i.passed=!0,i.accessorIndex=e,i.accessorThreshold=l,i.rankedValue=a.itemValue)}return i}function b(e,t,n){return e=C(e,n),t=C(t,n),t.length>e.length?v.NO_MATCH:e===t?v.CASE_SENSITIVE_EQUAL:(e=e.toLowerCase(),t=t.toLowerCase(),e===t?v.EQUAL:e.startsWith(t)?v.STARTS_WITH:e.includes(` ${t}`)?v.WORD_STARTS_WITH:e.includes(t)?v.CONTAINS:t.length===1?v.NO_MATCH:x(e).includes(t)?v.ACRONYM:S(e,t))}function x(e){let t=``;return e.split(` `).forEach(e=>{e.split(`-`).forEach(e=>{t+=e.substr(0,1)})}),t}function S(e,t){let n=0,r=0;function i(e,t,r){for(let i=r,a=t.length;i<a;i++)if(t[i]===e)return n+=1,i+1;return-1}function a(e){let r=1/e,i=n/t.length;return v.MATCHES+i*r}let o=i(t[0],e,0);if(o<0)return v.NO_MATCH;r=o;for(let n=1,a=t.length;n<a;n++){let a=t[n];if(r=i(a,e,r),!(r>-1))return v.NO_MATCH}return a(r-o)}function C(e,{keepDiacritics:t}){return e=`${e}`,t||(e=_(e)),e}function w(e,t){let n=t;typeof t==`object`&&(n=t.accessor);let r=n(e);return r==null?[]:Array.isArray(r)?r:[String(r)]}function T(e,t){let n=[];for(let r=0,i=t.length;r<i;r++){let i=t[r],a=D(i),o=w(e,i);for(let e=0,t=o.length;e<t;e++)n.push({itemValue:o[e],attributes:a})}return n}const E={maxRanking:1/0,minRanking:-1/0};function D(e){return typeof e==`function`?E:{...E,...e}}let O={data:``},k=e=>{if(typeof window==`object`){let t=(e?e.querySelector(`#_goober`):window._goober)||Object.assign(document.createElement(`style`),{innerHTML:` `,id:`_goober`});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||O},A=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,j=/\/\*[^]*?\*\/|  +/g,M=/\n+/g,N=(e,t)=>{let n=``,r=``,i=``;for(let a in e){let o=e[a];a[0]==`@`?a[1]==`i`?n=a+` `+o+`;`:r+=a[1]==`f`?N(o,a):a+`{`+N(o,a[1]==`k`?``:t)+`}`:typeof o==`object`?r+=N(o,t?t.replace(/([^,])+/g,e=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+` `+t:t)):a):o!=null&&(a=a[1]==`-`?a:a.replace(/[A-Z]/g,`-$&`).toLowerCase(),i+=N.p?N.p(a,o):a+`:`+o+`;`)}return n+(t&&i?t+`{`+i+`}`:i)+r},P={},F=e=>{if(typeof e==`object`){let t=``;for(let n in e)t+=n+F(e[n]);return t}return e},ee=(e,t,n,r,i)=>{let a=F(e),o=P[a]||(P[a]=(e=>{let t=0,n=11;for(;t<e.length;)n=101*n+e.charCodeAt(t++)>>>0;return`go`+n})(a));if(!P[o]){let t=a===e?(e=>{let t,n,r=[{}];for(;t=A.exec(e.replace(j,``));)t[4]?r.shift():t[3]?(n=t[3].replace(M,` `).trim(),r.unshift(r[0][n]=r[0][n]||{})):r[0][t[1]]=t[2].replace(M,` `).trim();return r[0]})(e):e;P[o]=N(i?{[`@keyframes `+o]:t}:t,n?``:`.`+o)}let s=n&&P.g;return n&&(P.g=P[o]),((e,t,n,r)=>{r?t.data=t.data.replace(r,e):t.data.indexOf(e)===-1&&(t.data=n?e+t.data:t.data+e)})(P[o],t,r,s),o},te=(e,t,n)=>e.reduce((e,r,i)=>{let a=t[i];if(a&&a.call){let e=a(n),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;a=t?`.`+t:e&&typeof e==`object`?e.props?``:N(e,``):!1===e?``:e}return e+r+(a??``)},``);function I(e){let t=this||{},n=e.call?e(t.p):e;return ee(n.unshift?n.raw?te(n,[].slice.call(arguments,1),t.p):n.reduce((e,n)=>Object.assign(e,n&&n.call?n(t.p):n),{}):n,k(t.target),t.g,t.o,t.k)}I.bind({g:1}),I.bind({k:1});function ne(e){var t,n,r=``;if(typeof e==`string`||typeof e==`number`)r+=e;else if(typeof e==`object`){if(Array.isArray(e)){var i=e.length;for(t=0;t<i;t++)e[t]&&(n=ne(e[t]))&&(r&&(r+=` `),r+=n)}else for(n in e)e[n]&&(r&&(r+=` `),r+=n)}return r}function L(){for(var e,t,n=0,r=``,i=arguments.length;n<i;n++)(e=arguments[n])&&(t=ne(e))&&(r&&(r+=` `),r+=t);return r}const re=()=>{};function ie(t,n){let r=e.$(t),{onChange:i}=n,a=new Set(n.appear?void 0:r),o=/* @__PURE__ */ new WeakSet,[s,c]=e.W([],{equals:!1}),[l]=e.tt(),u=n.exitMethod===`remove`?re:e=>{c(t=>(t.push.apply(t,e),t));for(let t of e)o.delete(t)},d=n.exitMethod===`remove`?re:n.exitMethod===`keep-index`?(e,t,n)=>e.splice(n,0,t):(e,t)=>e.push(t);return e.V(n=>{let r=s(),c=t();if(c[e.A],e.$(l))return l(),n;if(r.length){let e=n.filter(e=>!r.includes(e));return r.length=0,i({list:e,added:[],removed:[],unchanged:e,finishRemoved:u}),e}return e.$(()=>{let e=new Set(c),t=c.slice(),r=[],s=[],l=[];for(let e of c)(a.has(e)?l:r).push(e);let f=!r.length;for(let r=0;r<n.length;r++){let i=n[r];e.has(i)||(o.has(i)||(s.push(i),o.add(i)),d(t,i,r)),f&&i!==t[r]&&(f=!1)}return!s.length&&f?n:(i({list:t,added:r,removed:s,unchanged:l,finishRemoved:u}),a=e,t)})},n.appear?[]:r.slice())}function R(...e){return r(e)}const ae=e=>e instanceof Element;function oe(e,t){if(t(e))return e;if(typeof e==`function`&&!e.length)return oe(e(),t);if(Array.isArray(e)){let n=[];for(let r of e){let e=oe(r,t);e&&(Array.isArray(e)?n.push.apply(n,e):n.push(e))}return n.length?n:null}return null}function se(t,n=ae,r=ae){let i=e.V(t),a=e.V(()=>oe(i(),n));return a.toArray=()=>{let e=a();return Array.isArray(e)?e:e?[e]:[]},a}function ce(t){return e.V(()=>{let e=t.name||`s`;return{enterActive:(t.enterActiveClass||e+`-enter-active`).split(` `),enter:(t.enterClass||e+`-enter`).split(` `),enterTo:(t.enterToClass||e+`-enter-to`).split(` `),exitActive:(t.exitActiveClass||e+`-exit-active`).split(` `),exit:(t.exitClass||e+`-exit`).split(` `),exitTo:(t.exitToClass||e+`-exit-to`).split(` `),move:(t.moveClass||e+`-move`).split(` `)}})}function le(e){requestAnimationFrame(()=>requestAnimationFrame(e))}function ue(e,t,n,r){let{onBeforeEnter:i,onEnter:a,onAfterEnter:o}=t;i?.(n),n.classList.add(...e.enter),n.classList.add(...e.enterActive),queueMicrotask(()=>{if(!n.parentNode)return r?.();a?.(n,()=>s())}),le(()=>{n.classList.remove(...e.enter),n.classList.add(...e.enterTo),(!a||a.length<2)&&(n.addEventListener(`transitionend`,s),n.addEventListener(`animationend`,s))});function s(t){(!t||t.target===n)&&(r?.(),n.removeEventListener(`transitionend`,s),n.removeEventListener(`animationend`,s),n.classList.remove(...e.enterActive),n.classList.remove(...e.enterTo),o?.(n))}}function de(e,t,n,r){let{onBeforeExit:i,onExit:a,onAfterExit:o}=t;if(!n.parentNode)return r?.();i?.(n),n.classList.add(...e.exit),n.classList.add(...e.exitActive),a?.(n,()=>s()),le(()=>{n.classList.remove(...e.exit),n.classList.add(...e.exitTo),(!a||a.length<2)&&(n.addEventListener(`transitionend`,s),n.addEventListener(`animationend`,s))});function s(t){(!t||t.target===n)&&(r?.(),n.removeEventListener(`transitionend`,s),n.removeEventListener(`animationend`,s),n.classList.remove(...e.exitActive),n.classList.remove(...e.exitTo),o?.(n))}}var fe=e=>{let t=ce(e);return ie(se(()=>e.children).toArray,{appear:e.appear,exitMethod:`keep-index`,onChange({added:n,removed:r,finishRemoved:i,list:a}){let o=t();for(let t of n)ue(o,e,t);let s=[];for(let e of a)e.isConnected&&(e instanceof HTMLElement||e instanceof SVGElement)&&s.push({el:e,rect:e.getBoundingClientRect()});queueMicrotask(()=>{let e=[];for(let{el:t,rect:n}of s)if(t.isConnected){let r=t.getBoundingClientRect(),i=n.left-r.left,a=n.top-r.top;(i||a)&&(t.style.transform=`translate(${i}px, ${a}px)`,t.style.transitionDuration=`0s`,e.push(t))}document.body.offsetHeight;for(let t of e){let e=function(n){(n.target===t||/transform$/.test(n.propertyName))&&(t.removeEventListener(`transitionend`,e),t.classList.remove(...o.move))};t.classList.add(...o.move),t.style.transform=t.style.transitionDuration=``,t.addEventListener(`transitionend`,e)}});for(let t of r)de(o,e,t,()=>i([t]))}})};const pe=Symbol(`fallback`);function me(e){for(let t of e)t.dispose()}function he(t,n,r,i={}){let a=/* @__PURE__ */ new Map;return e.X(()=>me(a.values())),()=>{let r=t()||[];return r[e.A],e.$(()=>{if(!r.length)return me(a.values()),a.clear(),i.fallback?[e.U(e=>(a.set(pe,{dispose:e}),i.fallback()))]:[];let t=Array(r.length),s=a.get(pe);if(!a.size||s){s?.dispose(),a.delete(pe);for(let e=0;e<r.length;e++){let i=r[e],a=n(i,e);o(t,i,e,a)}return t}let c=new Set(a.keys());for(let e=0;e<r.length;e++){let i=r[e],s=n(i,e);c.delete(s);let l=a.get(s);l?(t[e]=l.mapped,l.setIndex?.(e),l.setItem(()=>i)):o(t,i,e,s)}for(let e of c)a.get(e)?.dispose(),a.delete(e);return t})};function o(t,n,i,o){e.U(s=>{let[c,l]=e.W(n),u={setItem:l,dispose:s};if(r.length>1){let[t,n]=e.W(i);u.setIndex=n,u.mapped=r(c,t)}else u.mapped=r(c);a.set(o,u),t[i]=u.mapped})}}function ge(t){let{by:n}=t;return e.V(he(()=>t.each,typeof n==`function`?n:e=>e[n],t.children,`fallback`in t?{fallback:()=>t.fallback}:void 0))}function _e(e,t,n,r){return e.addEventListener(t,n,r),s(e.removeEventListener.bind(e,t,n,r))}function ve(t,n,r,o){let s=()=>{a(i(t)).forEach(e=>{e&&a(i(n)).forEach(t=>_e(e,t,r,o))})};typeof t==`function`?e.B(s):e.H(s)}function ye(t,n){let r=new ResizeObserver(t);return e.X(r.disconnect.bind(r)),{observe:e=>r.observe(e,n),unobserve:r.unobserve.bind(r)}}function be(t,r,o){let s=/* @__PURE__ */ new WeakMap,{observe:l,unobserve:u}=ye(e=>{for(let t of e){let{contentRect:e,target:n}=t,i=Math.round(e.width),a=Math.round(e.height),o=s.get(n);(!o||o.width!==i||o.height!==a)&&(r(e,n,t),s.set(n,{width:i,height:a}))}},o);e.B(e=>{let r=n(a(i(t)));return c(r,e,l,u),r},[])}const xe=/((?:--)?(?:\w+-?)+)\s*:\s*([^;]*)/g;function Se(e){let t={},n;for(;n=xe.exec(e);)t[n[1]]=n[2];return t}function Ce(e,t){if(typeof e==`string`){if(typeof t==`string`)return`${e};${t}`;e=Se(e)}else typeof t==`string`&&(t=Se(t));return{...e,...t}}function we(e,t,n=-1){return n in e?[...e.slice(0,n),t,...e.slice(n)]:[...e,t]}function Te(e,t){let n=[...e],r=n.indexOf(t);return r!==-1&&n.splice(r,1),n}function Ee(e){return typeof e==`number`}function De(e){return Object.prototype.toString.call(e)===`[object String]`}function Oe(e){return typeof e==`function`}function ke(e){return t=>`${e()}-${t}`}function Ae(e,t){return e?e===t||e.contains(t):!1}function je(e,t=!1){let{activeElement:n}=Ne(e);if(!n?.nodeName)return null;if(Pe(n)&&n.contentDocument)return je(n.contentDocument.body,t);if(t){let e=n.getAttribute(`aria-activedescendant`);if(e){let t=Ne(n).getElementById(e);if(t)return t}}return n}function Me(e){return Ne(e).defaultView||window}function Ne(e){return e?e.ownerDocument||e:document}function Pe(e){return e.tagName===`IFRAME`}var Fe=/* @__PURE__ */ (e=>(e.Escape=`Escape`,e.Enter=`Enter`,e.Tab=`Tab`,e.Space=` `,e.ArrowDown=`ArrowDown`,e.ArrowLeft=`ArrowLeft`,e.ArrowRight=`ArrowRight`,e.ArrowUp=`ArrowUp`,e.End=`End`,e.Home=`Home`,e.PageDown=`PageDown`,e.PageUp=`PageUp`,e))(Fe||{});function Ie(e){return typeof window<`u`&&window.navigator!=null&&e.test(window.navigator.userAgentData?.platform||window.navigator.platform)}function Le(){return Ie(/^Mac/i)}function Re(){return Ie(/^iPhone/i)}function ze(){return Ie(/^iPad/i)||Le()&&navigator.maxTouchPoints>1}function Be(){return Re()||ze()}function Ve(){return Le()||Be()}function z(e,t){return t&&(Oe(t)?t(e):t[0](t[1],e)),e?.defaultPrevented}function B(e){return t=>{for(let n of e)z(t,n)}}function He(e){return Le()?e.metaKey&&!e.ctrlKey:e.ctrlKey&&!e.metaKey}function V(e){if(e){if(We())e.focus({preventScroll:!0});else{let t=Ge(e);e.focus(),Ke(t)}}}var Ue=null;function We(){if(Ue==null){Ue=!1;try{document.createElement(`div`).focus({get preventScroll(){return Ue=!0,!0}})}catch{}}return Ue}function Ge(e){let t=e.parentNode,n=[],r=document.scrollingElement||document.documentElement;for(;t instanceof HTMLElement&&t!==r;)(t.offsetHeight<t.scrollHeight||t.offsetWidth<t.scrollWidth)&&n.push({element:t,scrollTop:t.scrollTop,scrollLeft:t.scrollLeft}),t=t.parentNode;return r instanceof HTMLElement&&n.push({element:r,scrollTop:r.scrollTop,scrollLeft:r.scrollLeft}),n}function Ke(e){for(let{element:t,scrollTop:n,scrollLeft:r}of e)t.scrollTop=n,t.scrollLeft=r}var qe=[`input:not([type='hidden']):not([disabled])`,`select:not([disabled])`,`textarea:not([disabled])`,`button:not([disabled])`,`a[href]`,`area[href]`,`[tabindex]`,`iframe`,`object`,`embed`,`audio[controls]`,`video[controls]`,`[contenteditable]:not([contenteditable='false'])`],Je=[...qe,`[tabindex]:not([tabindex="-1"]):not([disabled])`],Ye=`${qe.join(`:not([hidden]),`)},[tabindex]:not([disabled]):not([hidden])`,Xe=Je.join(`:not([hidden]):not([tabindex="-1"]),`);function Ze(e,t){let n=Array.from(e.querySelectorAll(Ye)).filter(Qe);return t&&Qe(e)&&n.unshift(e),n.forEach((e,t)=>{if(Pe(e)&&e.contentDocument){let r=e.contentDocument.body,i=Ze(r,!1);n.splice(t,1,...i)}}),n}function Qe(e){return $e(e)&&!et(e)}function $e(e){return e.matches(Ye)&&tt(e)}function et(e){return Number.parseInt(e.getAttribute(`tabindex`)||`0`,10)<0}function tt(e,t){return e.nodeName!==`#comment`&&nt(e)&&rt(e,t)&&(!e.parentElement||tt(e.parentElement,e))}function nt(e){if(!(e instanceof HTMLElement)&&!(e instanceof SVGElement))return!1;let{display:t,visibility:n}=e.style,r=t!==`none`&&n!==`hidden`&&n!==`collapse`;if(r){if(!e.ownerDocument.defaultView)return r;let{getComputedStyle:t}=e.ownerDocument.defaultView,{display:n,visibility:i}=t(e);r=n!==`none`&&i!==`hidden`&&i!==`collapse`}return r}function rt(e,t){return!e.hasAttribute(`hidden`)&&(e.nodeName===`DETAILS`&&t&&t.nodeName!==`SUMMARY`?e.hasAttribute(`open`):!0)}function it(e,t){return t.some(t=>t.contains(e))}function at(e,t,n){let r=t?.tabbable?Xe:Ye,i=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode(e){return t?.from?.contains(e)?NodeFilter.FILTER_REJECT:e.matches(r)&&tt(e)&&(!n||it(e,n))&&(!t?.accept||t.accept(e))?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_SKIP}});return t?.from&&(i.currentNode=t.from),i}function ot(e){let t=e;for(;t&&!st(t);)t=t.parentElement;return t||document.scrollingElement||document.documentElement}function st(e){let t=window.getComputedStyle(e);return/(auto|scroll)/.test(t.overflow+t.overflowX+t.overflowY)}function ct(){}function lt(e,t){let[n,r]=e,i=!1,a=t.length;for(let e=a,o=0,s=e-1;o<e;s=o++){let[a,c]=t[o],[l,u]=t[s],[,d]=t[s===0?e-1:s-1]||[0,0],f=(c-u)*(n-a)-(a-l)*(r-c);if(u<c){if(r>=u&&r<c){if(f===0)return!0;f>0&&(r===u?r>d&&(i=!i):i=!i)}}else if(c<u){if(r>c&&r<=u){if(f===0)return!0;f<0&&(r===u?r<d&&(i=!i):i=!i)}}else if(r===c&&(n>=l&&n<=a||n>=a&&n<=l))return!0}return i}function H(t,n){return e.J(t,n)}var ut=/* @__PURE__ */ new Map,dt=/* @__PURE__ */ new Set;function ft(){if(typeof window>`u`||document.body===null)return;let e=e=>{if(!e.target)return;let n=ut.get(e.target);n||(n=/* @__PURE__ */ new Set,ut.set(e.target,n),e.target.addEventListener(`transitioncancel`,t)),n.add(e.propertyName)},t=e=>{if(!e.target)return;let n=ut.get(e.target);if(n&&(n.delete(e.propertyName),n.size===0&&(e.target.removeEventListener(`transitioncancel`,t),ut.delete(e.target)),ut.size===0)){for(let e of dt)e();dt.clear()}};document.body.addEventListener(`transitionrun`,e),document.body.addEventListener(`transitionend`,t)}typeof document<`u`&&(document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,ft):ft());function pt(e,t){let n=mt(e,t,`left`),r=mt(e,t,`top`),i=t.offsetWidth,a=t.offsetHeight,o=e.scrollLeft,s=e.scrollTop,c=o+e.offsetWidth,l=s+e.offsetHeight;n<=o?o=n:n+i>c&&(o+=n+i-c),r<=s?s=r:r+a>l&&(s+=r+a-l),e.scrollLeft=o,e.scrollTop=s}function mt(e,t,n){let r=n===`left`?`offsetLeft`:`offsetTop`,i=0;for(;t.offsetParent&&(i+=t[r],t.offsetParent!==e);){if(t.offsetParent.contains(e)){i-=e[r];break}t=t.offsetParent}return i}function ht(e,t){if(document.contains(e)){let n=document.scrollingElement||document.documentElement;if(window.getComputedStyle(n).overflow!==`hidden`){let{left:n,top:r}=e.getBoundingClientRect();e?.scrollIntoView?.({block:`nearest`});let{left:i,top:a}=e.getBoundingClientRect();(Math.abs(n-i)>1||Math.abs(r-a)>1)&&(t?.containingElement?.scrollIntoView?.({block:`center`,inline:`center`}),e.scrollIntoView?.({block:`nearest`}))}else{let t=ot(e);for(;e&&t&&e!==n&&t!==n;)pt(t,e),e=t,t=ot(e)}}}var gt={border:`0`,clip:`rect(0 0 0 0)`,"clip-path":`inset(50%)`,height:`1px`,margin:`0 -1px -1px 0`,overflow:`hidden`,padding:`0`,position:`absolute`,width:`1px`,"white-space":`nowrap`};function _t(e){let t=e.startIndex??0,n=e.startLevel??0,r=[],i=t=>{if(t==null)return``;let n=e.getKey??`key`,r=De(n)?t[n]:n(t);return r==null?``:String(r)},a=t=>{if(t==null)return``;let n=e.getTextValue??`textValue`,r=De(n)?t[n]:n(t);return r==null?``:String(r)},o=t=>{if(t==null)return!1;let n=e.getDisabled??`disabled`;return(De(n)?t[n]:n(t))??!1},s=t=>{if(t!=null)return De(e.getSectionChildren)?t[e.getSectionChildren]:e.getSectionChildren?.(t)};for(let c of e.dataSource){if(De(c)||Ee(c)){r.push({type:`item`,rawValue:c,key:String(c),textValue:String(c),disabled:o(c),level:n,index:t}),t++;continue}if(s(c)!=null){r.push({type:`section`,rawValue:c,key:``,textValue:``,disabled:!1,level:n,index:t}),t++;let i=s(c)??[];if(i.length>0){let a=_t({dataSource:i,getKey:e.getKey,getTextValue:e.getTextValue,getDisabled:e.getDisabled,getSectionChildren:e.getSectionChildren,startIndex:t,startLevel:n+1});r.push(...a),t+=a.length}}else r.push({type:`item`,rawValue:c,key:i(c),textValue:a(c),disabled:o(c),level:n,index:t}),t++}return r}function vt(t,n=[]){return e.V(()=>{let e=_t({dataSource:i(t.dataSource),getKey:i(t.getKey),getTextValue:i(t.getTextValue),getDisabled:i(t.getDisabled),getSectionChildren:i(t.getSectionChildren)});for(let e=0;e<n.length;e++)n[e]();return t.factory(e)})}var yt=/* @__PURE__ */ new Set([`Avst`,`Arab`,`Armi`,`Syrc`,`Samr`,`Mand`,`Thaa`,`Mend`,`Nkoo`,`Adlm`,`Rohg`,`Hebr`]),bt=/* @__PURE__ */ new Set([`ae`,`ar`,`arc`,`bcc`,`bqi`,`ckb`,`dv`,`fa`,`glk`,`he`,`ku`,`mzn`,`nqo`,`pnb`,`ps`,`sd`,`ug`,`ur`,`yi`]);function xt(e){if(Intl.Locale){let t=new Intl.Locale(e).maximize().script??``;return yt.has(t)}let t=e.split(`-`)[0];return bt.has(t)}function St(e){return xt(e)?`rtl`:`ltr`}function Ct(){let e=typeof navigator<`u`&&(navigator.language||navigator.userLanguage)||`en-US`;return{locale:e,direction:St(e)}}var wt=Ct(),Tt=/* @__PURE__ */ new Set;function Et(){wt=Ct();for(let e of Tt)e(wt)}function Dt(){let[t,n]=e.W(wt),r=e.V(()=>t());return e.Z(()=>{Tt.size===0&&window.addEventListener(`languagechange`,Et),Tt.add(n),e.X(()=>{Tt.delete(n),Tt.size===0&&window.removeEventListener(`languagechange`,Et)})}),{locale:()=>r().locale,direction:()=>r().direction}}var Ot=e.z();function kt(){let t=Dt();return e.et(Ot)||t}var At=/* @__PURE__ */ new Map;function jt(t){let{locale:n}=kt(),r=e.V(()=>n()+(t?Object.entries(t).sort((e,t)=>e[0]<t[0]?-1:1).join():``));return e.V(()=>{let e=r(),i;return At.has(e)&&(i=At.get(e)),i||(i=new Intl.Collator(n(),t),At.set(e,i)),i})}function Mt(t){let[n,r]=e.W(t.defaultValue?.()),i=e.V(()=>t.value?.()!==void 0),a=e.V(()=>i()?t.value?.():n());return[a,n=>{e.$(()=>{let e=o(n,a());return Object.is(e,a())||(i()||r(e),t.onChange?.(e)),e})}]}function Nt(e){let[t,n]=Mt(e);return[()=>t()??!1,n]}function Pt(e){let[t,n]=Mt(e);return[()=>t()??[],n]}var Ft=class e extends Set{anchorKey;currentKey;constructor(t,n,r){super(t),t instanceof e?(this.anchorKey=n||t.anchorKey,this.currentKey=r||t.currentKey):(this.anchorKey=n,this.currentKey=r)}};function It(e){let[t,n]=Mt(e);return[()=>t()??new Ft,n]}function Lt(e){return Ve()?e.altKey:e.ctrlKey}function Rt(e){return Le()?e.metaKey:e.ctrlKey}function zt(e){return new Ft(e)}function Bt(e,t){if(e.size!==t.size)return!1;for(let n of e)if(!t.has(n))return!1;return!0}function Vt(t){let n=H({selectionMode:`none`,selectionBehavior:`toggle`},t),[r,a]=e.W(!1),[o,s]=e.W(),[c,l]=It({value:e.V(()=>{let e=i(n.selectedKeys);return e==null?e:zt(e)}),defaultValue:e.V(()=>{let e=i(n.defaultSelectedKeys);return e==null?new Ft:zt(e)}),onChange:e=>n.onSelectionChange?.(e)}),[u,d]=e.W(i(n.selectionBehavior));return e.B(()=>{let e=c();i(n.selectionBehavior)===`replace`&&u()===`toggle`&&typeof e==`object`&&e.size===0&&d(`replace`)}),e.B(()=>{d(i(n.selectionBehavior)??`toggle`)}),{selectionMode:()=>i(n.selectionMode),disallowEmptySelection:()=>i(n.disallowEmptySelection)??!1,selectionBehavior:u,setSelectionBehavior:d,isFocused:r,setFocused:a,focusedKey:o,setFocusedKey:s,selectedKeys:c,setSelectedKeys:e=>{(i(n.allowDuplicateSelectionEvents)||!Bt(e,c()))&&l(e)}}}function Ht(t){let[n,r]=e.W(``),[a,o]=e.W(-1);return{typeSelectHandlers:{onKeyDown:e=>{if(i(t.isDisabled))return;let s=i(t.keyboardDelegate),c=i(t.selectionManager);if(!s.getKeyForSearch)return;let l=Ut(e.key);if(!l||e.ctrlKey||e.metaKey)return;l===` `&&n().trim().length>0&&(e.preventDefault(),e.stopPropagation());let u=r(e=>e+l),d=s.getKeyForSearch(u,c.focusedKey())??s.getKeyForSearch(u);d==null&&Wt(u)&&(u=u[0],d=s.getKeyForSearch(u,c.focusedKey())??s.getKeyForSearch(u)),d!=null&&(c.setFocusedKey(d),t.onTypeSelect?.(d)),clearTimeout(a()),o(window.setTimeout(()=>r(``),500))}}}}function Ut(e){return e.length===1||!/^[A-Z]/i.test(e)?e:``}function Wt(e){return e.split(``).every(t=>t===e[0])}function Gt(t,n,r){let a=e.J({selectOnFocus:()=>i(t.selectionManager).selectionBehavior()===`replace`},t),o=()=>r?.()??n(),{direction:s}=kt(),c={top:0,left:0};ve(()=>i(a.isVirtualized)?void 0:o(),`scroll`,()=>{let e=o();e&&(c={top:e.scrollTop,left:e.scrollLeft})});let{typeSelectHandlers:l}=Ht({isDisabled:()=>i(a.disallowTypeAhead),keyboardDelegate:()=>i(a.keyboardDelegate),selectionManager:()=>i(a.selectionManager)}),u=()=>i(a.orientation)??`vertical`,d=e=>{z(e,l.onKeyDown),e.altKey&&e.key===`Tab`&&e.preventDefault();let t=n();if(!t?.contains(e.target))return;let r=i(a.selectionManager),o=i(a.selectOnFocus),c=t=>{t!=null&&(r.setFocusedKey(t),e.shiftKey&&r.selectionMode()===`multiple`?r.extendSelection(t):o&&!Lt(e)&&r.replaceSelection(t))},d=i(a.keyboardDelegate),f=i(a.shouldFocusWrap),p=r.focusedKey();switch(e.key){case u()===`vertical`?`ArrowDown`:`ArrowRight`:if(d.getKeyBelow){e.preventDefault();let t;t=p==null?d.getFirstKey?.():d.getKeyBelow(p),t==null&&f&&(t=d.getFirstKey?.(p)),c(t)}break;case u()===`vertical`?`ArrowUp`:`ArrowLeft`:if(d.getKeyAbove){e.preventDefault();let t;t=p==null?d.getLastKey?.():d.getKeyAbove(p),t==null&&f&&(t=d.getLastKey?.(p)),c(t)}break;case u()===`vertical`?`ArrowLeft`:`ArrowUp`:if(d.getKeyLeftOf){e.preventDefault();let t=s()===`rtl`,n;n=p==null?t?d.getFirstKey?.():d.getLastKey?.():d.getKeyLeftOf(p),c(n)}break;case u()===`vertical`?`ArrowRight`:`ArrowDown`:if(d.getKeyRightOf){e.preventDefault();let t=s()===`rtl`,n;n=p==null?t?d.getLastKey?.():d.getFirstKey?.():d.getKeyRightOf(p),c(n)}break;case`Home`:if(d.getFirstKey){e.preventDefault();let t=d.getFirstKey(p,Rt(e));t!=null&&(r.setFocusedKey(t),Rt(e)&&e.shiftKey&&r.selectionMode()===`multiple`?r.extendSelection(t):o&&r.replaceSelection(t))}break;case`End`:if(d.getLastKey){e.preventDefault();let t=d.getLastKey(p,Rt(e));t!=null&&(r.setFocusedKey(t),Rt(e)&&e.shiftKey&&r.selectionMode()===`multiple`?r.extendSelection(t):o&&r.replaceSelection(t))}break;case`PageDown`:d.getKeyPageBelow&&p!=null&&(e.preventDefault(),c(d.getKeyPageBelow(p)));break;case`PageUp`:d.getKeyPageAbove&&p!=null&&(e.preventDefault(),c(d.getKeyPageAbove(p)));break;case`a`:Rt(e)&&r.selectionMode()===`multiple`&&i(a.disallowSelectAll)!==!0&&(e.preventDefault(),r.selectAll());break;case`Escape`:!e.defaultPrevented&&!i(a.disallowEmptySelection)&&(e.preventDefault(),r.clearSelection());break;case`Tab`:if(!i(a.allowsTabNavigation)){if(e.shiftKey)t.focus();else{let e=at(t,{tabbable:!0}),n,r;do r=e.lastChild(),r&&(n=r);while(r);n&&!n.contains(document.activeElement)&&V(n)}break}}},f=e=>{let t=i(a.selectionManager),n=i(a.keyboardDelegate),r=i(a.selectOnFocus);if(t.isFocused()){e.currentTarget.contains(e.target)||t.setFocused(!1);return}if(e.currentTarget.contains(e.target)){if(t.setFocused(!0),t.focusedKey()==null){let i=e=>{e!=null&&(t.setFocusedKey(e),r&&t.replaceSelection(e))},a=e.relatedTarget;a&&e.currentTarget.compareDocumentPosition(a)&Node.DOCUMENT_POSITION_FOLLOWING?i(t.lastSelectedKey()??n.getLastKey?.()):i(t.firstSelectedKey()??n.getFirstKey?.())}else if(!i(a.isVirtualized)){let e=o();if(e){e.scrollTop=c.top,e.scrollLeft=c.left;let n=e.querySelector(`[data-key="${t.focusedKey()}"]`);n&&(V(n),pt(e,n))}}}},p=e=>{let t=i(a.selectionManager);e.currentTarget.contains(e.relatedTarget)||t.setFocused(!1)},m=e=>{o()===e.target&&e.preventDefault()},h=()=>{let e=i(a.autoFocus);if(!e)return;let t=i(a.selectionManager),r=i(a.keyboardDelegate),o;e===`first`&&(o=r.getFirstKey?.()),e===`last`&&(o=r.getLastKey?.());let s=t.selectedKeys();s.size&&(o=s.values().next().value),t.setFocused(!0),t.setFocusedKey(o);let c=n();c&&o==null&&!i(a.shouldUseVirtualFocus)&&V(c)};return e.Z(()=>{a.deferAutoFocus?setTimeout(h,0):h()}),e.B(e.Y([o,()=>i(a.isVirtualized),()=>i(a.selectionManager).focusedKey()],e=>{let[t,n,r]=e;if(n)r&&a.scrollToKey?.(r);else if(r&&t){let e=t.querySelector(`[data-key="${r}"]`);e&&pt(t,e)}})),{tabIndex:e.V(()=>{if(!i(a.shouldUseVirtualFocus))return i(a.selectionManager).focusedKey()==null?0:-1}),onKeyDown:d,onMouseDown:m,onFocusIn:f,onFocusOut:p}}function Kt(t,n){let r=()=>i(t.selectionManager),a=()=>i(t.key),o=()=>i(t.shouldUseVirtualFocus),s=e=>{r().selectionMode()!==`none`&&(r().selectionMode()===`single`?r().isSelected(a())&&!r().disallowEmptySelection()?r().toggleSelection(a()):r().replaceSelection(a()):e?.shiftKey?r().extendSelection(a()):r().selectionBehavior()===`toggle`||Rt(e)||`pointerType`in e&&e.pointerType===`touch`?r().toggleSelection(a()):r().replaceSelection(a()))},c=()=>r().isSelected(a()),l=()=>i(t.disabled)||r().isDisabled(a()),u=()=>!l()&&r().canSelectItem(a()),d=null,f=e=>{u()&&(d=e.pointerType,e.pointerType===`mouse`&&e.button===0&&!i(t.shouldSelectOnPressUp)&&s(e))},p=e=>{u()&&e.pointerType===`mouse`&&e.button===0&&i(t.shouldSelectOnPressUp)&&i(t.allowsDifferentPressOrigin)&&s(e)},m=e=>{u()&&(i(t.shouldSelectOnPressUp)&&!i(t.allowsDifferentPressOrigin)||d!==`mouse`)&&s(e)},h=e=>{u()&&[`Enter`,` `].includes(e.key)&&(Lt(e)?r().toggleSelection(a()):s(e))},g=e=>{l()&&e.preventDefault()},_=e=>{let t=n();o()||l()||!t||e.target===t&&r().setFocusedKey(a())},v=e.V(()=>{if(!(o()||l()))return a()===r().focusedKey()?0:-1}),y=e.V(()=>i(t.virtualized)?void 0:a());return e.B(e.Y([n,a,o,()=>r().focusedKey(),()=>r().isFocused()],([e,n,r,i,a])=>{e&&n===i&&a&&!r&&document.activeElement!==e&&(t.focus?t.focus():V(e))})),{isSelected:c,isDisabled:l,allowsSelection:u,tabIndex:v,dataKey:y,onPointerDown:f,onPointerUp:p,onClick:m,onKeyDown:h,onMouseDown:g,onFocus:_}}var qt=class{collection;state;constructor(e,t){this.collection=e,this.state=t}selectionMode(){return this.state.selectionMode()}disallowEmptySelection(){return this.state.disallowEmptySelection()}selectionBehavior(){return this.state.selectionBehavior()}setSelectionBehavior(e){this.state.setSelectionBehavior(e)}isFocused(){return this.state.isFocused()}setFocused(e){this.state.setFocused(e)}focusedKey(){return this.state.focusedKey()}setFocusedKey(e){(e==null||this.collection().getItem(e))&&this.state.setFocusedKey(e)}selectedKeys(){return this.state.selectedKeys()}isSelected(e){if(this.state.selectionMode()===`none`)return!1;let t=this.getKey(e);return t!=null&&this.state.selectedKeys().has(t)}isEmpty(){return this.state.selectedKeys().size===0}isSelectAll(){if(this.isEmpty())return!1;let e=this.state.selectedKeys();return this.getAllSelectableKeys().every(t=>e.has(t))}firstSelectedKey(){let e;for(let t of this.state.selectedKeys()){let n=this.collection().getItem(t),r=n?.index!=null&&e?.index!=null&&n.index<e.index;(!e||r)&&(e=n)}return e?.key}lastSelectedKey(){let e;for(let t of this.state.selectedKeys()){let n=this.collection().getItem(t),r=n?.index!=null&&e?.index!=null&&n.index>e.index;(!e||r)&&(e=n)}return e?.key}extendSelection(e){if(this.selectionMode()===`none`)return;if(this.selectionMode()===`single`){this.replaceSelection(e);return}let t=this.getKey(e);if(t==null)return;let n=this.state.selectedKeys(),r=n.anchorKey||t,i=new Ft(n,r,t);for(let e of this.getKeyRange(r,n.currentKey||t))i.delete(e);for(let e of this.getKeyRange(t,r))this.canSelectItem(e)&&i.add(e);this.state.setSelectedKeys(i)}getKeyRange(e,t){let n=this.collection().getItem(e),r=this.collection().getItem(t);return n&&r?n.index!=null&&r.index!=null&&n.index<=r.index?this.getKeyRangeInternal(e,t):this.getKeyRangeInternal(t,e):[]}getKeyRangeInternal(e,t){let n=[],r=e;for(;r!=null;){let e=this.collection().getItem(r);if(e&&e.type===`item`&&n.push(r),r===t)return n;r=this.collection().getKeyAfter(r)}return[]}getKey(e){let t=this.collection().getItem(e);return t?!t||t.type!==`item`?null:t.key:e}toggleSelection(e){if(this.selectionMode()===`none`)return;if(this.selectionMode()===`single`&&!this.isSelected(e)){this.replaceSelection(e);return}let t=this.getKey(e);if(t==null)return;let n=new Ft(this.state.selectedKeys());n.has(t)?n.delete(t):this.canSelectItem(t)&&(n.add(t),n.anchorKey=t,n.currentKey=t),!(this.disallowEmptySelection()&&n.size===0)&&this.state.setSelectedKeys(n)}replaceSelection(e){if(this.selectionMode()===`none`)return;let t=this.getKey(e);if(t==null)return;let n=this.canSelectItem(t)?new Ft([t],t,t):new Ft;this.state.setSelectedKeys(n)}setSelectedKeys(e){if(this.selectionMode()===`none`)return;let t=new Ft;for(let n of e){let e=this.getKey(n);if(e!=null&&(t.add(e),this.selectionMode()===`single`))break}this.state.setSelectedKeys(t)}selectAll(){this.selectionMode()===`multiple`&&this.state.setSelectedKeys(new Set(this.getAllSelectableKeys()))}clearSelection(){let e=this.state.selectedKeys();!this.disallowEmptySelection()&&e.size>0&&this.state.setSelectedKeys(new Ft)}toggleSelectAll(){this.isSelectAll()?this.clearSelection():this.selectAll()}select(e,t){this.selectionMode()!==`none`&&(this.selectionMode()===`single`?this.isSelected(e)&&!this.disallowEmptySelection()?this.toggleSelection(e):this.replaceSelection(e):this.selectionBehavior()===`toggle`||t&&t.pointerType===`touch`?this.toggleSelection(e):this.replaceSelection(e))}isSelectionEqual(e){if(e===this.state.selectedKeys())return!0;let t=this.selectedKeys();if(e.size!==t.size)return!1;for(let n of e)if(!t.has(n))return!1;for(let n of t)if(!e.has(n))return!1;return!0}canSelectItem(e){if(this.state.selectionMode()===`none`)return!1;let t=this.collection().getItem(e);return t!=null&&!t.disabled}isDisabled(e){let t=this.collection().getItem(e);return!t||t.disabled}getAllSelectableKeys(){let e=[];return(t=>{for(;t!=null;){if(this.canSelectItem(t)){let n=this.collection().getItem(t);if(!n)continue;n.type===`item`&&e.push(t)}t=this.collection().getKeyAfter(t)}})(this.collection().getFirstKey()),e}},Jt=class{keyMap=/* @__PURE__ */ new Map;iterable;firstKey;lastKey;constructor(e){this.iterable=e;for(let t of e)this.keyMap.set(t.key,t);if(this.keyMap.size===0)return;let t,n=0;for(let[e,r]of this.keyMap)t?(t.nextKey=e,r.prevKey=t.key):(this.firstKey=e,r.prevKey=void 0),r.type===`item`&&(r.index=n++),t=r,t.nextKey=void 0;this.lastKey=t.key}*[Symbol.iterator](){yield*this.iterable}getSize(){return this.keyMap.size}getKeys(){return this.keyMap.keys()}getKeyBefore(e){return this.keyMap.get(e)?.prevKey}getKeyAfter(e){return this.keyMap.get(e)?.nextKey}getFirstKey(){return this.firstKey}getLastKey(){return this.lastKey}getItem(e){return this.keyMap.get(e)}at(e){let t=[...this.getKeys()];return this.getItem(t[e])}};function Yt(t){let n=Vt(t),r=vt({dataSource:()=>i(t.dataSource),getKey:()=>i(t.getKey),getTextValue:()=>i(t.getTextValue),getDisabled:()=>i(t.getDisabled),getSectionChildren:()=>i(t.getSectionChildren),factory:e=>t.filter?new Jt(t.filter(e)):new Jt(e)},[()=>t.filter]),a=new qt(r,n);return e.R(()=>{let e=n.focusedKey();e!=null&&!r().getItem(e)&&n.setFocusedKey(void 0)}),{collection:r,selectionManager:()=>a}}var Xt=e.z();function Zt(){return e.et(Xt)}function Qt(){let e=Zt();if(e===void 0)throw Error("[kobalte]: `useDomCollectionContext` must be used within a `DomCollectionProvider` component");return e}function $t(e,t){return!!(t.compareDocumentPosition(e)&Node.DOCUMENT_POSITION_PRECEDING)}function en(e,t){let n=t.ref();if(!n)return-1;let r=e.length;if(!r)return-1;for(;r--;){let t=e[r]?.ref();if(t&&$t(t,n))return r+1}return 0}function tn(e){let t=e.map((e,t)=>[t,e]),n=!1;return t.sort(([e,t],[r,i])=>{let a=t.ref(),o=i.ref();return a===o||!a||!o?0:$t(a,o)?(e>r&&(n=!0),-1):(e<r&&(n=!0),1)}),n?t.map(([e,t])=>t):e}function nn(e,t){let n=tn(e);e!==n&&t(n)}function rn(e){let t=e[0],n=e[e.length-1]?.ref(),r=t?.ref()?.parentElement;for(;r;){if(n&&r.contains(n))return r;r=r.parentElement}return Ne(r).body}function an(t,n){e.B(()=>{let r=setTimeout(()=>{nn(t(),n)});e.X(()=>clearTimeout(r))})}function on(t,n){if(typeof IntersectionObserver!=`function`){an(t,n);return}let r=[];e.B(()=>{let i=()=>{let e=!!r.length;r=t(),e&&nn(t(),n)},a=rn(t()),o=new IntersectionObserver(i,{root:a});for(let e of t()){let t=e.ref();t&&o.observe(t)}e.X(()=>o.disconnect())})}function sn(t={}){let[n,r]=Pt({value:()=>i(t.items),onChange:e=>t.onItemsChange?.(e)});on(n,r);let a=e=>(r(t=>we(t,e,en(t,e))),()=>{r(t=>{let n=t.filter(t=>t.ref()!==e.ref());return t.length===n.length?t:n})});return{DomCollectionProvider:t=>e.L(Xt.Provider,{value:{registerItem:a},get children(){return t.children}})}}function cn(t){let n=Qt(),r=H({shouldRegisterItem:!0},t);e.B(()=>{if(!r.shouldRegisterItem)return;let t=n.registerItem(r.getItem());e.X(t)})}function U(t){let[n,r]=e.Q(t,[`as`]);if(!n.as)throw Error("[kobalte]: Polymorphic is missing the required `as` prop.");return e.L(e.g,e.J(r,{get component(){return n.as}}))}var ln=Object.defineProperty,un=(e,t)=>{for(var n in t)ln(e,n,{get:t[n],enumerable:!0})},W=e=>typeof e==`function`?e():e,dn=t=>{let n=e.V(()=>{let e=W(t.element);if(e)return getComputedStyle(e)}),r=()=>n()?.animationName??`none`,[i,a]=e.W(W(t.show)?`present`:`hidden`),o=e=>{a(e),t.onStateChange?.(e)},s=`none`;return e.B(i=>{let a=W(t.show);return e.$(()=>{if(i===a)return a;let e=s,t=r();a?o(`present`):t===`none`||n()?.display===`none`?o(`hidden`):o(i===!0&&e!==t?`hiding`:`hidden`)}),a},W(t.show)),e.B(()=>{let n=W(t.element);if(!n)return;let a=e=>{e.target===n&&(s=r())},c=e=>{let t=r().includes(e.animationName);e.target===n&&t&&i()===`hiding`&&o(`hidden`)};n.addEventListener(`animationstart`,a),n.addEventListener(`animationcancel`,c),n.addEventListener(`animationend`,c),e.X(()=>{n.removeEventListener(`animationstart`,a),n.removeEventListener(`animationcancel`,c),n.removeEventListener(`animationend`,c)})}),{present:()=>i()===`present`||i()===`hiding`,state:i}},fn=`data-kb-top-layer`,pn,mn=!1,hn=[];function gn(e){return hn.findIndex(t=>t.node===e)}function _n(e){return hn[gn(e)]}function vn(e){return hn.length>0&&hn[hn.length-1].node===e}function yn(){return hn.filter(e=>e.isPointerBlocking)}function bn(){return[...yn()].slice(-1)[0]}function xn(){return yn().length>0}function Sn(e){let t=gn(bn()?.node);return gn(e)<t}function Cn(e){hn.push(e)}function wn(e){let t=gn(e);t<0||hn.splice(t,1)}function Tn(){for(let{node:e}of hn)e.style.pointerEvents=Sn(e)?`none`:`auto`}function En(e){if(xn()&&!mn){let t=Ne(e);pn=document.body.style.pointerEvents,t.body.style.pointerEvents=`none`,mn=!0}}function Dn(e){if(xn())return;let t=Ne(e);t.body.style.pointerEvents=pn,t.body.style.length===0&&t.body.removeAttribute(`style`),mn=!1}var G={layers:hn,isTopMostLayer:vn,hasPointerBlockingLayer:xn,isBelowPointerBlockingLayer:Sn,addLayer:Cn,removeLayer:wn,indexOf:gn,find:_n,assignPointerEventToLayers:Tn,disableBodyPointerEvents:En,restoreBodyPointerEvents:Dn};function On(t,n){let[r,i]=e.W(kn(n?.()));return e.B(()=>{i(t()?.tagName.toLowerCase()||kn(n?.()))}),r}function kn(e){return De(e)?e:void 0}un({},{Button:()=>Nn,Root:()=>Mn});var An=[`button`,`color`,`file`,`image`,`reset`,`submit`];function jn(e){let t=e.tagName.toLowerCase();return t===`button`?!0:t===`input`&&e.type?An.indexOf(e.type)!==-1:!1}function Mn(t){let n,r=H({type:`button`},t),[i,a]=e.Q(r,[`ref`,`type`,`disabled`]),o=On(()=>n,()=>`button`),s=e.V(()=>{let e=o();return e!=null&&jn({tagName:e,type:i.type})}),c=e.V(()=>o()===`input`),l=e.V(()=>o()===`a`&&n?.getAttribute(`href`)!=null);return e.L(U,e.J({as:`button`,ref(e){let t=R(e=>n=e,i.ref);typeof t==`function`&&t(e)},get type(){return s()||c()?i.type:void 0},get role(){return!s()&&!l()?`button`:void 0},get tabIndex(){return!s()&&!l()&&!i.disabled?0:void 0},get disabled(){return s()||c()?i.disabled:void 0},get"aria-disabled"(){return!s()&&!c()&&i.disabled?!0:void 0},get"data-disabled"(){return i.disabled?``:void 0}},a))}var Nn=Mn;function Pn(e){return t=>(e(t),()=>e(void 0))}function Fn(e={}){let[t,n]=Nt({value:()=>i(e.isSelected),defaultValue:()=>!!i(e.defaultIsSelected),onChange:t=>e.onSelectedChange?.(t)});return{isSelected:t,setIsSelected:t=>{!i(e.isReadOnly)&&!i(e.isDisabled)&&n(t)},toggle:()=>{!i(e.isReadOnly)&&!i(e.isDisabled)&&n(!t())}}}const In=[`top`,`right`,`bottom`,`left`],Ln=Math.min,K=Math.max,Rn=Math.round,zn=Math.floor,Bn=e=>({x:e,y:e}),Vn={left:`right`,right:`left`,bottom:`top`,top:`bottom`};function Hn(e,t,n){return K(e,Ln(t,n))}function Un(e,t){return typeof e==`function`?e(t):e}function Wn(e){return e.split(`-`)[0]}function Gn(e){return e.split(`-`)[1]}function Kn(e){return e===`x`?`y`:`x`}function qn(e){return e===`y`?`height`:`width`}function Jn(e){let t=e[0];return t===`t`||t===`b`?`y`:`x`}function Yn(e){return Kn(Jn(e))}function Xn(e,t,n){n===void 0&&(n=!1);let r=Gn(e),i=Yn(e),a=qn(i),o=i===`x`?r===(n?`end`:`start`)?`right`:`left`:r===`start`?`bottom`:`top`;return t.reference[a]>t.floating[a]&&(o=ar(o)),[o,ar(o)]}function Zn(e){let t=ar(e);return[Qn(e),t,Qn(t)]}function Qn(e){return e.includes(`start`)?e.replace(`start`,`end`):e.replace(`end`,`start`)}const $n=[`left`,`right`],er=[`right`,`left`],tr=[`top`,`bottom`],nr=[`bottom`,`top`];function rr(e,t,n){switch(e){case`top`:case`bottom`:return n?t?er:$n:t?$n:er;case`left`:case`right`:return t?tr:nr;default:return[]}}function ir(e,t,n,r){let i=Gn(e),a=rr(Wn(e),n===`start`,r);return i&&(a=a.map(e=>e+`-`+i),t&&(a=a.concat(a.map(Qn)))),a}function ar(e){let t=Wn(e);return Vn[t]+e.slice(t.length)}function or(e){return{top:0,right:0,bottom:0,left:0,...e}}function sr(e){return typeof e==`number`?{top:e,right:e,bottom:e,left:e}:or(e)}function cr(e){let{x:t,y:n,width:r,height:i}=e;return{width:r,height:i,top:n,left:t,right:t+r,bottom:n+i,x:t,y:n}}function lr(e,t,n){let{reference:r,floating:i}=e,a=Jn(t),o=Yn(t),s=qn(o),c=Wn(t),l=a===`y`,u=r.x+r.width/2-i.width/2,d=r.y+r.height/2-i.height/2,f=r[s]/2-i[s]/2,p;switch(c){case`top`:p={x:u,y:r.y-i.height};break;case`bottom`:p={x:u,y:r.y+r.height};break;case`right`:p={x:r.x+r.width,y:d};break;case`left`:p={x:r.x-i.width,y:d};break;default:p={x:r.x,y:r.y}}switch(Gn(t)){case`start`:p[o]-=f*(n&&l?-1:1);break;case`end`:p[o]+=f*(n&&l?-1:1)}return p}async function ur(e,t){t===void 0&&(t={});let{x:n,y:r,platform:i,rects:a,elements:o,strategy:s}=e,{boundary:c=`clippingAncestors`,rootBoundary:l=`viewport`,elementContext:u=`floating`,altBoundary:d=!1,padding:f=0}=Un(t,e),p=sr(f),m=o[d?u===`floating`?`reference`:`floating`:u],h=cr(await i.getClippingRect({element:await(i.isElement==null?void 0:i.isElement(m))??!0?m:m.contextElement||await(i.getDocumentElement==null?void 0:i.getDocumentElement(o.floating)),boundary:c,rootBoundary:l,strategy:s})),g=u===`floating`?{x:n,y:r,width:a.floating.width,height:a.floating.height}:a.reference,_=await(i.getOffsetParent==null?void 0:i.getOffsetParent(o.floating)),v=await(i.isElement==null?void 0:i.isElement(_))&&await(i.getScale==null?void 0:i.getScale(_))||{x:1,y:1},y=cr(i.convertOffsetParentRelativeRectToViewportRelativeRect?await i.convertOffsetParentRelativeRectToViewportRelativeRect({elements:o,rect:g,offsetParent:_,strategy:s}):g);return{top:(h.top-y.top+p.top)/v.y,bottom:(y.bottom-h.bottom+p.bottom)/v.y,left:(h.left-y.left+p.left)/v.x,right:(y.right-h.right+p.right)/v.x}}const dr=async(e,t,n)=>{let{placement:r=`bottom`,strategy:i=`absolute`,middleware:a=[],platform:o}=n,s=o.detectOverflow?o:{...o,detectOverflow:ur},c=await(o.isRTL==null?void 0:o.isRTL(t)),l=await o.getElementRects({reference:e,floating:t,strategy:i}),{x:u,y:d}=lr(l,r,c),f=r,p=0,m={};for(let n=0;n<a.length;n++){let h=a[n];if(!h)continue;let{name:g,fn:_}=h,{x:v,y,data:b,reset:x}=await _({x:u,y:d,initialPlacement:r,placement:f,strategy:i,middlewareData:m,rects:l,platform:s,elements:{reference:e,floating:t}});u=v??u,d=y??d,m[g]={...m[g],...b},x&&p<50&&(p++,typeof x==`object`&&(x.placement&&(f=x.placement),x.rects&&(l=x.rects===!0?await o.getElementRects({reference:e,floating:t,strategy:i}):x.rects),{x:u,y:d}=lr(l,f,c)),n=-1)}return{x:u,y:d,placement:f,strategy:i,middlewareData:m}},fr=e=>({name:`arrow`,options:e,async fn(t){let{x:n,y:r,placement:i,rects:a,platform:o,elements:s,middlewareData:c}=t,{element:l,padding:u=0}=Un(e,t)||{};if(l==null)return{};let d=sr(u),f={x:n,y:r},p=Yn(i),m=qn(p),h=await o.getDimensions(l),g=p===`y`,_=g?`top`:`left`,v=g?`bottom`:`right`,y=g?`clientHeight`:`clientWidth`,b=a.reference[m]+a.reference[p]-f[p]-a.floating[m],x=f[p]-a.reference[p],S=await(o.getOffsetParent==null?void 0:o.getOffsetParent(l)),C=S?S[y]:0;(!C||!await(o.isElement==null?void 0:o.isElement(S)))&&(C=s.floating[y]||a.floating[m]);let w=b/2-x/2,T=C/2-h[m]/2-1,E=Ln(d[_],T),D=Ln(d[v],T),O=E,k=C-h[m]-D,A=C/2-h[m]/2+w,j=Hn(O,A,k),M=!c.arrow&&Gn(i)!=null&&A!==j&&a.reference[m]/2-(A<O?E:D)-h[m]/2<0,N=M?A<O?A-O:A-k:0;return{[p]:f[p]+N,data:{[p]:j,centerOffset:A-j-N,...M&&{alignmentOffset:N}},reset:M}}}),pr=function(e){return e===void 0&&(e={}),{name:`flip`,options:e,async fn(t){var n;let{placement:r,middlewareData:i,rects:a,initialPlacement:o,platform:s,elements:c}=t,{mainAxis:l=!0,crossAxis:u=!0,fallbackPlacements:d,fallbackStrategy:f=`bestFit`,fallbackAxisSideDirection:p=`none`,flipAlignment:m=!0,...h}=Un(e,t);if((n=i.arrow)!=null&&n.alignmentOffset)return{};let g=Wn(r),_=Jn(o),v=Wn(o)===o,y=await(s.isRTL==null?void 0:s.isRTL(c.floating)),b=d||(v||!m?[ar(o)]:Zn(o)),x=p!==`none`;!d&&x&&b.push(...ir(o,m,p,y));let S=[o,...b],C=await s.detectOverflow(t,h),w=[],T=i.flip?.overflows||[];if(l&&w.push(C[g]),u){let e=Xn(r,a,y);w.push(C[e[0]],C[e[1]])}if(T=[...T,{placement:r,overflows:w}],!w.every(e=>e<=0)){let e=(i.flip?.index||0)+1,t=S[e];if(t&&(u!==`alignment`||_===Jn(t)||T.every(e=>Jn(e.placement)!==_||e.overflows[0]>0)))return{data:{index:e,overflows:T},reset:{placement:t}};let n=T.filter(e=>e.overflows[0]<=0).sort((e,t)=>e.overflows[1]-t.overflows[1])[0]?.placement;if(!n)switch(f){case`bestFit`:{let e=T.filter(e=>{if(x){let t=Jn(e.placement);return t===_||t===`y`}return!0}).map(e=>[e.placement,e.overflows.filter(e=>e>0).reduce((e,t)=>e+t,0)]).sort((e,t)=>e[1]-t[1])[0]?.[0];e&&(n=e);break}case`initialPlacement`:n=o}if(r!==n)return{reset:{placement:n}}}return{}}}};function mr(e,t){return{top:e.top-t.height,right:e.right-t.width,bottom:e.bottom-t.height,left:e.left-t.width}}function hr(e){return In.some(t=>e[t]>=0)}const gr=function(e){return e===void 0&&(e={}),{name:`hide`,options:e,async fn(t){let{rects:n,platform:r}=t,{strategy:i=`referenceHidden`,...a}=Un(e,t);switch(i){case`referenceHidden`:{let e=mr(await r.detectOverflow(t,{...a,elementContext:`reference`}),n.reference);return{data:{referenceHiddenOffsets:e,referenceHidden:hr(e)}}}case`escaped`:{let e=mr(await r.detectOverflow(t,{...a,altBoundary:!0}),n.floating);return{data:{escapedOffsets:e,escaped:hr(e)}}}default:return{}}}}},_r=/*#__PURE__*/ new Set([`left`,`top`]);async function vr(e,t){let{placement:n,platform:r,elements:i}=e,a=await(r.isRTL==null?void 0:r.isRTL(i.floating)),o=Wn(n),s=Gn(n),c=Jn(n)===`y`,l=_r.has(o)?-1:1,u=a&&c?-1:1,d=Un(t,e),{mainAxis:f,crossAxis:p,alignmentAxis:m}=typeof d==`number`?{mainAxis:d,crossAxis:0,alignmentAxis:null}:{mainAxis:d.mainAxis||0,crossAxis:d.crossAxis||0,alignmentAxis:d.alignmentAxis};return s&&typeof m==`number`&&(p=s===`end`?m*-1:m),c?{x:p*u,y:f*l}:{x:f*l,y:p*u}}const yr=function(e){return e===void 0&&(e=0),{name:`offset`,options:e,async fn(t){var n;let{x:r,y:i,placement:a,middlewareData:o}=t,s=await vr(t,e);return a===o.offset?.placement&&(n=o.arrow)!=null&&n.alignmentOffset?{}:{x:r+s.x,y:i+s.y,data:{...s,placement:a}}}}},br=function(e){return e===void 0&&(e={}),{name:`shift`,options:e,async fn(t){let{x:n,y:r,placement:i,platform:a}=t,{mainAxis:o=!0,crossAxis:s=!1,limiter:c={fn:e=>{let{x:t,y:n}=e;return{x:t,y:n}}},...l}=Un(e,t),u={x:n,y:r},d=await a.detectOverflow(t,l),f=Jn(Wn(i)),p=Kn(f),m=u[p],h=u[f];if(o){let e=p===`y`?`top`:`left`,t=p===`y`?`bottom`:`right`,n=m+d[e],r=m-d[t];m=Hn(n,m,r)}if(s){let e=f===`y`?`top`:`left`,t=f===`y`?`bottom`:`right`,n=h+d[e],r=h-d[t];h=Hn(n,h,r)}let g=c.fn({...t,[p]:m,[f]:h});return{...g,data:{x:g.x-n,y:g.y-r,enabled:{[p]:o,[f]:s}}}}}},xr=function(e){return e===void 0&&(e={}),{name:`size`,options:e,async fn(t){var n,r;let{placement:i,rects:a,platform:o,elements:s}=t,{apply:c=()=>{},...l}=Un(e,t),u=await o.detectOverflow(t,l),d=Wn(i),f=Gn(i),p=Jn(i)===`y`,{width:m,height:h}=a.floating,g,_;d===`top`||d===`bottom`?(g=d,_=f===(await(o.isRTL==null?void 0:o.isRTL(s.floating))?`start`:`end`)?`left`:`right`):(_=d,g=f===`end`?`top`:`bottom`);let v=h-u.top-u.bottom,y=m-u.left-u.right,b=Ln(h-u[g],v),x=Ln(m-u[_],y),S=!t.middlewareData.shift,C=b,w=x;if((n=t.middlewareData.shift)!=null&&n.enabled.x&&(w=y),(r=t.middlewareData.shift)!=null&&r.enabled.y&&(C=v),S&&!f){let e=K(u.left,0),t=K(u.right,0),n=K(u.top,0),r=K(u.bottom,0);p?w=m-2*(e!==0||t!==0?e+t:K(u.left,u.right)):C=h-2*(n!==0||r!==0?n+r:K(u.top,u.bottom))}await c({...t,availableWidth:w,availableHeight:C});let T=await o.getDimensions(s.floating);return m!==T.width||h!==T.height?{reset:{rects:!0}}:{}}}};function Sr(){return typeof window<`u`}function Cr(e){return Tr(e)?(e.nodeName||``).toLowerCase():`#document`}function q(e){var t;return(e==null||(t=e.ownerDocument)==null?void 0:t.defaultView)||window}function wr(e){return((Tr(e)?e.ownerDocument:e.document)||window.document)?.documentElement}function Tr(e){return Sr()?e instanceof Node||e instanceof q(e).Node:!1}function Er(e){return Sr()?e instanceof Element||e instanceof q(e).Element:!1}function Dr(e){return Sr()?e instanceof HTMLElement||e instanceof q(e).HTMLElement:!1}function Or(e){return!Sr()||typeof ShadowRoot>`u`?!1:e instanceof ShadowRoot||e instanceof q(e).ShadowRoot}function kr(e){let{overflow:t,overflowX:n,overflowY:r,display:i}=Br(e);return/auto|scroll|overlay|hidden|clip/.test(t+r+n)&&i!==`inline`&&i!==`contents`}function Ar(e){return/^(table|td|th)$/.test(Cr(e))}function jr(e){try{if(e.matches(`:popover-open`))return!0}catch{}try{return e.matches(`:modal`)}catch{return!1}}const Mr=/transform|translate|scale|rotate|perspective|filter/,Nr=/paint|layout|strict|content/,Pr=e=>!!e&&e!==`none`;let Fr;function Ir(e){let t=Er(e)?Br(e):e;return Pr(t.transform)||Pr(t.translate)||Pr(t.scale)||Pr(t.rotate)||Pr(t.perspective)||!Rr()&&(Pr(t.backdropFilter)||Pr(t.filter))||Mr.test(t.willChange||``)||Nr.test(t.contain||``)}function Lr(e){let t=Hr(e);for(;Dr(t)&&!zr(t);){if(Ir(t))return t;if(jr(t))return null;t=Hr(t)}return null}function Rr(){return Fr??=typeof CSS<`u`&&CSS.supports&&CSS.supports(`-webkit-backdrop-filter`,`none`),Fr}function zr(e){return/^(html|body|#document)$/.test(Cr(e))}function Br(e){return q(e).getComputedStyle(e)}function Vr(e){return Er(e)?{scrollLeft:e.scrollLeft,scrollTop:e.scrollTop}:{scrollLeft:e.scrollX,scrollTop:e.scrollY}}function Hr(e){if(Cr(e)===`html`)return e;let t=e.assignedSlot||e.parentNode||Or(e)&&e.host||wr(e);return Or(t)?t.host:t}function Ur(e){let t=Hr(e);return zr(t)?e.ownerDocument?e.ownerDocument.body:e.body:Dr(t)&&kr(t)?t:Ur(t)}function Wr(e,t,n){t===void 0&&(t=[]),n===void 0&&(n=!0);let r=Ur(e),i=r===e.ownerDocument?.body,a=q(r);if(i){let e=Gr(a);return t.concat(a,a.visualViewport||[],kr(r)?r:[],e&&n?Wr(e):[])}return t.concat(r,Wr(r,[],n))}function Gr(e){return e.parent&&Object.getPrototypeOf(e.parent)?e.frameElement:null}function Kr(e){let t=Br(e),n=parseFloat(t.width)||0,r=parseFloat(t.height)||0,i=Dr(e),a=i?e.offsetWidth:n,o=i?e.offsetHeight:r,s=Rn(n)!==a||Rn(r)!==o;return s&&(n=a,r=o),{width:n,height:r,$:s}}function qr(e){return Er(e)?e:e.contextElement}function Jr(e){let t=qr(e);if(!Dr(t))return Bn(1);let n=t.getBoundingClientRect(),{width:r,height:i,$:a}=Kr(t),o=(a?Rn(n.width):n.width)/r,s=(a?Rn(n.height):n.height)/i;return(!o||!Number.isFinite(o))&&(o=1),(!s||!Number.isFinite(s))&&(s=1),{x:o,y:s}}const Yr=/*#__PURE__*/ Bn(0);function Xr(e){let t=q(e);return!Rr()||!t.visualViewport?Yr:{x:t.visualViewport.offsetLeft,y:t.visualViewport.offsetTop}}function Zr(e,t,n){return t===void 0&&(t=!1),!n||t&&n!==q(e)?!1:t}function Qr(e,t,n,r){t===void 0&&(t=!1),n===void 0&&(n=!1);let i=e.getBoundingClientRect(),a=qr(e),o=Bn(1);t&&(r?Er(r)&&(o=Jr(r)):o=Jr(e));let s=Zr(a,n,r)?Xr(a):Bn(0),c=(i.left+s.x)/o.x,l=(i.top+s.y)/o.y,u=i.width/o.x,d=i.height/o.y;if(a){let e=q(a),t=r&&Er(r)?q(r):r,n=e,i=Gr(n);for(;i&&r&&t!==n;){let e=Jr(i),t=i.getBoundingClientRect(),r=Br(i),a=t.left+(i.clientLeft+parseFloat(r.paddingLeft))*e.x,o=t.top+(i.clientTop+parseFloat(r.paddingTop))*e.y;c*=e.x,l*=e.y,u*=e.x,d*=e.y,c+=a,l+=o,n=q(i),i=Gr(n)}}return cr({width:u,height:d,x:c,y:l})}function $r(e,t){let n=Vr(e).scrollLeft;return t?t.left+n:Qr(wr(e)).left+n}function ei(e,t){let n=e.getBoundingClientRect();return{x:n.left+t.scrollLeft-$r(e,n),y:n.top+t.scrollTop}}function ti(e){let{elements:t,rect:n,offsetParent:r,strategy:i}=e,a=i===`fixed`,o=wr(r),s=t?jr(t.floating):!1;if(r===o||s&&a)return n;let c={scrollLeft:0,scrollTop:0},l=Bn(1),u=Bn(0),d=Dr(r);if((d||!d&&!a)&&((Cr(r)!==`body`||kr(o))&&(c=Vr(r)),d)){let e=Qr(r);l=Jr(r),u.x=e.x+r.clientLeft,u.y=e.y+r.clientTop}let f=o&&!d&&!a?ei(o,c):Bn(0);return{width:n.width*l.x,height:n.height*l.y,x:n.x*l.x-c.scrollLeft*l.x+u.x+f.x,y:n.y*l.y-c.scrollTop*l.y+u.y+f.y}}function ni(e){return Array.from(e.getClientRects())}function ri(e){let t=wr(e),n=Vr(e),r=e.ownerDocument.body,i=K(t.scrollWidth,t.clientWidth,r.scrollWidth,r.clientWidth),a=K(t.scrollHeight,t.clientHeight,r.scrollHeight,r.clientHeight),o=-n.scrollLeft+$r(e),s=-n.scrollTop;return Br(r).direction===`rtl`&&(o+=K(t.clientWidth,r.clientWidth)-i),{width:i,height:a,x:o,y:s}}function ii(e,t){let n=q(e),r=wr(e),i=n.visualViewport,a=r.clientWidth,o=r.clientHeight,s=0,c=0;if(i){a=i.width,o=i.height;let e=Rr();(!e||e&&t===`fixed`)&&(s=i.offsetLeft,c=i.offsetTop)}let l=$r(r);if(l<=0){let e=r.ownerDocument,t=e.body,n=getComputedStyle(t),i=e.compatMode===`CSS1Compat`&&parseFloat(n.marginLeft)+parseFloat(n.marginRight)||0,o=Math.abs(r.clientWidth-t.clientWidth-i);o<=25&&(a-=o)}else l<=25&&(a+=l);return{width:a,height:o,x:s,y:c}}function ai(e,t){let n=Qr(e,!0,t===`fixed`),r=n.top+e.clientTop,i=n.left+e.clientLeft,a=Dr(e)?Jr(e):Bn(1);return{width:e.clientWidth*a.x,height:e.clientHeight*a.y,x:i*a.x,y:r*a.y}}function oi(e,t,n){let r;if(t===`viewport`)r=ii(e,n);else if(t===`document`)r=ri(wr(e));else if(Er(t))r=ai(t,n);else{let n=Xr(e);r={x:t.x-n.x,y:t.y-n.y,width:t.width,height:t.height}}return cr(r)}function si(e,t){let n=Hr(e);return n===t||!Er(n)||zr(n)?!1:Br(n).position===`fixed`||si(n,t)}function ci(e,t){let n=t.get(e);if(n)return n;let r=Wr(e,[],!1).filter(e=>Er(e)&&Cr(e)!==`body`),i=null,a=Br(e).position===`fixed`,o=a?Hr(e):e;for(;Er(o)&&!zr(o);){let t=Br(o),n=Ir(o);!n&&t.position===`fixed`&&(i=null),(a?!n&&!i:!n&&t.position===`static`&&i&&(i.position===`absolute`||i.position===`fixed`)||kr(o)&&!n&&si(e,o))?r=r.filter(e=>e!==o):i=t,o=Hr(o)}return t.set(e,r),r}function li(e){let{element:t,boundary:n,rootBoundary:r,strategy:i}=e,a=[...n===`clippingAncestors`?jr(t)?[]:ci(t,this._c):[].concat(n),r],o=oi(t,a[0],i),s=o.top,c=o.right,l=o.bottom,u=o.left;for(let e=1;e<a.length;e++){let n=oi(t,a[e],i);s=K(n.top,s),c=Ln(n.right,c),l=Ln(n.bottom,l),u=K(n.left,u)}return{width:c-u,height:l-s,x:u,y:s}}function ui(e){let{width:t,height:n}=Kr(e);return{width:t,height:n}}function di(e,t,n){let r=Dr(t),i=wr(t),a=n===`fixed`,o=Qr(e,!0,a,t),s={scrollLeft:0,scrollTop:0},c=Bn(0);function l(){c.x=$r(i)}if(r||!r&&!a){if((Cr(t)!==`body`||kr(i))&&(s=Vr(t)),r){let e=Qr(t,!0,a,t);c.x=e.x+t.clientLeft,c.y=e.y+t.clientTop}else i&&l()}a&&!r&&i&&l();let u=i&&!r&&!a?ei(i,s):Bn(0);return{x:o.left+s.scrollLeft-c.x-u.x,y:o.top+s.scrollTop-c.y-u.y,width:o.width,height:o.height}}function fi(e){return Br(e).position===`static`}function pi(e,t){if(!Dr(e)||Br(e).position===`fixed`)return null;if(t)return t(e);let n=e.offsetParent;return wr(e)===n&&(n=n.ownerDocument.body),n}function mi(e,t){let n=q(e);if(jr(e))return n;if(!Dr(e)){let t=Hr(e);for(;t&&!zr(t);){if(Er(t)&&!fi(t))return t;t=Hr(t)}return n}let r=pi(e,t);for(;r&&Ar(r)&&fi(r);)r=pi(r,t);return r&&zr(r)&&fi(r)&&!Ir(r)?n:r||Lr(e)||n}const hi=async function(e){let t=this.getOffsetParent||mi,n=this.getDimensions,r=await n(e.floating);return{reference:di(e.reference,await t(e.floating),e.strategy),floating:{x:0,y:0,width:r.width,height:r.height}}};function gi(e){return Br(e).direction===`rtl`}const _i={convertOffsetParentRelativeRectToViewportRelativeRect:ti,getDocumentElement:wr,getClippingRect:li,getOffsetParent:mi,getElementRects:hi,getClientRects:ni,getDimensions:ui,getScale:Jr,isElement:Er,isRTL:gi};function vi(e,t){return e.x===t.x&&e.y===t.y&&e.width===t.width&&e.height===t.height}function yi(e,t){let n=null,r,i=wr(e);function a(){var e;clearTimeout(r),(e=n)==null||e.disconnect(),n=null}function o(s,c){s===void 0&&(s=!1),c===void 0&&(c=1),a();let l=e.getBoundingClientRect(),{left:u,top:d,width:f,height:p}=l;if(s||t(),!f||!p)return;let m=zn(d),h=zn(i.clientWidth-(u+f)),g=zn(i.clientHeight-(d+p)),_=zn(u),v={rootMargin:-m+`px `+-h+`px `+-g+`px `+-_+`px`,threshold:K(0,Ln(1,c))||1},y=!0;function b(t){let n=t[0].intersectionRatio;if(n!==c){if(!y)return o();n?o(!1,n):r=setTimeout(()=>{o(!1,1e-7)},1e3)}n===1&&!vi(l,e.getBoundingClientRect())&&o(),y=!1}try{n=new IntersectionObserver(b,{...v,root:i.ownerDocument})}catch{n=new IntersectionObserver(b,v)}n.observe(e)}return o(!0),a}function bi(e,t,n,r){r===void 0&&(r={});let{ancestorScroll:i=!0,ancestorResize:a=!0,elementResize:o=typeof ResizeObserver==`function`,layoutShift:s=typeof IntersectionObserver==`function`,animationFrame:c=!1}=r,l=qr(e),u=i||a?[...l?Wr(l):[],...t?Wr(t):[]]:[];u.forEach(e=>{i&&e.addEventListener(`scroll`,n,{passive:!0}),a&&e.addEventListener(`resize`,n)});let d=l&&s?yi(l,n):null,f=-1,p=null;o&&(p=new ResizeObserver(e=>{let[r]=e;r&&r.target===l&&p&&t&&(p.unobserve(t),cancelAnimationFrame(f),f=requestAnimationFrame(()=>{var e;(e=p)==null||e.observe(t)})),n()}),l&&!c&&p.observe(l),t&&p.observe(t));let m,h=c?Qr(e):null;c&&g();function g(){let t=Qr(e);h&&!vi(h,t)&&n(),h=t,m=requestAnimationFrame(g)}return n(),()=>{var e;u.forEach(e=>{i&&e.removeEventListener(`scroll`,n),a&&e.removeEventListener(`resize`,n)}),d?.(),(e=p)==null||e.disconnect(),p=null,c&&cancelAnimationFrame(m)}}const xi=yr,Si=br,Ci=pr,wi=xr,Ti=gr,Ei=fr,Di=(e,t,n)=>{let r=/* @__PURE__ */ new Map,i={platform:_i,...n},a={...i.platform,_c:r};return dr(e,t,{...i,platform:a})};var Oi=e.z();function ki(){let t=e.et(Oi);if(t===void 0)throw Error("[kobalte]: `usePopperContext` must be used within a `Popper` component");return t}var Ai=/* @__PURE__ */ e.O(`<svg display="block" viewBox="0 0 30 30" style="transform:scale(1.02)"><g><path fill="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z"></path><path stroke="none" d="M23,27.8c1.1,1.2,3.4,2.2,5,2.2h2H0h2c1.7,0,3.9-1,5-2.2l6.6-7.2c0.7-0.8,2-0.8,2.7,0L23,27.8L23,27.8z">`),ji=30,Mi=ji/2,Ni={top:180,right:-90,bottom:0,left:90};function Pi(t){let n=ki(),r=H({size:ji},t),[i,a]=e.Q(r,[`ref`,`style`,`size`]),o=()=>n.currentPlacement().split(`-`)[0],s=Fi(n.contentRef),c=()=>s()?.getPropertyValue(`background-color`)||`none`,l=()=>s()?.getPropertyValue(`border-${o()}-color`)||`none`,u=()=>s()?.getPropertyValue(`border-${o()}-width`)||`0px`,d=()=>Number.parseInt(u())*2*(ji/i.size),f=()=>`rotate(${Ni[o()]} ${Mi} ${Mi}) translate(0 2)`;return e.L(U,e.J({as:`div`,ref(e){let t=R(n.setArrowRef,i.ref);typeof t==`function`&&t(e)},"aria-hidden":`true`,get style(){return Ce({position:`absolute`,"font-size":`${i.size}px`,width:`1em`,height:`1em`,"pointer-events":`none`,fill:c(),stroke:l(),"stroke-width":d()},i.style)}},a,{get children(){let t=Ai(),n=t.firstChild;return e.H(()=>e.T(n,`transform`,f())),t}}))}function Fi(t){let[n,r]=e.W();return e.B(()=>{let e=t();e&&r(Me(e).getComputedStyle(e))}),n}function Ii(t){let n=ki(),[r,i]=e.Q(t,[`ref`,`style`]);return e.L(U,e.J({as:`div`,ref(e){let t=R(n.setPositionerRef,r.ref);typeof t==`function`&&t(e)},"data-popper-positioner":``,get style(){return Ce({position:`absolute`,top:0,left:0,"min-width":`max-content`},r.style)}},i))}function Li(e){let{x:t=0,y:n=0,width:r=0,height:i=0}=e??{};if(typeof DOMRect==`function`)return new DOMRect(t,n,r,i);let a={x:t,y:n,width:r,height:i,top:n,right:t+r,bottom:n+i,left:t};return{...a,toJSON:()=>a}}function Ri(e,t){return{contextElement:e,getBoundingClientRect:()=>{let n=t(e);return n?Li(n):e?e.getBoundingClientRect():Li()}}}function zi(e){return/^(?:top|bottom|left|right)(?:-(?:start|end))?$/.test(e)}var Bi={top:`bottom`,right:`left`,bottom:`top`,left:`right`};function Vi(e,t){let[n,r]=e.split(`-`),i=Bi[n];return r?n===`left`||n===`right`?`${i} ${r===`start`?`top`:`bottom`}`:r===`start`?`${i} ${t===`rtl`?`right`:`left`}`:`${i} ${t===`rtl`?`left`:`right`}`:`${i} center`}function Hi(t){let n=H({getAnchorRect:e=>e?.getBoundingClientRect(),placement:`bottom`,gutter:0,shift:0,flip:!0,slide:!0,overlap:!1,sameWidth:!1,fitViewport:!1,hideWhenDetached:!1,detachedPadding:0,arrowPadding:4,overflowPadding:8},t),[r,i]=e.W(),[a,o]=e.W(),[s,c]=e.W(n.placement),l=()=>Ri(n.anchorRef?.(),n.getAnchorRect),{direction:u}=kt();async function d(){let e=l(),t=r(),i=a();if(!e||!t)return;let o=(i?.clientHeight||0)/2,s=typeof n.gutter==`number`?n.gutter+o:n.gutter??o;t.style.setProperty(`--kb-popper-content-overflow-padding`,`${n.overflowPadding}px`),e.getBoundingClientRect();let d=[xi(({placement:e})=>{let t=!!e.split(`-`)[1];return{mainAxis:s,crossAxis:t?void 0:n.shift,alignmentAxis:n.shift}})];if(n.flip!==!1){let e=typeof n.flip==`string`?n.flip.split(` `):void 0;if(e!==void 0&&!e.every(zi))throw Error("`flip` expects a spaced-delimited list of placements");d.push(Ci({padding:n.overflowPadding,fallbackPlacements:e}))}(n.slide||n.overlap)&&d.push(Si({mainAxis:n.slide,crossAxis:n.overlap,padding:n.overflowPadding})),d.push(wi({padding:n.overflowPadding,apply({availableWidth:e,availableHeight:r,rects:i}){let a=Math.round(i.reference.width);e=Math.floor(e),r=Math.floor(r),t.style.setProperty(`--kb-popper-anchor-width`,`${a}px`),t.style.setProperty(`--kb-popper-content-available-width`,`${e}px`),t.style.setProperty(`--kb-popper-content-available-height`,`${r}px`),n.sameWidth&&(t.style.width=`${a}px`),n.fitViewport&&(t.style.maxWidth=`${e}px`,t.style.maxHeight=`${r}px`)}})),n.hideWhenDetached&&d.push(Ti({padding:n.detachedPadding})),i&&d.push(Ei({element:i,padding:n.arrowPadding}));let f=await Di(e,t,{placement:n.placement,strategy:`absolute`,middleware:d,platform:{..._i,isRTL:()=>u()===`rtl`}});if(c(f.placement),n.onCurrentPlacementChange?.(f.placement),!t)return;t.style.setProperty(`--kb-popper-content-transform-origin`,Vi(f.placement,u()));let p=Math.round(f.x),m=Math.round(f.y),h;if(n.hideWhenDetached&&(h=f.middlewareData.hide?.referenceHidden?`hidden`:`visible`),Object.assign(t.style,{top:`0`,left:`0`,transform:`translate3d(${p}px, ${m}px, 0)`,visibility:h}),i&&f.middlewareData.arrow){let{x:e,y:t}=f.middlewareData.arrow,n=f.placement.split(`-`)[0];Object.assign(i.style,{left:e==null?``:`${e}px`,top:t==null?``:`${t}px`,[n]:`100%`})}}e.B(()=>{let t=l(),n=r();if(!t||!n)return;let i=bi(t,n,d,{elementResize:typeof ResizeObserver==`function`});e.X(i)}),e.B(()=>{let e=r(),t=n.contentRef?.();e&&t&&queueMicrotask(()=>{e.style.zIndex=getComputedStyle(t).zIndex})});let f={currentPlacement:s,contentRef:()=>n.contentRef?.(),setPositionerRef:i,setArrowRef:o};return e.L(Oi.Provider,{value:f,get children(){return n.children}})}var Ui=Object.assign(Hi,{Arrow:Pi,Context:Oi,usePopperContext:ki,Positioner:Ii});function Wi(t){let n=e=>{e.key===Fe.Escape&&t.onEscapeKeyDown?.(e)};e.B(()=>{if(i(t.isDisabled))return;let r=t.ownerDocument?.()??Ne();r.addEventListener(`keydown`,n),e.X(()=>{r.removeEventListener(`keydown`,n)})})}function Gi(e){let t=(typeof e.composedPath==`function`?e.composedPath():void 0)?.[0]??e.target;return t instanceof Element?t:null}function Ki(e,t){if(!e)return!1;let n=t;for(;n;){if(Ae(e,n))return!0;let t=n.getRootNode();n=t instanceof ShadowRoot?t.host:null}return!1}function qi(e,t){let n=e;for(;n;){let e=n.closest(t);if(e)return e;let r=n.getRootNode();n=r instanceof ShadowRoot?r.host:null}return null}var Ji=`interactOutside.pointerDownOutside`,Yi=`interactOutside.focusOutside`;function Xi(t,n){let r,a=ct,o=()=>Ne(n()),s=e=>t.onPointerDownOutside?.(e),c=e=>t.onFocusOutside?.(e),l=e=>t.onInteractOutside?.(e),u=e=>{let r=Gi(e);return!r||qi(r,`[data-kb-top-layer]`)||!Ki(o(),r)||Ki(n(),r)?!1:!t.shouldExcludeElement?.(r)},d=e=>{function t(){let t=n(),r=Gi(e);if(!t||!r||!u(e))return;let i=B([s,l]);r.addEventListener(Ji,i,{once:!0});let a=new CustomEvent(Ji,{bubbles:!1,cancelable:!0,detail:{originalEvent:e,isContextMenu:e.button===2||He(e)&&e.button===0}});r.dispatchEvent(a)}e.pointerType===`touch`?(o().removeEventListener(`click`,t),a=t,o().addEventListener(`click`,t,{once:!0})):t()},f=e=>{let t=n(),r=Gi(e);if(!t||!r||!u(e))return;let i=B([c,l]);r.addEventListener(Yi,i,{once:!0});let a=new CustomEvent(Yi,{bubbles:!1,cancelable:!0,detail:{originalEvent:e,isContextMenu:!1}});r.dispatchEvent(a)};e.B(()=>{i(t.isDisabled)||(r=window.setTimeout(()=>{o().addEventListener(`pointerdown`,d,!0)},0),o().addEventListener(`focusin`,f,!0),e.X(()=>{window.clearTimeout(r),o().removeEventListener(`click`,a),o().removeEventListener(`pointerdown`,d,!0),o().removeEventListener(`focusin`,f,!0)}))})}var Zi=e.z();function Qi(){return e.et(Zi)}function $i(t){let n,r=Qi(),[i,a]=e.Q(t,[`ref`,`disableOutsidePointerEvents`,`excludedElements`,`onEscapeKeyDown`,`onPointerDownOutside`,`onFocusOutside`,`onInteractOutside`,`onDismiss`,`bypassTopMostLayerCheck`]),o=/* @__PURE__ */ new Set([]),s=e=>{o.add(e);let t=r?.registerNestedLayer(e);return()=>{o.delete(e),t?.()}};Xi({shouldExcludeElement:e=>n?i.excludedElements?.some(t=>Ae(t(),e))||[...o].some(t=>Ae(t,e)):!1,onPointerDownOutside:e=>{n&&!G.isBelowPointerBlockingLayer(n)&&(i.bypassTopMostLayerCheck||G.isTopMostLayer(n))&&(i.onPointerDownOutside?.(e),i.onInteractOutside?.(e),e.defaultPrevented||i.onDismiss?.())},onFocusOutside:e=>{i.onFocusOutside?.(e),i.onInteractOutside?.(e),e.defaultPrevented||i.onDismiss?.()}},()=>n),Wi({ownerDocument:()=>Ne(n),onEscapeKeyDown:e=>{n&&G.isTopMostLayer(n)&&(i.onEscapeKeyDown?.(e),!e.defaultPrevented&&i.onDismiss&&(e.preventDefault(),i.onDismiss()))}}),e.Z(()=>{if(!n)return;G.addLayer({node:n,isPointerBlocking:i.disableOutsidePointerEvents,dismiss:i.onDismiss});let t=r?.registerNestedLayer(n);G.assignPointerEventToLayers(),G.disableBodyPointerEvents(n),e.X(()=>{n&&(G.removeLayer(n),t?.(),G.assignPointerEventToLayers(),G.restoreBodyPointerEvents(n))})}),e.B(e.Y([()=>n,()=>i.disableOutsidePointerEvents],([t,n])=>{if(!t)return;let r=G.find(t);r&&r.isPointerBlocking!==n&&(r.isPointerBlocking=n,G.assignPointerEventToLayers()),n&&G.disableBodyPointerEvents(t),e.X(()=>{G.restoreBodyPointerEvents(t)})},{defer:!0}));let c={registerNestedLayer:s};return e.L(Zi.Provider,{value:c,get children(){return e.L(U,e.J({as:`div`,ref(e){let t=R(e=>n=e,i.ref);typeof t==`function`&&t(e)}},a))}})}function ea(e={}){let[t,n]=Nt({value:()=>i(e.open),defaultValue:()=>!!i(e.defaultOpen),onChange:t=>e.onOpenChange?.(t)}),r=()=>{n(!0)},a=()=>{n(!1)};return{isOpen:t,setIsOpen:n,open:r,close:a,toggle:()=>{t()?a():r()}}}var ta=[`id`,`name`,`validationState`,`required`,`disabled`,`readOnly`];function na(t){let n=H({id:`form-control-${e.G()}`},t),[r,a]=e.W(),[o,s]=e.W(),[c,l]=e.W(),[u,d]=e.W();return{formControlContext:{name:()=>i(n.name)??i(n.id),dataset:e.V(()=>({"data-valid":i(n.validationState)===`valid`?``:void 0,"data-invalid":i(n.validationState)===`invalid`?``:void 0,"data-required":i(n.required)?``:void 0,"data-disabled":i(n.disabled)?``:void 0,"data-readonly":i(n.readOnly)?``:void 0})),validationState:()=>i(n.validationState),isRequired:()=>i(n.required),isDisabled:()=>i(n.disabled),isReadOnly:()=>i(n.readOnly),labelId:r,fieldId:o,descriptionId:c,errorMessageId:u,getAriaLabelledBy:(e,t,n)=>{let i=n!=null||r()!=null;return[n,r(),i&&t!=null?e:void 0].filter(Boolean).join(` `)||void 0},getAriaDescribedBy:e=>[c(),u(),e].filter(Boolean).join(` `)||void 0,generateId:ke(()=>i(n.id)),registerLabel:Pn(a),registerField:Pn(s),registerDescription:Pn(l),registerErrorMessage:Pn(d)}}}var ra=e.z();function ia(){let t=e.et(ra);if(t===void 0)throw Error("[kobalte]: `useFormControlContext` must be used within a `FormControlContext.Provider` component");return t}function aa(t){let n=ia(),r=H({id:n.generateId(`description`)},t);return e.B(()=>e.X(n.registerDescription(r.id))),e.L(U,e.J({as:`div`},()=>n.dataset(),r))}var oa=class{collection;ref;collator;constructor(e,t,n){this.collection=e,this.ref=t,this.collator=n}getKeyBelow(e){let t=this.collection().getKeyAfter(e);for(;t!=null;){let e=this.collection().getItem(t);if(e&&e.type===`item`&&!e.disabled)return t;t=this.collection().getKeyAfter(t)}}getKeyAbove(e){let t=this.collection().getKeyBefore(e);for(;t!=null;){let e=this.collection().getItem(t);if(e&&e.type===`item`&&!e.disabled)return t;t=this.collection().getKeyBefore(t)}}getFirstKey(){let e=this.collection().getFirstKey();for(;e!=null;){let t=this.collection().getItem(e);if(t&&t.type===`item`&&!t.disabled)return e;e=this.collection().getKeyAfter(e)}}getLastKey(){let e=this.collection().getLastKey();for(;e!=null;){let t=this.collection().getItem(e);if(t&&t.type===`item`&&!t.disabled)return e;e=this.collection().getKeyBefore(e)}}getItem(e){return this.ref?.()?.querySelector(`[data-key="${e}"]`)??null}getKeyPageAbove(e){let t=this.ref?.(),n=this.getItem(e);if(!t||!n)return;let r=Math.max(0,n.offsetTop+n.offsetHeight-t.offsetHeight),i=e;for(;i&&n&&n.offsetTop>r;)i=this.getKeyAbove(i),n=i==null?null:this.getItem(i);return i}getKeyPageBelow(e){let t=this.ref?.(),n=this.getItem(e);if(!t||!n)return;let r=Math.min(t.scrollHeight,n.offsetTop-n.offsetHeight+t.offsetHeight),i=e;for(;i&&n&&n.offsetTop<r;)i=this.getKeyBelow(i),n=i==null?null:this.getItem(i);return i}getKeyForSearch(e,t){let n=this.collator?.();if(!n)return;let r=t==null?this.getFirstKey():this.getKeyBelow(t);for(;r!=null;){let t=this.collection().getItem(r);if(t){let i=t.textValue.slice(0,e.length);if(t.textValue&&n.compare(i,e)===0)return r}r=this.getKeyBelow(r)}}};function sa(t,n,r){let a=jt({usage:`search`,sensitivity:`base`});return Gt({selectionManager:()=>i(t.selectionManager),keyboardDelegate:e.V(()=>i(t.keyboardDelegate)||new oa(t.collection,n,a)),autoFocus:()=>i(t.autoFocus),deferAutoFocus:()=>i(t.deferAutoFocus),shouldFocusWrap:()=>i(t.shouldFocusWrap),disallowEmptySelection:()=>i(t.disallowEmptySelection),selectOnFocus:()=>i(t.selectOnFocus),disallowTypeAhead:()=>i(t.disallowTypeAhead),shouldUseVirtualFocus:()=>i(t.shouldUseVirtualFocus),allowsTabNavigation:()=>i(t.allowsTabNavigation),isVirtualized:()=>i(t.isVirtualized),scrollToKey:e=>i(t.scrollToKey)?.(e),orientation:()=>i(t.orientation)},n,r)}var ca=`focusScope.autoFocusOnMount`,la=`focusScope.autoFocusOnUnmount`,ua={bubbles:!1,cancelable:!0},da={stack:[],active(){return this.stack[0]},add(e){e!==this.active()&&this.active()?.pause(),this.stack=Te(this.stack,e),this.stack.unshift(e)},remove(e){this.stack=Te(this.stack,e),this.active()?.resume()}};function fa(t,n){let[r,a]=e.W(!1),o={pause(){a(!0)},resume(){a(!1)}},s=null,c=e=>t.onMountAutoFocus?.(e),l=e=>t.onUnmountAutoFocus?.(e),u=()=>Ne(n()),d=()=>{let e=u().createElement(`span`);return e.setAttribute(`data-focus-trap`,``),e.tabIndex=0,Object.assign(e.style,gt),e},f=()=>{let e=n();return e?Ze(e,!0).filter(e=>!e.hasAttribute(`data-focus-trap`)):[]},p=()=>{let e=f();return e.length>0?e[0]:null},m=()=>{let e=f();return e.length>0?e[e.length-1]:null},h=()=>{let e=n();if(!e)return!1;let t=je(e);return!t||Ae(e,t)?!1:$e(t)};e.B(()=>{let t=n();if(!t)return;da.add(o);let r=je(t);if(!Ae(t,r)){let e=new CustomEvent(ca,ua);t.addEventListener(ca,c),t.dispatchEvent(e),e.defaultPrevented||setTimeout(()=>{V(p()),je(t)===r&&V(t)},0)}e.X(()=>{t.removeEventListener(ca,c),setTimeout(()=>{let e=new CustomEvent(la,ua);h()&&e.preventDefault(),t.addEventListener(la,l),t.dispatchEvent(e),e.defaultPrevented||V(r??u().body),t.removeEventListener(la,l),da.remove(o)},0)})}),e.B(()=>{let a=n();if(!a||!i(t.trapFocus)||r())return;let o=e=>{let t=e.target;t?.closest(`[data-kb-top-layer]`)||(Ae(a,t)?s=t:V(s))},c=e=>{let t=e.relatedTarget??je(a);t?.closest(`[data-kb-top-layer]`)||Ae(a,t)||V(s)};u().addEventListener(`focusin`,o),u().addEventListener(`focusout`,c),e.X(()=>{u().removeEventListener(`focusin`,o),u().removeEventListener(`focusout`,c)})}),e.B(()=>{let a=n();if(!a||!i(t.trapFocus)||r())return;let o=d();a.insertAdjacentElement(`afterbegin`,o);let s=d();a.insertAdjacentElement(`beforeend`,s);function c(e){let t=p(),n=m();e.relatedTarget===t?V(n):V(t)}o.addEventListener(`focusin`,c),s.addEventListener(`focusin`,c);let l=new MutationObserver(e=>{for(let t of e)t.previousSibling===s&&(s.remove(),a.insertAdjacentElement(`beforeend`,s)),t.nextSibling===o&&(o.remove(),a.insertAdjacentElement(`afterbegin`,o))});l.observe(a,{childList:!0,subtree:!1}),e.X(()=>{o.removeEventListener(`focusin`,c),s.removeEventListener(`focusin`,c),o.remove(),s.remove(),l.disconnect()})})}var pa=`data-live-announcer`;function ma(t){e.B(()=>{i(t.isDisabled)||e.X(_a(i(t.targets),i(t.root)))})}var ha=/* @__PURE__ */ new WeakMap,ga=[];function _a(e,t=document.body){let n=new Set(e),r=/* @__PURE__ */ new Set,i=e=>{for(let t of e.querySelectorAll(`[${pa}], [${fn}]`))n.add(t);let t=e=>{if(n.has(e)||e.parentElement&&r.has(e.parentElement)&&e.parentElement.getAttribute(`role`)!==`row`)return NodeFilter.FILTER_REJECT;for(let t of n)if(e.contains(t))return NodeFilter.FILTER_SKIP;return NodeFilter.FILTER_ACCEPT},i=document.createTreeWalker(e,NodeFilter.SHOW_ELEMENT,{acceptNode:t}),o=t(e);if(o===NodeFilter.FILTER_ACCEPT&&a(e),o!==NodeFilter.FILTER_REJECT){let e=i.nextNode();for(;e!=null;)a(e),e=i.nextNode()}},a=e=>{let t=ha.get(e)??0;(e.getAttribute(`aria-hidden`)!==`true`||t!==0)&&(t===0&&setTimeout(()=>requestAnimationFrame(()=>e.setAttribute(`aria-hidden`,`true`))),r.add(e),ha.set(e,t+1))};ga.length&&ga[ga.length-1].disconnect(),i(t);let o=new MutationObserver(e=>{for(let t of e)if(t.type===`childList`&&t.addedNodes.length!==0&&![...n,...r].some(e=>e.contains(t.target))){for(let e of t.removedNodes)e instanceof Element&&(n.delete(e),r.delete(e));for(let e of t.addedNodes)(e instanceof HTMLElement||e instanceof SVGElement)&&(e.dataset.liveAnnouncer===`true`||e.dataset.reactAriaTopLayer===`true`)?n.add(e):e instanceof Element&&i(e)}});o.observe(t,{childList:!0,subtree:!0});let s={observe(){o.observe(t,{childList:!0,subtree:!0})},disconnect(){o.disconnect()}};return ga.push(s),()=>{o.disconnect();for(let e of r){let t=ha.get(e);if(t==null)return;t===1?setTimeout(()=>requestAnimationFrame(()=>{let t=ha.get(e);t===1?(e.removeAttribute(`aria-hidden`),ha.delete(e)):t!=null&&t>1&&ha.set(e,t-1)})):ha.set(e,t-1)}s===ga[ga.length-1]?(ga.pop(),ga.length&&ga[ga.length-1].observe()):ga.splice(ga.indexOf(s),1)}}function va(t){let n,r=ia(),i=H({id:r.generateId(`label`)},t),[a,o]=e.Q(i,[`ref`]),s=On(()=>n,()=>`label`);return e.B(()=>e.X(r.registerLabel(o.id))),e.L(U,e.J({as:`label`,ref(e){let t=R(e=>n=e,a.ref);typeof t==`function`&&t(e)},get for(){return e.C(()=>s()===`label`)()?r.fieldId():void 0}},()=>r.dataset(),o))}function ya(t,n){e.B(e.Y(t,t=>{if(t==null)return;let r=ba(t);r!=null&&(r.addEventListener(`reset`,n,{passive:!0}),e.X(()=>{r.removeEventListener(`reset`,n)}))}))}function ba(e){return xa(e)?e.form:e.closest(`form`)}function xa(e){return e.matches(`textarea, input, select, button`)}function Sa(t){let n=ia(),r=H({id:n.generateId(`error-message`)},t),[i,a]=e.Q(r,[`forceMount`]),o=()=>n.validationState()===`invalid`;return e.B(()=>{o()&&e.X(n.registerErrorMessage(a.id))}),e.L(e.P,{get when(){return i.forceMount||o()},get children(){return e.L(U,e.J({as:`div`},()=>n.dataset(),a))}})}var Ca=(e,t)=>{if(e.contains(t))return!0;let n=t;for(;n;){if(n===e)return!0;n=n._$host??n.parentElement}return!1},wa=/* @__PURE__ */ new Map,Ta=t=>{e.B(()=>{let n=W(t.style)??{},r=W(t.properties)??[],i={};for(let e in n)i[e]=t.element.style[e];let a=wa.get(t.key);a?a.activeCount++:wa.set(t.key,{activeCount:1,originalStyles:i,properties:r.map(e=>e.key)}),Object.assign(t.element.style,t.style);for(let e of r)t.element.style.setProperty(e.key,e.value);e.X(()=>{let e=wa.get(t.key);if(e){if(e.activeCount!==1){e.activeCount--;return}wa.delete(t.key);for(let[n,r]of Object.entries(e.originalStyles))t.element.style[n]=r;for(let n of e.properties)t.element.style.removeProperty(n);t.element.style.length===0&&t.element.removeAttribute(`style`),t.cleanup?.()}})})},Ea=(e,t)=>{switch(t){case`x`:return[e.clientWidth,e.scrollLeft,e.scrollWidth];case`y`:return[e.clientHeight,e.scrollTop,e.scrollHeight]}},Da=(e,t)=>{let n=getComputedStyle(e),r=t===`x`?n.overflowX:n.overflowY;return r===`auto`||r===`scroll`||e.tagName===`HTML`&&r===`visible`},Oa=(e,t,n)=>{let r=t===`x`&&window.getComputedStyle(e).direction===`rtl`?-1:1,i=e,a=0,o=0,s=!1;do{let[e,c,l]=Ea(i,t),u=l-e-r*c;(c!==0||u!==0)&&Da(i,t)&&(a+=u,o+=c),i===(n??document.documentElement)?s=!0:i=i._$host??i.parentElement}while(i&&!s);return[a,o]},[ka,Aa]=e.W([]),ja=e=>ka().indexOf(e)===ka().length-1,Ma=t=>{let n=e.J({element:null,enabled:!0,hideScrollbar:!0,preventScrollbarShift:!0,preventScrollbarShiftMode:`padding`,restoreScrollPosition:!0,allowPinchZoom:!1},t),r=e.G(),i=[0,0],a=null,o=null;e.B(()=>{W(n.enabled)&&(Aa(e=>[...e,r]),e.X(()=>{Aa(e=>e.filter(e=>e!==r))}))}),e.B(()=>{if(!W(n.enabled)||!W(n.hideScrollbar))return;let{documentElement:e}=document,t=window.innerWidth-e.clientWidth;if(W(n.preventScrollbarShift)){let r={overflow:`hidden`},i=[];t>0&&(W(n.preventScrollbarShiftMode)===`padding`?r.paddingRight=`calc(${window.getComputedStyle(e).paddingRight} + ${t}px)`:r.marginRight=`calc(${window.getComputedStyle(e).marginRight} + ${t}px)`,i.push({key:`--scrollbar-width`,value:`${t}px`}));let a=window.scrollY,o=window.scrollX;Ta({key:`prevent-scroll`,element:e,style:r,properties:i,cleanup:()=>{W(n.restoreScrollPosition)&&t>0&&window.scrollTo(o,a)}})}else Ta({key:`prevent-scroll`,element:e,style:{overflow:`hidden`}})}),e.B(()=>{ja(r)&&W(n.enabled)&&(document.addEventListener(`wheel`,c,{passive:!1}),document.addEventListener(`touchstart`,s,{passive:!1}),document.addEventListener(`touchmove`,l,{passive:!1}),e.X(()=>{document.removeEventListener(`wheel`,c),document.removeEventListener(`touchstart`,s),document.removeEventListener(`touchmove`,l)}))});let s=e=>{i=Pa(e),a=null,o=null},c=e=>{let t=e.target,r=W(n.element),i=Na(e),a=Math.abs(i[0])>Math.abs(i[1])?`x`:`y`,o=Fa(t,a,a===`x`?i[0]:i[1],r),s;s=r&&Ca(r,t)?!o:!0,s&&e.cancelable&&e.preventDefault()},l=e=>{let t=W(n.element),r=e.target,s;if(e.touches.length===2)s=!W(n.allowPinchZoom);else{if(a==null||o===null){let t=Pa(e).map((e,t)=>i[t]-e),n=Math.abs(t[0])>Math.abs(t[1])?`x`:`y`;a=n,o=n===`x`?t[0]:t[1]}if(r.type===`range`)s=!1;else{let e=Fa(r,a,o,t);s=t&&Ca(t,r)?!e:!0}}s&&e.cancelable&&e.preventDefault()}},Na=e=>[e.deltaX,e.deltaY],Pa=e=>e.changedTouches[0]?[e.changedTouches[0].clientX,e.changedTouches[0].clientY]:[0,0],Fa=(e,t,n,r)=>{let[i,a]=Oa(e,t,r!==null&&Ca(r,e)?r:void 0);return!(n>0&&Math.abs(i)<=1||n<0&&Math.abs(a)<1)},Ia=Ma,La={};un(La,{Description:()=>aa,ErrorMessage:()=>Sa,Item:()=>Ha,ItemControl:()=>Ua,ItemDescription:()=>Wa,ItemIndicator:()=>Ga,ItemInput:()=>Ka,ItemLabel:()=>qa,Label:()=>Ja,RadioGroup:()=>Xa,Root:()=>Ya,useRadioGroupContext:()=>za});var Ra=e.z();function za(){let t=e.et(Ra);if(t===void 0)throw Error("[kobalte]: `useRadioGroupContext` must be used within a `RadioGroup` component");return t}var Ba=e.z();function Va(){let t=e.et(Ba);if(t===void 0)throw Error("[kobalte]: `useRadioGroupItemContext` must be used within a `RadioGroup.Item` component");return t}function Ha(t){let n=ia(),r=za(),i=H({id:`${n.generateId(`item`)}-${e.G()}`},t),[a,o]=e.Q(i,[`value`,`disabled`,`onPointerDown`]),[s,c]=e.W(),[l,u]=e.W(),[d,f]=e.W(),[p,m]=e.W(),[h,g]=e.W(!1),_=e.V(()=>r.isDefaultValue(a.value)),v=e.V(()=>r.isSelectedValue(a.value)),y=e.V(()=>a.disabled||n.isDisabled()||!1),b=e=>{z(e,a.onPointerDown),h()&&e.preventDefault()},x=e.V(()=>({...n.dataset(),"data-disabled":y()?``:void 0,"data-checked":v()?``:void 0})),S={value:()=>a.value,dataset:x,isDefault:_,isSelected:v,isDisabled:y,inputId:s,labelId:l,descriptionId:d,inputRef:p,select:()=>r.setSelectedValue(a.value),generateId:ke(()=>o.id),registerInput:Pn(c),registerLabel:Pn(u),registerDescription:Pn(f),setIsFocused:g,setInputRef:m};return e.L(Ba.Provider,{value:S,get children(){return e.L(U,e.J({as:`div`,role:`group`,onPointerDown:b},x,o))}})}function Ua(t){let n=Va(),r=H({id:n.generateId(`control`)},t),[i,a]=e.Q(r,[`onClick`,`onKeyDown`]);return e.L(U,e.J({as:`div`,onClick:e=>{z(e,i.onClick),n.select(),n.inputRef()?.focus({preventScroll:!0})},onKeyDown:e=>{z(e,i.onKeyDown),e.key===Fe.Space&&(n.select(),n.inputRef()?.focus({preventScroll:!0}))}},()=>n.dataset(),a))}function Wa(t){let n=Va(),r=H({id:n.generateId(`description`)},t);return e.B(()=>e.X(n.registerDescription(r.id))),e.L(U,e.J({as:`div`},()=>n.dataset(),r))}function Ga(t){let n=Va(),r=H({id:n.generateId(`indicator`)},t),[i,a]=e.Q(r,[`ref`,`forceMount`]),[o,s]=e.W(),{present:c}=dn({show:()=>i.forceMount||n.isSelected(),element:()=>o()??null});return e.L(e.P,{get when(){return c()},get children(){return e.L(U,e.J({as:`div`,ref(e){let t=R(s,i.ref);typeof t==`function`&&t(e)}},()=>n.dataset(),a))}})}function Ka(t){let n=ia(),r=za(),i=Va(),a=H({id:i.generateId(`input`)},t),[o,s]=e.Q(a,[`ref`,`style`,`aria-labelledby`,`aria-describedby`,`onChange`,`onFocus`,`onBlur`]),c=()=>[o[`aria-labelledby`],i.labelId(),o[`aria-labelledby`]!=null&&s[`aria-label`]!=null?s.id:void 0].filter(Boolean).join(` `)||void 0,l=()=>[o[`aria-describedby`],i.descriptionId(),r.ariaDescribedBy()].filter(Boolean).join(` `)||void 0,[u,d]=e.W(!1);return e.B(e.Y([()=>i.isSelected(),()=>i.value()],e=>{if(!e[0]&&e[1]===i.value())return;d(!0);let t=i.inputRef();t?.dispatchEvent(new Event(`input`,{bubbles:!0,cancelable:!0})),t?.dispatchEvent(new Event(`change`,{bubbles:!0,cancelable:!0}))},{defer:!0})),e.B(()=>e.X(i.registerInput(s.id))),e.L(U,e.J({as:`input`,ref(e){let t=R(i.setInputRef,o.ref);typeof t==`function`&&t(e)},type:`radio`,get name(){return n.name()},get value(){return i.value()},get checked(){return i.isSelected()},get required(){return n.isRequired()},get disabled(){return i.isDisabled()},get readonly(){return n.isReadOnly()},get style(){return Ce({...gt},o.style)},get"aria-labelledby"(){return c()},get"aria-describedby"(){return l()},onChange:e=>{if(z(e,o.onChange),e.stopPropagation(),!u()){r.setSelectedValue(i.value());let t=e.target;t.checked=i.isSelected()}d(!1)},onFocus:e=>{z(e,o.onFocus),i.setIsFocused(!0)},onBlur:e=>{z(e,o.onBlur),i.setIsFocused(!1)}},()=>i.dataset(),s))}function qa(t){let n=Va(),r=H({id:n.generateId(`label`)},t);return e.B(()=>e.X(n.registerLabel(r.id))),e.L(U,e.J({as:`label`,get for(){return n.inputId()}},()=>n.dataset(),r))}function Ja(t){return e.L(va,e.J({as:`span`},t))}function Ya(t){let n,r=H({id:`radiogroup-${e.G()}`,orientation:`vertical`},t),[a,o,s]=e.Q(r,[`ref`,`value`,`defaultValue`,`onChange`,`orientation`,`aria-labelledby`,`aria-describedby`],ta),[c,l]=Mt({value:()=>a.value,defaultValue:()=>a.defaultValue,onChange:e=>a.onChange?.(e)}),{formControlContext:u}=na(o);ya(()=>n,()=>l(a.defaultValue??``));let d=()=>u.getAriaLabelledBy(i(o.id),s[`aria-label`],a[`aria-labelledby`]),f=()=>u.getAriaDescribedBy(a[`aria-describedby`]),p=e=>e===t.defaultValue,m=e=>e===c(),h={ariaDescribedBy:f,isDefaultValue:p,isSelectedValue:m,setSelectedValue:e=>{if(!(u.isReadOnly()||u.isDisabled())&&(l(e),n))for(let e of n.querySelectorAll(`[type='radio']`)){let t=e;t.checked=m(t.value)}}};return e.L(ra.Provider,{value:u,get children(){return e.L(Ra.Provider,{value:h,get children(){return e.L(U,e.J({as:`div`,ref(e){let t=R(e=>n=e,a.ref);typeof t==`function`&&t(e)},role:`radiogroup`,get id(){return i(o.id)},get"aria-invalid"(){return u.validationState()===`invalid`||void 0},get"aria-required"(){return u.isRequired()||void 0},get"aria-disabled"(){return u.isDisabled()||void 0},get"aria-readonly"(){return u.isReadOnly()||void 0},get"aria-orientation"(){return a.orientation},get"aria-labelledby"(){return d()},get"aria-describedby"(){return f()}},()=>u.dataset(),s))}})}})}var Xa=Object.assign(Ya,{Description:aa,ErrorMessage:Sa,Item:Ha,ItemControl:Ua,ItemDescription:Wa,ItemIndicator:Ga,ItemInput:Ka,ItemLabel:qa,Label:Ja}),Za=e.z();function Qa(){return e.et(Za)}var $a=e.z();function eo(){return e.et($a)}var to=e.z();function no(){return e.et(to)}function ro(){let e=no();if(e===void 0)throw Error("[kobalte]: `useMenuContext` must be used within a `Menu` component");return e}var io=e.z();function ao(){let t=e.et(io);if(t===void 0)throw Error("[kobalte]: `useMenuRootContext` must be used within a `MenuRoot` component");return t}function oo(e,t,n){let r=e.split(`-`)[0],i=n.getBoundingClientRect(),a=[],o=t.clientX,s=t.clientY;switch(r){case`top`:a.push([o,s+5]),a.push([i.left,i.bottom]),a.push([i.left,i.top]),a.push([i.right,i.top]),a.push([i.right,i.bottom]);break;case`right`:a.push([o-5,s]),a.push([i.left,i.top]),a.push([i.right,i.top]),a.push([i.right,i.bottom]),a.push([i.left,i.bottom]);break;case`bottom`:a.push([o,s-5]),a.push([i.right,i.top]),a.push([i.right,i.bottom]),a.push([i.left,i.bottom]),a.push([i.left,i.top]);break;case`left`:a.push([o+5,s]),a.push([i.right,i.bottom]),a.push([i.left,i.bottom]),a.push([i.left,i.top]),a.push([i.right,i.top])}return a}function so(e,t){return t?lt([e.clientX,e.clientY],t):!1}function co(t){let n=ao(),r=Zt(),i=no(),a=Qa(),o=eo(),s=H({placement:n.orientation()===`horizontal`?`bottom-start`:`right-start`},t),[c,l]=e.Q(s,[`open`,`defaultOpen`,`onOpenChange`]),u=0,d=null,f=`right`,[p,m]=e.W(),[h,g]=e.W(),[_,v]=e.W(),[y,b]=e.W(),[x,S]=e.W(!0),[C,w]=e.W(l.placement),[T,E]=e.W([]),[D,O]=e.W([]),{DomCollectionProvider:k}=sn({items:D,onItemsChange:O}),A=ea({open:()=>c.open,defaultOpen:()=>c.defaultOpen,onOpenChange:e=>c.onOpenChange?.(e)}),{present:j}=dn({show:()=>n.forceMount()||A.isOpen(),element:()=>y()??null}),M=Yt({selectionMode:`none`,dataSource:D}),N=e=>{S(e),A.open()},P=(e=!1)=>{A.close(),e&&i&&i.close(!0)},F=e=>{S(e),A.toggle()},ee=()=>{let e=y();e&&(V(e),M.selectionManager().setFocused(!0),M.selectionManager().setFocusedKey(void 0))},te=()=>{o==null?ee():setTimeout(()=>ee())},I=e=>{E(t=>[...t,e]);let t=i?.registerNestedMenu(e);return()=>{E(t=>Te(t,e)),t?.()}},ne=e=>f===d?.side&&so(e,d?.area),L=e=>{ne(e)&&e.preventDefault()},re=e=>{ne(e)||te()},ie=e=>{ne(e)&&e.preventDefault()};ma({isDisabled:()=>!(i==null&&A.isOpen()&&n.isModal()),targets:()=>[y(),...T()].filter(Boolean)}),e.B(()=>{let t=y();if(!t||!i)return;let n=i.registerNestedMenu(t);e.X(()=>{n()})}),e.B(()=>{i===void 0&&a?.registerMenu(n.value(),[y(),...T()])}),e.B(()=>{i===void 0&&a!==void 0&&(a.value()===n.value()?(_()?.focus(),a.autoFocusMenu()&&N(!0)):P())}),e.B(()=>{i===void 0&&a!==void 0&&A.isOpen()&&a.setValue(n.value())}),e.X(()=>{i===void 0&&a?.unregisterMenu(n.value())});let R={dataset:e.V(()=>({"data-expanded":A.isOpen()?``:void 0,"data-closed":A.isOpen()?void 0:``})),isOpen:A.isOpen,contentPresent:j,nestedMenus:T,currentPlacement:C,pointerGraceTimeoutId:()=>u,autoFocus:x,listState:()=>M,parentMenuContext:()=>i,triggerRef:_,contentRef:y,triggerId:p,contentId:h,setTriggerRef:v,setContentRef:b,open:N,close:P,toggle:F,focusContent:te,onItemEnter:L,onItemLeave:re,onTriggerLeave:ie,setPointerDir:e=>f=e,setPointerGraceTimeoutId:e=>u=e,setPointerGraceIntent:e=>d=e,registerNestedMenu:I,registerItemToParentDomCollection:r?.registerItem,registerTriggerId:Pn(m),registerContentId:Pn(g)};return e.L(k,{get children(){return e.L(to.Provider,{value:R,get children(){return e.L(e.P,{when:o===void 0,get fallback(){return l.children},get children(){return e.L(Ui,e.J({anchorRef:_,contentRef:y,onCurrentPlacementChange:w},l))}})}})}})}var lo=e.z();function uo(){let t=e.et(lo);if(t===void 0)throw Error("[kobalte]: `useMenuItemContext` must be used within a `Menu.Item` component");return t}function fo(t){let n,r=ao(),i=ro(),a=H({id:r.generateId(`item-${e.G()}`)},t),[o,s]=e.Q(a,[`ref`,`textValue`,`disabled`,`closeOnSelect`,`checked`,`indeterminate`,`onSelect`,`onPointerMove`,`onPointerLeave`,`onPointerDown`,`onPointerUp`,`onClick`,`onKeyDown`,`onMouseDown`,`onFocus`]),[c,l]=e.W(),[u,d]=e.W(),[f,p]=e.W(),m=()=>i.listState().selectionManager(),h=()=>s.id,g=()=>m().focusedKey()===h(),_=()=>{o.onSelect?.(),o.closeOnSelect&&setTimeout(()=>{i.close(!0)},1)};cn({getItem:()=>({ref:()=>n,type:`item`,key:h(),textValue:o.textValue??f()?.textContent??n?.textContent??``,disabled:o.disabled??!1})});let v=Kt({key:h,selectionManager:m,shouldSelectOnPressUp:!0,allowsDifferentPressOrigin:!0,disabled:()=>o.disabled},()=>n),y=e=>{z(e,o.onPointerMove),e.pointerType===`mouse`&&(o.disabled?i.onItemLeave(e):(i.onItemEnter(e),e.defaultPrevented||(V(e.currentTarget),i.listState().selectionManager().setFocused(!0),i.listState().selectionManager().setFocusedKey(h()))))},b=e=>{z(e,o.onPointerLeave),e.pointerType===`mouse`&&i.onItemLeave(e)},x=e=>{z(e,o.onPointerUp),!o.disabled&&e.button===0&&_()},S=e=>{if(z(e,o.onKeyDown),!e.repeat&&!o.disabled)switch(e.key){case`Enter`:case` `:_()}},C=e.V(()=>{if(o.indeterminate)return`mixed`;if(o.checked!=null)return o.checked}),w=e.V(()=>({"data-indeterminate":o.indeterminate?``:void 0,"data-checked":o.checked&&!o.indeterminate?``:void 0,"data-disabled":o.disabled?``:void 0,"data-highlighted":g()?``:void 0})),T={isChecked:()=>o.checked,dataset:w,setLabelRef:p,generateId:ke(()=>s.id),registerLabel:Pn(l),registerDescription:Pn(d)};return e.L(lo.Provider,{value:T,get children(){return e.L(U,e.J({as:`div`,ref(e){let t=R(e=>n=e,o.ref);typeof t==`function`&&t(e)},get tabIndex(){return v.tabIndex()},get"aria-checked"(){return C()},get"aria-disabled"(){return o.disabled},get"aria-labelledby"(){return c()},get"aria-describedby"(){return u()},get"data-key"(){return v.dataKey()},get onPointerDown(){return B([o.onPointerDown,v.onPointerDown])},get onPointerUp(){return B([x,v.onPointerUp])},get onClick(){return B([o.onClick,v.onClick])},get onKeyDown(){return B([S,v.onKeyDown])},get onMouseDown(){return B([o.onMouseDown,v.onMouseDown])},get onFocus(){return B([o.onFocus,v.onFocus])},onPointerMove:y,onPointerLeave:b},w,s))}})}function po(t){let n=H({closeOnSelect:!1},t),[r,i]=e.Q(n,[`checked`,`defaultChecked`,`onChange`,`onSelect`]),a=Fn({isSelected:()=>r.checked,defaultIsSelected:()=>r.defaultChecked,onSelectedChange:e=>r.onChange?.(e),isDisabled:()=>i.disabled});return e.L(fo,e.J({role:`menuitemcheckbox`,get checked(){return a.isSelected()},onSelect:()=>{r.onSelect?.(),a.toggle()}},i))}var mo={next:(e,t)=>e===`ltr`?t===`horizontal`?`ArrowRight`:`ArrowDown`:t===`horizontal`?`ArrowLeft`:`ArrowUp`,previous:(e,t)=>mo.next(e===`ltr`?`rtl`:`ltr`,t)},ho={first:e=>e===`horizontal`?`ArrowDown`:`ArrowRight`,last:e=>e===`horizontal`?`ArrowUp`:`ArrowLeft`};function go(t){let n=ao(),r=ro(),i=Qa(),{direction:a}=kt(),o=H({id:n.generateId(`trigger`)},t),[s,c]=e.Q(o,[`ref`,`id`,`disabled`,`onPointerDown`,`onClick`,`onKeyDown`,`onMouseOver`,`onFocus`]),l=()=>n.value();i!==void 0&&(l=()=>n.value()??s.id,i.lastValue()===void 0&&i.setLastValue(l));let u=On(()=>r.triggerRef(),()=>`button`),d=e.V(()=>u()===`a`&&r.triggerRef()?.getAttribute(`href`)!=null);e.B(e.Y(()=>i?.value(),e=>{d()&&e===l()&&r.triggerRef()?.focus()}));let f=()=>{i===void 0?r.toggle(!0):r.isOpen()?i.value()===l()&&i.closeMenu():(i.autoFocusMenu()||i.setAutoFocusMenu(!0),r.open(!1))};return e.B(()=>e.X(r.registerTriggerId(s.id))),e.L(Mn,e.J({ref(e){let t=R(r.setTriggerRef,s.ref);typeof t==`function`&&t(e)},get"data-kb-menu-value-trigger"(){return n.value()},get id(){return s.id},get disabled(){return s.disabled},"aria-haspopup":`true`,get"aria-expanded"(){return r.isOpen()},get"aria-controls"(){return e.C(()=>!!r.isOpen())()?r.contentId():void 0},get"data-highlighted"(){return l()!==void 0&&i?.value()===l()||void 0},get tabIndex(){return i===void 0?void 0:i.value()===l()||i.lastValue()===l()?0:-1},onPointerDown:e=>{z(e,s.onPointerDown),e.currentTarget.dataset.pointerType=e.pointerType,!s.disabled&&e.pointerType!==`touch`&&e.button===0&&f()},onMouseOver:e=>{z(e,s.onMouseOver),r.triggerRef()?.dataset.pointerType!==`touch`&&!s.disabled&&i!==void 0&&i.value()!==void 0&&i.setValue(l)},onClick:e=>{z(e,s.onClick),s.disabled||e.currentTarget.dataset.pointerType===`touch`&&f()},onKeyDown:e=>{if(z(e,s.onKeyDown),!s.disabled){if(d())switch(e.key){case`Enter`:case` `:return}switch(e.key){case`Enter`:case` `:case ho.first(n.orientation()):e.stopPropagation(),e.preventDefault(),ht(e.currentTarget),r.open(`first`),i?.setAutoFocusMenu(!0),i?.setValue(l);break;case ho.last(n.orientation()):e.stopPropagation(),e.preventDefault(),r.open(`last`);break;case mo.next(a(),n.orientation()):if(i===void 0)break;e.stopPropagation(),e.preventDefault(),i.nextMenu();break;case mo.previous(a(),n.orientation()):if(i===void 0)break;e.stopPropagation(),e.preventDefault(),i.previousMenu()}}},onFocus:e=>{z(e,s.onFocus),i!==void 0&&e.currentTarget.dataset.pointerType!==`touch`&&i.setValue(l)},role:i===void 0?void 0:`menuitem`},()=>r.dataset(),c))}function _o(t){let n,r=ao(),i=ro(),a=Qa(),o=eo(),{direction:s}=kt(),c=H({id:r.generateId(`content-${e.G()}`)},t),[l,u]=e.Q(c,[`ref`,`id`,`style`,`onOpenAutoFocus`,`onCloseAutoFocus`,`onEscapeKeyDown`,`onFocusOutside`,`onPointerEnter`,`onPointerMove`,`onKeyDown`,`onMouseDown`,`onFocusIn`,`onFocusOut`]),d=0,f=()=>i.parentMenuContext()==null&&a===void 0&&r.isModal(),p=sa({selectionManager:i.listState().selectionManager,collection:i.listState().collection,autoFocus:i.autoFocus,deferAutoFocus:!0,shouldFocusWrap:!0,disallowTypeAhead:()=>!i.listState().selectionManager().isFocused(),orientation:()=>r.orientation()===`horizontal`?`vertical`:`horizontal`},()=>n);fa({trapFocus:()=>f()&&i.isOpen(),onMountAutoFocus:e=>{a===void 0&&l.onOpenAutoFocus?.(e)},onUnmountAutoFocus:l.onCloseAutoFocus},()=>n);let m=e=>{if(Ae(e.currentTarget,e.target)&&(e.key===`Tab`&&i.isOpen()&&e.preventDefault(),a!==void 0&&e.currentTarget.getAttribute(`aria-haspopup`)!==`true`))switch(e.key){case mo.next(s(),r.orientation()):e.stopPropagation(),e.preventDefault(),i.close(!0),a.setAutoFocusMenu(!0),a.nextMenu();break;case mo.previous(s(),r.orientation()):if(e.currentTarget.hasAttribute(`data-closed`))break;e.stopPropagation(),e.preventDefault(),i.close(!0),a.setAutoFocusMenu(!0),a.previousMenu()}},h=e=>{l.onEscapeKeyDown?.(e),a?.setAutoFocusMenu(!1),i.close(!0)},g=e=>{l.onFocusOutside?.(e),r.isModal()&&e.preventDefault()},_=e=>{z(e,l.onPointerEnter),i.isOpen()&&(i.parentMenuContext()?.listState().selectionManager().setFocused(!1),i.parentMenuContext()?.listState().selectionManager().setFocusedKey(void 0))},v=e=>{if(z(e,l.onPointerMove),e.pointerType!==`mouse`)return;let t=e.target,n=d!==e.clientX;Ae(e.currentTarget,t)&&n&&(i.setPointerDir(e.clientX>d?`right`:`left`),d=e.clientX)};e.B(()=>e.X(i.registerContentId(l.id))),e.X(()=>i.setContentRef(void 0));let y={ref:R(e=>{i.setContentRef(e),n=e},l.ref),role:`menu`,get id(){return l.id},get tabIndex(){return p.tabIndex()},get"aria-labelledby"(){return i.triggerId()},onKeyDown:B([l.onKeyDown,p.onKeyDown,m]),onMouseDown:B([l.onMouseDown,p.onMouseDown]),onFocusIn:B([l.onFocusIn,p.onFocusIn]),onFocusOut:B([l.onFocusOut,p.onFocusOut]),onPointerEnter:_,onPointerMove:v,get"data-orientation"(){return r.orientation()}};return e.L(e.P,{get when(){return i.contentPresent()},get children(){return e.L(e.P,{get when(){return o===void 0||i.parentMenuContext()!=null},get fallback(){return e.L(U,e.J({as:`div`},()=>i.dataset(),y,u))},get children(){return e.L(Ui.Positioner,{get children(){return e.L($i,e.J({get disableOutsidePointerEvents(){return e.C(()=>!!f())()&&i.isOpen()},get excludedElements(){return[i.triggerRef]},bypassTopMostLayerCheck:!0,get style(){return Ce({"--kb-menu-content-transform-origin":`var(--kb-popper-content-transform-origin)`,position:`relative`},l.style)},onEscapeKeyDown:h,onFocusOutside:g,get onDismiss(){return i.close}},()=>i.dataset(),y,u))}})}})}})}function vo(t){let n,r=ao(),i=ro(),[a,o]=e.Q(t,[`ref`]);return Ia({element:()=>n??null,enabled:()=>i.contentPresent()&&r.preventScroll()}),e.L(_o,e.J({ref(e){let t=R(e=>{n=e},a.ref);typeof t==`function`&&t(e)}},o))}var yo=e.z();function bo(){let t=e.et(yo);if(t===void 0)throw Error("[kobalte]: `useMenuGroupContext` must be used within a `Menu.Group` component");return t}function xo(t){let n=H({id:ao().generateId(`group-${e.G()}`)},t),[r,i]=e.W(),a={generateId:ke(()=>n.id),registerLabelId:Pn(i)};return e.L(yo.Provider,{value:a,get children(){return e.L(U,e.J({as:`div`,role:`group`,get"aria-labelledby"(){return r()}},n))}})}function So(t){let n=bo(),r=H({id:n.generateId(`label`)},t),[i,a]=e.Q(r,[`id`]);return e.B(()=>e.X(n.registerLabelId(i.id))),e.L(U,e.J({as:`span`,get id(){return i.id},"aria-hidden":`true`},a))}function Co(t){let n=ro(),r=H({children:`▼`},t);return e.L(U,e.J({as:`span`,"aria-hidden":`true`},()=>n.dataset(),r))}function wo(t){return e.L(fo,e.J({role:`menuitem`,closeOnSelect:!0},t))}function To(t){let n=uo(),r=H({id:n.generateId(`description`)},t),[i,a]=e.Q(r,[`id`]);return e.B(()=>e.X(n.registerDescription(i.id))),e.L(U,e.J({as:`div`,get id(){return i.id}},()=>n.dataset(),a))}function Eo(t){let n=uo(),r=H({id:n.generateId(`indicator`)},t),[i,a]=e.Q(r,[`forceMount`]);return e.L(e.P,{get when(){return i.forceMount||n.isChecked()},get children(){return e.L(U,e.J({as:`div`},()=>n.dataset(),a))}})}function Do(t){let n=uo(),r=H({id:n.generateId(`label`)},t),[i,a]=e.Q(r,[`ref`,`id`]);return e.B(()=>e.X(n.registerLabel(i.id))),e.L(U,e.J({as:`div`,ref(e){let t=R(n.setLabelRef,i.ref);typeof t==`function`&&t(e)},get id(){return i.id}},()=>n.dataset(),a))}function Oo(t){let n=ro();return e.L(e.P,{get when(){return n.contentPresent()},get children(){return e.L(e._,t)}})}var ko=e.z();function Ao(){let t=e.et(ko);if(t===void 0)throw Error("[kobalte]: `useMenuRadioGroupContext` must be used within a `Menu.RadioGroup` component");return t}function jo(t){let n=H({id:ao().generateId(`radiogroup-${e.G()}`)},t),[r,i]=e.Q(n,[`value`,`defaultValue`,`onChange`,`disabled`]),[a,o]=Mt({value:()=>r.value,defaultValue:()=>r.defaultValue,onChange:e=>r.onChange?.(e)});return e.L(ko.Provider,{value:{isDisabled:()=>r.disabled,isSelectedValue:e=>e===a(),setSelectedValue:e=>o(e)},get children(){return e.L(xo,i)}})}function Mo(t){let n=Ao(),r=H({closeOnSelect:!1},t),[i,a]=e.Q(r,[`value`,`onSelect`]);return e.L(fo,e.J({role:`menuitemradio`,get checked(){return n.isSelectedValue(i.value)},onSelect:()=>{i.onSelect?.(),n.setSelectedValue(i.value)}},a))}function No(t){let n=Qa(),r=H({id:`menu-${e.G()}`,modal:!0},t),[i,a]=e.Q(r,[`id`,`modal`,`preventScroll`,`forceMount`,`open`,`defaultOpen`,`onOpenChange`,`value`,`orientation`]),o=ea({open:()=>i.open,defaultOpen:()=>i.defaultOpen,onOpenChange:e=>i.onOpenChange?.(e)}),s={isModal:()=>i.modal??!0,preventScroll:()=>i.preventScroll??s.isModal(),forceMount:()=>i.forceMount??!1,generateId:ke(()=>i.id),value:()=>i.value,orientation:()=>i.orientation??n?.orientation()??`horizontal`};return e.L(io.Provider,{value:s,get children(){return e.L(co,e.J({get open(){return o.isOpen()},get onOpenChange(){return o.setIsOpen}},a))}})}function Po(t){let{direction:n}=kt();return e.L(co,e.J({get placement(){return n()===`rtl`?`left-start`:`right-start`},flip:!0},t))}var Fo={close:(e,t)=>e===`ltr`?[t===`horizontal`?`ArrowLeft`:`ArrowUp`]:[t===`horizontal`?`ArrowRight`:`ArrowDown`]};function Io(t){let n=ro(),r=ao(),[i,a]=e.Q(t,[`onFocusOutside`,`onKeyDown`]),{direction:o}=kt();return e.L(_o,e.J({onOpenAutoFocus:e=>{e.preventDefault()},onCloseAutoFocus:e=>{e.preventDefault()},onFocusOutside:e=>{i.onFocusOutside?.(e);let t=e.target;Ae(n.triggerRef(),t)||n.close()},onKeyDown:e=>{z(e,i.onKeyDown);let t=Ae(e.currentTarget,e.target),a=Fo.close(o(),r.orientation()).includes(e.key),s=n.parentMenuContext()!=null;t&&a&&s&&(n.close(),V(n.triggerRef()))}},a))}var Lo=[`Enter`,` `],Ro={open:(e,t)=>e===`ltr`?[...Lo,t===`horizontal`?`ArrowRight`:`ArrowDown`]:[...Lo,t===`horizontal`?`ArrowLeft`:`ArrowUp`]};function zo(t){let n,r=ao(),i=ro(),a=H({id:r.generateId(`sub-trigger-${e.G()}`)},t),[o,s]=e.Q(a,[`ref`,`id`,`textValue`,`disabled`,`onPointerMove`,`onPointerLeave`,`onPointerDown`,`onPointerUp`,`onClick`,`onKeyDown`,`onMouseDown`,`onFocus`]),c=null,l=()=>{c&&window.clearTimeout(c),c=null},{direction:u}=kt(),d=()=>o.id,f=()=>{let e=i.parentMenuContext();if(e==null)throw Error("[kobalte]: `Menu.SubTrigger` must be used within a `Menu.Sub` component");return e.listState().selectionManager()},p=()=>i.listState().collection(),m=()=>f().focusedKey()===d(),h=Kt({key:d,selectionManager:f,shouldSelectOnPressUp:!0,allowsDifferentPressOrigin:!0,disabled:()=>o.disabled},()=>n),g=e=>{z(e,o.onClick),!i.isOpen()&&!o.disabled&&i.open(!0)},_=e=>{if(z(e,o.onPointerMove),e.pointerType!==`mouse`)return;let t=i.parentMenuContext();if(t?.onItemEnter(e),!e.defaultPrevented){if(o.disabled){t?.onItemLeave(e);return}!i.isOpen()&&!c&&(i.parentMenuContext()?.setPointerGraceIntent(null),c=window.setTimeout(()=>{i.open(!1),l()},100)),t?.onItemEnter(e),e.defaultPrevented||(i.listState().selectionManager().isFocused()&&(i.listState().selectionManager().setFocused(!1),i.listState().selectionManager().setFocusedKey(void 0)),V(e.currentTarget),t?.listState().selectionManager().setFocused(!0),t?.listState().selectionManager().setFocusedKey(d()))}},v=e=>{if(z(e,o.onPointerLeave),e.pointerType!==`mouse`)return;l();let t=i.parentMenuContext(),n=i.contentRef();if(n){t?.setPointerGraceIntent({area:oo(i.currentPlacement(),e,n),side:i.currentPlacement().split(`-`)[0]}),window.clearTimeout(t?.pointerGraceTimeoutId());let r=window.setTimeout(()=>{t?.setPointerGraceIntent(null)},300);t?.setPointerGraceTimeoutId(r)}else{if(t?.onTriggerLeave(e),e.defaultPrevented)return;t?.setPointerGraceIntent(null)}t?.onItemLeave(e)},y=e=>{z(e,o.onKeyDown),!e.repeat&&(o.disabled||Ro.open(u(),r.orientation()).includes(e.key)&&(e.stopPropagation(),e.preventDefault(),f().setFocused(!1),f().setFocusedKey(void 0),i.isOpen()||i.open(`first`),i.focusContent(),i.listState().selectionManager().setFocused(!0),i.listState().selectionManager().setFocusedKey(p().getFirstKey())))};return e.B(()=>{if(i.registerItemToParentDomCollection==null)throw Error("[kobalte]: `Menu.SubTrigger` must be used within a `Menu.Sub` component");let t=i.registerItemToParentDomCollection({ref:()=>n,type:`item`,key:d(),textValue:o.textValue??n?.textContent??``,disabled:o.disabled??!1});e.X(t)}),e.B(e.Y(()=>i.parentMenuContext()?.pointerGraceTimeoutId(),t=>{e.X(()=>{window.clearTimeout(t),i.parentMenuContext()?.setPointerGraceIntent(null)})})),e.B(()=>e.X(i.registerTriggerId(o.id))),e.X(()=>{l()}),e.L(U,e.J({as:`div`,ref(e){let t=R(e=>{i.setTriggerRef(e),n=e},o.ref);typeof t==`function`&&t(e)},get id(){return o.id},role:`menuitem`,get tabIndex(){return h.tabIndex()},"aria-haspopup":`true`,get"aria-expanded"(){return i.isOpen()},get"aria-controls"(){return e.C(()=>!!i.isOpen())()?i.contentId():void 0},get"aria-disabled"(){return o.disabled},get"data-key"(){return h.dataKey()},get"data-highlighted"(){return m()?``:void 0},get"data-disabled"(){return o.disabled?``:void 0},get onPointerDown(){return B([o.onPointerDown,h.onPointerDown])},get onPointerUp(){return B([o.onPointerUp,h.onPointerUp])},get onClick(){return B([g,h.onClick])},get onKeyDown(){return B([y,h.onKeyDown])},get onMouseDown(){return B([o.onMouseDown,h.onMouseDown])},get onFocus(){return B([o.onFocus,h.onFocus])},onPointerMove:_,onPointerLeave:v},()=>i.dataset(),s))}un({},{Root:()=>Bo,Separator:()=>Vo});function Bo(t){let n,r=H({orientation:`horizontal`},t),[i,a]=e.Q(r,[`ref`,`orientation`]),o=On(()=>n,()=>`hr`);return e.L(U,e.J({as:`hr`,ref(e){let t=R(e=>n=e,i.ref);typeof t==`function`&&t(e)},get role(){return o()===`hr`?void 0:`separator`},get"aria-orientation"(){return i.orientation===`vertical`?`vertical`:void 0},get"data-orientation"(){return i.orientation}},a))}var Vo=Bo,J={};un(J,{Arrow:()=>Pi,CheckboxItem:()=>po,Content:()=>Ho,DropdownMenu:()=>Wo,Group:()=>xo,GroupLabel:()=>So,Icon:()=>Co,Item:()=>wo,ItemDescription:()=>To,ItemIndicator:()=>Eo,ItemLabel:()=>Do,Portal:()=>Oo,RadioGroup:()=>jo,RadioItem:()=>Mo,Root:()=>Uo,Separator:()=>Bo,Sub:()=>Po,SubContent:()=>Io,SubTrigger:()=>zo,Trigger:()=>go});function Ho(t){let n=ao(),r=ro(),[i,a]=e.Q(t,[`onCloseAutoFocus`,`onInteractOutside`]),o=!1;return e.L(vo,e.J({onCloseAutoFocus:e=>{i.onCloseAutoFocus?.(e),o||V(r.triggerRef()),o=!1,e.preventDefault()},onInteractOutside:e=>{i.onInteractOutside?.(e),(!n.isModal()||e.detail.isContextMenu)&&(o=!0)}},a))}function Uo(t){let n=H({id:`dropdownmenu-${e.G()}`},t);return e.L(No,n)}var Wo=Object.assign(Uo,{Arrow:Pi,CheckboxItem:po,Content:Ho,Group:xo,GroupLabel:So,Icon:Co,Item:wo,ItemDescription:To,ItemIndicator:Eo,ItemLabel:Do,Portal:Oo,RadioGroup:jo,RadioItem:Mo,Separator:Bo,Sub:Po,SubContent:Io,SubTrigger:zo,Trigger:go});const Y={colors:{inherit:`inherit`,current:`currentColor`,transparent:`transparent`,black:`#000000`,white:`#ffffff`,neutral:{50:`#f9fafb`,100:`#f2f4f7`,200:`#eaecf0`,300:`#d0d5dd`,400:`#98a2b3`,500:`#667085`,600:`#475467`,700:`#344054`,800:`#1d2939`,900:`#101828`},darkGray:{50:`#525c7a`,100:`#49536e`,200:`#414962`,300:`#394056`,400:`#313749`,500:`#292e3d`,600:`#212530`,700:`#191c24`,800:`#111318`,900:`#0b0d10`},gray:{50:`#f9fafb`,100:`#f2f4f7`,200:`#eaecf0`,300:`#d0d5dd`,400:`#98a2b3`,500:`#667085`,600:`#475467`,700:`#344054`,800:`#1d2939`,900:`#101828`},blue:{25:`#F5FAFF`,50:`#EFF8FF`,100:`#D1E9FF`,200:`#B2DDFF`,300:`#84CAFF`,400:`#53B1FD`,500:`#2E90FA`,600:`#1570EF`,700:`#175CD3`,800:`#1849A9`,900:`#194185`},green:{25:`#F6FEF9`,50:`#ECFDF3`,100:`#D1FADF`,200:`#A6F4C5`,300:`#6CE9A6`,400:`#32D583`,500:`#12B76A`,600:`#039855`,700:`#027A48`,800:`#05603A`,900:`#054F31`},red:{50:`#fef2f2`,100:`#fee2e2`,200:`#fecaca`,300:`#fca5a5`,400:`#f87171`,500:`#ef4444`,600:`#dc2626`,700:`#b91c1c`,800:`#991b1b`,900:`#7f1d1d`,950:`#450a0a`},yellow:{25:`#FFFCF5`,50:`#FFFAEB`,100:`#FEF0C7`,200:`#FEDF89`,300:`#FEC84B`,400:`#FDB022`,500:`#F79009`,600:`#DC6803`,700:`#B54708`,800:`#93370D`,900:`#7A2E0E`},purple:{25:`#FAFAFF`,50:`#F4F3FF`,100:`#EBE9FE`,200:`#D9D6FE`,300:`#BDB4FE`,400:`#9B8AFB`,500:`#7A5AF8`,600:`#6938EF`,700:`#5925DC`,800:`#4A1FB8`,900:`#3E1C96`},teal:{25:`#F6FEFC`,50:`#F0FDF9`,100:`#CCFBEF`,200:`#99F6E0`,300:`#5FE9D0`,400:`#2ED3B7`,500:`#15B79E`,600:`#0E9384`,700:`#107569`,800:`#125D56`,900:`#134E48`},pink:{25:`#fdf2f8`,50:`#fce7f3`,100:`#fbcfe8`,200:`#f9a8d4`,300:`#f472b6`,400:`#ec4899`,500:`#db2777`,600:`#be185d`,700:`#9d174d`,800:`#831843`,900:`#500724`},cyan:{25:`#ecfeff`,50:`#cffafe`,100:`#a5f3fc`,200:`#67e8f9`,300:`#22d3ee`,400:`#06b6d4`,500:`#0891b2`,600:`#0e7490`,700:`#155e75`,800:`#164e63`,900:`#083344`}},alpha:{100:`ff`,90:`e5`,80:`cc`,70:`b3`,60:`99`,50:`80`,40:`66`,30:`4d`,20:`33`,10:`1a`,0:`00`},font:{size:{"2xs":`calc(var(--tsqd-font-size) * 0.625)`,xs:`calc(var(--tsqd-font-size) * 0.75)`,sm:`calc(var(--tsqd-font-size) * 0.875)`,md:`var(--tsqd-font-size)`,lg:`calc(var(--tsqd-font-size) * 1.125)`,xl:`calc(var(--tsqd-font-size) * 1.25)`,"2xl":`calc(var(--tsqd-font-size) * 1.5)`,"3xl":`calc(var(--tsqd-font-size) * 1.875)`,"4xl":`calc(var(--tsqd-font-size) * 2.25)`,"5xl":`calc(var(--tsqd-font-size) * 3)`,"6xl":`calc(var(--tsqd-font-size) * 3.75)`,"7xl":`calc(var(--tsqd-font-size) * 4.5)`,"8xl":`calc(var(--tsqd-font-size) * 6)`,"9xl":`calc(var(--tsqd-font-size) * 8)`},lineHeight:{xs:`calc(var(--tsqd-font-size) * 1)`,sm:`calc(var(--tsqd-font-size) * 1.25)`,md:`calc(var(--tsqd-font-size) * 1.5)`,lg:`calc(var(--tsqd-font-size) * 1.75)`,xl:`calc(var(--tsqd-font-size) * 2)`,"2xl":`calc(var(--tsqd-font-size) * 2.25)`,"3xl":`calc(var(--tsqd-font-size) * 2.5)`,"4xl":`calc(var(--tsqd-font-size) * 2.75)`,"5xl":`calc(var(--tsqd-font-size) * 3)`,"6xl":`calc(var(--tsqd-font-size) * 3.25)`,"7xl":`calc(var(--tsqd-font-size) * 3.5)`,"8xl":`calc(var(--tsqd-font-size) * 3.75)`,"9xl":`calc(var(--tsqd-font-size) * 4)`},weight:{thin:`100`,extralight:`200`,light:`300`,normal:`400`,medium:`500`,semibold:`600`,bold:`700`,extrabold:`800`,black:`900`}},breakpoints:{xs:`320px`,sm:`640px`,md:`768px`,lg:`1024px`,xl:`1280px`,"2xl":`1536px`},border:{radius:{none:`0px`,xs:`calc(var(--tsqd-font-size) * 0.125)`,sm:`calc(var(--tsqd-font-size) * 0.25)`,md:`calc(var(--tsqd-font-size) * 0.375)`,lg:`calc(var(--tsqd-font-size) * 0.5)`,xl:`calc(var(--tsqd-font-size) * 0.75)`,"2xl":`calc(var(--tsqd-font-size) * 1)`,"3xl":`calc(var(--tsqd-font-size) * 1.5)`,full:`9999px`}},size:{0:`0px`,.25:`calc(var(--tsqd-font-size) * 0.0625)`,.5:`calc(var(--tsqd-font-size) * 0.125)`,1:`calc(var(--tsqd-font-size) * 0.25)`,1.5:`calc(var(--tsqd-font-size) * 0.375)`,2:`calc(var(--tsqd-font-size) * 0.5)`,2.5:`calc(var(--tsqd-font-size) * 0.625)`,3:`calc(var(--tsqd-font-size) * 0.75)`,3.5:`calc(var(--tsqd-font-size) * 0.875)`,4:`calc(var(--tsqd-font-size) * 1)`,4.5:`calc(var(--tsqd-font-size) * 1.125)`,5:`calc(var(--tsqd-font-size) * 1.25)`,5.5:`calc(var(--tsqd-font-size) * 1.375)`,6:`calc(var(--tsqd-font-size) * 1.5)`,6.5:`calc(var(--tsqd-font-size) * 1.625)`,7:`calc(var(--tsqd-font-size) * 1.75)`,8:`calc(var(--tsqd-font-size) * 2)`,9:`calc(var(--tsqd-font-size) * 2.25)`,10:`calc(var(--tsqd-font-size) * 2.5)`,11:`calc(var(--tsqd-font-size) * 2.75)`,12:`calc(var(--tsqd-font-size) * 3)`,14:`calc(var(--tsqd-font-size) * 3.5)`,16:`calc(var(--tsqd-font-size) * 4)`,20:`calc(var(--tsqd-font-size) * 5)`,24:`calc(var(--tsqd-font-size) * 6)`,28:`calc(var(--tsqd-font-size) * 7)`,32:`calc(var(--tsqd-font-size) * 8)`,36:`calc(var(--tsqd-font-size) * 9)`,40:`calc(var(--tsqd-font-size) * 10)`,44:`calc(var(--tsqd-font-size) * 11)`,48:`calc(var(--tsqd-font-size) * 12)`,52:`calc(var(--tsqd-font-size) * 13)`,56:`calc(var(--tsqd-font-size) * 14)`,60:`calc(var(--tsqd-font-size) * 15)`,64:`calc(var(--tsqd-font-size) * 16)`,72:`calc(var(--tsqd-font-size) * 18)`,80:`calc(var(--tsqd-font-size) * 20)`,96:`calc(var(--tsqd-font-size) * 24)`},shadow:{xs:(e=`rgb(0 0 0 / 0.1)`)=>`0 1px 2px 0 rgb(0 0 0 / 0.05)`,sm:(e=`rgb(0 0 0 / 0.1)`)=>`0 1px 3px 0 ${e}, 0 1px 2px -1px ${e}`,md:(e=`rgb(0 0 0 / 0.1)`)=>`0 4px 6px -1px ${e}, 0 2px 4px -2px ${e}`,lg:(e=`rgb(0 0 0 / 0.1)`)=>`0 10px 15px -3px ${e}, 0 4px 6px -4px ${e}`,xl:(e=`rgb(0 0 0 / 0.1)`)=>`0 20px 25px -5px ${e}, 0 8px 10px -6px ${e}`,"2xl":(e=`rgb(0 0 0 / 0.25)`)=>`0 25px 50px -12px ${e}`,inner:(e=`rgb(0 0 0 / 0.05)`)=>`inset 0 2px 4px 0 ${e}`,none:()=>`none`},zIndices:{hide:-1,auto:`auto`,base:0,docked:10,dropdown:1e3,sticky:1100,banner:1200,overlay:1300,modal:1400,popover:1500,skipLink:1600,toast:1700,tooltip:1800}};var Go=/*#__PURE__*/ e.O(`<svg width=14 height=14 viewBox="0 0 14 14"fill=none xmlns=http://www.w3.org/2000/svg><path d="M13 13L9.00007 9M10.3333 5.66667C10.3333 8.244 8.244 10.3333 5.66667 10.3333C3.08934 10.3333 1 8.244 1 5.66667C1 3.08934 3.08934 1 5.66667 1C8.244 1 10.3333 3.08934 10.3333 5.66667Z"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>`),Ko=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),qo=/*#__PURE__*/ e.O(`<svg width=10 height=6 viewBox="0 0 10 6"fill=none xmlns=http://www.w3.org/2000/svg><path d="M1 1L5 5L9 1"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>`),Jo=/*#__PURE__*/ e.O(`<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 13.3333V2.66667M8 2.66667L4 6.66667M8 2.66667L12 6.66667"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>`),Yo=/*#__PURE__*/ e.O(`<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 2.66667V13.3333M8 13.3333L4 9.33333M8 13.3333L12 9.33333"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>`),Xo=/*#__PURE__*/ e.O(`<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg style=transform:rotate(90deg)><path d="M8 2.66667V13.3333M8 13.3333L4 9.33333M8 13.3333L12 9.33333"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>`),Zo=/*#__PURE__*/ e.O(`<svg width=12 height=12 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg style=transform:rotate(-90deg)><path d="M8 2.66667V13.3333M8 13.3333L4 9.33333M8 13.3333L12 9.33333"stroke=currentColor stroke-width=1.66667 stroke-linecap=round stroke-linejoin=round>`),Qo=/*#__PURE__*/ e.O(`<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M12 2v2m0 16v2M4 12H2m4.314-5.686L4.9 4.9m12.786 1.414L19.1 4.9M6.314 17.69 4.9 19.104m12.786-1.414 1.414 1.414M22 12h-2m-3 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),$o=/*#__PURE__*/ e.O(`<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M22 15.844a10.424 10.424 0 0 1-4.306.925c-5.779 0-10.463-4.684-10.463-10.462 0-1.536.33-2.994.925-4.307A10.464 10.464 0 0 0 2 11.538C2 17.316 6.684 22 12.462 22c4.243 0 7.896-2.526 9.538-6.156Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),es=/*#__PURE__*/ e.O(`<svg viewBox="0 0 24 24"height=12 width=12 fill=none xmlns=http://www.w3.org/2000/svg><path d="M8 21h8m-4-4v4m-5.2-4h10.4c1.68 0 2.52 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 14.72 22 13.88 22 12.2V7.8c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C19.72 3 18.88 3 17.2 3H6.8c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C2 5.28 2 6.12 2 7.8v4.4c0 1.68 0 2.52.327 3.162a3 3 0 0 0 1.311 1.311C4.28 17 5.12 17 6.8 17Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),ts=/*#__PURE__*/ e.O(`<svg stroke=currentColor fill=currentColor stroke-width=0 viewBox="0 0 24 24"height=1em width=1em xmlns=http://www.w3.org/2000/svg><path fill=none d="M0 0h24v24H0z"></path><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3a4.237 4.237 0 00-6 0zm-4-4l2 2a7.074 7.074 0 0110 0l2-2C15.14 9.14 8.87 9.14 5 13z">`),ns=/*#__PURE__*/ e.O(`<svg stroke-width=0 viewBox="0 0 24 24"height=1em width=1em xmlns=http://www.w3.org/2000/svg><path fill=none d="M24 .01c0-.01 0-.01 0 0L0 0v24h24V.01zM0 0h24v24H0V0zm0 0h24v24H0V0z"></path><path d="M22.99 9C19.15 5.16 13.8 3.76 8.84 4.78l2.52 2.52c3.47-.17 6.99 1.05 9.63 3.7l2-2zm-4 4a9.793 9.793 0 00-4.49-2.56l3.53 3.53.96-.97zM2 3.05L5.07 6.1C3.6 6.82 2.22 7.78 1 9l1.99 2c1.24-1.24 2.67-2.16 4.2-2.77l2.24 2.24A9.684 9.684 0 005 13v.01L6.99 15a7.042 7.042 0 014.92-2.06L18.98 20l1.27-1.26L3.29 1.79 2 3.05zM9 17l3 3 3-3a4.237 4.237 0 00-6 0z">`),rs=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9.3951 19.3711L9.97955 20.6856C10.1533 21.0768 10.4368 21.4093 10.7958 21.6426C11.1547 21.8759 11.5737 22.0001 12.0018 22C12.4299 22.0001 12.8488 21.8759 13.2078 21.6426C13.5667 21.4093 13.8503 21.0768 14.024 20.6856L14.6084 19.3711C14.8165 18.9047 15.1664 18.5159 15.6084 18.26C16.0532 18.0034 16.5678 17.8941 17.0784 17.9478L18.5084 18.1C18.9341 18.145 19.3637 18.0656 19.7451 17.8713C20.1265 17.6771 20.4434 17.3763 20.6573 17.0056C20.8715 16.635 20.9735 16.2103 20.9511 15.7829C20.9286 15.3555 20.7825 14.9438 20.5307 14.5978L19.684 13.4344C19.3825 13.0171 19.2214 12.5148 19.224 12C19.2239 11.4866 19.3865 10.9864 19.6884 10.5711L20.5351 9.40778C20.787 9.06175 20.933 8.65007 20.9555 8.22267C20.978 7.79528 20.8759 7.37054 20.6618 7C20.4479 6.62923 20.131 6.32849 19.7496 6.13423C19.3681 5.93997 18.9386 5.86053 18.5129 5.90556L17.0829 6.05778C16.5722 6.11141 16.0577 6.00212 15.6129 5.74556C15.17 5.48825 14.82 5.09736 14.6129 4.62889L14.024 3.31444C13.8503 2.92317 13.5667 2.59072 13.2078 2.3574C12.8488 2.12408 12.4299 1.99993 12.0018 2C11.5737 1.99993 11.1547 2.12408 10.7958 2.3574C10.4368 2.59072 10.1533 2.92317 9.97955 3.31444L9.3951 4.62889C9.18803 5.09736 8.83798 5.48825 8.3951 5.74556C7.95032 6.00212 7.43577 6.11141 6.9251 6.05778L5.49066 5.90556C5.06499 5.86053 4.6354 5.93997 4.25397 6.13423C3.87255 6.32849 3.55567 6.62923 3.34177 7C3.12759 7.37054 3.02555 7.79528 3.04804 8.22267C3.07052 8.65007 3.21656 9.06175 3.46844 9.40778L4.3151 10.5711C4.61704 10.9864 4.77964 11.4866 4.77955 12C4.77964 12.5134 4.61704 13.0137 4.3151 13.4289L3.46844 14.5922C3.21656 14.9382 3.07052 15.3499 3.04804 15.7773C3.02555 16.2047 3.12759 16.6295 3.34177 17C3.55589 17.3706 3.8728 17.6712 4.25417 17.8654C4.63554 18.0596 5.06502 18.1392 5.49066 18.0944L6.92066 17.9422C7.43133 17.8886 7.94587 17.9979 8.39066 18.2544C8.83519 18.511 9.18687 18.902 9.3951 19.3711Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round></path><path d="M12 15C13.6568 15 15 13.6569 15 12C15 10.3431 13.6568 9 12 9C10.3431 9 8.99998 10.3431 8.99998 12C8.99998 13.6569 10.3431 15 12 15Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),is=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M16 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V8M11.5 12.5L17 7M17 7H12M17 7V12M6.2 21H8.8C9.9201 21 10.4802 21 10.908 20.782C11.2843 20.5903 11.5903 20.2843 11.782 19.908C12 19.4802 12 18.9201 12 17.8V15.2C12 14.0799 12 13.5198 11.782 13.092C11.5903 12.7157 11.2843 12.4097 10.908 12.218C10.4802 12 9.92011 12 8.8 12H6.2C5.0799 12 4.51984 12 4.09202 12.218C3.71569 12.4097 3.40973 12.7157 3.21799 13.092C3 13.5198 3 14.0799 3 15.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),as=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path class=copier d="M8 8V5.2C8 4.0799 8 3.51984 8.21799 3.09202C8.40973 2.71569 8.71569 2.40973 9.09202 2.21799C9.51984 2 10.0799 2 11.2 2H18.8C19.9201 2 20.4802 2 20.908 2.21799C21.2843 2.40973 21.5903 2.71569 21.782 3.09202C22 3.51984 22 4.0799 22 5.2V12.8C22 13.9201 22 14.4802 21.782 14.908C21.5903 15.2843 21.2843 15.5903 20.908 15.782C20.4802 16 19.9201 16 18.8 16H16M5.2 22H12.8C13.9201 22 14.4802 22 14.908 21.782C15.2843 21.5903 15.5903 21.2843 15.782 20.908C16 20.4802 16 19.9201 16 18.8V11.2C16 10.0799 16 9.51984 15.782 9.09202C15.5903 8.71569 15.2843 8.40973 14.908 8.21799C14.4802 8 13.9201 8 12.8 8H5.2C4.0799 8 3.51984 8 3.09202 8.21799C2.71569 8.40973 2.40973 8.71569 2.21799 9.09202C2 9.51984 2 10.0799 2 11.2V18.8C2 19.9201 2 20.4802 2.21799 20.908C2.40973 21.2843 2.71569 21.5903 3.09202 21.782C3.51984 22 4.07989 22 5.2 22Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round stroke=currentColor>`),os=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M2.5 21.4998L8.04927 19.3655C8.40421 19.229 8.58168 19.1607 8.74772 19.0716C8.8952 18.9924 9.0358 18.901 9.16804 18.7984C9.31692 18.6829 9.45137 18.5484 9.72028 18.2795L21 6.99982C22.1046 5.89525 22.1046 4.10438 21 2.99981C19.8955 1.89525 18.1046 1.89524 17 2.99981L5.72028 14.2795C5.45138 14.5484 5.31692 14.6829 5.20139 14.8318C5.09877 14.964 5.0074 15.1046 4.92823 15.2521C4.83911 15.4181 4.77085 15.5956 4.63433 15.9506L2.5 21.4998ZM2.5 21.4998L4.55812 16.1488C4.7054 15.7659 4.77903 15.5744 4.90534 15.4867C5.01572 15.4101 5.1523 15.3811 5.2843 15.4063C5.43533 15.4351 5.58038 15.5802 5.87048 15.8703L8.12957 18.1294C8.41967 18.4195 8.56472 18.5645 8.59356 18.7155C8.61877 18.8475 8.58979 18.9841 8.51314 19.0945C8.42545 19.2208 8.23399 19.2944 7.85107 19.4417L2.5 21.4998Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),ss=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M7.5 12L10.5 15L16.5 9M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),cs=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9 9L15 15M15 9L9 15M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z"stroke=#F04438 stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),ls=/*#__PURE__*/ e.O(`<svg width=24 height=24 viewBox="0 0 24 24"fill=none stroke=currentColor stroke-width=2 xmlns=http://www.w3.org/2000/svg><rect class=list width=20 height=20 y=2 x=2 rx=2></rect><line class=list-item y1=7 y2=7 x1=6 x2=18></line><line class=list-item y2=12 y1=12 x1=6 x2=18></line><line class=list-item y1=17 y2=17 x1=6 x2=18>`),us=/*#__PURE__*/ e.O(`<svg viewBox="0 0 24 24"height=20 width=20 fill=none xmlns=http://www.w3.org/2000/svg><path d="M3 7.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C5.28 3 6.12 3 7.8 3h8.4c1.68 0 2.52 0 3.162.327a3 3 0 0 1 1.311 1.311C21 5.28 21 6.12 21 7.8v8.4c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C18.72 21 17.88 21 16.2 21H7.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C3 18.72 3 17.88 3 16.2V7.8Z"stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),ds=/*#__PURE__*/ e.O(`<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M7.5 12L10.5 15L16.5 9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),fs=/*#__PURE__*/ e.O(`<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M12 2V6M12 18V22M6 12H2M22 12H18M19.0784 19.0784L16.25 16.25M19.0784 4.99994L16.25 7.82837M4.92157 19.0784L7.75 16.25M4.92157 4.99994L7.75 7.82837"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round></path><animateTransform attributeName=transform attributeType=XML type=rotate from=0 to=360 dur=2s repeatCount=indefinite>`),ps=/*#__PURE__*/ e.O(`<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M15 9L9 15M9 9L15 15M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),ms=/*#__PURE__*/ e.O(`<svg width=14 height=14 viewBox="0 0 24 24"fill=none xmlns=http://www.w3.org/2000/svg><path d="M9.5 15V9M14.5 15V9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"stroke=currentColor stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),hs=/*#__PURE__*/ e.O(`<svg version=1.0 viewBox="0 0 633 633"><linearGradient x1=-666.45 x2=-666.45 y1=163.28 y2=163.99 gradientTransform="matrix(633 0 0 633 422177 -103358)"gradientUnits=userSpaceOnUse><stop stop-color=#6BDAFF offset=0></stop><stop stop-color=#F9FFB5 offset=.32></stop><stop stop-color=#FFA770 offset=.71></stop><stop stop-color=#FF7373 offset=1></stop></linearGradient><circle cx=316.5 cy=316.5 r=316.5></circle><defs><filter x=-137.5 y=412 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=412 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=610.5 rx=214.5 ry=186 fill=#015064 stroke=#00CFE2 stroke-width=25></ellipse></g><defs><filter x=316.5 y=412 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=412 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=610.5 rx=214.5 ry=186 fill=#015064 stroke=#00CFE2 stroke-width=25></ellipse></g><defs><filter x=-137.5 y=450 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=450 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=648.5 rx=214.5 ry=186 fill=#015064 stroke=#00A8B8 stroke-width=25></ellipse></g><defs><filter x=316.5 y=450 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=450 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=648.5 rx=214.5 ry=186 fill=#015064 stroke=#00A8B8 stroke-width=25></ellipse></g><defs><filter x=-137.5 y=486 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=-137.5 y=486 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=89.5 cy=684.5 rx=214.5 ry=186 fill=#015064 stroke=#007782 stroke-width=25></ellipse></g><defs><filter x=316.5 y=486 width=454 height=396.9 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=316.5 y=486 width=454 height=396.9 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><ellipse cx=543.5 cy=684.5 rx=214.5 ry=186 fill=#015064 stroke=#007782 stroke-width=25></ellipse></g><defs><filter x=272.2 y=308 width=176.9 height=129.3 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=272.2 y=308 width=176.9 height=129.3 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><line x1=436 x2=431 y1=403.2 y2=431.8 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><line x1=291 x2=280 y1=341.5 y2=403.5 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><line x1=332.9 x2=328.6 y1=384.1 y2=411.2 fill=none stroke=#000 stroke-linecap=round stroke-linejoin=bevel stroke-width=11></line><linearGradient x1=-670.75 x2=-671.59 y1=164.4 y2=164.49 gradientTransform="matrix(-184.16 -32.472 -11.461 64.997 -121359 -32126)"gradientUnits=userSpaceOnUse><stop stop-color=#EE2700 offset=0></stop><stop stop-color=#FF008E offset=1></stop></linearGradient><path d="m344.1 363 97.7 17.2c5.8 2.1 8.2 6.1 7.1 12.1s-4.7 9.2-11 9.9l-106-18.7-57.5-59.2c-3.2-4.8-2.9-9.1 0.8-12.8s8.3-4.4 13.7-2.1l55.2 53.6z"clip-rule=evenodd fill-rule=evenodd></path><line x1=428.2 x2=429.1 y1=384.5 y2=378 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=395.2 x2=396.1 y1=379.5 y2=373 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=362.2 x2=363.1 y1=373.5 y2=367.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=324.2 x2=328.4 y1=351.3 y2=347.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line><line x1=303.2 x2=307.4 y1=331.3 y2=327.4 fill=none stroke=#fff stroke-linecap=round stroke-linejoin=bevel stroke-width=7></line></g><defs><filter x=73.2 y=113.8 width=280.6 height=317.4 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=73.2 y=113.8 width=280.6 height=317.4 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-672.16 x2=-672.16 y1=165.03 y2=166.03 gradientTransform="matrix(-100.18 48.861 97.976 200.88 -83342 -93.059)"gradientUnits=userSpaceOnUse><stop stop-color=#A17500 offset=0></stop><stop stop-color=#5D2100 offset=1></stop></linearGradient><path d="m192.3 203c8.1 37.3 14 73.6 17.8 109.1 3.8 35.4 2.8 75.1-3 119.2l61.2-16.7c-15.6-59-25.2-97.9-28.6-116.6s-10.8-51.9-22.1-99.6l-25.3 4.6"clip-rule=evenodd fill-rule=evenodd></path><g stroke=#2F8A00><linearGradient x1=-660.23 x2=-660.23 y1=166.72 y2=167.72 gradientTransform="matrix(92.683 4.8573 -2.0259 38.657 61680 -3088.6)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m195 183.9s-12.6-22.1-36.5-29.9c-15.9-5.2-34.4-1.5-55.5 11.1 15.9 14.3 29.5 22.6 40.7 24.9 16.8 3.6 51.3-6.1 51.3-6.1z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-661.36 x2=-661.36 y1=164.18 y2=165.18 gradientTransform="matrix(110 5.7648 -6.3599 121.35 73933 -15933)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5s-47.5-8.5-83.2 15.7c-23.8 16.2-34.3 49.3-31.6 99.4 30.3-27.8 52.1-48.5 65.2-61.9 19.8-20.2 49.6-53.2 49.6-53.2z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-656.79 x2=-656.79 y1=165.15 y2=166.15 gradientTransform="matrix(62.954 3.2993 -3.5023 66.828 42156 -8754.1)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m195 183.9c-0.8-21.9 6-38 20.6-48.2s29.8-15.4 45.5-15.3c-6.1 21.4-14.5 35.8-25.2 43.4s-24.4 14.2-40.9 20.1z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-663.07 x2=-663.07 y1=165.44 y2=166.44 gradientTransform="matrix(152.47 7.9907 -3.0936 59.029 101884 -4318.7)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c31.9-30 64.1-39.7 96.7-29s50.8 30.4 54.6 59.1c-35.2-5.5-60.4-9.6-75.8-12.1-15.3-2.6-40.5-8.6-75.5-18z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-662.57 x2=-662.57 y1=164.44 y2=165.44 gradientTransform="matrix(136.46 7.1517 -5.2163 99.533 91536 -11442)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c35.8-7.6 65.6-0.2 89.2 22s37.7 49 42.3 80.3c-39.8-9.7-68.3-23.8-85.5-42.4s-32.5-38.5-46-59.9z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><linearGradient x1=-656.43 x2=-656.43 y1=163.86 y2=164.86 gradientTransform="matrix(60.866 3.1899 -8.7773 167.48 41560 -25168)"gradientUnits=userSpaceOnUse><stop stop-color=#2F8A00 offset=0></stop><stop stop-color=#90FF57 offset=1></stop></linearGradient><path d="m194.9 184.5c-33.6 13.8-53.6 35.7-60.1 65.6s-3.6 63.1 8.7 99.6c27.4-40.3 43.2-69.6 47.4-88s5.6-44.1 4-77.2z"clip-rule=evenodd fill-rule=evenodd stroke-width=13></path><path d="m196.5 182.3c-14.8 21.6-25.1 41.4-30.8 59.4s-9.5 33-11.1 45.1"fill=none stroke-linecap=round stroke-width=8></path><path d="m194.9 185.7c-24.4 1.7-43.8 9-58.1 21.8s-24.7 25.4-31.3 37.8"fill=none stroke-linecap=round stroke-width=8></path><path d="m204.5 176.4c29.7-6.7 52-8.4 67-5.1s26.9 8.6 35.8 15.9"fill=none stroke-linecap=round stroke-width=8></path><path d="m196.5 181.4c20.3 9.9 38.2 20.5 53.9 31.9s27.4 22.1 35.1 32"fill=none stroke-linecap=round stroke-width=8></path></g></g><defs><filter x=50.5 y=399 width=532 height=633 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=50.5 y=399 width=532 height=633 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-666.06 x2=-666.23 y1=163.36 y2=163.75 gradientTransform="matrix(532 0 0 633 354760 -102959)"gradientUnits=userSpaceOnUse><stop stop-color=#FFF400 offset=0></stop><stop stop-color=#3C8700 offset=1></stop></linearGradient><ellipse cx=316.5 cy=715.5 rx=266 ry=316.5></ellipse></g><defs><filter x=391 y=-24 width=288 height=283 filterUnits=userSpaceOnUse><feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"></feColorMatrix></filter></defs><mask x=391 y=-24 width=288 height=283 maskUnits=userSpaceOnUse><g><circle cx=316.5 cy=316.5 r=316.5 fill=#fff></circle></g></mask><g><linearGradient x1=-664.56 x2=-664.56 y1=163.79 y2=164.79 gradientTransform="matrix(227 0 0 227 151421 -37204)"gradientUnits=userSpaceOnUse><stop stop-color=#FFDF00 offset=0></stop><stop stop-color=#FF9D00 offset=1></stop></linearGradient><circle cx=565.5 cy=89.5 r=113.5></circle><linearGradient x1=-644.5 x2=-645.77 y1=342 y2=342 gradientTransform="matrix(30 0 0 1 19770 -253)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=427 x2=397 y1=89 y2=89 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-641.56 x2=-642.83 y1=196.02 y2=196.07 gradientTransform="matrix(26.5 0 0 5.5 17439 -1025.5)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=430.5 x2=404 y1=55.5 y2=50 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-643.73 x2=-645 y1=185.83 y2=185.9 gradientTransform="matrix(29 0 0 8 19107 -1361)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=431 x2=402 y1=122 y2=130 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-638.94 x2=-640.22 y1=177.09 y2=177.39 gradientTransform="matrix(24 0 0 13 15783 -2145)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=442 x2=418 y1=153 y2=166 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-633.42 x2=-634.7 y1=172.41 y2=173.31 gradientTransform="matrix(20 0 0 19 13137 -3096)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=464 x2=444 y1=180 y2=199 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-619.05 x2=-619.52 y1=170.82 y2=171.82 gradientTransform="matrix(13.83 0 0 22.85 9050 -3703.4)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=491.4 x2=477.5 y1=203 y2=225.9 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=-578.5 x2=-578.63 y1=170.31 y2=171.31 gradientTransform="matrix(7.5 0 0 24.5 4860 -3953)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=524.5 x2=517 y1=219.5 y2=244 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12></line><linearGradient x1=666.5 x2=666.5 y1=170.31 y2=171.31 gradientTransform="matrix(.5 0 0 24.5 231.5 -3944)"gradientUnits=userSpaceOnUse><stop stop-color=#FFA400 offset=0></stop><stop stop-color=#FF5E00 offset=1></stop></linearGradient><line x1=564.5 x2=565 y1=228.5 y2=253 fill=none stroke-linecap=round stroke-linejoin=bevel stroke-width=12>`);function gs(){return Go()}function _s(){return Ko()}function vs(){return qo()}function ys(){return Jo()}function bs(){return Yo()}function xs(){return Xo()}function Ss(){return Zo()}function Cs(){return Qo()}function ws(){return $o()}function Ts(){return es()}function Es(){return ts()}function Ds(){return ns()}function Os(){return rs()}function ks(){return is()}function As(){return as()}function js(){return os()}function Ms(t){return(()=>{var n=ss(),r=n.firstChild;return e.H(()=>e.T(r,`stroke`,t.theme===`dark`?`#12B76A`:`#027A48`)),n})()}function Ns(){return cs()}function Ps(){return ls()}function Fs(t){return[e.L(e.P,{get when(){return t.checked},get children(){var n=ss(),r=n.firstChild;return e.H(()=>e.T(r,`stroke`,t.theme===`dark`?`#9B8AFB`:`#6938EF`)),n}}),e.L(e.P,{get when(){return!t.checked},get children(){var n=us(),r=n.firstChild;return e.H(()=>e.T(r,`stroke`,t.theme===`dark`?`#9B8AFB`:`#6938EF`)),n}})]}function Is(){return ds()}function Ls(){return fs()}function Rs(){return ps()}function zs(){return ms()}function Bs(){let t=e.G();return(()=>{var n=hs(),r=n.firstChild,i=r.nextSibling,a=i.nextSibling,o=a.firstChild,s=a.nextSibling,c=s.firstChild,l=s.nextSibling,u=l.nextSibling,d=u.firstChild,f=u.nextSibling,p=f.firstChild,m=f.nextSibling,h=m.nextSibling,g=h.firstChild,_=h.nextSibling,v=_.firstChild,y=_.nextSibling,b=y.nextSibling,x=b.firstChild,S=b.nextSibling,C=S.firstChild,w=S.nextSibling,T=w.nextSibling,E=T.firstChild,D=T.nextSibling,O=D.firstChild,k=D.nextSibling,A=k.nextSibling,j=A.firstChild,M=A.nextSibling,N=M.firstChild,P=M.nextSibling,F=P.nextSibling,ee=F.firstChild,te=F.nextSibling,I=te.firstChild,ne=te.nextSibling,L=ne.firstChild.nextSibling.nextSibling.nextSibling,re=L.nextSibling,ie=ne.nextSibling,R=ie.firstChild,ae=ie.nextSibling,oe=ae.firstChild,se=ae.nextSibling,ce=se.firstChild,le=ce.nextSibling,ue=le.nextSibling.firstChild,de=ue.nextSibling,fe=de.nextSibling,pe=fe.nextSibling,me=pe.nextSibling,he=me.nextSibling,ge=he.nextSibling,_e=ge.nextSibling,ve=_e.nextSibling,ye=ve.nextSibling,be=ye.nextSibling,xe=be.nextSibling,Se=se.nextSibling,Ce=Se.firstChild,we=Se.nextSibling,Te=we.firstChild,Ee=we.nextSibling,De=Ee.firstChild,Oe=De.nextSibling,ke=Ee.nextSibling,Ae=ke.firstChild,je=ke.nextSibling,Me=je.firstChild,Ne=je.nextSibling,Pe=Ne.firstChild,Fe=Pe.nextSibling,Ie=Fe.nextSibling,Le=Ie.nextSibling,Re=Le.nextSibling,ze=Re.nextSibling,Be=ze.nextSibling,Ve=Be.nextSibling,z=Ve.nextSibling,B=z.nextSibling,He=B.nextSibling,V=He.nextSibling,Ue=V.nextSibling,We=Ue.nextSibling,Ge=We.nextSibling,Ke=Ge.nextSibling,qe=Ke.nextSibling,Je=qe.nextSibling;return e.T(r,`id`,`a-${t}`),e.T(i,`fill`,`url(#a-${t})`),e.T(o,`id`,`am-${t}`),e.T(s,`id`,`b-${t}`),e.T(c,`filter`,`url(#am-${t})`),e.T(l,`mask`,`url(#b-${t})`),e.T(d,`id`,`ah-${t}`),e.T(f,`id`,`k-${t}`),e.T(p,`filter`,`url(#ah-${t})`),e.T(m,`mask`,`url(#k-${t})`),e.T(g,`id`,`ae-${t}`),e.T(_,`id`,`j-${t}`),e.T(v,`filter`,`url(#ae-${t})`),e.T(y,`mask`,`url(#j-${t})`),e.T(x,`id`,`ai-${t}`),e.T(S,`id`,`i-${t}`),e.T(C,`filter`,`url(#ai-${t})`),e.T(w,`mask`,`url(#i-${t})`),e.T(E,`id`,`aj-${t}`),e.T(D,`id`,`h-${t}`),e.T(O,`filter`,`url(#aj-${t})`),e.T(k,`mask`,`url(#h-${t})`),e.T(j,`id`,`ag-${t}`),e.T(M,`id`,`g-${t}`),e.T(N,`filter`,`url(#ag-${t})`),e.T(P,`mask`,`url(#g-${t})`),e.T(ee,`id`,`af-${t}`),e.T(te,`id`,`f-${t}`),e.T(I,`filter`,`url(#af-${t})`),e.T(ne,`mask`,`url(#f-${t})`),e.T(L,`id`,`m-${t}`),e.T(re,`fill`,`url(#m-${t})`),e.T(R,`id`,`ak-${t}`),e.T(ae,`id`,`e-${t}`),e.T(oe,`filter`,`url(#ak-${t})`),e.T(se,`mask`,`url(#e-${t})`),e.T(ce,`id`,`n-${t}`),e.T(le,`fill`,`url(#n-${t})`),e.T(ue,`id`,`r-${t}`),e.T(de,`fill`,`url(#r-${t})`),e.T(fe,`id`,`s-${t}`),e.T(pe,`fill`,`url(#s-${t})`),e.T(me,`id`,`q-${t}`),e.T(he,`fill`,`url(#q-${t})`),e.T(ge,`id`,`p-${t}`),e.T(_e,`fill`,`url(#p-${t})`),e.T(ve,`id`,`o-${t}`),e.T(ye,`fill`,`url(#o-${t})`),e.T(be,`id`,`l-${t}`),e.T(xe,`fill`,`url(#l-${t})`),e.T(Ce,`id`,`al-${t}`),e.T(we,`id`,`d-${t}`),e.T(Te,`filter`,`url(#al-${t})`),e.T(Ee,`mask`,`url(#d-${t})`),e.T(De,`id`,`u-${t}`),e.T(Oe,`fill`,`url(#u-${t})`),e.T(Ae,`id`,`ad-${t}`),e.T(je,`id`,`c-${t}`),e.T(Me,`filter`,`url(#ad-${t})`),e.T(Ne,`mask`,`url(#c-${t})`),e.T(Pe,`id`,`t-${t}`),e.T(Fe,`fill`,`url(#t-${t})`),e.T(Ie,`id`,`v-${t}`),e.T(Le,`stroke`,`url(#v-${t})`),e.T(Re,`id`,`aa-${t}`),e.T(ze,`stroke`,`url(#aa-${t})`),e.T(Be,`id`,`w-${t}`),e.T(Ve,`stroke`,`url(#w-${t})`),e.T(z,`id`,`ac-${t}`),e.T(B,`stroke`,`url(#ac-${t})`),e.T(He,`id`,`ab-${t}`),e.T(V,`stroke`,`url(#ab-${t})`),e.T(Ue,`id`,`y-${t}`),e.T(We,`stroke`,`url(#y-${t})`),e.T(Ge,`id`,`x-${t}`),e.T(Ke,`stroke`,`url(#x-${t})`),e.T(qe,`id`,`z-${t}`),e.T(Je,`stroke`,`url(#z-${t})`),n})()}const Vs=Object.keys(e.f)[0],Hs=Object.keys(e.u)[0],Us=e.z({client:void 0,onlineManager:void 0,queryFlavor:``,version:``,shadowDOMTarget:void 0});function X(){return e.et(Us)}var Ws=class extends Error{};const Gs=e.z(void 0),Ks=t=>{let[n,r]=e.W(null),i=()=>{let e=n();e!=null&&(e.close(),t.setLocalStore(`pip_open`,`false`),r(null))},a=(i,a)=>{if(n()!=null)return;let o=window.open(``,`TSQD-Devtools-Panel`,`width=${i},height=${a},popup`);if(!o)throw new Ws(`Failed to open popup. Please allow popups for this site to view the devtools in picture-in-picture mode.`);o.document.head.innerHTML=``,o.document.body.innerHTML=``,e.b(o.document),o.document.title=`TanStack Query Devtools`,o.document.body.style.margin=`0`,o.addEventListener(`pagehide`,()=>{t.setLocalStore(`pip_open`,`false`),r(null)}),[...(X().shadowDOMTarget||document).styleSheets].forEach(e=>{try{let t=[...e.cssRules].map(e=>e.cssText).join(``),n=document.createElement(`style`),r=e.ownerNode,i=``;r&&`id`in r&&(i=r.id),i&&n.setAttribute(`id`,i),n.textContent=t,o.document.head.appendChild(n)}catch{let t=document.createElement(`link`);if(e.href==null)return;t.rel=`stylesheet`,t.type=e.type,t.media=e.media.toString(),t.href=e.href,o.document.head.appendChild(t)}}),e.x([`focusin`,`focusout`,`pointermove`,`keydown`,`pointerdown`,`pointerup`,`click`,`mousedown`,`input`],o.document),t.setLocalStore(`pip_open`,`true`),r(o)};e.B(()=>{if((t.localStore.pip_open??`false`)===`true`&&!t.disabled)try{a(Number(window.innerWidth),Number(t.localStore.height||500))}catch(e){if(e instanceof Ws){t.setLocalStore(`pip_open`,`false`),t.setLocalStore(`open`,`false`);return}throw e}}),e.B(()=>{let t=(X().shadowDOMTarget||document).querySelector(`#_goober`),r=n();if(t&&r){let n=new MutationObserver(()=>{let e=(X().shadowDOMTarget||r.document).querySelector(`#_goober`);e&&(e.textContent=t.textContent)});n.observe(t,{childList:!0,subtree:!0,characterDataOldValue:!0}),e.X(()=>{n.disconnect()})}});let o=e.V(()=>({pipWindow:n(),requestPipWindow:a,closePipWindow:i,disabled:t.disabled??!1}));return e.L(Gs.Provider,{value:o,get children(){return t.children}})},qs=()=>e.V(()=>{let t=e.et(Gs);if(!t)throw Error(`usePiPWindow must be used within a PiPProvider`);return t()}),Js=e.z(()=>`dark`);function Z(){return e.et(Js)}var Ys=/*#__PURE__*/ e.O(`<span><svg width=16 height=16 viewBox="0 0 16 16"fill=none xmlns=http://www.w3.org/2000/svg><path d="M6 12L10 8L6 4"stroke-width=2 stroke-linecap=round stroke-linejoin=round>`),Xs=/*#__PURE__*/ e.O(`<button title="Copy object to clipboard">`),Zs=/*#__PURE__*/ e.O(`<button title="Remove all items"aria-label="Remove all items">`),Qs=/*#__PURE__*/ e.O(`<button title="Delete item"aria-label="Delete item">`),$s=/*#__PURE__*/ e.O(`<button title="Toggle value"aria-label="Toggle value">`),ec=/*#__PURE__*/ e.O(`<button title="Bulk Edit Data"aria-label="Bulk Edit Data">`),tc=/*#__PURE__*/ e.O(`<div>`),nc=/*#__PURE__*/ e.O(`<div><button> <span></span> <span> `),rc=/*#__PURE__*/ e.O(`<input>`),ic=/*#__PURE__*/ e.O(`<span>`),ac=/*#__PURE__*/ e.O(`<div><label>:`),oc=/*#__PURE__*/ e.O(`<div><div><button> [<!>...<!>]`);function sc(e,t){if(t<1)return[];let n=0,r=[];for(;n<e.length;)r.push(e.slice(n,n+t)),n+=t;return r}const cc=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?_c(r):gc(r));return(()=>{var n=Ys();return e.H(()=>e.y(n,L(i().expander,r`
          transform: rotate(${t.expanded?90:0}deg);
        `,t.expanded&&r`
            & svg {
              top: -1px;
            }
          `))),n})()},lc=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?_c(r):gc(r)),[a,o]=e.W(`NoCopy`);return(()=>{var r=Xs();return e.v(r,`click`,a()===`NoCopy`?()=>{navigator.clipboard.writeText(e.h(t.value)).then(()=>{o(`SuccessCopy`),setTimeout(()=>{o(`NoCopy`)},1500)},e=>{o(`ErrorCopy`),setTimeout(()=>{o(`NoCopy`)},1500)})}:void 0,!0),e.S(r,e.L(e.F,{get children(){return[e.L(e.N,{get when(){return a()===`NoCopy`},get children(){return e.L(As,{})}}),e.L(e.N,{get when(){return a()===`SuccessCopy`},get children(){return e.L(Ms,{get theme(){return n()}})}}),e.L(e.N,{get when(){return a()===`ErrorCopy`},get children(){return e.L(Ns,{})}})]}})),e.H(t=>{var n=i().actionButton,o=`${a()===`NoCopy`?`Copy object to clipboard`:a()===`SuccessCopy`?`Object copied to clipboard`:`Error copying object to clipboard`}`;return n!==t.e&&e.y(r,t.e=n),o!==t.t&&e.T(r,`aria-label`,t.t=o),t},{e:void 0,t:void 0}),r})()},uc=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?_c(r):gc(r)),a=X().client;return(()=>{var n=Zs();return n.$$click=()=>{let n=t.activeQuery.state.data,r=e.p(n,t.dataPath,[]);a.setQueryData(t.activeQuery.queryKey,r)},e.S(n,e.L(Ps,{})),e.H(()=>e.y(n,i().actionButton)),n})()},dc=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?_c(r):gc(r)),a=X().client;return(()=>{var n=Qs();return n.$$click=()=>{let n=t.activeQuery.state.data,r=e.n(n,t.dataPath);a.setQueryData(t.activeQuery.queryKey,r)},e.S(n,e.L(_s,{})),e.H(()=>e.y(n,L(i().actionButton))),n})()},fc=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?_c(r):gc(r)),a=X().client;return(()=>{var o=$s();return o.$$click=()=>{let n=t.activeQuery.state.data,r=e.p(n,t.dataPath,!t.value);a.setQueryData(t.activeQuery.queryKey,r)},e.S(o,e.L(Fs,{get theme(){return n()},get checked(){return t.value}})),e.H(()=>e.y(o,L(i().actionButton,r`
          width: ${Y.size[3.5]};
          height: ${Y.size[3.5]};
        `))),o})()};function pc(e){return Symbol.iterator in e}function mc(t){let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?_c(r):gc(r)),a=X().client,[o,s]=e.W((t.defaultExpanded||[]).includes(t.label)),c=()=>s(e=>!e),[l,u]=e.W([]),d=e.V(()=>Array.isArray(t.value)?t.value.map((e,t)=>({label:t.toString(),value:e})):t.value!==null&&typeof t.value==`object`&&pc(t.value)&&typeof t.value[Symbol.iterator]==`function`?t.value instanceof Map?Array.from(t.value,([e,t])=>({label:e,value:t})):Array.from(t.value,(e,t)=>({label:t.toString(),value:e})):typeof t.value==`object`&&t.value!==null?Object.entries(t.value).map(([e,t])=>({label:e,value:t})):[]),f=e.V(()=>Array.isArray(t.value)?`array`:t.value!==null&&typeof t.value==`object`&&pc(t.value)&&typeof t.value[Symbol.iterator]==`function`?`Iterable`:typeof t.value==`object`&&t.value!==null?`object`:typeof t.value),p=e.V(()=>sc(d(),100)),m=t.dataPath??[],h=e.G();return(()=>{var n=tc();return e.S(n,e.L(e.P,{get when(){return p().length},get children(){return[(()=>{var n=nc(),r=n.firstChild,a=r.firstChild,s=a.nextSibling,l=s.nextSibling.nextSibling,u=l.firstChild;return r.$$click=()=>c(),e.S(r,e.L(cc,{get expanded(){return o()}}),a),e.S(s,()=>t.label),e.S(l,()=>String(f()).toLowerCase()===`iterable`?`(Iterable) `:``,u),e.S(l,()=>d().length,u),e.S(l,()=>d().length>1?`items`:`item`,null),e.S(n,e.L(e.P,{get when(){return t.editable},get children(){var n=tc();return e.S(n,e.L(lc,{get value(){return t.value}}),null),e.S(n,e.L(e.P,{get when(){return e.C(()=>!!t.itemsDeletable)()&&t.activeQuery!==void 0},get children(){return e.L(dc,{get activeQuery(){return t.activeQuery},dataPath:m})}}),null),e.S(n,e.L(e.P,{get when(){return e.C(()=>f()===`array`)()&&t.activeQuery!==void 0},get children(){return e.L(uc,{get activeQuery(){return t.activeQuery},dataPath:m})}}),null),e.S(n,e.L(e.P,{get when(){return e.C(()=>!!t.onEdit)()&&!e.m(t.value).meta},get children(){var n=ec();return n.$$click=()=>{t.onEdit?.()},e.S(n,e.L(js,{})),e.H(()=>e.y(n,i().actionButton)),n}}),null),e.H(()=>e.y(n,i().actions)),n}}),null),e.H(t=>{var a=i().expanderButtonContainer,s=i().expanderButton,c=o()?`true`:`false`,u=i().info;return a!==t.e&&e.y(n,t.e=a),s!==t.t&&e.y(r,t.t=s),c!==t.a&&e.T(r,`aria-expanded`,t.a=c),u!==t.o&&e.y(l,t.o=u),t},{e:void 0,t:void 0,a:void 0,o:void 0}),n})(),e.L(e.P,{get when(){return o()},get children(){return[e.L(e.P,{get when(){return p().length===1},get children(){var n=tc();return e.S(n,e.L(ge,{get each(){return d()},by:e=>e.label,children:n=>e.L(mc,{get defaultExpanded(){return t.defaultExpanded},get label(){return n().label},get value(){return n().value},get editable(){return t.editable},get dataPath(){return[...m,n().label]},get activeQuery(){return t.activeQuery},get itemsDeletable(){return f()===`array`||f()===`Iterable`||f()===`object`}})})),e.H(()=>e.y(n,i().subEntry)),n}}),e.L(e.P,{get when(){return p().length>1},get children(){var n=tc();return e.S(n,e.L(e.M,{get each(){return p()},children:(n,r)=>(()=>{var a=oc(),o=a.firstChild,s=o.firstChild,c=s.firstChild,d=c.nextSibling,f=d.nextSibling.nextSibling;return f.nextSibling,s.$$click=()=>u(e=>e.includes(r)?e.filter(e=>e!==r):[...e,r]),e.S(s,e.L(cc,{get expanded(){return l().includes(r)}}),c),e.S(s,r*100,d),e.S(s,r*100+100-1,f),e.S(o,e.L(e.P,{get when(){return l().includes(r)},get children(){var r=tc();return e.S(r,e.L(ge,{get each(){return n()},by:e=>e.label,children:n=>e.L(mc,{get defaultExpanded(){return t.defaultExpanded},get label(){return n().label},get value(){return n().value},get editable(){return t.editable},get dataPath(){return[...m,n().label]},get activeQuery(){return t.activeQuery}})})),e.H(()=>e.y(r,i().subEntry)),r}}),null),e.H(t=>{var n=i().entry,r=i().expanderButton;return n!==t.e&&e.y(o,t.e=n),r!==t.t&&e.y(s,t.t=r),t},{e:void 0,t:void 0}),a})()})),e.H(()=>e.y(n,i().subEntry)),n}})]}})]}}),null),e.S(n,e.L(e.P,{get when(){return p().length===0},get children(){var n=ac(),r=n.firstChild,o=r.firstChild;return e.T(r,`for`,h),e.S(r,()=>t.label,o),e.S(n,e.L(e.P,{get when(){return e.C(()=>!!(t.editable&&t.activeQuery!==void 0))()&&(f()===`string`||f()===`number`||f()===`boolean`)},get fallback(){return(()=>{var n=ic();return e.S(n,()=>e.r(t.value)),e.H(()=>e.y(n,i().value)),n})()},get children(){return[e.L(e.P,{get when(){return e.C(()=>!!(t.editable&&t.activeQuery!==void 0))()&&(f()===`string`||f()===`number`)},get children(){var n=rc();return n.addEventListener(`change`,n=>{let r=t.activeQuery.state.data,i=e.p(r,m,f()===`number`?n.target.valueAsNumber:n.target.value);a.setQueryData(t.activeQuery.queryKey,i)}),e.T(n,`id`,h),e.H(t=>{var r=f()===`number`?`number`:`text`,a=L(i().value,i().editableInput);return r!==t.e&&e.T(n,`type`,t.e=r),a!==t.t&&e.y(n,t.t=a),t},{e:void 0,t:void 0}),e.H(()=>n.value=t.value),n}}),e.L(e.P,{get when(){return f()===`boolean`},get children(){var n=ic();return e.S(n,e.L(fc,{get activeQuery(){return t.activeQuery},dataPath:m,get value(){return t.value}}),null),e.S(n,()=>e.r(t.value),null),e.H(()=>e.y(n,L(i().value,i().actions,i().editableInput))),n}})]}}),null),e.S(n,e.L(e.P,{get when(){return e.C(()=>!!(t.editable&&t.itemsDeletable))()&&t.activeQuery!==void 0},get children(){return e.L(dc,{get activeQuery(){return t.activeQuery},dataPath:m})}}),null),e.H(t=>{var a=i().row,o=i().label;return a!==t.e&&e.y(n,t.e=a),o!==t.t&&e.y(r,t.t=o),t},{e:void 0,t:void 0}),n}}),null),e.H(()=>e.y(n,i().entry)),n})()}const hc=(e,t)=>{let{colors:n,font:r,size:i,border:a}=Y,o=(t,n)=>e===`light`?t:n;return{entry:t`
      & * {
        font-size: ${r.size.xs};
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
      }
      position: relative;
      outline: none;
      word-break: break-word;
    `,subEntry:t`
      margin: 0 0 0 0.5em;
      padding-left: 0.75em;
      border-left: 2px solid ${o(n.gray[300],n.darkGray[400])};
      /* outline: 1px solid ${n.teal[400]}; */
    `,expander:t`
      & path {
        stroke: ${n.gray[400]};
      }
      & svg {
        width: ${i[3]};
        height: ${i[3]};
      }
      display: inline-flex;
      align-items: center;
      transition: all 0.1s ease;
      /* outline: 1px solid ${n.blue[400]}; */
    `,expanderButtonContainer:t`
      display: flex;
      align-items: center;
      line-height: ${i[4]};
      min-height: ${i[4]};
      gap: ${i[2]};
    `,expanderButton:t`
      cursor: pointer;
      color: inherit;
      font: inherit;
      outline: inherit;
      height: ${i[5]};
      background: transparent;
      border: none;
      padding: 0;
      display: inline-flex;
      align-items: center;
      gap: ${i[1]};
      position: relative;
      /* outline: 1px solid ${n.green[400]}; */

      &:focus-visible {
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }

      & svg {
        position: relative;
        left: 1px;
      }
    `,info:t`
      color: ${o(n.gray[500],n.gray[500])};
      font-size: ${r.size.xs};
      margin-left: ${i[1]};
      /* outline: 1px solid ${n.yellow[400]}; */
    `,label:t`
      color: ${o(n.gray[700],n.gray[300])};
      white-space: nowrap;
    `,value:t`
      color: ${o(n.purple[600],n.purple[400])};
      flex-grow: 1;
    `,actions:t`
      display: inline-flex;
      gap: ${i[2]};
      align-items: center;
    `,row:t`
      display: inline-flex;
      gap: ${i[2]};
      width: 100%;
      margin: ${i[.25]} 0px;
      line-height: ${i[4.5]};
      align-items: center;
    `,editableInput:t`
      border: none;
      padding: ${i[.5]} ${i[1]} ${i[.5]} ${i[1.5]};
      flex-grow: 1;
      border-radius: ${a.radius.xs};
      background-color: ${o(n.gray[200],n.darkGray[500])};

      &:hover {
        background-color: ${o(n.gray[300],n.darkGray[600])};
      }
    `,actionButton:t`
      background-color: transparent;
      color: ${o(n.gray[500],n.gray[500])};
      border: none;
      display: inline-flex;
      padding: 0px;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      width: ${i[3]};
      height: ${i[3]};
      position: relative;
      z-index: 1;

      &:hover svg {
        color: ${o(n.gray[600],n.gray[400])};
      }

      &:focus-visible {
        border-radius: ${a.radius.xs};
        outline: 2px solid ${n.blue[800]};
        outline-offset: 2px;
      }
    `}},gc=e=>hc(`light`,e),_c=e=>hc(`dark`,e);e.x([`click`]);var vc=/*#__PURE__*/ e.O(`<div><div aria-hidden=true></div><button type=button aria-label="Open Tanstack query devtools"class=tsqd-open-btn>`),yc=/*#__PURE__*/ e.O(`<div>`),bc=/*#__PURE__*/ e.O(`<div style=--tsqd-font-size:16px;max-height:100vh;height:100vh;width:100vw>`),xc=/*#__PURE__*/ e.O(`<div style=--tsqd-font-size:16px>`),Sc=/*#__PURE__*/ e.O(`<aside aria-label="Tanstack query devtools"><div role=separator aria-label="Resize devtools panel"tabindex=0></div><button aria-label="Close tanstack query devtools">`),Cc=/*#__PURE__*/ e.O(`<select name=tsqd-queries-filter-sort aria-label="Sort queries by">`),wc=/*#__PURE__*/ e.O(`<select name=tsqd-mutations-filter-sort aria-label="Sort mutations by">`),Tc=/*#__PURE__*/ e.O(`<span>Asc`),Ec=/*#__PURE__*/ e.O(`<span>Desc`),Dc=/*#__PURE__*/ e.O(`<button aria-label="Open in picture-in-picture mode"title="Open in picture-in-picture mode">`),Oc=/*#__PURE__*/ e.O(`<div>Settings`),kc=/*#__PURE__*/ e.O(`<span>Position`),Ac=/*#__PURE__*/ e.O(`<span>Top`),jc=/*#__PURE__*/ e.O(`<span>Bottom`),Mc=/*#__PURE__*/ e.O(`<span>Left`),Nc=/*#__PURE__*/ e.O(`<span>Right`),Pc=/*#__PURE__*/ e.O(`<span>Theme`),Fc=/*#__PURE__*/ e.O(`<span>Light`),Ic=/*#__PURE__*/ e.O(`<span>Dark`),Lc=/*#__PURE__*/ e.O(`<span>System`),Rc=/*#__PURE__*/ e.O(`<span>Disabled Queries`),zc=/*#__PURE__*/ e.O(`<span>Show`),Bc=/*#__PURE__*/ e.O(`<span>Hide`),Vc=/*#__PURE__*/ e.O(`<div><div class=tsqd-queries-container>`),Hc=/*#__PURE__*/ e.O(`<div><div class=tsqd-mutations-container>`),Uc=/*#__PURE__*/ e.O(`<div><div><div><button aria-label="Close Tanstack query devtools"><span>TANSTACK</span><span> v</span></button></div></div><div><div><div><input aria-label="Filter queries by query key"type=text placeholder=Filter name=tsqd-query-filter-input></div><div></div><button class=tsqd-query-filter-sort-order-btn></button></div><div><button aria-label="Clear query cache"></button><button>`),Wc=/*#__PURE__*/ e.O(`<option>Sort by `),Gc=/*#__PURE__*/ e.O(`<div class=tsqd-query-disabled-indicator aria-hidden=true>disabled`),Kc=/*#__PURE__*/ e.O(`<div class=tsqd-query-static-indicator aria-hidden=true>static`),qc=/*#__PURE__*/ e.O(`<button><div></div><code class=tsqd-query-hash>`),Jc=/*#__PURE__*/ e.O(`<div role=tooltip id=tsqd-status-tooltip>`),Yc=/*#__PURE__*/ e.O(`<span>`),Xc=/*#__PURE__*/ e.O(`<button><span aria-hidden=true></span><span>`),Zc=/*#__PURE__*/ e.O(`<button><span aria-hidden=true></span> Error`),Qc=/*#__PURE__*/ e.O(`<div><span aria-hidden=true></span>Trigger Error<select aria-label="Select error type to trigger"><option value disabled selected>`),$c=/*#__PURE__*/ e.O(`<div class="tsqd-query-details-explorer-container tsqd-query-details-data-explorer">`),el=/*#__PURE__*/ e.O(`<form><textarea name=data aria-label="Edit query data as JSON"></textarea><div><span></span><div><button type=button>Cancel</button><button>Save`),tl=/*#__PURE__*/ e.O(`<div><div role=heading aria-level=2>Query Details</div><div><div class=tsqd-query-details-summary><pre><code></code></pre><span role=status aria-live=polite></span></div><div class=tsqd-query-details-observers-count><span>Observers:</span><span></span></div><div class=tsqd-query-details-last-updated><span>Last Updated:</span><span></span></div></div><div role=heading aria-level=2>Actions</div><div><button><span aria-hidden=true></span>Refetch</button><button><span aria-hidden=true></span>Invalidate</button><button><span aria-hidden=true></span>Reset</button><button><span aria-hidden=true></span>Remove</button><button><span aria-hidden=true></span> Loading</button></div><div role=heading aria-level=2>Data </div><div role=heading aria-level=2>Query Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer">`),nl=/*#__PURE__*/ e.O(`<option>`),rl=/*#__PURE__*/ e.O(`<div><div role=heading aria-level=2>Mutation Details</div><div><div class=tsqd-query-details-summary><pre><code></code></pre><span role=status aria-live=polite></span></div><div class=tsqd-query-details-last-updated><span>Submitted At:</span><span></span></div></div><div role=heading aria-level=2>Variables Details</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div role=heading aria-level=2>Context Details</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div role=heading aria-level=2>Data Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer"></div><div role=heading aria-level=2>Mutations Explorer</div><div class="tsqd-query-details-explorer-container tsqd-query-details-query-explorer">`);const[Q,il]=e.W(null),[al,ol]=e.W(null),[sl,cl]=e.W(0),[ll,ul]=e.W(!1),dl=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?jl(r):Al(r)),a=e.V(()=>X().onlineManager);e.Z(()=>{let t=a().subscribe(e=>{ul(!e)});e.X(()=>{t()})});let o=qs(),s=e.V(()=>X().buttonPosition||`bottom-right`),c=e.V(()=>t.localStore.open===`true`?!0:t.localStore.open===`false`?!1:X().initialIsOpen||!1),l=e.V(()=>t.localStore.position||X().position||`bottom`),u;e.B(()=>{let e=u.parentElement,n=t.localStore.height||500,r=t.localStore.width||500,i=l();e.style.setProperty(`--tsqd-panel-height`,`${i===`top`?`-`:``}${n}px`),e.style.setProperty(`--tsqd-panel-width`,`${i===`left`?`-`:``}${r}px`)}),e.Z(()=>{let t=()=>{let e=u.parentElement,t=getComputedStyle(e).fontSize;e.style.setProperty(`--tsqd-font-size`,t)};t(),window.addEventListener(`focus`,t),e.X(()=>{window.removeEventListener(`focus`,t)})});let d=e.V(()=>t.localStore.pip_open??`false`);return[e.L(e.P,{get when(){return e.C(()=>!!o().pipWindow)()&&d()==`true`},get children(){return e.L(e._,{get mount(){return o().pipWindow?.document.body},get children(){return e.L(fl,{get children(){return e.L(hl,t)}})}})}}),(()=>{var n=yc(),a=u;return typeof a==`function`?e.k(a,n):u=n,e.S(n,e.L(fe,{name:`tsqd-panel-transition`,get children(){return e.L(e.P,{get when(){return e.C(()=>!(!c()||o().pipWindow))()&&d()==`false`},get children(){return e.L(ml,{get localStore(){return t.localStore},get setLocalStore(){return t.setLocalStore}})}})}}),null),e.S(n,e.L(fe,{name:`tsqd-button-transition`,get children(){return e.L(e.P,{get when(){return!c()},get children(){var n=vc(),r=n.firstChild,a=r.nextSibling;return e.S(r,e.L(Bs,{})),a.$$click=()=>t.setLocalStore(`open`,`true`),e.S(a,e.L(Bs,{})),e.H(()=>e.y(n,L(i().devtoolsBtn,i()[`devtoolsBtn-position-${s()}`],`tsqd-open-btn-container`))),n}})}}),null),e.H(()=>e.y(n,L(r`
            & .tsqd-panel-transition-exit-active,
            & .tsqd-panel-transition-enter-active {
              transition:
                opacity 0.3s,
                transform 0.3s;
            }

            & .tsqd-panel-transition-exit-to,
            & .tsqd-panel-transition-enter {
              ${l()===`top`||l()===`bottom`?`transform: translateY(var(--tsqd-panel-height));`:`transform: translateX(var(--tsqd-panel-width));`}
            }

            & .tsqd-button-transition-exit-active,
            & .tsqd-button-transition-enter-active {
              transition:
                opacity 0.3s,
                transform 0.3s;
              opacity: 1;
            }

            & .tsqd-button-transition-exit-to,
            & .tsqd-button-transition-enter {
              transform: ${s()===`relative`?`none;`:s()===`top-left`?`translateX(-72px);`:s()===`top-right`?`translateX(72px);`:`translateY(72px);`};
              opacity: 0;
            }
          `,`tsqd-transitions-container`))),n})()]},fl=t=>{let n=qs(),r=Z(),i=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,a=e.V(()=>r()===`dark`?jl(i):Al(i)),o=()=>{let{colors:e}=Y,t=(e,t)=>r()===`dark`?t:e;return sl()<796?i`
        flex-direction: column;
        background-color: ${t(e.gray[300],e.gray[600])};
      `:i`
      flex-direction: row;
      background-color: ${t(e.gray[200],e.darkGray[900])};
    `};return e.B(()=>{let t=n().pipWindow,r=()=>{t&&cl(t.innerWidth)};t&&(t.addEventListener(`resize`,r),r()),e.X(()=>{t&&t.removeEventListener(`resize`,r)})}),(()=>{var n=bc();return e.S(n,()=>t.children),e.H(()=>e.y(n,L(a().panel,o(),{[i`
            min-width: min-content;
          `]:sl()<700},`tsqd-main-panel`))),n})()},pl=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?jl(r):Al(r)),a;e.Z(()=>{be(a,({width:e},t)=>{t===a&&cl(e)})});let o=()=>{let{colors:e}=Y,t=(e,t)=>n()===`dark`?t:e;return sl()<796?r`
        flex-direction: column;
        background-color: ${t(e.gray[300],e.gray[600])};
      `:r`
      flex-direction: row;
      background-color: ${t(e.gray[200],e.darkGray[900])};
    `};return(()=>{var n=xc(),s=a;return typeof s==`function`?e.k(s,n):a=n,e.S(n,()=>t.children),e.H(()=>e.y(n,L(i().parentPanel,o(),{[r`
            min-width: min-content;
          `]:sl()<700},`tsqd-main-panel`))),n})()},ml=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?jl(r):Al(r)),a;e.Z(()=>{a.focus()});let[o,s]=e.W(!1),c=e.V(()=>t.localStore.position||X().position||`bottom`),l=n=>{let r=n.currentTarget.parentElement;if(!r)return;s(!0);let{height:i,width:a}=r.getBoundingClientRect(),l=n.clientX,u=n.clientY,d=0,f=e.t(3.5),p=e.t(12),m=e=>{if(e.preventDefault(),c()===`left`||c()===`right`){let n=c()===`right`?l-e.clientX:e.clientX-l;d=Math.round(a+n),d<p&&(d=p),t.setLocalStore(`width`,String(Math.round(d)));let i=r.getBoundingClientRect().width;Number(t.localStore.width)<i&&t.setLocalStore(`width`,String(i))}else{let n=c()===`bottom`?u-e.clientY:e.clientY-u;d=Math.round(i+n),d<f&&(d=f,il(null)),t.setLocalStore(`height`,String(Math.round(d)))}},h=()=>{o()&&s(!1),document.removeEventListener(`mousemove`,m,!1),document.removeEventListener(`mouseup`,h,!1)};document.addEventListener(`mousemove`,m,!1),document.addEventListener(`mouseup`,h,!1)},u;e.Z(()=>{be(u,({width:e},t)=>{t===u&&cl(e)})}),e.B(()=>{let n=u.parentElement?.parentElement?.parentElement;if(!n)return;let r=t.localStore.position||`bottom`,i=e.l(`padding`,r),a=t.localStore.position===`left`||t.localStore.position===`right`,o=(({padding:e,paddingTop:t,paddingBottom:n,paddingLeft:r,paddingRight:i})=>({padding:e,paddingTop:t,paddingBottom:n,paddingLeft:r,paddingRight:i}))(n.style);n.style[i]=`${a?t.localStore.width:t.localStore.height}px`,e.X(()=>{Object.entries(o).forEach(([e,t])=>{n.style[e]=t})})});let d=()=>{let{colors:e}=Y,t=(e,t)=>n()===`dark`?t:e;return sl()<796?r`
        flex-direction: column;
        background-color: ${t(e.gray[300],e.gray[600])};
      `:r`
      flex-direction: row;
      background-color: ${t(e.gray[200],e.darkGray[900])};
    `};return(()=>{var n=Sc(),o=n.firstChild,s=o.nextSibling,f=u;typeof f==`function`?e.k(f,n):u=n,o.$$keydown=n=>{let r=e.t(3.5),i=e.t(12);if(c()===`top`||c()===`bottom`){if(n.key===`ArrowUp`||n.key===`ArrowDown`){n.preventDefault();let e=Number(t.localStore.height||500),i=c()===`bottom`?n.key===`ArrowUp`?10:-10:n.key===`ArrowDown`?10:-10,a=Math.max(r,e+i);t.setLocalStore(`height`,String(a))}}else if(n.key===`ArrowLeft`||n.key===`ArrowRight`){n.preventDefault();let e=Number(t.localStore.width||500),r=c()===`right`?n.key===`ArrowLeft`?10:-10:n.key===`ArrowRight`?10:-10,a=Math.max(i,e+r);t.setLocalStore(`width`,String(a))}},o.$$mousedown=l,s.$$click=()=>t.setLocalStore(`open`,`false`);var p=a;return typeof p==`function`?e.k(p,s):a=s,e.S(s,e.L(vs,{})),e.S(n,e.L(hl,t),null),e.H(a=>{var l=L(i().panel,i()[`panel-position-${c()}`],d(),{[r`
            min-width: min-content;
          `]:sl()<700&&(c()===`right`||c()===`left`)},`tsqd-main-panel`),u=c()===`bottom`||c()===`top`?`${t.localStore.height||500}px`:`auto`,f=c()===`right`||c()===`left`?`${t.localStore.width||500}px`:`auto`,p=c()===`top`||c()===`bottom`?`horizontal`:`vertical`,m=c()===`top`||c()===`bottom`?e.t(3.5):e.t(12),h=c()===`top`||c()===`bottom`?Number(t.localStore.height||500):Number(t.localStore.width||500),g=L(i().dragHandle,i()[`dragHandle-position-${c()}`],`tsqd-drag-handle`),_=L(i().closeBtn,i()[`closeBtn-position-${c()}`],`tsqd-minimize-btn`);return l!==a.e&&e.y(n,a.e=l),u!==a.t&&e.E(n,`height`,a.t=u),f!==a.a&&e.E(n,`width`,a.a=f),p!==a.o&&e.T(o,`aria-orientation`,a.o=p),m!==a.i&&e.T(o,`aria-valuemin`,a.i=m),h!==a.n&&e.T(o,`aria-valuenow`,a.n=h),g!==a.s&&e.y(o,a.s=g),_!==a.h&&e.y(s,a.h=_),a},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0}),n})()},hl=t=>{wl(),El();let n,r=Z(),i=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,a=e.V(()=>r()===`dark`?jl(i):Al(i)),o=qs(),[s,c]=e.W(`queries`),l=e.V(()=>t.localStore.sort||Vs),u=e.V(()=>Number(t.localStore.sortOrder)||1),d=e.V(()=>t.localStore.mutationSort||Hs),f=e.V(()=>Number(t.localStore.mutationSortOrder)||1),p=e.V(()=>e.f[l()]),m=e.V(()=>e.u[d()]),h=e.V(()=>X().onlineManager),g=e.V(()=>X().client.getQueryCache()),_=e.V(()=>X().client.getMutationCache()),v=$(e=>e().getAll().length,!1),b=e.V(e.Y(()=>[v(),t.localStore.filter,l(),u(),t.localStore.hideDisabledQueries],()=>{let e=g().getAll(),n=t.localStore.filter?e.filter(e=>y(e.queryHash,t.localStore.filter||``).passed):[...e];return t.localStore.hideDisabledQueries===`true`&&(n=n.filter(e=>!e.isDisabled())),p()?n.sort((e,t)=>p()(e,t)*u()):n})),x=Dl(e=>e().getAll().length,!1),S=e.V(e.Y(()=>[x(),t.localStore.mutationFilter,d(),f()],()=>{let e=_().getAll(),n=t.localStore.mutationFilter?e.filter(e=>y(`${e.options.mutationKey?JSON.stringify(e.options.mutationKey)+` - `:``}${new Date(e.state.submittedAt).toLocaleString()}`,t.localStore.mutationFilter||``).passed):[...e];return m()?n.sort((e,t)=>m()(e,t)*f()):n})),C=e=>{t.setLocalStore(`position`,e)},w=e=>{let t=getComputedStyle(n).getPropertyValue(`--tsqd-font-size`);e.style.setProperty(`--tsqd-font-size`,t)};return[(()=>{var r=Uc(),p=r.firstChild,m=p.firstChild,v=m.firstChild,y=v.firstChild,x=y.nextSibling,T=x.firstChild,E=p.nextSibling,D=E.firstChild,O=D.firstChild,k=O.firstChild,A=O.nextSibling,j=A.nextSibling,M=D.nextSibling,N=M.firstChild,P=N.nextSibling,F=n;return typeof F==`function`?e.k(F,r):n=r,v.$$click=()=>{if(!o().pipWindow&&!t.showPanelViewOnly){t.setLocalStore(`open`,`false`);return}t.onClose&&t.onClose()},e.S(x,()=>X().queryFlavor,T),e.S(x,()=>X().version,null),e.S(m,e.L(La.Root,{get class(){return L(a().viewToggle)},get value(){return s()},"aria-label":`Toggle between queries and mutations view`,onChange:e=>{c(e),il(null),ol(null)},get children(){return[e.L(La.Item,{value:`queries`,class:`tsqd-radio-toggle`,get children(){return[e.L(La.ItemInput,{}),e.L(La.ItemControl,{get children(){return e.L(La.ItemIndicator,{})}}),e.L(La.ItemLabel,{title:`Toggle Queries View`,children:`Queries`})]}}),e.L(La.Item,{value:`mutations`,class:`tsqd-radio-toggle`,get children(){return[e.L(La.ItemInput,{}),e.L(La.ItemControl,{get children(){return e.L(La.ItemIndicator,{})}}),e.L(La.ItemLabel,{title:`Toggle Mutations View`,children:`Mutations`})]}})]}}),null),e.S(p,e.L(e.P,{get when(){return s()===`queries`},get children(){return e.L(vl,{})}}),null),e.S(p,e.L(e.P,{get when(){return s()===`mutations`},get children(){return e.L(yl,{})}}),null),e.S(O,e.L(gs,{}),k),k.$$input=e=>{s()===`queries`?t.setLocalStore(`filter`,e.currentTarget.value):t.setLocalStore(`mutationFilter`,e.currentTarget.value)},e.S(A,e.L(e.P,{get when(){return s()===`queries`},get children(){var n=Cc();return n.addEventListener(`change`,e=>{t.setLocalStore(`sort`,e.currentTarget.value)}),e.S(n,()=>Object.keys(e.f).map(t=>(()=>{var n=Wc();return n.firstChild,n.value=t,e.S(n,t,null),n})())),e.H(()=>n.value=l()),n}}),null),e.S(A,e.L(e.P,{get when(){return s()===`mutations`},get children(){var n=wc();return n.addEventListener(`change`,e=>{t.setLocalStore(`mutationSort`,e.currentTarget.value)}),e.S(n,()=>Object.keys(e.u).map(t=>(()=>{var n=Wc();return n.firstChild,n.value=t,e.S(n,t,null),n})())),e.H(()=>n.value=d()),n}}),null),e.S(A,e.L(vs,{}),null),j.$$click=()=>{s()===`queries`?t.setLocalStore(`sortOrder`,String(u()*-1)):t.setLocalStore(`mutationSortOrder`,String(f()*-1))},e.S(j,e.L(e.P,{get when(){return(s()===`queries`?u():f())===1},get children(){return[Tc(),e.L(ys,{})]}}),null),e.S(j,e.L(e.P,{get when(){return(s()===`queries`?u():f())===-1},get children(){return[Ec(),e.L(bs,{})]}}),null),N.$$click=()=>{s()===`queries`?(Ol({type:`CLEAR_QUERY_CACHE`}),g().clear()):(Ol({type:`CLEAR_MUTATION_CACHE`}),_().clear())},e.S(N,e.L(_s,{})),P.$$click=()=>{h().setOnline(!h().isOnline())},e.S(P,(()=>{var t=e.C(()=>!!ll());return()=>t()?e.L(Ds,{}):e.L(Es,{})})()),e.S(M,e.L(e.P,{get when(){return e.C(()=>!o().pipWindow)()&&!o().disabled},get children(){var n=Dc();return n.$$click=()=>{o().requestPipWindow(Number(window.innerWidth),Number(t.localStore.height??500))},e.S(n,e.L(ks,{})),e.H(()=>e.y(n,L(a().actionsBtn,`tsqd-actions-btn`,`tsqd-action-open-pip`))),n}}),null),e.S(M,e.L(J.Root,{gutter:4,get children(){return[e.L(J.Trigger,{get class(){return L(a().actionsBtn,`tsqd-actions-btn`,`tsqd-action-settings`)},"aria-label":`Open settings menu`,title:`Open settings menu`,get children(){return e.L(Os,{})}}),e.L(J.Portal,{ref:e=>w(e),get mount(){return e.C(()=>!!o().pipWindow)()?o().pipWindow.document.body:document.body},get children(){return e.L(J.Content,{get class(){return L(a().settingsMenu,`tsqd-settings-menu`)},get children(){return[(()=>{var t=Oc();return e.H(()=>e.y(t,L(a().settingsMenuHeader,`tsqd-settings-menu-header`))),t})(),e.L(e.P,{get when(){return!t.showPanelViewOnly},get children(){return e.L(J.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[e.L(J.SubTrigger,{get class(){return L(a().settingsSubTrigger,`tsqd-settings-menu-sub-trigger`,`tsqd-settings-menu-sub-trigger-position`)},get children(){return[kc(),e.L(vs,{})]}}),e.L(J.Portal,{ref:e=>w(e),get mount(){return e.C(()=>!!o().pipWindow)()?o().pipWindow.document.body:document.body},get children(){return e.L(J.SubContent,{get class(){return L(a().settingsMenu,`tsqd-settings-submenu`)},get children(){return e.L(J.RadioGroup,{"aria-label":`Position settings`,get value(){return t.localStore.position},onChange:e=>C(e),get children(){return[e.L(J.RadioItem,{value:`top`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-top`)},get children(){return[Ac(),e.L(ys,{})]}}),e.L(J.RadioItem,{value:`bottom`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-bottom`)},get children(){return[jc(),e.L(bs,{})]}}),e.L(J.RadioItem,{value:`left`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-left`)},get children(){return[Mc(),e.L(xs,{})]}}),e.L(J.RadioItem,{value:`right`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-right`)},get children(){return[Nc(),e.L(Ss,{})]}})]}})}})}})]}})}}),e.L(J.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[e.L(J.SubTrigger,{get class(){return L(a().settingsSubTrigger,`tsqd-settings-menu-sub-trigger`,`tsqd-settings-menu-sub-trigger-theme`)},get children(){return[Pc(),e.L(vs,{})]}}),e.L(J.Portal,{ref:e=>w(e),get mount(){return e.C(()=>!!o().pipWindow)()?o().pipWindow.document.body:document.body},get children(){return e.L(J.SubContent,{get class(){return L(a().settingsMenu,`tsqd-settings-submenu`)},get children(){return e.L(J.RadioGroup,{get value(){return t.localStore.theme_preference},onChange:e=>{t.setLocalStore(`theme_preference`,e)},"aria-label":`Theme preference`,get children(){return[e.L(J.RadioItem,{value:`light`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-top`)},get children(){return[Fc(),e.L(Cs,{})]}}),e.L(J.RadioItem,{value:`dark`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-bottom`)},get children(){return[Ic(),e.L(ws,{})]}}),e.L(J.RadioItem,{value:`system`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-left`)},get children(){return[Lc(),e.L(Ts,{})]}})]}})}})}})]}}),e.L(J.Sub,{overlap:!0,gutter:8,shift:-4,get children(){return[e.L(J.SubTrigger,{get class(){return L(a().settingsSubTrigger,`tsqd-settings-menu-sub-trigger`,`tsqd-settings-menu-sub-trigger-disabled-queries`)},get children(){return[Rc(),e.L(vs,{})]}}),e.L(J.Portal,{ref:e=>w(e),get mount(){return e.C(()=>!!o().pipWindow)()?o().pipWindow.document.body:document.body},get children(){return e.L(J.SubContent,{get class(){return L(a().settingsMenu,`tsqd-settings-submenu`)},get children(){return e.L(J.RadioGroup,{get value(){return t.localStore.hideDisabledQueries},"aria-label":`Hide disabled queries setting`,onChange:e=>t.setLocalStore(`hideDisabledQueries`,e),get children(){return[e.L(J.RadioItem,{value:`false`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-show`)},get children(){return[zc(),e.L(e.P,{get when(){return t.localStore.hideDisabledQueries!==`true`},get children(){return e.L(Is,{})}})]}}),e.L(J.RadioItem,{value:`true`,get class(){return L(a().settingsSubButton,`tsqd-settings-menu-position-btn`,`tsqd-settings-menu-position-btn-hide`)},get children(){return[Bc(),e.L(e.P,{get when(){return t.localStore.hideDisabledQueries===`true`},get children(){return e.L(Is,{})}})]}})]}})}})}})]}})]}})}})]}}),null),e.S(r,e.L(e.P,{get when(){return s()===`queries`},get children(){var t=Vc(),n=t.firstChild;return e.S(n,e.L(ge,{by:e=>e.queryHash,get each(){return b()},children:t=>e.L(gl,{get query(){return t()}})})),e.H(()=>e.y(t,L(a().overflowQueryContainer,`tsqd-queries-overflow-container`))),t}}),null),e.S(r,e.L(e.P,{get when(){return s()===`mutations`},get children(){var t=Hc(),n=t.firstChild;return e.S(n,e.L(ge,{by:e=>e.mutationId,get each(){return S()},children:t=>e.L(_l,{get mutation(){return t()}})})),e.H(()=>e.y(t,L(a().overflowQueryContainer,`tsqd-mutations-overflow-container`))),t}}),null),e.H(t=>{var n=L(a().queriesContainer,sl()<796&&(Q()||al())&&i`
              height: 50%;
              max-height: 50%;
            `,sl()<796&&!(Q()||al())&&i`
              height: 100%;
              max-height: 100%;
            `,`tsqd-queries-container`),o=L(a().row,`tsqd-header`),c=a().logoAndToggleContainer,l=L(a().logo,`tsqd-text-logo-container`),d=L(a().tanstackLogo,`tsqd-text-logo-tanstack`),h=L(a().queryFlavorLogo,`tsqd-text-logo-query-flavor`),g=L(a().row,`tsqd-filters-actions-container`),_=L(a().filtersContainer,`tsqd-filters-container`),b=L(a().filterInput,`tsqd-query-filter-textfield-container`),S=L(`tsqd-query-filter-textfield`),C=L(a().filterSelect,`tsqd-query-filter-sort-container`),w=`Sort order ${(s()===`queries`?u():f())===-1?`descending`:`ascending`}`,T=(s()===`queries`?u():f())===-1,F=L(a().actionsContainer,`tsqd-actions-container`),ee=L(a().actionsBtn,`tsqd-actions-btn`,`tsqd-action-clear-cache`),te=`Clear ${s()} cache`,I=L(a().actionsBtn,ll()&&a().actionsBtnOffline,`tsqd-actions-btn`,`tsqd-action-mock-offline-behavior`),ne=`${ll()?`Unset offline mocking behavior`:`Mock offline behavior`}`,re=ll(),ie=`${ll()?`Unset offline mocking behavior`:`Mock offline behavior`}`;return n!==t.e&&e.y(r,t.e=n),o!==t.t&&e.y(p,t.t=o),c!==t.a&&e.y(m,t.a=c),l!==t.o&&e.y(v,t.o=l),d!==t.i&&e.y(y,t.i=d),h!==t.n&&e.y(x,t.n=h),g!==t.s&&e.y(E,t.s=g),_!==t.h&&e.y(D,t.h=_),b!==t.r&&e.y(O,t.r=b),S!==t.d&&e.y(k,t.d=S),C!==t.l&&e.y(A,t.l=C),w!==t.u&&e.T(j,`aria-label`,t.u=w),T!==t.c&&e.T(j,`aria-pressed`,t.c=T),F!==t.w&&e.y(M,t.w=F),ee!==t.m&&e.y(N,t.m=ee),te!==t.f&&e.T(N,`title`,t.f=te),I!==t.y&&e.y(P,t.y=I),ne!==t.g&&e.T(P,`aria-label`,t.g=ne),re!==t.p&&e.T(P,`aria-pressed`,t.p=re),ie!==t.b&&e.T(P,`title`,t.b=ie),t},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0}),e.H(()=>k.value=s()===`queries`?t.localStore.filter||``:t.localStore.mutationFilter||``),r})(),e.L(e.P,{get when(){return e.C(()=>s()===`queries`)()&&Q()},get children(){return e.L(xl,{})}}),e.L(e.P,{get when(){return e.C(()=>s()===`mutations`)()&&al()},get children(){return e.L(Sl,{})}})]},gl=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?jl(r):Al(r)),{colors:a,alpha:o}=Y,s=(e,t)=>n()===`dark`?t:e,c=$(e=>e().get(t.query.queryHash)?.state,!0,e=>e.query.queryHash===t.query.queryHash),l=$(e=>e().get(t.query.queryHash)?.isDisabled()??!1,!0,e=>e.query.queryHash===t.query.queryHash),u=$(e=>e().get(t.query.queryHash)?.isStatic()??!1,!0,e=>e.query.queryHash===t.query.queryHash),d=$(e=>e().get(t.query.queryHash)?.isStale()??!1,!0,e=>e.query.queryHash===t.query.queryHash),f=$(e=>e().get(t.query.queryHash)?.getObserversCount()??0,!0,e=>e.query.queryHash===t.query.queryHash),p=e.V(()=>e.o({queryState:c(),observerCount:f(),isStale:d()})),m=()=>p()===`gray`?r`
        background-color: ${s(a[p()][200],a[p()][700])};
        color: ${s(a[p()][700],a[p()][300])};
      `:r`
      background-color: ${s(a[p()][200]+o[80],a[p()][900])};
      color: ${s(a[p()][800],a[p()][300])};
    `;return e.L(e.P,{get when(){return c()},get children(){var n=qc(),r=n.firstChild,a=r.nextSibling;return n.$$click=()=>il(t.query.queryHash===Q()?null:t.query.queryHash),e.S(r,f),e.S(a,()=>t.query.queryHash),e.S(n,e.L(e.P,{get when(){return l()},get children(){return Gc()}}),null),e.S(n,e.L(e.P,{get when(){return u()},get children(){return Kc()}}),null),e.H(a=>{var o=L(i().queryRow,Q()===t.query.queryHash&&i().selectedQueryRow,`tsqd-query-row`),s=`Query key ${t.query.queryHash}${l()?`, disabled`:``}${u()?`, static`:``}`,c=L(m(),`tsqd-query-observer-count`);return o!==a.e&&e.y(n,a.e=o),s!==a.t&&e.T(n,`aria-label`,a.t=s),c!==a.a&&e.y(r,a.a=c),a},{e:void 0,t:void 0,a:void 0}),n}})},_l=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?jl(r):Al(r)),{colors:a,alpha:o}=Y,s=(e,t)=>n()===`dark`?t:e,c=Dl(e=>e().getAll().find(e=>e.mutationId===t.mutation.mutationId)?.state),l=Dl(e=>{let n=e().getAll().find(e=>e.mutationId===t.mutation.mutationId);return n?n.state.isPaused:!1}),u=Dl(e=>{let n=e().getAll().find(e=>e.mutationId===t.mutation.mutationId);return n?n.state.status:`idle`}),d=e.V(()=>e.i({isPaused:l(),status:u()})),f=()=>d()===`gray`?r`
        background-color: ${s(a[d()][200],a[d()][700])};
        color: ${s(a[d()][700],a[d()][300])};
      `:r`
      background-color: ${s(a[d()][200]+o[80],a[d()][900])};
      color: ${s(a[d()][800],a[d()][300])};
    `;return e.L(e.P,{get when(){return c()},get children(){var n=qc(),r=n.firstChild,a=r.nextSibling;return n.$$click=()=>{ol(t.mutation.mutationId===al()?null:t.mutation.mutationId)},e.S(r,e.L(e.P,{get when(){return d()===`purple`},get children(){return e.L(zs,{})}}),null),e.S(r,e.L(e.P,{get when(){return d()===`green`},get children(){return e.L(Is,{})}}),null),e.S(r,e.L(e.P,{get when(){return d()===`red`},get children(){return e.L(Rs,{})}}),null),e.S(r,e.L(e.P,{get when(){return d()===`yellow`},get children(){return e.L(Ls,{})}}),null),e.S(a,e.L(e.P,{get when(){return t.mutation.options.mutationKey},get children(){return[e.C(()=>JSON.stringify(t.mutation.options.mutationKey)),` -`,` `]}}),null),e.S(a,()=>new Date(t.mutation.state.submittedAt).toLocaleString(),null),e.H(a=>{var o=L(i().queryRow,al()===t.mutation.mutationId&&i().selectedQueryRow,`tsqd-query-row`),s=`Mutation submitted at ${new Date(t.mutation.state.submittedAt).toLocaleString()}`,c=L(f(),`tsqd-query-observer-count`);return o!==a.e&&e.y(n,a.e=o),s!==a.t&&e.T(n,`aria-label`,a.t=s),c!==a.a&&e.y(r,a.a=c),a},{e:void 0,t:void 0,a:void 0}),n}})},vl=()=>{let t=$(t=>t().getAll().filter(t=>e.c(t)===`stale`).length),n=$(t=>t().getAll().filter(t=>e.c(t)===`fresh`).length),r=$(t=>t().getAll().filter(t=>e.c(t)===`fetching`).length),i=$(t=>t().getAll().filter(t=>e.c(t)===`paused`).length),a=$(t=>t().getAll().filter(t=>e.c(t)===`inactive`).length),o=Z(),s=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,c=e.V(()=>o()===`dark`?jl(s):Al(s));return(()=>{var o=yc();return e.S(o,e.L(bl,{label:`Fresh`,color:`green`,get count(){return n()}}),null),e.S(o,e.L(bl,{label:`Fetching`,color:`blue`,get count(){return r()}}),null),e.S(o,e.L(bl,{label:`Paused`,color:`purple`,get count(){return i()}}),null),e.S(o,e.L(bl,{label:`Stale`,color:`yellow`,get count(){return t()}}),null),e.S(o,e.L(bl,{label:`Inactive`,color:`gray`,get count(){return a()}}),null),e.H(()=>e.y(o,L(c().queryStatusContainer,`tsqd-query-status-container`))),o})()},yl=()=>{let t=Dl(t=>t().getAll().filter(t=>e.i({isPaused:t.state.isPaused,status:t.state.status})===`green`).length),n=Dl(t=>t().getAll().filter(t=>e.i({isPaused:t.state.isPaused,status:t.state.status})===`yellow`).length),r=Dl(t=>t().getAll().filter(t=>e.i({isPaused:t.state.isPaused,status:t.state.status})===`purple`).length),i=Dl(t=>t().getAll().filter(t=>e.i({isPaused:t.state.isPaused,status:t.state.status})===`red`).length),a=Z(),o=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,s=e.V(()=>a()===`dark`?jl(o):Al(o));return(()=>{var a=yc();return e.S(a,e.L(bl,{label:`Paused`,color:`purple`,get count(){return r()}}),null),e.S(a,e.L(bl,{label:`Pending`,color:`yellow`,get count(){return n()}}),null),e.S(a,e.L(bl,{label:`Success`,color:`green`,get count(){return t()}}),null),e.S(a,e.L(bl,{label:`Error`,color:`red`,get count(){return i()}}),null),e.H(()=>e.y(a,L(s().queryStatusContainer,`tsqd-query-status-container`))),a})()},bl=t=>{let n=Z(),r=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,i=e.V(()=>n()===`dark`?jl(r):Al(r)),{colors:a,alpha:o}=Y,s=(e,t)=>n()===`dark`?t:e,c,[l,u]=e.W(!1),[d,f]=e.W(!1),p=e.V(()=>!(Q()&&sl()<1024&&sl()>796||sl()<796));return(()=>{var n=Xc(),m=n.firstChild,h=m.nextSibling,g=c;return typeof g==`function`?e.k(g,n):c=n,n.addEventListener(`mouseleave`,()=>{u(!1),f(!1)}),n.addEventListener(`mouseenter`,()=>u(!0)),n.addEventListener(`blur`,()=>f(!1)),n.addEventListener(`focus`,()=>f(!0)),e.D(n,e.J({get disabled(){return p()},get"aria-label"(){return`${t.label}: ${t.count}`},get class(){return L(i().queryStatusTag,!p()&&r`
            cursor: pointer;
            &:hover {
              background: ${s(a.gray[200],a.darkGray[400])}${o[80]};
            }
          `,`tsqd-query-status-tag`,`tsqd-query-status-tag-${t.label.toLowerCase()}`)}},()=>l()||d()?{"aria-describedby":`tsqd-status-tooltip`}:{}),!1,!0),e.S(n,e.L(e.P,{get when(){return e.C(()=>!p())()&&(l()||d())},get children(){var n=Jc();return e.S(n,()=>t.label),e.H(()=>e.y(n,L(i().statusTooltip,`tsqd-query-status-tooltip`))),n}}),m),e.S(n,e.L(e.P,{get when(){return p()},get children(){var n=Yc();return e.S(n,()=>t.label),e.H(()=>e.y(n,L(i().queryStatusTagLabel,`tsqd-query-status-tag-label`))),n}}),h),e.S(h,()=>t.count),e.H(n=>{var o=L(r`
            width: ${Y.size[1.5]};
            height: ${Y.size[1.5]};
            border-radius: ${Y.border.radius.full};
            background-color: ${Y.colors[t.color][500]};
          `,`tsqd-query-status-tag-dot`),c=L(i().queryStatusCount,t.count>0&&t.color!==`gray`&&r`
              background-color: ${s(a[t.color][100],a[t.color][900])};
              color: ${s(a[t.color][700],a[t.color][300])};
            `,`tsqd-query-status-tag-count`);return o!==n.e&&e.y(m,n.e=o),c!==n.t&&e.y(h,n.t=c),n},{e:void 0,t:void 0}),n})()},xl=()=>{let t=Z(),n=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,r=e.V(()=>t()===`dark`?jl(n):Al(n)),{colors:i}=Y,a=(e,n)=>t()===`dark`?n:e,o=X().client,[s,c]=e.W(!1),[l,u]=e.W(`view`),[d,f]=e.W(!1),p=e.V(()=>X().errorTypes||[]),m=$(e=>e().getAll().find(e=>e.queryHash===Q()),!1),h=$(e=>e().getAll().find(e=>e.queryHash===Q()),!1),g=$(e=>e().getAll().find(e=>e.queryHash===Q())?.state,!1),_=$(e=>e().getAll().find(e=>e.queryHash===Q())?.state.data,!1),v=$(t=>{let n=t().getAll().find(e=>e.queryHash===Q());return n?e.c(n):`inactive`}),y=$(e=>{let t=e().getAll().find(e=>e.queryHash===Q());return t?t.state.status:`pending`}),b=$(e=>e().getAll().find(e=>e.queryHash===Q())?.getObserversCount()??0),x=e.V(()=>e.s(v())),S=()=>{Ol({type:`REFETCH`,queryHash:m()?.queryHash}),(m()?.fetch())?.catch(()=>{})},C=e=>{let t=m();if(!t)return;Ol({type:`TRIGGER_ERROR`,queryHash:t.queryHash,metadata:{error:e?.name}});let n=e?.initializer(t)??/* @__PURE__ */ Error(`Unknown error from devtools`),r=t.options;t.setState({data:void 0,status:`error`,error:n,fetchMeta:{...t.state.fetchMeta,__previousQueryOptions:r}})},w=()=>{let e=m();if(!e)return;Ol({type:`RESTORE_LOADING`,queryHash:e.queryHash});let t=e.state,n=e.state.fetchMeta?e.state.fetchMeta.__previousQueryOptions:null;e.cancel({silent:!0}),e.setState({...t,fetchStatus:`idle`,fetchMeta:null}),n&&e.fetch(n)};e.B(()=>{v()!==`fetching`&&c(!1)});let T=()=>x()===`gray`?n`
        background-color: ${a(i[x()][200],i[x()][700])};
        color: ${a(i[x()][700],i[x()][300])};
        border-color: ${a(i[x()][400],i[x()][600])};
      `:n`
      background-color: ${a(i[x()][100],i[x()][900])};
      color: ${a(i[x()][700],i[x()][300])};
      border-color: ${a(i[x()][400],i[x()][600])};
    `;return e.L(e.P,{get when(){return e.C(()=>!!m())()&&g()},get children(){var t=tl(),x=t.firstChild,E=x.nextSibling,D=E.firstChild,O=D.firstChild,k=O.firstChild,A=O.nextSibling,j=D.nextSibling,M=j.firstChild.nextSibling,N=j.nextSibling.firstChild.nextSibling,P=E.nextSibling,F=P.nextSibling,ee=F.firstChild,te=ee.firstChild,I=ee.nextSibling,ne=I.firstChild,re=I.nextSibling,ie=re.firstChild,R=re.nextSibling,ae=R.firstChild,oe=R.nextSibling,se=oe.firstChild,ce=se.nextSibling,le=F.nextSibling;le.firstChild;var ue=le.nextSibling,de=ue.nextSibling;return e.S(k,()=>e.r(m().queryKey,!0)),e.S(A,v),e.S(M,b),e.S(N,()=>new Date(g().dataUpdatedAt).toLocaleTimeString()),ee.$$click=S,I.$$click=()=>{Ol({type:`INVALIDATE`,queryHash:m()?.queryHash}),o.invalidateQueries({queryKey:m()?.queryKey,exact:!0})},re.$$click=()=>{Ol({type:`RESET`,queryHash:m()?.queryHash}),o.resetQueries({queryKey:m()?.queryKey,exact:!0})},R.$$click=()=>{Ol({type:`REMOVE`,queryHash:m()?.queryHash}),o.removeQueries({queryKey:m()?.queryKey,exact:!0}),il(null)},oe.$$click=()=>{if(m()?.state.data===void 0)c(!0),w();else{let e=m();if(!e)return;Ol({type:`TRIGGER_LOADING`,queryHash:e.queryHash});let t=e.options;e.fetch({...t,queryFn:()=>new Promise(()=>{}),gcTime:-1}),e.setState({data:void 0,status:`pending`,fetchMeta:{...e.state.fetchMeta,__previousQueryOptions:t}})}},e.S(oe,()=>y()===`pending`?`Restore`:`Trigger`,ce),e.S(F,e.L(e.P,{get when(){return p().length===0||y()===`error`},get children(){var t=Zc(),r=t.firstChild,s=r.nextSibling;return t.$$click=()=>{m().state.error?(Ol({type:`RESTORE_ERROR`,queryHash:m()?.queryHash}),o.resetQueries({queryKey:m()?.queryKey})):C()},e.S(t,()=>y()===`error`?`Restore`:`Trigger`,s),e.H(o=>{var s=L(n`
                  color: ${a(i.red[500],i.red[400])};
                `,`tsqd-query-details-actions-btn`,`tsqd-query-details-action-error`),c=y()===`pending`,l=n`
                  background-color: ${a(i.red[500],i.red[400])};
                `;return s!==o.e&&e.y(t,o.e=s),c!==o.t&&(t.disabled=o.t=c),l!==o.a&&e.y(r,o.a=l),o},{e:void 0,t:void 0,a:void 0}),t}}),null),e.S(F,e.L(e.P,{get when(){return p().length!==0&&y()!==`error`},get children(){var t=Qc(),i=t.firstChild,a=i.nextSibling.nextSibling;return a.firstChild,a.addEventListener(`change`,e=>{let t=p().find(t=>t.name===e.currentTarget.value);C(t)}),e.S(a,e.L(e.j,{get each(){return p()},children:t=>(()=>{var n=nl();return e.S(n,()=>t.name),e.H(()=>n.value=t.name),n})()}),null),e.S(t,e.L(vs,{}),null),e.H(o=>{var s=L(r().actionsSelect,`tsqd-query-details-actions-btn`,`tsqd-query-details-action-error-multiple`),c=n`
                  background-color: ${Y.colors.red[400]};
                `,l=y()===`pending`;return s!==o.e&&e.y(t,o.e=s),c!==o.t&&e.y(i,o.t=c),l!==o.a&&(a.disabled=o.a=l),o},{e:void 0,t:void 0,a:void 0}),t}}),null),e.S(le,()=>l()===`view`?`Explorer`:`Editor`,null),e.S(t,e.L(e.P,{get when(){return l()===`view`},get children(){var t=$c();return e.S(t,e.L(mc,{label:`Data`,defaultExpanded:[`Data`],get value(){return _()},editable:!0,onEdit:()=>u(`edit`),get activeQuery(){return m()}})),e.H(n=>e.E(t,`padding`,Y.size[2])),t}}),ue),e.S(t,e.L(e.P,{get when(){return l()===`edit`},get children(){var t=el(),o=t.firstChild,s=o.nextSibling,c=s.firstChild,l=c.nextSibling,p=l.firstChild,h=p.nextSibling;return t.addEventListener(`submit`,e=>{e.preventDefault();let t=new FormData(e.currentTarget).get(`data`);try{let e=JSON.parse(t);m().setState({...m().state,data:e}),u(`view`)}catch{f(!0)}}),o.addEventListener(`focus`,()=>f(!1)),e.S(c,()=>d()?`Invalid Value`:``),p.$$click=()=>u(`view`),e.H(u=>{var f=L(r().devtoolsEditForm,`tsqd-query-details-data-editor`),m=r().devtoolsEditTextarea,g=d(),_=r().devtoolsEditFormActions,v=r().devtoolsEditFormError,y=r().devtoolsEditFormActionContainer,b=L(r().devtoolsEditFormAction,n`
                      color: ${a(i.gray[600],i.gray[300])};
                    `),x=L(r().devtoolsEditFormAction,n`
                      color: ${a(i.blue[600],i.blue[400])};
                    `);return f!==u.e&&e.y(t,u.e=f),m!==u.t&&e.y(o,u.t=m),g!==u.a&&e.T(o,`data-error`,u.a=g),_!==u.o&&e.y(s,u.o=_),v!==u.i&&e.y(c,u.i=v),y!==u.n&&e.y(l,u.n=y),b!==u.s&&e.y(p,u.s=b),x!==u.h&&e.y(h,u.h=x),u},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0}),e.H(()=>o.value=JSON.stringify(_(),null,2)),t}}),ue),e.S(de,e.L(mc,{label:`Query`,defaultExpanded:[`Query`,`queryKey`],get value(){return h()}})),e.H(o=>{var c=L(r().detailsContainer,`tsqd-query-details-container`),l=L(r().detailsHeader,`tsqd-query-details-header`),u=L(r().detailsBody,`tsqd-query-details-summary-container`),d=L(r().queryDetailsStatus,T()),f=L(r().detailsHeader,`tsqd-query-details-header`),p=L(r().actionsBody,`tsqd-query-details-actions-container`),m=L(n`
                color: ${a(i.blue[600],i.blue[400])};
              `,`tsqd-query-details-actions-btn`,`tsqd-query-details-action-refetch`),h=v()===`fetching`,g=n`
                background-color: ${a(i.blue[600],i.blue[400])};
              `,_=L(n`
                color: ${a(i.yellow[600],i.yellow[400])};
              `,`tsqd-query-details-actions-btn`,`tsqd-query-details-action-invalidate`),b=y()===`pending`,S=n`
                background-color: ${a(i.yellow[600],i.yellow[400])};
              `,C=L(n`
                color: ${a(i.gray[600],i.gray[300])};
              `,`tsqd-query-details-actions-btn`,`tsqd-query-details-action-reset`),w=y()===`pending`,D=n`
                background-color: ${a(i.gray[600],i.gray[400])};
              `,O=L(n`
                color: ${a(i.pink[500],i.pink[400])};
              `,`tsqd-query-details-actions-btn`,`tsqd-query-details-action-remove`),k=v()===`fetching`,j=n`
                background-color: ${a(i.pink[500],i.pink[400])};
              `,M=L(n`
                color: ${a(i.cyan[500],i.cyan[400])};
              `,`tsqd-query-details-actions-btn`,`tsqd-query-details-action-loading`),N=s(),ce=n`
                background-color: ${a(i.cyan[500],i.cyan[400])};
              `,fe=L(r().detailsHeader,`tsqd-query-details-header`),pe=L(r().detailsHeader,`tsqd-query-details-header`),me=Y.size[2];return c!==o.e&&e.y(t,o.e=c),l!==o.t&&e.y(x,o.t=l),u!==o.a&&e.y(E,o.a=u),d!==o.o&&e.y(A,o.o=d),f!==o.i&&e.y(P,o.i=f),p!==o.n&&e.y(F,o.n=p),m!==o.s&&e.y(ee,o.s=m),h!==o.h&&(ee.disabled=o.h=h),g!==o.r&&e.y(te,o.r=g),_!==o.d&&e.y(I,o.d=_),b!==o.l&&(I.disabled=o.l=b),S!==o.u&&e.y(ne,o.u=S),C!==o.c&&e.y(re,o.c=C),w!==o.w&&(re.disabled=o.w=w),D!==o.m&&e.y(ie,o.m=D),O!==o.f&&e.y(R,o.f=O),k!==o.y&&(R.disabled=o.y=k),j!==o.g&&e.y(ae,o.g=j),M!==o.p&&e.y(oe,o.p=M),N!==o.b&&(oe.disabled=o.b=N),ce!==o.T&&e.y(se,o.T=ce),fe!==o.A&&e.y(le,o.A=fe),pe!==o.O&&e.y(ue,o.O=pe),me!==o.I&&e.E(de,`padding`,o.I=me),o},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0,c:void 0,w:void 0,m:void 0,f:void 0,y:void 0,g:void 0,p:void 0,b:void 0,T:void 0,A:void 0,O:void 0,I:void 0}),t}})},Sl=()=>{let t=Z(),n=X().shadowDOMTarget?I.bind({target:X().shadowDOMTarget}):I,r=e.V(()=>t()===`dark`?jl(n):Al(n)),{colors:i}=Y,a=(e,n)=>t()===`dark`?n:e,o=Dl(e=>{let t=e().getAll().find(e=>e.mutationId===al());return t?t.state.isPaused:!1}),s=Dl(e=>{let t=e().getAll().find(e=>e.mutationId===al());return t?t.state.status:`idle`}),c=e.V(()=>e.i({isPaused:o(),status:s()})),l=Dl(e=>e().getAll().find(e=>e.mutationId===al()),!1),u=()=>c()===`gray`?n`
        background-color: ${a(i[c()][200],i[c()][700])};
        color: ${a(i[c()][700],i[c()][300])};
        border-color: ${a(i[c()][400],i[c()][600])};
      `:n`
      background-color: ${a(i[c()][100],i[c()][900])};
      color: ${a(i[c()][700],i[c()][300])};
      border-color: ${a(i[c()][400],i[c()][600])};
    `;return e.L(e.P,{get when(){return l()},get children(){var t=rl(),n=t.firstChild,i=n.nextSibling,a=i.firstChild,o=a.firstChild,d=o.firstChild,f=o.nextSibling,p=a.nextSibling.firstChild.nextSibling,m=i.nextSibling,h=m.nextSibling,g=h.nextSibling,_=g.nextSibling,v=_.nextSibling,y=v.nextSibling,b=y.nextSibling,x=b.nextSibling;return e.S(d,e.L(e.P,{get when(){return l().options.mutationKey},fallback:`No mutationKey found`,get children(){return e.r(l().options.mutationKey,!0)}})),e.S(f,e.L(e.P,{get when(){return c()===`purple`},children:`pending`}),null),e.S(f,e.L(e.P,{get when(){return c()!==`purple`},get children(){return s()}}),null),e.S(p,()=>new Date(l().state.submittedAt).toLocaleTimeString()),e.S(h,e.L(mc,{label:`Variables`,defaultExpanded:[`Variables`],get value(){return l().state.variables}})),e.S(_,e.L(mc,{label:`Context`,defaultExpanded:[`Context`],get value(){return l().state.context}})),e.S(y,e.L(mc,{label:`Data`,defaultExpanded:[`Data`],get value(){return l().state.data}})),e.S(x,e.L(mc,{label:`Mutation`,defaultExpanded:[`Mutation`],get value(){return l()}})),e.H(a=>{var o=L(r().detailsContainer,`tsqd-query-details-container`),s=L(r().detailsHeader,`tsqd-query-details-header`),c=L(r().detailsBody,`tsqd-query-details-summary-container`),l=L(r().queryDetailsStatus,u()),d=L(r().detailsHeader,`tsqd-query-details-header`),p=Y.size[2],S=L(r().detailsHeader,`tsqd-query-details-header`),C=Y.size[2],w=L(r().detailsHeader,`tsqd-query-details-header`),T=Y.size[2],E=L(r().detailsHeader,`tsqd-query-details-header`),D=Y.size[2];return o!==a.e&&e.y(t,a.e=o),s!==a.t&&e.y(n,a.t=s),c!==a.a&&e.y(i,a.a=c),l!==a.o&&e.y(f,a.o=l),d!==a.i&&e.y(m,a.i=d),p!==a.n&&e.E(h,`padding`,a.n=p),S!==a.s&&e.y(g,a.s=S),C!==a.h&&e.E(_,`padding`,a.h=C),w!==a.r&&e.y(v,a.r=w),T!==a.d&&e.E(y,`padding`,a.d=T),E!==a.l&&e.y(b,a.l=E),D!==a.u&&e.E(x,`padding`,a.u=D),a},{e:void 0,t:void 0,a:void 0,o:void 0,i:void 0,n:void 0,s:void 0,h:void 0,r:void 0,d:void 0,l:void 0,u:void 0}),t}})},Cl=/* @__PURE__ */ new Map,wl=()=>{let t=e.V(()=>X().client.getQueryCache()),n=t().subscribe(n=>{e.I(()=>{for(let[e,r]of Cl.entries())r.shouldUpdate(n)&&r.setter(e(t))})});return e.X(()=>{Cl.clear(),n()}),n},$=(t,n=!0,r=()=>!0)=>{let i=e.V(()=>X().client.getQueryCache()),[a,o]=e.W(t(i),n?void 0:{equals:!1});return e.B(()=>{o(t(i))}),Cl.set(t,{setter:o,shouldUpdate:r}),e.X(()=>{Cl.delete(t)}),a},Tl=/* @__PURE__ */ new Map,El=()=>{let t=e.V(()=>X().client.getMutationCache()),n=t().subscribe(()=>{for(let[e,n]of Tl.entries())queueMicrotask(()=>{n(e(t))})});return e.X(()=>{Tl.clear(),n()}),n},Dl=(t,n=!0)=>{let r=e.V(()=>X().client.getMutationCache()),[i,a]=e.W(t(r),n?void 0:{equals:!1});return e.B(()=>{a(t(r))}),Tl.set(t,a),e.X(()=>{Tl.delete(t)}),i},Ol=({type:e,queryHash:t,metadata:n})=>{let r=new CustomEvent(`@tanstack/query-devtools-event`,{detail:{type:e,queryHash:t,metadata:n},bubbles:!0,cancelable:!0});window.dispatchEvent(r)},kl=(e,t)=>{let{colors:n,font:r,size:i,alpha:a,shadow:o,border:s}=Y,c=(t,n)=>e===`light`?t:n;return{devtoolsBtn:t`
      z-index: 100000;
      position: fixed;
      padding: 4px;
      text-align: left;

      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      box-shadow: ${o.md()};
      overflow: hidden;

      & div {
        position: absolute;
        top: -8px;
        left: -8px;
        right: -8px;
        bottom: -8px;
        border-radius: 9999px;
        -webkit-transform: translateZ(0);
        transform: translateZ(0);

        & svg {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        filter: blur(6px) saturate(1.2) contrast(1.1);
      }

      &:focus-within {
        outline-offset: 2px;
        outline: 3px solid ${n.green[600]};
      }

      & button {
        position: relative;
        z-index: 1;
        padding: 0;
        border-radius: 9999px;
        background-color: transparent;
        border: none;
        height: 40px;
        display: flex;
        width: 40px;
        overflow: hidden;
        cursor: pointer;
        outline: none;
        & svg {
          position: absolute;
          width: 100%;
          height: 100%;
        }
      }
    `,panel:t`
      position: fixed;
      z-index: 9999;
      display: flex;
      gap: ${Y.size[.5]};
      & * {
        box-sizing: border-box;
        text-transform: none;
      }

      & *::-webkit-scrollbar {
        width: 7px;
      }

      & *::-webkit-scrollbar-track {
        background: transparent;
      }

      & *::-webkit-scrollbar-thumb {
        background: ${c(n.gray[300],n.darkGray[200])};
      }

      & *::-webkit-scrollbar-thumb:hover {
        background: ${c(n.gray[400],n.darkGray[300])};
      }
    `,parentPanel:t`
      z-index: 9999;
      display: flex;
      height: 100%;
      gap: ${Y.size[.5]};
      & * {
        box-sizing: border-box;
        text-transform: none;
      }

      & *::-webkit-scrollbar {
        width: 7px;
      }

      & *::-webkit-scrollbar-track {
        background: transparent;
      }

      & *::-webkit-scrollbar-thumb {
        background: ${c(n.gray[300],n.darkGray[200])};
      }

      & *::-webkit-scrollbar-thumb:hover {
        background: ${c(n.gray[400],n.darkGray[300])};
      }
    `,"devtoolsBtn-position-bottom-right":t`
      bottom: 12px;
      right: 12px;
    `,"devtoolsBtn-position-bottom-left":t`
      bottom: 12px;
      left: 12px;
    `,"devtoolsBtn-position-top-left":t`
      top: 12px;
      left: 12px;
    `,"devtoolsBtn-position-top-right":t`
      top: 12px;
      right: 12px;
    `,"devtoolsBtn-position-relative":t`
      position: relative;
    `,"panel-position-top":t`
      top: 0;
      right: 0;
      left: 0;
      max-height: 90%;
      min-height: ${i[14]};
      border-bottom: ${c(n.gray[400],n.darkGray[300])} 1px solid;
    `,"panel-position-bottom":t`
      bottom: 0;
      right: 0;
      left: 0;
      max-height: 90%;
      min-height: ${i[14]};
      border-top: ${c(n.gray[400],n.darkGray[300])} 1px solid;
    `,"panel-position-right":t`
      bottom: 0;
      right: 0;
      top: 0;
      border-left: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      max-width: 90%;
    `,"panel-position-left":t`
      bottom: 0;
      left: 0;
      top: 0;
      border-right: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      max-width: 90%;
    `,closeBtn:t`
      position: absolute;
      cursor: pointer;
      z-index: 5;
      display: flex;
      align-items: center;
      justify-content: center;
      outline: none;
      background-color: ${c(n.gray[50],n.darkGray[700])};
      &:hover {
        background-color: ${c(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline: 2px solid ${n.blue[600]};
      }
      & svg {
        color: ${c(n.gray[600],n.gray[400])};
        width: ${i[2]};
        height: ${i[2]};
      }
    `,"closeBtn-position-top":t`
      bottom: 0;
      right: ${i[2]};
      transform: translate(0, 100%);
      border-right: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-left: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: none;
      border-bottom: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: 0px 0px ${s.radius.sm} ${s.radius.sm};
      padding: ${i[.5]} ${i[1.5]} ${i[1]} ${i[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        bottom: 100%;
        left: -${i[2.5]};
        height: ${i[1.5]};
        width: calc(100% + ${i[5]});
      }

      & svg {
        transform: rotate(180deg);
      }
    `,"closeBtn-position-bottom":t`
      top: 0;
      right: ${i[2]};
      transform: translate(0, -100%);
      border-right: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-left: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: none;
      border-radius: ${s.radius.sm} ${s.radius.sm} 0px 0px;
      padding: ${i[1]} ${i[1.5]} ${i[.5]} ${i[1.5]};

      &::after {
        content: ' ';
        position: absolute;
        top: 100%;
        left: -${i[2.5]};
        height: ${i[1.5]};
        width: calc(100% + ${i[5]});
      }
    `,"closeBtn-position-right":t`
      bottom: ${i[2]};
      left: 0;
      transform: translate(-100%, 0);
      border-right: none;
      border-left: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: ${s.radius.sm} 0px 0px ${s.radius.sm};
      padding: ${i[1.5]} ${i[.5]} ${i[1.5]} ${i[1]};

      &::after {
        content: ' ';
        position: absolute;
        left: 100%;
        height: calc(100% + ${i[5]});
        width: ${i[1.5]};
      }

      & svg {
        transform: rotate(-90deg);
      }
    `,"closeBtn-position-left":t`
      bottom: ${i[2]};
      right: 0;
      transform: translate(100%, 0);
      border-left: none;
      border-right: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-top: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-bottom: ${c(n.gray[400],n.darkGray[300])} 1px solid;
      border-radius: 0px ${s.radius.sm} ${s.radius.sm} 0px;
      padding: ${i[1.5]} ${i[1]} ${i[1.5]} ${i[.5]};

      &::after {
        content: ' ';
        position: absolute;
        right: 100%;
        height: calc(100% + ${i[5]});
        width: ${i[1.5]};
      }

      & svg {
        transform: rotate(90deg);
      }
    `,queriesContainer:t`
      flex: 1 1 700px;
      background-color: ${c(n.gray[50],n.darkGray[700])};
      display: flex;
      flex-direction: column;
      & * {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      }
    `,dragHandle:t`
      position: absolute;
      transition: background-color 0.125s ease;
      &:hover {
        background-color: ${n.purple[400]}${c(``,a[90])};
      }
      &:focus {
        outline: none;
        background-color: ${n.purple[400]}${c(``,a[90])};
      }
      &:focus-visible {
        outline: 2px solid ${n.blue[800]};
        outline-offset: -2px;
        background-color: ${n.purple[400]}${c(``,a[90])};
      }
      z-index: 4;
    `,"dragHandle-position-top":t`
      bottom: 0;
      width: 100%;
      height: 3px;
      cursor: ns-resize;
    `,"dragHandle-position-bottom":t`
      top: 0;
      width: 100%;
      height: 3px;
      cursor: ns-resize;
    `,"dragHandle-position-right":t`
      left: 0;
      width: 3px;
      height: 100%;
      cursor: ew-resize;
    `,"dragHandle-position-left":t`
      right: 0;
      width: 3px;
      height: 100%;
      cursor: ew-resize;
    `,row:t`
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: ${Y.size[2]} ${Y.size[2.5]};
      gap: ${Y.size[2.5]};
      border-bottom: ${c(n.gray[300],n.darkGray[500])} 1px solid;
      align-items: center;
      & > button {
        padding: 0;
        background: transparent;
        border: none;
        display: flex;
        gap: ${i[.5]};
        flex-direction: column;
      }
    `,logoAndToggleContainer:t`
      display: flex;
      gap: ${Y.size[3]};
      align-items: center;
    `,logo:t`
      cursor: pointer;
      display: flex;
      flex-direction: column;
      background-color: transparent;
      border: none;
      gap: ${Y.size[.5]};
      padding: 0px;
      &:hover {
        opacity: 0.7;
      }
      &:focus-visible {
        outline-offset: 4px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,tanstackLogo:t`
      font-size: ${r.size.md};
      font-weight: ${r.weight.bold};
      line-height: ${r.lineHeight.xs};
      white-space: nowrap;
      color: ${c(n.gray[600],n.gray[300])};
    `,queryFlavorLogo:t`
      font-weight: ${r.weight.semibold};
      font-size: ${r.size.xs};
      background: linear-gradient(
        to right,
        ${c(`#ea4037, #ff9b11`,`#dd524b, #e9a03b`)}
      );
      background-clip: text;
      -webkit-background-clip: text;
      line-height: 1;
      -webkit-text-fill-color: transparent;
      white-space: nowrap;
    `,queryStatusContainer:t`
      display: flex;
      gap: ${Y.size[2]};
      height: min-content;
    `,queryStatusTag:t`
      display: flex;
      gap: ${Y.size[1.5]};
      box-sizing: border-box;
      height: ${Y.size[6.5]};
      background: ${c(n.gray[50],n.darkGray[500])};
      color: ${c(n.gray[700],n.gray[300])};
      border-radius: ${Y.border.radius.sm};
      font-size: ${r.size.sm};
      padding: ${Y.size[1]};
      padding-left: ${Y.size[1.5]};
      align-items: center;
      font-weight: ${r.weight.medium};
      border: ${c(`1px solid `+n.gray[300],`1px solid transparent`)};
      user-select: none;
      position: relative;
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
    `,queryStatusTagLabel:t`
      font-size: ${r.size.xs};
    `,queryStatusCount:t`
      font-size: ${r.size.xs};
      padding: 0 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${c(n.gray[500],n.gray[400])};
      background-color: ${c(n.gray[200],n.darkGray[300])};
      border-radius: 2px;
      font-variant-numeric: tabular-nums;
      height: ${Y.size[4.5]};
    `,statusTooltip:t`
      position: absolute;
      z-index: 1;
      background-color: ${c(n.gray[50],n.darkGray[500])};
      top: 100%;
      left: 50%;
      transform: translate(-50%, calc(${Y.size[2]}));
      padding: ${Y.size[.5]} ${Y.size[2]};
      border-radius: ${Y.border.radius.sm};
      font-size: ${r.size.xs};
      border: 1px solid ${c(n.gray[400],n.gray[600])};
      color: ${c(n.gray[600],n.gray[300])};

      &::before {
        top: 0px;
        content: ' ';
        display: block;
        left: 50%;
        transform: translate(-50%, -100%);
        position: absolute;
        border-color: transparent transparent
          ${c(n.gray[400],n.gray[600])} transparent;
        border-style: solid;
        border-width: 7px;
        /* transform: rotate(180deg); */
      }

      &::after {
        top: 0px;
        content: ' ';
        display: block;
        left: 50%;
        transform: translate(-50%, calc(-100% + 2px));
        position: absolute;
        border-color: transparent transparent
          ${c(n.gray[100],n.darkGray[500])} transparent;
        border-style: solid;
        border-width: 7px;
      }
    `,filtersContainer:t`
      display: flex;
      gap: ${Y.size[2]};
      & > button {
        cursor: pointer;
        padding: ${Y.size[.5]} ${Y.size[1.5]} ${Y.size[.5]}
          ${Y.size[2]};
        border-radius: ${Y.border.radius.sm};
        background-color: ${c(n.gray[100],n.darkGray[400])};
        border: 1px solid ${c(n.gray[300],n.darkGray[200])};
        color: ${c(n.gray[700],n.gray[300])};
        font-size: ${r.size.xs};
        display: flex;
        align-items: center;
        line-height: ${r.lineHeight.sm};
        gap: ${Y.size[1.5]};
        max-width: 160px;
        &:focus-visible {
          outline-offset: 2px;
          border-radius: ${s.radius.xs};
          outline: 2px solid ${n.blue[800]};
        }
        & svg {
          width: ${Y.size[3]};
          height: ${Y.size[3]};
          color: ${c(n.gray[500],n.gray[400])};
        }
      }
    `,filterInput:t`
      padding: ${i[.5]} ${i[2]};
      border-radius: ${Y.border.radius.sm};
      background-color: ${c(n.gray[100],n.darkGray[400])};
      display: flex;
      box-sizing: content-box;
      align-items: center;
      gap: ${Y.size[1.5]};
      max-width: 160px;
      min-width: 100px;
      border: 1px solid ${c(n.gray[300],n.darkGray[200])};
      height: min-content;
      color: ${c(n.gray[600],n.gray[400])};
      & > svg {
        width: ${i[3]};
        height: ${i[3]};
      }
      & input {
        font-size: ${r.size.xs};
        width: 100%;
        background-color: ${c(n.gray[100],n.darkGray[400])};
        border: none;
        padding: 0;
        line-height: ${r.lineHeight.sm};
        color: ${c(n.gray[700],n.gray[300])};
        &::placeholder {
          color: ${c(n.gray[700],n.gray[300])};
        }
        &:focus {
          outline: none;
        }
      }

      &:focus-within {
        outline-offset: 2px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,filterSelect:t`
      padding: ${Y.size[.5]} ${Y.size[2]};
      border-radius: ${Y.border.radius.sm};
      background-color: ${c(n.gray[100],n.darkGray[400])};
      display: flex;
      align-items: center;
      gap: ${Y.size[1.5]};
      box-sizing: content-box;
      max-width: 160px;
      border: 1px solid ${c(n.gray[300],n.darkGray[200])};
      height: min-content;
      & > svg {
        color: ${c(n.gray[600],n.gray[400])};
        width: ${Y.size[2]};
        height: ${Y.size[2]};
      }
      & > select {
        appearance: none;
        color: ${c(n.gray[700],n.gray[300])};
        min-width: 100px;
        line-height: ${r.lineHeight.sm};
        font-size: ${r.size.xs};
        background-color: ${c(n.gray[100],n.darkGray[400])};
        border: none;
        &:focus {
          outline: none;
        }
      }
      &:focus-within {
        outline-offset: 2px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,actionsContainer:t`
      display: flex;
      gap: ${Y.size[2]};
    `,actionsBtn:t`
      border-radius: ${Y.border.radius.sm};
      background-color: ${c(n.gray[100],n.darkGray[400])};
      border: 1px solid ${c(n.gray[300],n.darkGray[200])};
      width: ${Y.size[6.5]};
      height: ${Y.size[6.5]};
      justify-content: center;
      display: flex;
      align-items: center;
      gap: ${Y.size[1.5]};
      max-width: 160px;
      cursor: pointer;
      padding: 0;
      &:hover {
        background-color: ${c(n.gray[200],n.darkGray[500])};
      }
      & svg {
        color: ${c(n.gray[700],n.gray[300])};
        width: ${Y.size[3]};
        height: ${Y.size[3]};
      }
      &:focus-visible {
        outline-offset: 2px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
    `,actionsBtnOffline:t`
      & svg {
        stroke: ${c(n.yellow[700],n.yellow[500])};
        fill: ${c(n.yellow[700],n.yellow[500])};
      }
    `,overflowQueryContainer:t`
      flex: 1;
      overflow-y: auto;
      & > div {
        display: flex;
        flex-direction: column;
      }
    `,queryRow:t`
      display: flex;
      align-items: center;
      padding: 0;
      border: none;
      cursor: pointer;
      color: ${c(n.gray[700],n.gray[300])};
      background-color: ${c(n.gray[50],n.darkGray[700])};
      line-height: 1;
      &:focus {
        outline: none;
      }
      &:focus-visible {
        outline-offset: -2px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      &:hover .tsqd-query-hash {
        background-color: ${c(n.gray[200],n.darkGray[600])};
      }

      & .tsqd-query-observer-count {
        padding: 0 ${Y.size[1]};
        user-select: none;
        min-width: ${Y.size[6.5]};
        align-self: stretch;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${r.size.xs};
        font-weight: ${r.weight.medium};
        border-bottom-width: 1px;
        border-bottom-style: solid;
        border-bottom: 1px solid ${c(n.gray[300],n.darkGray[700])};
      }
      & .tsqd-query-hash {
        user-select: text;
        font-size: ${r.size.xs};
        display: flex;
        align-items: center;
        min-height: ${Y.size[6]};
        flex: 1;
        padding: ${Y.size[1]} ${Y.size[2]};
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        border-bottom: 1px solid ${c(n.gray[300],n.darkGray[400])};
        text-align: left;
        text-overflow: clip;
        word-break: break-word;
      }

      & .tsqd-query-disabled-indicator {
        align-self: stretch;
        display: flex;
        align-items: center;
        padding: 0 ${Y.size[2]};
        color: ${c(n.gray[800],n.gray[300])};
        background-color: ${c(n.gray[300],n.darkGray[600])};
        border-bottom: 1px solid ${c(n.gray[300],n.darkGray[400])};
        font-size: ${r.size.xs};
      }

      & .tsqd-query-static-indicator {
        align-self: stretch;
        display: flex;
        align-items: center;
        padding: 0 ${Y.size[2]};
        color: ${c(n.teal[800],n.teal[300])};
        background-color: ${c(n.teal[100],n.teal[900])};
        border-bottom: 1px solid ${c(n.teal[300],n.teal[700])};
        font-size: ${r.size.xs};
      }
    `,selectedQueryRow:t`
      background-color: ${c(n.gray[200],n.darkGray[500])};
    `,detailsContainer:t`
      flex: 1 1 700px;
      background-color: ${c(n.gray[50],n.darkGray[700])};
      color: ${c(n.gray[700],n.gray[300])};
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      display: flex;
      text-align: left;
    `,detailsHeader:t`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      position: sticky;
      top: 0;
      z-index: 2;
      background-color: ${c(n.gray[200],n.darkGray[600])};
      padding: ${Y.size[1.5]} ${Y.size[2]};
      font-weight: ${r.weight.medium};
      font-size: ${r.size.xs};
      line-height: ${r.lineHeight.xs};
      text-align: left;
    `,detailsBody:t`
      margin: ${Y.size[1.5]} 0px ${Y.size[2]} 0px;
      & > div {
        display: flex;
        align-items: stretch;
        padding: 0 ${Y.size[2]};
        line-height: ${r.lineHeight.sm};
        justify-content: space-between;
        & > span {
          font-size: ${r.size.xs};
        }
        & > span:nth-child(2) {
          font-variant-numeric: tabular-nums;
        }
      }

      & > div:first-child {
        margin-bottom: ${Y.size[1.5]};
      }

      & code {
        font-family:
          ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
          'Liberation Mono', 'Courier New', monospace;
        margin: 0;
        font-size: ${r.size.xs};
        line-height: ${r.lineHeight.xs};
        max-width: 100%;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      & pre {
        margin: 0;
        display: flex;
        align-items: center;
      }
    `,queryDetailsStatus:t`
      border: 1px solid ${n.darkGray[200]};
      border-radius: ${Y.border.radius.sm};
      font-weight: ${r.weight.medium};
      padding: ${Y.size[1]} ${Y.size[2.5]};
    `,actionsBody:t`
      flex-wrap: wrap;
      margin: ${Y.size[2]} 0px ${Y.size[2]} 0px;
      display: flex;
      gap: ${Y.size[2]};
      padding: 0px ${Y.size[2]};
      & > button {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
        font-size: ${r.size.xs};
        padding: ${Y.size[1]} ${Y.size[2]};
        display: flex;
        border-radius: ${Y.border.radius.sm};
        background-color: ${c(n.gray[100],n.darkGray[600])};
        border: 1px solid ${c(n.gray[300],n.darkGray[400])};
        align-items: center;
        gap: ${Y.size[2]};
        font-weight: ${r.weight.medium};
        line-height: ${r.lineHeight.xs};
        cursor: pointer;
        &:focus-visible {
          outline-offset: 2px;
          border-radius: ${s.radius.xs};
          outline: 2px solid ${n.blue[800]};
        }
        &:hover {
          background-color: ${c(n.gray[200],n.darkGray[500])};
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        & > span {
          width: ${i[1.5]};
          height: ${i[1.5]};
          border-radius: ${Y.border.radius.full};
        }
      }
    `,actionsSelect:t`
      font-size: ${r.size.xs};
      padding: ${Y.size[.5]} ${Y.size[2]};
      display: flex;
      border-radius: ${Y.border.radius.sm};
      overflow: hidden;
      background-color: ${c(n.gray[100],n.darkGray[600])};
      border: 1px solid ${c(n.gray[300],n.darkGray[400])};
      align-items: center;
      gap: ${Y.size[2]};
      font-weight: ${r.weight.medium};
      line-height: ${r.lineHeight.sm};
      color: ${c(n.red[500],n.red[400])};
      cursor: pointer;
      position: relative;
      &:hover {
        background-color: ${c(n.gray[200],n.darkGray[500])};
      }
      & > span {
        width: ${i[1.5]};
        height: ${i[1.5]};
        border-radius: ${Y.border.radius.full};
      }
      &:focus-within {
        outline-offset: 2px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      & select {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        appearance: none;
        background-color: transparent;
        border: none;
        color: transparent;
        outline: none;
      }

      & svg path {
        stroke: ${Y.colors.red[400]};
      }
      & svg {
        width: ${Y.size[2]};
        height: ${Y.size[2]};
      }
    `,settingsMenu:t`
      display: flex;
      & * {
        font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      }
      flex-direction: column;
      gap: ${i[.5]};
      border-radius: ${Y.border.radius.sm};
      border: 1px solid ${c(n.gray[300],n.gray[700])};
      background-color: ${c(n.gray[50],n.darkGray[600])};
      font-size: ${r.size.xs};
      color: ${c(n.gray[700],n.gray[300])};
      z-index: 99999;
      min-width: 120px;
      padding: ${i[.5]};
    `,settingsSubTrigger:t`
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-radius: ${Y.border.radius.xs};
      padding: ${Y.size[1]} ${Y.size[1]};
      cursor: pointer;
      background-color: transparent;
      border: none;
      color: ${c(n.gray[700],n.gray[300])};
      & svg {
        color: ${c(n.gray[600],n.gray[400])};
        transform: rotate(-90deg);
        width: ${Y.size[2]};
        height: ${Y.size[2]};
      }
      &:hover {
        background-color: ${c(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
      &.data-disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,settingsMenuHeader:t`
      padding: ${Y.size[1]} ${Y.size[1]};
      font-weight: ${r.weight.medium};
      border-bottom: 1px solid ${c(n.gray[300],n.darkGray[400])};
      color: ${c(n.gray[500],n.gray[400])};
      font-size: ${r.size.xs};
    `,settingsSubButton:t`
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: ${c(n.gray[700],n.gray[300])};
      font-size: ${r.size.xs};
      border-radius: ${Y.border.radius.xs};
      padding: ${Y.size[1]} ${Y.size[1]};
      cursor: pointer;
      background-color: transparent;
      border: none;
      & svg {
        color: ${c(n.gray[600],n.gray[400])};
      }
      &:hover {
        background-color: ${c(n.gray[200],n.darkGray[500])};
      }
      &:focus-visible {
        outline-offset: 2px;
        outline: 2px solid ${n.blue[800]};
      }
      &[data-checked] {
        background-color: ${c(n.purple[100],n.purple[900])};
        color: ${c(n.purple[700],n.purple[300])};
        & svg {
          color: ${c(n.purple[700],n.purple[300])};
        }
        &:hover {
          background-color: ${c(n.purple[100],n.purple[900])};
        }
      }
    `,viewToggle:t`
      border-radius: ${Y.border.radius.sm};
      background-color: ${c(n.gray[200],n.darkGray[600])};
      border: 1px solid ${c(n.gray[300],n.darkGray[200])};
      display: flex;
      padding: 0;
      font-size: ${r.size.xs};
      color: ${c(n.gray[700],n.gray[300])};
      overflow: hidden;

      &:has(:focus-visible) {
        outline: 2px solid ${n.blue[800]};
      }

      & .tsqd-radio-toggle {
        opacity: 0.5;
        display: flex;
        & label {
          display: flex;
          align-items: center;
          cursor: pointer;
          line-height: ${r.lineHeight.md};
        }

        & label:hover {
          background-color: ${c(n.gray[100],n.darkGray[500])};
        }
      }

      & > [data-checked] {
        opacity: 1;
        background-color: ${c(n.gray[100],n.darkGray[400])};
        & label:hover {
          background-color: ${c(n.gray[100],n.darkGray[400])};
        }
      }

      & .tsqd-radio-toggle:first-child {
        & label {
          padding: 0 ${Y.size[1.5]} 0 ${Y.size[2]};
        }
        border-right: 1px solid ${c(n.gray[300],n.darkGray[200])};
      }

      & .tsqd-radio-toggle:nth-child(2) {
        & label {
          padding: 0 ${Y.size[2]} 0 ${Y.size[1.5]};
        }
      }
    `,devtoolsEditForm:t`
      padding: ${i[2]};
      & > [data-error='true'] {
        outline: 2px solid ${c(n.red[200],n.red[800])};
        outline-offset: 2px;
        border-radius: ${s.radius.xs};
      }
    `,devtoolsEditTextarea:t`
      width: 100%;
      max-height: 500px;
      font-family: 'Fira Code', monospace;
      font-size: ${r.size.xs};
      border-radius: ${s.radius.sm};
      field-sizing: content;
      padding: ${i[2]};
      background-color: ${c(n.gray[100],n.darkGray[800])};
      color: ${c(n.gray[900],n.gray[100])};
      border: 1px solid ${c(n.gray[200],n.gray[700])};
      resize: none;
      &:focus {
        outline-offset: 2px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${c(n.blue[200],n.blue[800])};
      }
    `,devtoolsEditFormActions:t`
      display: flex;
      justify-content: space-between;
      gap: ${i[2]};
      align-items: center;
      padding-top: ${i[1]};
      font-size: ${r.size.xs};
    `,devtoolsEditFormError:t`
      color: ${c(n.red[700],n.red[500])};
    `,devtoolsEditFormActionContainer:t`
      display: flex;
      gap: ${i[2]};
    `,devtoolsEditFormAction:t`
      font-family: ui-sans-serif, Inter, system-ui, sans-serif, sans-serif;
      font-size: ${r.size.xs};
      padding: ${i[1]} ${Y.size[2]};
      display: flex;
      border-radius: ${s.radius.sm};
      background-color: ${c(n.gray[100],n.darkGray[600])};
      border: 1px solid ${c(n.gray[300],n.darkGray[400])};
      align-items: center;
      gap: ${i[2]};
      font-weight: ${r.weight.medium};
      line-height: ${r.lineHeight.xs};
      cursor: pointer;
      &:focus-visible {
        outline-offset: 2px;
        border-radius: ${s.radius.xs};
        outline: 2px solid ${n.blue[800]};
      }
      &:hover {
        background-color: ${c(n.gray[200],n.darkGray[500])};
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `}},Al=e=>kl(`light`,e),jl=e=>kl(`dark`,e);e.x([`click`,`mousedown`,`keydown`,`input`]),Object.defineProperty(exports,"a",{enumerable:!0,get:function(){return Ks}}),Object.defineProperty(exports,"c",{enumerable:!0,get:function(){return u}}),Object.defineProperty(exports,"i",{enumerable:!0,get:function(){return Js}}),Object.defineProperty(exports,"n",{enumerable:!0,get:function(){return dl}}),Object.defineProperty(exports,"o",{enumerable:!0,get:function(){return Us}}),Object.defineProperty(exports,"r",{enumerable:!0,get:function(){return pl}}),Object.defineProperty(exports,"s",{enumerable:!0,get:function(){return`system`}}),Object.defineProperty(exports,"t",{enumerable:!0,get:function(){return hl}});