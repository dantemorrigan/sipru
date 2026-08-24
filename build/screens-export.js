function BookPreview({html:i,title:e,page:o,ctx:n,lang:r,font:c,onMeta:s}){const a=useRef(null),l=useRef(null),[p,x]=useState(!1),[d,f]=useState(!1),[m,b]=useState(0),[g,y]=useState([[]]),S=useRef([]),w=useRef(0),u=T(r||"en"),v=o||(window.SipruStore?window.SipruStore.PAGE_DEFAULTS:{}),C=JSON.stringify(v),M=useMemo(()=>pageGeometry(v,m),[C,m]),{headings:z,htmlWithIds:P}=useMemo(()=>{const h=document.createElement("div");h.innerHTML=i||"";const k=[];let N=0;return h.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(_=>{const E="bh-"+N++;_.id=E,k.push({id:E,level:parseInt(_.tagName[1]),text:_.textContent.trim()})}),{headings:k,htmlWithIds:h.innerHTML}},[i]),R=useRef(s);R.current=s;const L=useRef(M);L.current=M;const A=useRef(1);useEffect(()=>{const h=a.current;if(!h)return;const k=()=>{x(h.scrollTop>320);const N=L.current,_=N.pageH+N.gap,E=Math.max(1,Math.min(A.current,Math.floor((h.scrollTop+_*.35)/_)+1));R.current&&R.current({page:E,total:A.current})};return h.addEventListener("scroll",k,{passive:!0}),()=>h.removeEventListener("scroll",k)},[]),useEffect(()=>{A.current=g.length,s&&s({page:Math.min(g.length,1),total:g.length})},[g.length]),useEffect(()=>{const h=a.current;if(!h)return;const k=()=>{if(!h.clientWidth)return;const _=window.innerWidth<700?20:96;b(Math.max(160,h.clientWidth-_))};k();let N=null;return window.ResizeObserver?(N=new ResizeObserver(k),N.observe(h)):window.addEventListener("resize",k),()=>{N?N.disconnect():window.removeEventListener("resize",k)}},[]);function O(){const h=l.current;if(!h)return;const k=footnoteList(h),N={};k.forEach(E=>{N[E.id]=E});const _=paginateArea(h,M,S.current);y(_.notes.map(E=>E.map(j=>N[j]).filter(Boolean)))}useEffect(()=>{w.current=0,O()},[P,M]);function I(h){const k=S.current;let N=!1;for(let _=0;_<h.length;_++){const E=h[_]?h[_]+Math.round(12*M.scale):0;Math.abs((k[_]||0)-E)>2&&(k[_]=E,N=!0)}k.length>h.length&&(k.length=h.length,N=!0),N&&w.current<3?(w.current++,O()):w.current=0}function H(){a.current&&a.current.scrollTo({top:0,behavior:"smooth"})}const[$,B]=useState(null);useEffect(()=>{if(!$)return;B(null);const h=l.current&&l.current.querySelector("#"+$);if(!h||!a.current)return;const k=a.current.getBoundingClientRect().top,N=h.getBoundingClientRect().top;a.current.scrollBy({top:N-k-24,behavior:"smooth"})},[$]);const D=g.length*(M.pageH+M.gap)-M.gap,q={width:M.pageW,height:D,"--ed-font":c||"var(--book)","--pg-font":M.fontPx+"px","--pg-lead":v.leading,"--pg-align":v.align==="justify"?"justify":v.align,"--pg-indent":v.indent+"em","--pg-padl":v.padL+"em","--pg-padr":v.padR+"em","--pg-before":v.spaceBefore+"em","--pg-after":v.spaceAfter+"em","--pg-hyphens":v.hyphens?"auto":"manual","--pg-scale":M.scale};return React.createElement("div",{className:"preview-scroll",ref:a},z.length>0&&React.createElement("div",{className:"preview-anchors"+(d?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>f(h=>!h)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,u(d?"anchors_hide":"anchors_show"))),d&&React.createElement("nav",{className:"anchors-nav"},z.map(h=>React.createElement("button",{key:h.id,className:"anchor-item anchor-item--h"+h.level,onClick:()=>{f(!1),B(h.id)}},h.text)))),React.createElement("div",{className:"ed-paper ed-paper--preview",style:q},React.createElement(PageLayer,{pages:g,geom:M,pg:v,ctx:n||{title:e||"",chapter:e||""},onFootnote:()=>{},onMeasure:I}),React.createElement("div",{ref:l,className:"ed-area ed-area--ro",style:{top:M.mt,left:M.ml,width:M.contentW},dangerouslySetInnerHTML:{__html:P}})),React.createElement("div",{className:"ed-tail"}),p&&React.createElement("button",{className:"scroll-top-btn",onClick:H,title:u("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}const TXT_BLOCK={P:1,DIV:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,BLOCKQUOTE:1,LI:1,UL:1,OL:1,FIGURE:1,FIGCAPTION:1,ASIDE:1,HR:1,PRE:1,TABLE:1,TR:1,SECTION:1};function blockText(i){const e=[];let o="";const n=()=>{const r=o.split(`
`).map(c=>c.replace(/[^\S\n]+/g," ").trim()).join(`
`).replace(/^\n+|\n+$/g,"");r&&e.push(r),o=""};return(function r(c){for(let s=c.firstChild;s;s=s.nextSibling){if(s.nodeType===3){o+=s.nodeValue;continue}if(s.nodeType===1){if(s.tagName==="BR"){o+=`
`;continue}if(s.tagName==="PRE"){n(),e.push((s.textContent||"").replace(/^\n+|\n+$/g,""));continue}if(s.tagName==="TD"||s.tagName==="TH"){o.trim()&&(o+="  |  "),r(s);continue}if(s.tagName==="IMG"){const a=(s.getAttribute("alt")||"").trim();a&&(o+="["+a+"]");continue}if(s.tagName==="INPUT"){o+=s.hasAttribute("checked")?"[x] ":"[ ] ";continue}TXT_BLOCK[s.tagName]?(n(),r(s),n()):r(s)}}})(i),n(),e.join(`

`)}function htmlToText(i){const e=document.createElement("div");e.innerHTML=i||"";const o=e.querySelector(".fn-defs");let n="";if(o){const r=Array.prototype.map.call(o.children,(c,s)=>s+1+". "+(c.textContent||""));o.remove(),r.length&&(n=`

---
`+r.join(`
`))}return(blockText(e)+n).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(i){return String(i==null?"":i).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(i){let e="";return i.childNodes.forEach(o=>{if(o.nodeType===3){e+=mdEscapeText(o.textContent);return}if(o.nodeType!==1)return;const n=o.tagName.toLowerCase();if(n==="br"){e+=`  
`;return}if(n==="sup"&&o.classList&&o.classList.contains("fn")){e+="[^"+(o.textContent||"").trim()+"]";return}if(n==="code"){const c=o.textContent||"";let s="`";for(;c.indexOf(s)>=0;)s+="`";const a=/^`|`$/.test(c)?" ":"";e+=s+a+c+a+s;return}if(n==="img"){const c=o.getAttribute("src")||"",s=o.getAttribute("title");e+="!["+mdEscapeText(o.getAttribute("alt")||"")+"]("+c+(s?' "'+s.replace(/"/g,"")+'"':"")+")";return}if(n==="input")return;const r=inlineToMd(o);if(n==="strong"||n==="b")e+="**"+r+"**";else if(n==="em"||n==="i")e+="*"+r+"*";else if(n==="u")e+="<u>"+r+"</u>";else if(n==="mark")e+="=="+r+"==";else if(n==="s"||n==="strike")e+="~~"+r+"~~";else if(n==="a"){const c=o.getAttribute("href")||"",s=o.getAttribute("title");!s&&r.trim()===c.trim()&&/^(https?:|mailto:)/i.test(c)?e+="<"+c+">":e+="["+r+"]("+c+(s?' "'+s.replace(/"/g,"")+'"':"")+")"}else e+=r}),e}function listToMd(i,e,o){const n=i.tagName.toLowerCase()==="ol";o=o||"";let r="",c=1;return Array.prototype.forEach.call(i.children,s=>{if(s.tagName.toLowerCase()!=="li")return;const a=[],l=document.createElement("div");Array.prototype.forEach.call(s.childNodes,f=>{const m=f.nodeType===1?f.tagName.toLowerCase():"";m==="ul"||m==="ol"?a.push(f):l.appendChild(f.cloneNode(!0))});const p=s.querySelector(":scope > input[type=checkbox]")?s.querySelector(":scope > input[type=checkbox]").hasAttribute("checked")?"[x] ":"[ ] ":"",x=inlineToMd(l).replace(/\s*\n\s*/g," ").trim(),d=n?c+++". ":"- ";r+=o+d+p+x+`
`,a.forEach(f=>{r+=listToMd(f,e+1,o+" ".repeat(d.length))})}),r}function quoteToMd(i){const e=[];let o=null;return Array.prototype.forEach.call(i.childNodes,n=>{if((n.nodeType===1?n.tagName.toLowerCase():"")==="blockquote"){o=null,e.push(quoteToMd(n).replace(/^/gm,"> "));return}o||(o=document.createElement("div"),e.push(o)),o.appendChild(n.cloneNode(!0))}),e.map(n=>typeof n=="string"?n:inlineToMd(n)).filter(n=>n.trim()).join(`
`).replace(/\s+$/,"")}function guardBlockStart(i){return String(i||"").split(`
`).map(e=>e.replace(/^(\s*)(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|={3,}$|-{3,}$)/,(o,n,r)=>n+"\\"+r)).join(`
`)}function htmlToMd(i){const e=document.createElement("div");e.innerHTML=i||"";let o="";const n=[],r=a=>(n.push(a),"v"+(n.length-1)+""),c=[],s=e.querySelector(".fn-defs");return s&&(Array.prototype.forEach.call(s.children,a=>c.push((a.textContent||"").replace(/\s*\n\s*/g," "))),s.remove()),e.childNodes.forEach(a=>{if(a.nodeType===3){o+=mdEscapeText(a.textContent);return}const l=a.tagName?a.tagName.toLowerCase():"",p=a.getAttribute&&a.getAttribute("class")||"";if(l==="hr"&&p.indexOf("page-break")>=0){o+=`
<!-- page-break -->

`;return}if(l==="hr"&&p.indexOf("scene-sep")>=0){o+=`
<!-- scene: `+(a.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(a.getAttribute("data-s")||"draft")+` -->

`;return}if(l==="figure"&&p.indexOf("epigraph")>=0){const f=a.querySelector("blockquote"),m=a.querySelector("figcaption"),b=f?inlineToMd(f):"",g=m?inlineToMd(m):"";if(!b.trim()&&!g.trim())return;o+=`
::: epigraph
`+b+`
`+(g.trim()?"-- "+g+`
`:"")+`:::

`;return}if(l==="pre"){const m=(a.querySelector("code")||a).textContent||"";if(p.indexOf("math")>=0){o+=`
`+r(`$$
`+m+`
$$`)+`

`;return}let b="```";for(;new RegExp("^\\s*"+b,"m").test(m);)b+="`";o+=`
`+r(b+(a.getAttribute("data-lang")||"")+`
`+m+`
`+b)+`

`;return}if(l==="table"){const f=Array.prototype.map.call(a.querySelectorAll("tr"),w=>Array.prototype.map.call(w.children,u=>inlineToMd(u).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!f.length)return;const m=f.reduce((w,u)=>Math.max(w,u.length),0),b=w=>{const u=w.slice();for(;u.length<m;)u.push("");return"| "+u.join(" | ")+" |"},g=a.querySelector("tr"),y=g?Array.prototype.slice.call(g.children):[],S=[];for(let w=0;w<m;w++){const u=y[w]&&y[w].getAttribute("class")||"";S.push(u.indexOf("ta-c")>=0?":---:":u.indexOf("ta-r")>=0?"---:":u.indexOf("ta-l")>=0?":---":"---")}o+=`
`+b(f[0])+`
| `+S.join(" | ")+` |
`+f.slice(1).map(b).join(`
`)+`

`;return}if(l==="aside"&&p.indexOf("note")>=0){const f=inlineToMd(a);if(!f.trim())return;o+=`
::: note
`+f+`
:::

`;return}const x=inlineToMd(a);if(!x.trim()&&l!=="hr")return;const d=p.match(/\bal-(l|c|r|j)\b/);/^h[1-6]$/.test(l)?o+=`
`+"#".repeat(+l.charAt(1))+" "+x+`

`:l==="blockquote"?o+=quoteToMd(a).replace(/^/gm,"> ")+`

`:l==="hr"?o+=`
---

`:l==="ul"||l==="ol"?o+=`
`+listToMd(a,0)+`
`:l==="p"&&d?o+='<p class="al-'+d[1]+'">'+x.replace(/\n/g," ")+`</p>

`:o+=guardBlockStart(x)+`

`}),o=o.replace(/\n{3,}/g,`

`).trim(),c.length&&(o+=`

`+c.map((a,l)=>"[^"+(l+1)+"]: "+a).join(`
`)),o.replace(/\x01v(\d+)\x02/g,(a,l)=>n[+l])}function splitNotes(i){const e=document.createElement("div");e.innerHTML=i||"";const o=e.querySelector(".fn-defs"),n=[];return o&&(Array.prototype.forEach.call(o.children,r=>n.push(r.textContent||"")),o.remove()),{html:e.innerHTML,notes:n}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(i){const e=i&&i.size==="custom"?{w:i.w||210,h:i.h||297}:PAGE_MM[i&&i.size]||PAGE_MM.a4;return i&&i.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(i){return{...i||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1,noFluid:!0}}function StaticSheet({geom:i,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:i.pageW,height:i.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:i.pageW,height:i.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:i.mt,left:i.ml,width:i.contentW,height:i.contentH}},e))}function PaginatedChapter({html:i,geom:e,title:o}){const n=useRef(null),r=useRef([]),c=useRef(0),[s,a]=useState([[]]);function l(){const m=n.current;if(!m)return;const b=footnoteList(m),g={};b.forEach(S=>{g[S.id]=S});const y=paginateArea(m,e,r.current);a(y.notes.map(S=>S.map(w=>g[w]).filter(Boolean)))}useEffect(()=>{n.current&&(n.current.innerHTML=(o?"<h1>"+escText(o)+"</h1>":"")+(i||"")),r.current=[],c.current=0,l()},[i,e,o]);function p(m){const b=r.current;let g=!1;for(let y=0;y<m.length;y++){const S=m[y]?m[y]+Math.round(12*e.scale):0;Math.abs((b[y]||0)-S)>2&&(b[y]=S,g=!0)}b.length>m.length&&(b.length=m.length,g=!0),g&&c.current<3?(c.current++,l()):c.current=0}const d=s.length*(e.pageH+e.gap)-e.gap,f={width:e.pageW,height:d,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:f},React.createElement(PageLayer,{pages:s,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:p}),React.createElement("div",{ref:n,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:i,opts:e,lang:o}){const n=T(o||"en"),r=useRef(null),[c,s]=useState(0);useEffect(()=>{const d=r.current;if(!d)return;const f=()=>{d.clientWidth&&s(Math.max(160,d.clientWidth-48))};f();let m=null;return window.ResizeObserver?(m=new ResizeObserver(f),m.observe(d)):window.addEventListener("resize",f),()=>{m?m.disconnect():window.removeEventListener("resize",f)}},[]);const a=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),l=useMemo(()=>{const d=pageGeometry(a,c);return d.leading=a.leading,d.align=a.align,d.indent=a.indent,d.padL=a.padL,d.padR=a.padR,d.spaceBefore=a.spaceBefore,d.spaceAfter=a.spaceAfter,d.hyphens=a.hyphens,d.pg=a,d},[a,c]),p=i.chapters.filter(d=>e.include[d.id]!==!1),x=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:r,style:{"--ed-font":x}},e.titlePage&&React.createElement(StaticSheet,{geom:l},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,i.title),i.synopsis&&React.createElement("p",{className:"b-syn"},i.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:l},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,n("toc_title")),React.createElement("ol",null,p.map(d=>React.createElement("li",{key:d.id},d.title))))),p.map(d=>React.createElement(PaginatedChapter,{key:d.id,html:d.content||"",geom:l,title:d.title})),!p.length&&React.createElement("div",{className:"exp-pages-empty mono"},n("exp_of")))}function NotePagedPreview({note:i,opts:e}){const o=useRef(null),[n,r]=useState(0);useEffect(()=>{const l=o.current;if(!l)return;const p=()=>{l.clientWidth&&r(Math.max(160,l.clientWidth-48))};p();let x=null;return window.ResizeObserver?(x=new ResizeObserver(p),x.observe(l)):window.addEventListener("resize",p),()=>{x?x.disconnect():window.removeEventListener("resize",p)}},[]);const c=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),s=useMemo(()=>{const l=pageGeometry(c,n);return l.leading=c.leading,l.align=c.align,l.indent=c.indent,l.padL=c.padL,l.padR=c.padR,l.spaceBefore=c.spaceBefore,l.spaceAfter=c.spaceAfter,l.hyphens=c.hyphens,l.pg=c,l},[c,n]),a=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:o,style:{"--ed-font":a}},e.titlePage&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,i.title))),React.createElement(PaginatedChapter,{html:i.content||"",geom:s,title:i.title}))}function printHTML(i){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const o=()=>setTimeout(()=>e.remove(),6e4);try{const n=e.contentDocument;n.open(),n.write(i),n.close();const r=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}o()};return n.readyState==="complete"?setTimeout(r,500):e.contentWindow.addEventListener("load",()=>setTimeout(r,500)),!0}catch{return e.remove(),!1}}function downloadBlob(i,e,o){const n=window.__TAURI__;if(n&&n.dialog&&n.fs){const a=o instanceof Uint8Array?o:new TextEncoder().encode(o),l=i.includes(".")?i.slice(i.lastIndexOf(".")+1):"";n.dialog.save({defaultPath:i,filters:l?[{name:l.toUpperCase(),extensions:[l]}]:void 0}).then(p=>p&&n.fs.writeFile(p,a)).catch(()=>{});return}const r=new Blob([o],{type:e}),c=URL.createObjectURL(r),s=document.createElement("a");s.href=c,s.download=i,document.body.appendChild(s),s.click(),s.remove(),setTimeout(()=>URL.revokeObjectURL(c),1500)}const BLOCK_CSS=`
    sup.fn { font-size: .68em; vertical-align: super; line-height: 0; color: #c2542f; }
    .fn-defs { display: none; }
    .b-notes { margin: 1.8em 0 0; padding: .9em 0 0 1.4em; border-top: 1px solid #e2ddcf;
      font-size: 9.5pt; line-height: 1.45; color: #5c564a; }
    .b-notes li { margin-bottom: .3em; text-align: left; text-indent: 0; }
    figure.epigraph { margin: 1.8em 0 2em auto; max-width: 24em; font-style: italic; color: #5c564a; }
    figure.epigraph blockquote { margin: 0; font-style: italic; color: inherit; text-align: right; }
    figure.epigraph figcaption { margin-top: .45em; text-align: right; font-style: normal;
      font-size: .86em; letter-spacing: .02em; color: #8a8474; }
    aside.note { margin: 1.3em 0; padding: .55em 0 .55em .95em; border-left: 2px solid #ddd7c8;
      font-size: .92em; color: #5c564a; text-indent: 0; }
    hr.page-break { border: none; height: 0; margin: 0; page-break-after: always; break-after: page; }
    hr.page-break::after { content: none; }
    hr.scene-sep { border: none; text-align: center; margin: 1.7em 0; }
    hr.scene-sep::after { content: "\xB7 \xB7 \xB7"; color: #b9b2a1; letter-spacing: .2em; }
    p.al-l { text-align: left; } p.al-j { text-align: justify; }
    p.al-c { text-align: center; text-indent: 0; } p.al-r { text-align: right; text-indent: 0; }
    /* justify stretches every forced line of a paragraph, not just its
       wrapped ones \u2014 a paragraph built from manual line breaks (an
       address, a diagram, a few short verse lines) has too few words per
       line for that, and blows apart into huge gaps. */
    p:has(br) { text-align: left; }
    /* ---- the wider markdown set, printed the way the editor shows it ---- */
    blockquote blockquote { margin: .6em 0; border-left-color: #ddd7c8; }
    li > ul, li > ol { margin: .35em 0 .1em; }
    li.task { list-style: none; margin-left: -1.15em; }
    li.task > input[type="checkbox"] { margin-right: .5em; }
    mark { background: #f6e2b8; color: inherit; padding: .05em .18em; }
    img { max-width: 100%; height: auto; display: block; margin: 1.2em auto; }
    table { width: 100%; border-collapse: collapse; margin: 1.3em 0; text-indent: 0;
      font-size: .94em; page-break-inside: avoid; break-inside: avoid; }
    th, td { border: 1px solid #ddd7c8; padding: .42em .6em; text-align: left; vertical-align: top; }
    thead th { background: #f4f0e6; font-weight: 600; }
    .ta-l { text-align: left; } .ta-c { text-align: center; } .ta-r { text-align: right; }
    pre { margin: 1.3em 0; padding: .85em 1em; text-indent: 0; overflow-x: auto;
      background: #f4f0e6; border: 1px solid #e2ddcf; border-radius: 6px;
      page-break-inside: avoid; break-inside: avoid; }
    pre code { display: block; background: none; border: none; padding: 0;
      font-size: .84em; line-height: 1.5; white-space: pre-wrap; }
    pre[data-lang]::before { content: attr(data-lang); display: block; margin: -.25em 0 .5em;
      font-family: 'JetBrains Mono', monospace; font-size: .66em; letter-spacing: .08em;
      text-transform: uppercase; color: #a09a89; }
    code { font-family: 'JetBrains Mono', monospace; font-size: .87em;
      background: #f4f0e6; border: 1px solid #e2ddcf; border-radius: 3px; padding: .1em .35em; }
    h4 { font-size: 1.05em; font-weight: 600; margin: 1.1em 0 .35em; text-indent: 0; }
    h5 { font-size: 1em; font-weight: 600; margin: 1em 0 .3em; text-indent: 0; }
    h6 { font-size: .92em; font-weight: 600; margin: 1em 0 .3em; text-indent: 0;
      letter-spacing: .04em; text-transform: uppercase; }
`;function escText(i){return String(i==null?"":i).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(i){const{html:e,notes:o}=splitNotes(i);return o.length?e+'<ol class="b-notes">'+o.map(n=>"<li>"+escText(n)+"</li>").join("")+"</ol>":e}function buildBookHTML(i,e){const o=i.chapters.filter(m=>e.include[m.id]!==!1),n=e.page||{},r=pageDimsMM(n),c=n.mt!=null?n.mt:20,s=n.mr!=null?n.mr:18,a=n.mb!=null?n.mb:20,l=n.ml!=null?n.ml:18,p=Math.round(r.w/5.4)+"em",x=Math.round(Math.min(l,s)*2.6)+"px",d=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let f="";return e.titlePage&&(f+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${i.title}</h1>${i.synopsis?`<p class="b-syn">${i.synopsis}</p>`:""}</section>`),e.toc&&(f+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${o.map(m=>`<li><span>${m.title}</span></li>`).join("")}</ol></section>`),o.forEach((m,b)=>{f+=`<section class="b-chap"><h1>${escText(m.title)}</h1>${chapterBody(m.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${r.w}mm ${r.h}mm; margin: ${c}mm ${s}mm ${a}mm ${l}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${d}; font-size: ${n.fontSize||12}pt; line-height: ${n.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
    .b-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; }
    .b-title h1 { font-size: 30pt; line-height: 1.06; margin: 18px 0 16px; font-weight: 600; letter-spacing: -.015em; }
    .b-syn { font-style: italic; color: #6b6457; font-size: 13pt; margin: 0 auto; max-width: 30em; }
    .b-toc h2 { font-size: 15pt; font-weight: 600; margin: 0 0 .9em; letter-spacing: -.01em; }
    .b-toc ol { line-height: 2.05; padding-left: 1.3em; color: #3a382f; margin: 0; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${n.spaceAfter!=null?n.spaceAfter:.6}em; text-indent: ${n.indent!=null?n.indent:1.5}em; text-align: ${(n.align||"justify")==="justify"?"justify":n.align}; }
    h1 + p, h2 + p, h3 + p, h4 + p, h5 + p, h6 + p, blockquote + p, ul + p, ol + p, hr + p, p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; text-align: left; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "\u2736"; color: #c2542f; }
${BLOCK_CSS}
    /* on-screen preview: a single clean, centred book column */
    @media screen {
      body { padding: 60px 0 80px; }
      body > section { max-width: ${p}; margin: 0 auto; padding: 0 ${x}; }
      .b-title { text-align: center; padding-bottom: 46px; margin-bottom: 46px; border-bottom: 1px solid #e9e3d5; }
      .b-toc { padding-bottom: 40px; margin-bottom: 40px; border-bottom: 1px solid #e9e3d5; }
      .b-chap + .b-chap { margin-top: 44px; }
      .b-chap h1 { padding-top: 26px; }
      .b-chap:first-of-type h1 { padding-top: 0; }
    }
    /* print / PDF: real pagination */
    @media print {
      .b-title { text-align: center; padding-top: 34vh; page-break-after: always; }
      .b-toc { page-break-after: always; padding-top: 12%; }
      .b-chap { page-break-before: always; break-before: page; }
      .b-chap:first-of-type { page-break-before: avoid; break-before: avoid; }
      h1 { padding-top: 6%; }
    }
  </style></head><body>${f}</body></html>`}function buildPlain(i,e,o){const n=i.chapters.filter(c=>e.include[c.id]!==!1);let r="";return e.titlePage&&(r+=i.title.toUpperCase()+`
`+(i.synopsis||"")+`


`),e.toc&&(r+=t("toc_title",e.lang||"en").toUpperCase()+`
`+n.map((c,s)=>s+1+". "+c.title).join(`
`)+`


`),n.forEach(c=>{const s=(c.title||"").trim();s&&(r+=(o?"# "+s:s.toUpperCase())+`

`),r+=(o?htmlToMd(c.content):htmlToText(c.content))+`


`}),r.trim()+`
`}function buildBookDocx(i,e){const o=i.chapters.filter(r=>e.include[r.id]!==!1),n=[];return e.toc&&n.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+o.map(r=>"<li>"+r.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),o.forEach((r,c)=>{n.push({heading:r.title||"",html:r.content||"",pageBreakBefore:c>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?i.title:"",subtitle:e.titlePage&&i.synopsis||"",sections:n,font:e.font,page:e.page||null,bookTitle:i.title,author:e.author||""})}function ExportModal({store:i,projectId:e,onClose:o,initialFormat:n,onToast:r}){const[c,s]=useDismiss(o),a=i.get().projects.find(u=>u.id===e),l=i.get().user&&i.get().user.lang||"en",p=T(l),x=i.get().user&&i.get().user.editorFont||"book",[d,f]=useState(()=>({titlePage:!0,toc:!0,font:x,lang:l,include:{}})),m=u=>f(v=>({...v,...u}));if(!a)return null;const b=i.resolvePage(a.page),g={...d,page:b,author:i.get().user&&i.get().user.name||""},y=useMemo(()=>buildBookHTML(a,g),[a,d,JSON.stringify(b)]),S=a.chapters.filter(u=>d.include[u.id]!==!1).length;function w(u){const v=a.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(u==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(a,g))){r(p("exp_toast_pdf"));return}downloadBlob(v+".html","text/html;charset=utf-8",buildBookHTML(a,g)),r(p("exp_toast_pdf_tauri"));return}const C=window.open("","_blank");if(!C){r(p("exp_err_popup"));return}C.document.write(buildBookHTML(a,g)),C.document.close(),setTimeout(()=>{C.focus(),C.print()},700),r(p("exp_toast_pdf"))}else if(u==="docx")try{downloadBlob(v+".docx",SipruFormats.DOCX_MIME,buildBookDocx(a,g)),r(p("exp_toast_docx_real"))}catch{r(p("exp_err_docx"))}else u==="txt"?(downloadBlob(v+".txt","text/plain;charset=utf-8",buildPlain(a,g,!1)),r(p("exp_toast_txt"))):u==="md"&&(downloadBlob(v+".md","text/markdown;charset=utf-8",buildPlain(a,g,!0)),r(p("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+c,onMouseDown:s},React.createElement("div",{className:"modal export-modal",onMouseDown:u=>u.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},p("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},a.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>m({titlePage:!0,toc:!0,font:x}),title:p("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",p("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:s},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_chapters_label")," \xB7 ",S," ",p("exp_of")," ",a.chapters.length),React.createElement("ul",{className:"exp-chaps"},a.chapters.map((u,v)=>React.createElement("li",{key:u.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:d.include[u.id]!==!1,onChange:C=>m({include:{...d.include,[u.id]:C.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(v+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},u.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([u,v])=>React.createElement("label",{key:u,className:"exp-toggle"},React.createElement("span",{className:"switch"+(d[u]?" on":""),onClick:()=>m({[u]:!d[u]})},React.createElement("span",null)),p(v))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>w("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>w("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>w("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>w("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:a,opts:g,lang:l})))))}function buildNoteHTML(i,e){const o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif",n=e.page||{},r=pageDimsMM(n),c=n.mt!=null?n.mt:20,s=n.mr!=null?n.mr:18,a=n.mb!=null?n.mb:20,l=n.ml!=null?n.ml:18,p=Math.round(r.w/5.4)+"em",x=Math.round(Math.min(l,s)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${r.w}mm ${r.h}mm; margin: ${c}mm ${s}mm ${a}mm ${l}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${o}; font-size: ${n.fontSize||12}pt; line-height: ${n.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${n.spaceAfter!=null?n.spaceAfter:.8}em; text-indent: ${n.indent!=null?n.indent:0}em; text-align: ${(n.align||"left")==="justify"?"justify":n.align||"left"}; }
    p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; border-left: 3px solid #c2542f; padding-left: 1em; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "\u2736"; color: #c2542f; }
${BLOCK_CSS}
    .n-head { margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #e9e3d5; }
    .n-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; margin-bottom: 10px; }
    .n-title { font-size: 26pt; font-weight: 600; letter-spacing: -.015em; line-height: 1.1; margin: 0; }
    @media screen {
      body { padding: 60px 0 80px; }
      .n-wrap { max-width: ${p}; margin: 0 auto; padding: 0 ${x}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${i.title}</h1></div>`:""}${chapterBody(i.content||"")}</div></body></html>`}function NoteExportModal({note:i,onClose:e,onToast:o,lang:n,defaultFont:r,page:c}){const[s,a]=useDismiss(e),l=T(n||"en"),[p,x]=useState({font:r||"book",titlePage:!0}),d=b=>x(g=>({...g,...b})),f={...p,page:c};function m(b){const g=i.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(b==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(i,f))){o(l("exp_toast_pdf"));return}downloadBlob(g+".html","text/html;charset=utf-8",buildNoteHTML(i,f)),o(l("exp_toast_pdf_tauri"));return}const y=window.open("","_blank");if(!y){o(l("exp_err_popup"));return}y.document.write(buildNoteHTML(i,f)),y.document.close(),setTimeout(()=>{y.focus(),y.print()},700),o(l("exp_toast_pdf"))}else if(b==="docx")try{downloadBlob(g+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:p.titlePage?i.title:"",sections:[{html:i.content||""}],font:p.font,page:c||null})),o(l("exp_toast_docx_real"))}catch{o(l("exp_err_docx"))}else b==="txt"?(downloadBlob(g+".txt","text/plain;charset=utf-8",htmlToText(i.content)),o(l("exp_toast_txt"))):b==="md"&&(downloadBlob(g+".md","text/markdown;charset=utf-8","# "+i.title+`

`+htmlToMd(i.content)),o(l("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+s,onMouseDown:a},React.createElement("div",{className:"modal export-modal",onMouseDown:b=>b.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},l("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},i.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>d({font:r||"book",titlePage:!0}),title:l("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",l("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:a},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(p.titlePage?" on":""),onClick:()=>d({titlePage:!p.titlePage})},React.createElement("span",null)),l("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>m("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>m("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>m("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>m("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(NotePagedPreview,{note:i,opts:f})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
