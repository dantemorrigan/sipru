function BookPreview({html:o,title:e,page:i,ctx:n,lang:r,font:c,onMeta:s}){const a=useRef(null),l=useRef(null),[p,x]=useState(!1),[d,f]=useState(!1),[m,y]=useState(0),[w,h]=useState([[]]),g=useRef([]),k=useRef(0),S=T(r||"en"),E=i||(window.SipruStore?window.SipruStore.PAGE_DEFAULTS:{}),b=JSON.stringify(E),v=useMemo(()=>pageGeometry(E,m),[b,m]),{headings:R,htmlWithIds:$}=useMemo(()=>{const u=document.createElement("div");u.innerHTML=o||"";const N=[];let _=0;return u.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(M=>{const z="bh-"+_++;M.id=z,N.push({id:z,level:parseInt(M.tagName[1]),text:M.textContent.trim()})}),{headings:N,htmlWithIds:u.innerHTML}},[o]),L=useRef(s);L.current=s;const P=useRef(v);P.current=v;const C=useRef(1);useEffect(()=>{const u=a.current;if(!u)return;const N=()=>{x(u.scrollTop>320);const _=P.current,M=_.pageH+_.gap,z=Math.max(1,Math.min(C.current,Math.floor((u.scrollTop+M*.35)/M)+1));L.current&&L.current({page:z,total:C.current})};return u.addEventListener("scroll",N,{passive:!0}),()=>u.removeEventListener("scroll",N)},[]),useEffect(()=>{C.current=w.length,s&&s({page:Math.min(w.length,1),total:w.length})},[w.length]),useEffect(()=>{const u=a.current;if(!u)return;const N=()=>{if(!u.clientWidth)return;const M=window.innerWidth<700?20:96;y(Math.max(160,u.clientWidth-M))};N();let _=null;return window.ResizeObserver?(_=new ResizeObserver(N),_.observe(u)):window.addEventListener("resize",N),()=>{_?_.disconnect():window.removeEventListener("resize",N)}},[]);function B(){const u=l.current;if(!u)return;const N=footnoteList(u),_={};N.forEach(z=>{_[z.id]=z});const M=paginateArea(u,v,g.current);h(M.notes.map(z=>z.map(j=>_[j]).filter(Boolean)))}useEffect(()=>{k.current=0,B()},[$,v]);function I(u){const N=g.current;let _=!1;for(let M=0;M<u.length;M++){const z=u[M]?u[M]+Math.round(12*v.scale):0;Math.abs((N[M]||0)-z)>2&&(N[M]=z,_=!0)}N.length>u.length&&(N.length=u.length,_=!0),_&&k.current<3?(k.current++,B()):k.current=0}function H(){a.current&&a.current.scrollTo({top:0,behavior:"smooth"})}const[A,O]=useState(null);useEffect(()=>{if(!A)return;O(null);const u=l.current&&l.current.querySelector("#"+A);if(!u||!a.current)return;const N=a.current.getBoundingClientRect().top,_=u.getBoundingClientRect().top;a.current.scrollBy({top:_-N-24,behavior:"smooth"})},[A]);const U=w.length*(v.pageH+v.gap)-v.gap,q={width:v.pageW,height:U,"--ed-font":c||"var(--book)","--pg-font":v.fontPx+"px","--pg-lead":E.leading,"--pg-align":E.align==="justify"?"justify":E.align,"--pg-indent":E.indent+"em","--pg-padl":E.padL+"em","--pg-padr":E.padR+"em","--pg-before":E.spaceBefore+"em","--pg-after":E.spaceAfter+"em","--pg-hyphens":E.hyphens?"auto":"manual","--pg-scale":v.scale};return React.createElement("div",{className:"preview-scroll",ref:a},R.length>0&&React.createElement("div",{className:"preview-anchors"+(d?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>f(u=>!u)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,S(d?"anchors_hide":"anchors_show"))),d&&React.createElement("nav",{className:"anchors-nav"},R.map(u=>React.createElement("button",{key:u.id,className:"anchor-item anchor-item--h"+u.level,onClick:()=>{f(!1),O(u.id)}},u.text)))),React.createElement("div",{className:"ed-paper ed-paper--preview",style:q},React.createElement(PageLayer,{pages:w,geom:v,pg:E,ctx:n||{title:e||"",chapter:e||""},onFootnote:()=>{},onMeasure:I}),React.createElement("div",{ref:l,className:"ed-area ed-area--ro",style:{top:v.mt,left:v.ml,width:v.contentW},dangerouslySetInnerHTML:{__html:$}})),React.createElement("div",{className:"ed-tail"}),p&&React.createElement("button",{className:"scroll-top-btn",onClick:H,title:S("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}const TXT_BLOCK={P:1,DIV:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,BLOCKQUOTE:1,LI:1,UL:1,OL:1,FIGURE:1,FIGCAPTION:1,ASIDE:1,HR:1,PRE:1,TABLE:1,TR:1,SECTION:1};function blockText(o){const e=[];let i="";const n=()=>{const r=i.split(`
`).map(c=>c.replace(/[^\S\n]+/g," ").trim()).join(`
`).replace(/^\n+|\n+$/g,"");r&&e.push(r),i=""};return(function r(c){for(let s=c.firstChild;s;s=s.nextSibling){if(s.nodeType===3){i+=s.nodeValue;continue}if(s.nodeType===1){if(s.tagName==="BR"){i+=`
`;continue}if(s.tagName==="PRE"){n(),e.push((s.textContent||"").replace(/^\n+|\n+$/g,""));continue}if(s.tagName==="TD"||s.tagName==="TH"){i.trim()&&(i+="  |  "),r(s);continue}if(s.tagName==="IMG"){const a=(s.getAttribute("alt")||"").trim();a&&(i+="["+a+"]");continue}if(s.tagName==="INPUT"){i+=s.hasAttribute("checked")?"[x] ":"[ ] ";continue}TXT_BLOCK[s.tagName]?(n(),r(s),n()):r(s)}}})(o),n(),e.join(`

`)}function htmlToText(o){const e=document.createElement("div");e.innerHTML=o||"";const i=e.querySelector(".fn-defs");let n="";if(i){const r=Array.prototype.map.call(i.children,(c,s)=>s+1+". "+(c.textContent||""));i.remove(),r.length&&(n=`

---
`+r.join(`
`))}return(blockText(e)+n).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(o){return String(o==null?"":o).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(o){let e="";return o.childNodes.forEach(i=>{if(i.nodeType===3){e+=mdEscapeText(i.textContent);return}if(i.nodeType!==1)return;const n=i.tagName.toLowerCase();if(n==="br"){e+=`  
`;return}if(n==="sup"&&i.classList&&i.classList.contains("fn")){e+="[^"+(i.textContent||"").trim()+"]";return}if(n==="code"){const c=i.textContent||"";let s="`";for(;c.indexOf(s)>=0;)s+="`";const a=/^`|`$/.test(c)?" ":"";e+=s+a+c+a+s;return}if(n==="img"){const c=i.getAttribute("src")||"",s=i.getAttribute("title");e+="!["+mdEscapeText(i.getAttribute("alt")||"")+"]("+c+(s?' "'+s.replace(/"/g,"")+'"':"")+")";return}if(n==="input")return;const r=inlineToMd(i);if(n==="strong"||n==="b")e+="**"+r+"**";else if(n==="em"||n==="i")e+="*"+r+"*";else if(n==="u")e+="<u>"+r+"</u>";else if(n==="mark")e+="=="+r+"==";else if(n==="s"||n==="strike")e+="~~"+r+"~~";else if(n==="a"){const c=i.getAttribute("href")||"",s=i.getAttribute("title");!s&&r.trim()===c.trim()&&/^(https?:|mailto:)/i.test(c)?e+="<"+c+">":e+="["+r+"]("+c+(s?' "'+s.replace(/"/g,"")+'"':"")+")"}else e+=r}),e}function listToMd(o,e,i){const n=o.tagName.toLowerCase()==="ol";i=i||"";let r="",c=1;return Array.prototype.forEach.call(o.children,s=>{if(s.tagName.toLowerCase()!=="li")return;const a=[],l=document.createElement("div");Array.prototype.forEach.call(s.childNodes,f=>{const m=f.nodeType===1?f.tagName.toLowerCase():"";m==="ul"||m==="ol"?a.push(f):l.appendChild(f.cloneNode(!0))});const p=s.querySelector(":scope > input[type=checkbox]")?s.querySelector(":scope > input[type=checkbox]").hasAttribute("checked")?"[x] ":"[ ] ":"",x=inlineToMd(l).replace(/\s*\n\s*/g," ").trim(),d=n?c+++". ":"- ";r+=i+d+p+x+`
`,a.forEach(f=>{r+=listToMd(f,e+1,i+" ".repeat(d.length))})}),r}function quoteToMd(o){const e=[];let i=null;return Array.prototype.forEach.call(o.childNodes,n=>{if((n.nodeType===1?n.tagName.toLowerCase():"")==="blockquote"){i=null,e.push(quoteToMd(n).replace(/^/gm,"> "));return}i||(i=document.createElement("div"),e.push(i)),i.appendChild(n.cloneNode(!0))}),e.map(n=>typeof n=="string"?n:inlineToMd(n)).filter(n=>n.trim()).join(`
`).replace(/\s+$/,"")}function guardBlockStart(o){return String(o||"").split(`
`).map(e=>e.replace(/^(\s*)(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|={3,}$|-{3,}$)/,(i,n,r)=>n+"\\"+r)).join(`
`)}function htmlToMd(o){const e=document.createElement("div");e.innerHTML=o||"";let i="";const n=[],r=a=>(n.push(a),"v"+(n.length-1)+""),c=[],s=e.querySelector(".fn-defs");return s&&(Array.prototype.forEach.call(s.children,a=>c.push((a.textContent||"").replace(/\s*\n\s*/g," "))),s.remove()),e.childNodes.forEach(a=>{if(a.nodeType===3){i+=mdEscapeText(a.textContent);return}const l=a.tagName?a.tagName.toLowerCase():"",p=a.getAttribute&&a.getAttribute("class")||"";if(l==="hr"&&p.indexOf("page-break")>=0){i+=`
<!-- page-break -->

`;return}if(l==="hr"&&p.indexOf("scene-sep")>=0){i+=`
<!-- scene: `+(a.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(a.getAttribute("data-s")||"draft")+` -->

`;return}if(l==="figure"&&p.indexOf("epigraph")>=0){const f=a.querySelector("blockquote"),m=a.querySelector("figcaption"),y=f?inlineToMd(f):"",w=m?inlineToMd(m):"";if(!y.trim()&&!w.trim())return;i+=`
::: epigraph
`+y+`
`+(w.trim()?"-- "+w+`
`:"")+`:::

`;return}if(l==="pre"){const m=(a.querySelector("code")||a).textContent||"";if(p.indexOf("math")>=0){i+=`
`+r(`$$
`+m+`
$$`)+`

`;return}let y="```";for(;new RegExp("^\\s*"+y,"m").test(m);)y+="`";i+=`
`+r(y+(a.getAttribute("data-lang")||"")+`
`+m+`
`+y)+`

`;return}if(l==="table"){const f=Array.prototype.map.call(a.querySelectorAll("tr"),k=>Array.prototype.map.call(k.children,S=>inlineToMd(S).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!f.length)return;const m=f.reduce((k,S)=>Math.max(k,S.length),0),y=k=>{const S=k.slice();for(;S.length<m;)S.push("");return"| "+S.join(" | ")+" |"},w=a.querySelector("tr"),h=w?Array.prototype.slice.call(w.children):[],g=[];for(let k=0;k<m;k++){const S=h[k]&&h[k].getAttribute("class")||"";g.push(S.indexOf("ta-c")>=0?":---:":S.indexOf("ta-r")>=0?"---:":S.indexOf("ta-l")>=0?":---":"---")}i+=`
`+y(f[0])+`
| `+g.join(" | ")+` |
`+f.slice(1).map(y).join(`
`)+`

`;return}if(l==="aside"&&p.indexOf("note")>=0){const f=inlineToMd(a);if(!f.trim())return;i+=`
::: note
`+f+`
:::

`;return}const x=inlineToMd(a);if(!x.trim()&&l!=="hr")return;const d=p.match(/\bal-(l|c|r|j)\b/);/^h[1-6]$/.test(l)?i+=`
`+"#".repeat(+l.charAt(1))+" "+x+`

`:l==="blockquote"?i+=quoteToMd(a).replace(/^/gm,"> ")+`

`:l==="hr"?i+=`
---

`:l==="ul"||l==="ol"?i+=`
`+listToMd(a,0)+`
`:l==="p"&&d?i+='<p class="al-'+d[1]+'">'+x.replace(/\n/g," ")+`</p>

`:i+=guardBlockStart(x)+`

`}),i=i.replace(/\n{3,}/g,`

`).trim(),c.length&&(i+=`

`+c.map((a,l)=>"[^"+(l+1)+"]: "+a).join(`
`)),i.replace(/\x01v(\d+)\x02/g,(a,l)=>n[+l])}function splitNotes(o){const e=document.createElement("div");e.innerHTML=o||"";const i=e.querySelector(".fn-defs"),n=[];return i&&(Array.prototype.forEach.call(i.children,r=>n.push(r.textContent||"")),i.remove()),{html:e.innerHTML,notes:n}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(o){const e=o&&o.size==="custom"?{w:o.w||210,h:o.h||297}:PAGE_MM[o&&o.size]||PAGE_MM.a4;return o&&o.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(o){return{...o||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1,noFluid:!0}}function StaticSheet({geom:o,children:e}){const i=useRef(null),n=16*o.scale;return useEffect(()=>{const r=i.current;if(!r)return;const c=()=>{let a=n;r.style.fontSize=a+"px";for(let l=0;l<6;l++){const p=r.firstElementChild;if(!p)return;const x=p.getBoundingClientRect().height;if(x<=r.clientHeight&&p.scrollWidth<=r.clientWidth)return;a=Math.max(n*.5,a*Math.min(.97,r.clientHeight/Math.max(1,x))),r.style.fontSize=a+"px"}};c();const s=document.fonts;if(s&&s.addEventListener)return s.addEventListener("loadingdone",c),()=>s.removeEventListener("loadingdone",c)}),React.createElement("div",{className:"ed-paper exp-sheet",style:{width:o.pageW,height:o.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:o.pageW,height:o.pageH}})),React.createElement("div",{ref:i,className:"exp-sheet-body",style:{top:o.mt,left:o.ml,width:o.contentW,height:o.contentH,fontSize:n+"px"}},e))}function PaginatedChapter({html:o,geom:e,title:i}){const n=useRef(null),r=useRef([]),c=useRef(0),[s,a]=useState([[]]);function l(){const m=n.current;if(!m)return;const y=footnoteList(m),w={};y.forEach(g=>{w[g.id]=g});const h=paginateArea(m,e,r.current);a(h.notes.map(g=>g.map(k=>w[k]).filter(Boolean)))}useEffect(()=>{n.current&&(n.current.innerHTML=(i?"<h1>"+escText(i)+"</h1>":"")+(o||"")),r.current=[],c.current=0,l()},[o,e,i]);function p(m){const y=r.current;let w=!1;for(let h=0;h<m.length;h++){const g=m[h]?m[h]+Math.round(12*e.scale):0;Math.abs((y[h]||0)-g)>2&&(y[h]=g,w=!0)}y.length>m.length&&(y.length=m.length,w=!0),w&&c.current<3?(c.current++,l()):c.current=0}const d=s.length*(e.pageH+e.gap)-e.gap,f={width:e.pageW,height:d,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:f},React.createElement(PageLayer,{pages:s,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:p}),React.createElement("div",{ref:n,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:o,opts:e,lang:i}){const n=T(i||"en"),r=useRef(null),[c,s]=useState(0);useEffect(()=>{const d=r.current;if(!d)return;const f=()=>{d.clientWidth&&s(Math.max(160,d.clientWidth-48))};f();let m=null;return window.ResizeObserver?(m=new ResizeObserver(f),m.observe(d)):window.addEventListener("resize",f),()=>{m?m.disconnect():window.removeEventListener("resize",f)}},[]);const a=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),l=useMemo(()=>{const d=pageGeometry(a,c);return d.leading=a.leading,d.align=a.align,d.indent=a.indent,d.padL=a.padL,d.padR=a.padR,d.spaceBefore=a.spaceBefore,d.spaceAfter=a.spaceAfter,d.hyphens=a.hyphens,d.pg=a,d},[a,c]),p=o.chapters.filter(d=>e.include[d.id]!==!1),x=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:r,style:{"--ed-font":x}},e.titlePage&&React.createElement(StaticSheet,{geom:l},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,o.title),o.synopsis&&React.createElement("p",{className:"b-syn"},o.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:l},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,n("toc_title")),React.createElement("ol",null,p.map(d=>React.createElement("li",{key:d.id},d.title))))),p.map(d=>React.createElement(PaginatedChapter,{key:d.id,html:d.content||"",geom:l,title:d.title})),!p.length&&React.createElement("div",{className:"exp-pages-empty mono"},n("exp_of")))}function NotePagedPreview({note:o,opts:e}){const i=useRef(null),[n,r]=useState(0);useEffect(()=>{const l=i.current;if(!l)return;const p=()=>{l.clientWidth&&r(Math.max(160,l.clientWidth-48))};p();let x=null;return window.ResizeObserver?(x=new ResizeObserver(p),x.observe(l)):window.addEventListener("resize",p),()=>{x?x.disconnect():window.removeEventListener("resize",p)}},[]);const c=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),s=useMemo(()=>{const l=pageGeometry(c,n);return l.leading=c.leading,l.align=c.align,l.indent=c.indent,l.padL=c.padL,l.padR=c.padR,l.spaceBefore=c.spaceBefore,l.spaceAfter=c.spaceAfter,l.hyphens=c.hyphens,l.pg=c,l},[c,n]),a=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:i,style:{"--ed-font":a}},e.titlePage&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,o.title))),React.createElement(PaginatedChapter,{html:o.content||"",geom:s,title:o.title}))}function printHTML(o){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const i=()=>setTimeout(()=>e.remove(),6e4);try{const n=e.contentDocument;n.open(),n.write(o),n.close();const r=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}i()};return n.readyState==="complete"?setTimeout(r,500):e.contentWindow.addEventListener("load",()=>setTimeout(r,500)),!0}catch{return e.remove(),!1}}function downloadBlob(o,e,i){const n=window.__TAURI__;if(n&&n.dialog&&n.fs){const a=i instanceof Uint8Array?i:new TextEncoder().encode(i),l=o.includes(".")?o.slice(o.lastIndexOf(".")+1):"";n.dialog.save({defaultPath:o,filters:l?[{name:l.toUpperCase(),extensions:[l]}]:void 0}).then(p=>p&&n.fs.writeFile(p,a)).catch(()=>{});return}const r=new Blob([i],{type:e}),c=URL.createObjectURL(r),s=document.createElement("a");s.href=c,s.download=o,document.body.appendChild(s),s.click(),s.remove(),setTimeout(()=>URL.revokeObjectURL(c),1500)}const BLOCK_CSS=`
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
`;function escText(o){return String(o==null?"":o).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(o){const{html:e,notes:i}=splitNotes(o);return i.length?e+'<ol class="b-notes">'+i.map(n=>"<li>"+escText(n)+"</li>").join("")+"</ol>":e}function buildBookHTML(o,e){const i=o.chapters.filter(m=>e.include[m.id]!==!1),n=e.page||{},r=pageDimsMM(n),c=n.mt!=null?n.mt:20,s=n.mr!=null?n.mr:18,a=n.mb!=null?n.mb:20,l=n.ml!=null?n.ml:18,p=Math.round(r.w/5.4)+"em",x=Math.round(Math.min(l,s)*2.6)+"px",d=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Lora', Georgia, serif":"'Source Serif 4', Georgia, serif";let f="";return e.titlePage&&(f+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${o.title}</h1>${o.synopsis?`<p class="b-syn">${o.synopsis}</p>`:""}</section>`),e.toc&&(f+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${i.map(m=>`<li><span>${m.title}</span></li>`).join("")}</ol></section>`),i.forEach((m,y)=>{f+=`<section class="b-chap"><h1>${escText(m.title)}</h1>${chapterBody(m.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${o.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
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
  </style></head><body>${f}</body></html>`}function buildPlain(o,e,i){const n=o.chapters.filter(c=>e.include[c.id]!==!1);let r="";return e.titlePage&&(r+=o.title.toUpperCase()+`
`+(o.synopsis||"")+`


`),e.toc&&(r+=t("toc_title",e.lang||"en").toUpperCase()+`
`+n.map((c,s)=>s+1+". "+c.title).join(`
`)+`


`),n.forEach(c=>{const s=(c.title||"").trim();s&&(r+=(i?"# "+s:s.toUpperCase())+`

`),r+=(i?htmlToMd(c.content):htmlToText(c.content))+`


`}),r.trim()+`
`}function buildBookDocx(o,e){const i=o.chapters.filter(r=>e.include[r.id]!==!1),n=[];return e.toc&&n.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+i.map(r=>"<li>"+r.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),i.forEach((r,c)=>{n.push({heading:r.title||"",html:r.content||"",pageBreakBefore:c>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?o.title:"",subtitle:e.titlePage&&o.synopsis||"",sections:n,font:e.font,page:e.page||null,bookTitle:o.title,author:e.author||""})}function ExportModal({store:o,projectId:e,onClose:i,initialFormat:n,onToast:r}){const[c,s]=useDismiss(i),a=o.get().projects.find(b=>b.id===e),l=o.get().user&&o.get().user.lang||"en",p=T(l),x=o.get().user&&o.get().user.editorFont||"book",[d,f]=useState(n||"pdf"),[m,y]=useState(()=>({titlePage:!0,toc:!0,font:x,lang:l,include:{}})),w=b=>y(v=>({...v,...b}));if(!a)return null;const h=o.resolvePage(a.page),g={...m,page:h,author:o.get().user&&o.get().user.name||""},k=useMemo(()=>buildBookHTML(a,g),[a,m,JSON.stringify(h)]),S=a.chapters.filter(b=>m.include[b.id]!==!1).length;function E(b){const v=a.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(b==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(a,g))){r(p("exp_toast_pdf"));return}downloadBlob(v+".html","text/html;charset=utf-8",buildBookHTML(a,g)),r(p("exp_toast_pdf_tauri"));return}const R=window.open("","_blank");if(!R){r(p("exp_err_popup"));return}R.document.write(buildBookHTML(a,g)),R.document.close(),setTimeout(()=>{R.focus(),R.print()},700),r(p("exp_toast_pdf"))}else if(b==="docx")try{downloadBlob(v+".docx",SipruFormats.DOCX_MIME,buildBookDocx(a,g)),r(p("exp_toast_docx_real"))}catch{r(p("exp_err_docx"))}else b==="txt"?(downloadBlob(v+".txt","text/plain;charset=utf-8",buildPlain(a,g,!1)),r(p("exp_toast_txt"))):b==="md"&&(downloadBlob(v+".md","text/markdown;charset=utf-8",buildPlain(a,g,!0)),r(p("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+c,onMouseDown:s},React.createElement("div",{className:"modal export-modal",onMouseDown:b=>b.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},p("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},a.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>w({titlePage:!0,toc:!0,font:x}),title:p("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",p("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:s},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_format_label")),React.createElement("div",{className:"exp-formats"},[["pdf","export"],["docx","note"],["txt","type"],["md","code"]].map(([b,v])=>React.createElement("button",{key:b,className:"exp-fmt"+(d===b?" on":""),onClick:()=>f(b)},React.createElement(Icon,{name:v,size:20}),React.createElement("span",{className:"mono"},b.toUpperCase()))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_chapters_label")," \xB7 ",S," ",p("exp_of")," ",a.chapters.length),React.createElement("ul",{className:"exp-chaps"},a.chapters.map((b,v)=>React.createElement("li",{key:b.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:m.include[b.id]!==!1,onChange:R=>w({include:{...m.include,[b.id]:R.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(v+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},b.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([b,v])=>React.createElement("label",{key:b,className:"exp-toggle"},React.createElement("span",{className:"switch"+(m[b]?" on":""),onClick:()=>w({[b]:!m[b]})},React.createElement("span",null)),p(v))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent exp-go",onClick:()=>E(d)},React.createElement(Icon,{name:"download",size:16})," ",p("exp_do")," \xB7 ",d.toUpperCase()))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:a,opts:g,lang:l})))))}function buildNoteHTML(o,e){const i=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Lora', Georgia, serif":"'Source Serif 4', Georgia, serif",n=e.page||{},r=pageDimsMM(n),c=n.mt!=null?n.mt:20,s=n.mr!=null?n.mr:18,a=n.mb!=null?n.mb:20,l=n.ml!=null?n.ml:18,p=Math.round(r.w/5.4)+"em",x=Math.round(Math.min(l,s)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${o.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${r.w}mm ${r.h}mm; margin: ${c}mm ${s}mm ${a}mm ${l}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${i}; font-size: ${n.fontSize||12}pt; line-height: ${n.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
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
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${o.title}</h1></div>`:""}${chapterBody(o.content||"")}</div></body></html>`}function NoteExportModal({note:o,onClose:e,onToast:i,lang:n,defaultFont:r,page:c}){const[s,a]=useDismiss(e),l=T(n||"en"),[p,x]=useState("pdf"),[d,f]=useState({font:r||"book",titlePage:!0}),m=h=>f(g=>({...g,...h})),y={...d,page:c};function w(h){const g=o.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(h==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(o,y))){i(l("exp_toast_pdf"));return}downloadBlob(g+".html","text/html;charset=utf-8",buildNoteHTML(o,y)),i(l("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){i(l("exp_err_popup"));return}k.document.write(buildNoteHTML(o,y)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),i(l("exp_toast_pdf"))}else if(h==="docx")try{downloadBlob(g+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:d.titlePage?o.title:"",sections:[{html:o.content||""}],font:d.font,page:c||null})),i(l("exp_toast_docx_real"))}catch{i(l("exp_err_docx"))}else h==="txt"?(downloadBlob(g+".txt","text/plain;charset=utf-8",htmlToText(o.content)),i(l("exp_toast_txt"))):h==="md"&&(downloadBlob(g+".md","text/markdown;charset=utf-8","# "+o.title+`

`+htmlToMd(o.content)),i(l("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+s,onMouseDown:a},React.createElement("div",{className:"modal export-modal",onMouseDown:h=>h.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},l("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},o.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>m({font:r||"book",titlePage:!0}),title:l("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",l("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:a},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_format_label")),React.createElement("div",{className:"exp-formats"},[["pdf","export"],["docx","note"],["txt","type"],["md","code"]].map(([h,g])=>React.createElement("button",{key:h,className:"exp-fmt"+(p===h?" on":""),onClick:()=>x(h)},React.createElement(Icon,{name:g,size:20}),React.createElement("span",{className:"mono"},h.toUpperCase()))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(d.titlePage?" on":""),onClick:()=>m({titlePage:!d.titlePage})},React.createElement("span",null)),l("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent exp-go",onClick:()=>w(p)},React.createElement(Icon,{name:"download",size:16})," ",l("exp_do")," \xB7 ",p.toUpperCase()))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(NotePagedPreview,{note:o,opts:y})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
