function BookPreview({html:i,title:e,page:o,ctx:n,lang:a,font:c,onMeta:s}){const r=useRef(null),l=useRef(null),[p,x]=useState(!1),[d,f]=useState(!1),[m,y]=useState(0),[w,h]=useState([[]]),g=useRef([]),k=useRef(0),S=T(a||"en"),E=o||(window.SipruStore?window.SipruStore.PAGE_DEFAULTS:{}),b=JSON.stringify(E),v=useMemo(()=>pageGeometry(E,m),[b,m]),{headings:R,htmlWithIds:A}=useMemo(()=>{const u=document.createElement("div");u.innerHTML=i||"";const N=[];let _=0;return u.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(M=>{const z="bh-"+_++;M.id=z,N.push({id:z,level:parseInt(M.tagName[1]),text:M.textContent.trim()})}),{headings:N,htmlWithIds:u.innerHTML}},[i]),L=useRef(s);L.current=s;const P=useRef(v);P.current=v;const C=useRef(1);useEffect(()=>{const u=r.current;if(!u)return;const N=()=>{x(u.scrollTop>320);const _=P.current,M=_.pageH+_.gap,z=Math.max(1,Math.min(C.current,Math.floor((u.scrollTop+M*.35)/M)+1));L.current&&L.current({page:z,total:C.current})};return u.addEventListener("scroll",N,{passive:!0}),()=>u.removeEventListener("scroll",N)},[]),useEffect(()=>{C.current=w.length,s&&s({page:Math.min(w.length,1),total:w.length})},[w.length]),useEffect(()=>{const u=r.current;if(!u)return;const N=()=>{if(!u.clientWidth)return;const M=window.innerWidth<700?20:96;y(Math.max(160,u.clientWidth-M))};N();let _=null;return window.ResizeObserver?(_=new ResizeObserver(N),_.observe(u)):window.addEventListener("resize",N),()=>{_?_.disconnect():window.removeEventListener("resize",N)}},[]);function B(){const u=l.current;if(!u)return;const N=footnoteList(u),_={};N.forEach(z=>{_[z.id]=z});const M=paginateArea(u,v,g.current);h(M.notes.map(z=>z.map(q=>_[q]).filter(Boolean)))}useEffect(()=>{k.current=0,B()},[A,v]);function I(u){const N=g.current;let _=!1;for(let M=0;M<u.length;M++){const z=u[M]?u[M]+Math.round(12*v.scale):0;Math.abs((N[M]||0)-z)>2&&(N[M]=z,_=!0)}N.length>u.length&&(N.length=u.length,_=!0),_&&k.current<3?(k.current++,B()):k.current=0}function H(){r.current&&r.current.scrollTo({top:0,behavior:"smooth"})}const[$,O]=useState(null);useEffect(()=>{if(!$)return;O(null);const u=l.current&&l.current.querySelector("#"+$);if(!u||!r.current)return;const N=r.current.getBoundingClientRect().top,_=u.getBoundingClientRect().top;r.current.scrollBy({top:_-N-24,behavior:"smooth"})},[$]);const j=w.length*(v.pageH+v.gap)-v.gap,U={width:v.pageW,height:j,"--ed-font":c||"var(--book)","--pg-font":v.fontPx+"px","--pg-lead":E.leading,"--pg-align":E.align==="justify"?"justify":E.align,"--pg-indent":E.indent+"em","--pg-padl":E.padL+"em","--pg-padr":E.padR+"em","--pg-before":E.spaceBefore+"em","--pg-after":E.spaceAfter+"em","--pg-hyphens":E.hyphens?"auto":"manual","--pg-scale":v.scale};return React.createElement("div",{className:"preview-scroll",ref:r},R.length>0&&React.createElement("div",{className:"preview-anchors"+(d?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>f(u=>!u)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,S(d?"anchors_hide":"anchors_show"))),d&&React.createElement("nav",{className:"anchors-nav"},R.map(u=>React.createElement("button",{key:u.id,className:"anchor-item anchor-item--h"+u.level,onClick:()=>{f(!1),O(u.id)}},u.text)))),React.createElement("div",{className:"ed-paper ed-paper--preview",style:U},React.createElement(PageLayer,{pages:w,geom:v,pg:E,ctx:n||{title:e||"",chapter:e||""},onFootnote:()=>{},onMeasure:I}),React.createElement("div",{ref:l,className:"ed-area ed-area--ro",style:{top:v.mt,left:v.ml,width:v.contentW},dangerouslySetInnerHTML:{__html:A}})),React.createElement("div",{className:"ed-tail"}),p&&React.createElement("button",{className:"scroll-top-btn",onClick:H,title:S("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}const TXT_BLOCK={P:1,DIV:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,BLOCKQUOTE:1,LI:1,UL:1,OL:1,FIGURE:1,FIGCAPTION:1,ASIDE:1,HR:1,PRE:1,TABLE:1,TR:1,SECTION:1};function blockText(i){const e=[];let o="";const n=()=>{const a=o.split(`
`).map(c=>c.replace(/[^\S\n]+/g," ").trim()).join(`
`).replace(/^\n+|\n+$/g,"");a&&e.push(a),o=""};return(function a(c){for(let s=c.firstChild;s;s=s.nextSibling){if(s.nodeType===3){o+=s.nodeValue;continue}if(s.nodeType===1){if(s.tagName==="BR"){o+=`
`;continue}if(s.tagName==="PRE"){n(),e.push((s.textContent||"").replace(/^\n+|\n+$/g,""));continue}if(s.tagName==="TD"||s.tagName==="TH"){o.trim()&&(o+="  |  "),a(s);continue}if(s.tagName==="IMG"){const r=(s.getAttribute("alt")||"").trim();r&&(o+="["+r+"]");continue}if(s.tagName==="INPUT"){o+=s.hasAttribute("checked")?"[x] ":"[ ] ";continue}TXT_BLOCK[s.tagName]?(n(),a(s),n()):a(s)}}})(i),n(),e.join(`

`)}function htmlToText(i){const e=document.createElement("div");e.innerHTML=i||"";const o=e.querySelector(".fn-defs");let n="";if(o){const a=Array.prototype.map.call(o.children,(c,s)=>s+1+". "+(c.textContent||""));o.remove(),a.length&&(n=`

---
`+a.join(`
`))}return(blockText(e)+n).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(i){return String(i==null?"":i).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(i){let e="";return i.childNodes.forEach(o=>{if(o.nodeType===3){e+=mdEscapeText(o.textContent);return}if(o.nodeType!==1)return;const n=o.tagName.toLowerCase();if(n==="br"){e+=`  
`;return}if(n==="sup"&&o.classList&&o.classList.contains("fn")){e+="[^"+(o.textContent||"").trim()+"]";return}if(n==="code"){const c=o.textContent||"";let s="`";for(;c.indexOf(s)>=0;)s+="`";const r=/^`|`$/.test(c)?" ":"";e+=s+r+c+r+s;return}if(n==="img"){const c=o.getAttribute("src")||"",s=o.getAttribute("title");e+="!["+mdEscapeText(o.getAttribute("alt")||"")+"]("+c+(s?' "'+s.replace(/"/g,"")+'"':"")+")";return}if(n==="input")return;const a=inlineToMd(o);if(n==="strong"||n==="b")e+="**"+a+"**";else if(n==="em"||n==="i")e+="*"+a+"*";else if(n==="u")e+="<u>"+a+"</u>";else if(n==="mark")e+="=="+a+"==";else if(n==="s"||n==="strike")e+="~~"+a+"~~";else if(n==="a"){const c=o.getAttribute("href")||"",s=o.getAttribute("title");!s&&a.trim()===c.trim()&&/^(https?:|mailto:)/i.test(c)?e+="<"+c+">":e+="["+a+"]("+c+(s?' "'+s.replace(/"/g,"")+'"':"")+")"}else e+=a}),e}function listToMd(i,e,o){const n=i.tagName.toLowerCase()==="ol";o=o||"";let a="",c=1;return Array.prototype.forEach.call(i.children,s=>{if(s.tagName.toLowerCase()!=="li")return;const r=[],l=document.createElement("div");Array.prototype.forEach.call(s.childNodes,f=>{const m=f.nodeType===1?f.tagName.toLowerCase():"";m==="ul"||m==="ol"?r.push(f):l.appendChild(f.cloneNode(!0))});const p=s.querySelector(":scope > input[type=checkbox]")?s.querySelector(":scope > input[type=checkbox]").hasAttribute("checked")?"[x] ":"[ ] ":"",x=inlineToMd(l).replace(/\s*\n\s*/g," ").trim(),d=n?c+++". ":"- ";a+=o+d+p+x+`
`,r.forEach(f=>{a+=listToMd(f,e+1,o+" ".repeat(d.length))})}),a}function quoteToMd(i){const e=[];let o=null;return Array.prototype.forEach.call(i.childNodes,n=>{if((n.nodeType===1?n.tagName.toLowerCase():"")==="blockquote"){o=null,e.push(quoteToMd(n).replace(/^/gm,"> "));return}o||(o=document.createElement("div"),e.push(o)),o.appendChild(n.cloneNode(!0))}),e.map(n=>typeof n=="string"?n:inlineToMd(n)).filter(n=>n.trim()).join(`
`).replace(/\s+$/,"")}function guardBlockStart(i){return String(i||"").split(`
`).map(e=>e.replace(/^(\s*)(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|={3,}$|-{3,}$)/,(o,n,a)=>n+"\\"+a)).join(`
`)}function htmlToMd(i){const e=document.createElement("div");e.innerHTML=i||"";let o="";const n=[],a=r=>(n.push(r),"v"+(n.length-1)+""),c=[],s=e.querySelector(".fn-defs");return s&&(Array.prototype.forEach.call(s.children,r=>c.push((r.textContent||"").replace(/\s*\n\s*/g," "))),s.remove()),e.childNodes.forEach(r=>{if(r.nodeType===3){o+=mdEscapeText(r.textContent);return}const l=r.tagName?r.tagName.toLowerCase():"",p=r.getAttribute&&r.getAttribute("class")||"";if(l==="hr"&&p.indexOf("page-break")>=0){o+=`
<!-- page-break -->

`;return}if(l==="hr"&&p.indexOf("scene-sep")>=0){o+=`
<!-- scene: `+(r.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(r.getAttribute("data-s")||"draft")+` -->

`;return}if(l==="figure"&&p.indexOf("epigraph")>=0){const f=r.querySelector("blockquote"),m=r.querySelector("figcaption"),y=f?inlineToMd(f):"",w=m?inlineToMd(m):"";if(!y.trim()&&!w.trim())return;o+=`
::: epigraph
`+y+`
`+(w.trim()?"-- "+w+`
`:"")+`:::

`;return}if(l==="pre"){const m=(r.querySelector("code")||r).textContent||"";if(p.indexOf("math")>=0){o+=`
`+a(`$$
`+m+`
$$`)+`

`;return}let y="```";for(;new RegExp("^\\s*"+y,"m").test(m);)y+="`";o+=`
`+a(y+(r.getAttribute("data-lang")||"")+`
`+m+`
`+y)+`

`;return}if(l==="table"){const f=Array.prototype.map.call(r.querySelectorAll("tr"),k=>Array.prototype.map.call(k.children,S=>inlineToMd(S).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!f.length)return;const m=f.reduce((k,S)=>Math.max(k,S.length),0),y=k=>{const S=k.slice();for(;S.length<m;)S.push("");return"| "+S.join(" | ")+" |"},w=r.querySelector("tr"),h=w?Array.prototype.slice.call(w.children):[],g=[];for(let k=0;k<m;k++){const S=h[k]&&h[k].getAttribute("class")||"";g.push(S.indexOf("ta-c")>=0?":---:":S.indexOf("ta-r")>=0?"---:":S.indexOf("ta-l")>=0?":---":"---")}o+=`
`+y(f[0])+`
| `+g.join(" | ")+` |
`+f.slice(1).map(y).join(`
`)+`

`;return}if(l==="aside"&&p.indexOf("note")>=0){const f=inlineToMd(r);if(!f.trim())return;o+=`
::: note
`+f+`
:::

`;return}const x=inlineToMd(r);if(!x.trim()&&l!=="hr")return;const d=p.match(/\bal-(l|c|r|j)\b/);/^h[1-6]$/.test(l)?o+=`
`+"#".repeat(+l.charAt(1))+" "+x+`

`:l==="blockquote"?o+=quoteToMd(r).replace(/^/gm,"> ")+`

`:l==="hr"?o+=`
---

`:l==="ul"||l==="ol"?o+=`
`+listToMd(r,0)+`
`:l==="p"&&d?o+='<p class="al-'+d[1]+'">'+x.replace(/\n/g," ")+`</p>

`:o+=guardBlockStart(x)+`

`}),o=o.replace(/\n{3,}/g,`

`).trim(),c.length&&(o+=`

`+c.map((r,l)=>"[^"+(l+1)+"]: "+r).join(`
`)),o.replace(/\x01v(\d+)\x02/g,(r,l)=>n[+l])}function splitNotes(i){const e=document.createElement("div");e.innerHTML=i||"";const o=e.querySelector(".fn-defs"),n=[];return o&&(Array.prototype.forEach.call(o.children,a=>n.push(a.textContent||"")),o.remove()),{html:e.innerHTML,notes:n}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(i){const e=i&&i.size==="custom"?{w:i.w||210,h:i.h||297}:PAGE_MM[i&&i.size]||PAGE_MM.a4;return i&&i.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(i){return{...i||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1,noFluid:!0}}function StaticSheet({geom:i,children:e}){const o=useRef(null),n=16*i.scale;return useEffect(()=>{const a=o.current;if(!a)return;const c=()=>{let r=n;a.style.fontSize=r+"px";for(let l=0;l<6;l++){const p=a.firstElementChild;if(!p)return;const x=p.getBoundingClientRect().height;if(x<=a.clientHeight&&p.scrollWidth<=a.clientWidth)return;r=Math.max(n*.5,r*Math.min(.97,a.clientHeight/Math.max(1,x))),a.style.fontSize=r+"px"}};c();const s=document.fonts;if(s&&s.addEventListener)return s.addEventListener("loadingdone",c),()=>s.removeEventListener("loadingdone",c)}),React.createElement("div",{className:"ed-paper exp-sheet",style:{width:i.pageW,height:i.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:i.pageW,height:i.pageH}})),React.createElement("div",{ref:o,className:"exp-sheet-body",style:{top:i.mt,left:i.ml,width:i.contentW,height:i.contentH,fontSize:n+"px"}},e))}function PaginatedChapter({html:i,geom:e,title:o}){const n=useRef(null),a=useRef([]),c=useRef(0),[s,r]=useState([[]]);function l(){const m=n.current;if(!m)return;const y=footnoteList(m),w={};y.forEach(g=>{w[g.id]=g});const h=paginateArea(m,e,a.current);r(h.notes.map(g=>g.map(k=>w[k]).filter(Boolean)))}useEffect(()=>{n.current&&(n.current.innerHTML=(o?"<h1>"+escText(o)+"</h1>":"")+(i||"")),a.current=[],c.current=0,l()},[i,e,o]);function p(m){const y=a.current;let w=!1;for(let h=0;h<m.length;h++){const g=m[h]?m[h]+Math.round(12*e.scale):0;Math.abs((y[h]||0)-g)>2&&(y[h]=g,w=!0)}y.length>m.length&&(y.length=m.length,w=!0),w&&c.current<3?(c.current++,l()):c.current=0}const d=s.length*(e.pageH+e.gap)-e.gap,f={width:e.pageW,height:d,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:f},React.createElement(PageLayer,{pages:s,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:p}),React.createElement("div",{ref:n,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:i,opts:e,lang:o}){const n=T(o||"en"),a=useRef(null),[c,s]=useState(0);useEffect(()=>{const d=a.current;if(!d)return;const f=()=>{d.clientWidth&&s(Math.max(160,d.clientWidth-48))};f();let m=null;return window.ResizeObserver?(m=new ResizeObserver(f),m.observe(d)):window.addEventListener("resize",f),()=>{m?m.disconnect():window.removeEventListener("resize",f)}},[]);const r=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),l=useMemo(()=>{const d=pageGeometry(r,c);return d.leading=r.leading,d.align=r.align,d.indent=r.indent,d.padL=r.padL,d.padR=r.padR,d.spaceBefore=r.spaceBefore,d.spaceAfter=r.spaceAfter,d.hyphens=r.hyphens,d.pg=r,d},[r,c]),p=i.chapters.filter(d=>e.include[d.id]!==!1),x=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:a,style:{"--ed-font":x}},e.titlePage&&React.createElement(StaticSheet,{geom:l},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,i.title),i.synopsis&&React.createElement("p",{className:"b-syn"},i.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:l},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,n("toc_title")),React.createElement("ol",null,p.map(d=>React.createElement("li",{key:d.id},d.title))))),p.map(d=>React.createElement(PaginatedChapter,{key:d.id,html:d.content||"",geom:l,title:d.title})),!p.length&&React.createElement("div",{className:"exp-pages-empty mono"},n("exp_of")))}function NotePagedPreview({note:i,opts:e}){const o=useRef(null),[n,a]=useState(0);useEffect(()=>{const l=o.current;if(!l)return;const p=()=>{l.clientWidth&&a(Math.max(160,l.clientWidth-48))};p();let x=null;return window.ResizeObserver?(x=new ResizeObserver(p),x.observe(l)):window.addEventListener("resize",p),()=>{x?x.disconnect():window.removeEventListener("resize",p)}},[]);const c=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),s=useMemo(()=>{const l=pageGeometry(c,n);return l.leading=c.leading,l.align=c.align,l.indent=c.indent,l.padL=c.padL,l.padR=c.padR,l.spaceBefore=c.spaceBefore,l.spaceAfter=c.spaceAfter,l.hyphens=c.hyphens,l.pg=c,l},[c,n]),r=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:o,style:{"--ed-font":r}},e.titlePage&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,i.title))),React.createElement(PaginatedChapter,{html:i.content||"",geom:s,title:i.title}))}function printHTML(i){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const o=()=>setTimeout(()=>e.remove(),6e4);try{const n=e.contentDocument;n.open(),n.write(i),n.close();const a=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}o()};return n.readyState==="complete"?setTimeout(a,500):e.contentWindow.addEventListener("load",()=>setTimeout(a,500)),!0}catch{return e.remove(),!1}}function downloadBlob(i,e,o){const n=window.__TAURI__;if(n&&n.dialog&&n.fs){const r=o instanceof Uint8Array?o:new TextEncoder().encode(o),l=i.includes(".")?i.slice(i.lastIndexOf(".")+1):"";n.dialog.save({defaultPath:i,filters:l?[{name:l.toUpperCase(),extensions:[l]}]:void 0}).then(p=>p&&n.fs.writeFile(p,r)).catch(()=>{});return}const a=new Blob([o],{type:e}),c=URL.createObjectURL(a),s=document.createElement("a");s.href=c,s.download=i,document.body.appendChild(s),s.click(),s.remove(),setTimeout(()=>URL.revokeObjectURL(c),1500)}const BLOCK_CSS=`
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
    .al-l, .al-l > li { text-align: left; } .al-j, .al-j > li { text-align: justify; }
    .al-c, .al-c > li { text-align: center; text-indent: 0; } .al-r, .al-r > li { text-align: right; text-indent: 0; }
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
`;function escText(i){return String(i==null?"":i).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(i){const{html:e,notes:o}=splitNotes(i);return o.length?e+'<ol class="b-notes">'+o.map(n=>"<li>"+escText(n)+"</li>").join("")+"</ol>":e}function buildBookHTML(i,e){const o=i.chapters.filter(m=>e.include[m.id]!==!1),n=e.page||{},a=pageDimsMM(n),{mt:c,mr:s,mb:r,ml:l}=SipruFormats.fitMargins(a.w,a.h,{mt:n.mt!=null?n.mt:20,mr:n.mr!=null?n.mr:18,mb:n.mb!=null?n.mb:20,ml:n.ml!=null?n.ml:18}),p=Math.round(a.w/5.4)+"em",x=Math.round(Math.min(l,s)*2.6)+"px",d=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Lora', Georgia, serif":"'Source Serif 4', Georgia, serif";let f="";return e.titlePage&&(f+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${escText(i.title)}</h1>${i.synopsis?`<p class="b-syn">${escText(i.synopsis)}</p>`:""}</section>`),e.toc&&(f+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${o.map(m=>`<li><span>${escText(m.title)}</span></li>`).join("")}</ol></section>`),o.forEach((m,y)=>{f+=`<section class="b-chap"><h1 class="b-chap-title">${escText(m.title)}</h1>${chapterBody(m.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${escText(i.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${c}mm ${s}mm ${r}mm ${l}mm; }
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
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; }
    /* every text block follows the page alignment, as it does in the
       editor \u2014 not just <p>. Zero specificity, so a block's own al-*
       alignment still wins. */
    :where(.b-chap > :is(h1, h2, h3, h4, h5, h6, blockquote, ul, ol, aside):not(.b-chap-title), .b-chap li) {
      text-align: ${(n.align||"justify")==="justify"?"justify":n.align}; }
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
  </style></head><body>${f}</body></html>`}function buildPlain(i,e,o){const n=i.chapters.filter(c=>e.include[c.id]!==!1);let a="";return e.titlePage&&(a+=i.title.toUpperCase()+`
`+(i.synopsis||"")+`


`),e.toc&&(a+=t("toc_title",e.lang||"en").toUpperCase()+`
`+n.map((c,s)=>s+1+". "+c.title).join(`
`)+`


`),n.forEach(c=>{const s=(c.title||"").trim();s&&(a+=(o?"# "+s:s.toUpperCase())+`

`),a+=(o?htmlToMd(c.content):htmlToText(c.content))+`


`}),a.trim()+`
`}function buildBookDocx(i,e){const o=i.chapters.filter(a=>e.include[a.id]!==!1),n=[];return e.toc&&n.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+o.map(a=>"<li>"+escText(a.title)+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),o.forEach((a,c)=>{n.push({heading:a.title||"",html:a.content||"",pageBreakBefore:c>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?i.title:"",subtitle:e.titlePage&&i.synopsis||"",sections:n,font:e.font,page:e.page||null,bookTitle:i.title,author:e.author||""})}function ExportModal({store:i,projectId:e,onClose:o,initialFormat:n,onToast:a}){const[c,s]=useDismiss(o),r=i.get().projects.find(b=>b.id===e),l=i.get().user&&i.get().user.lang||"en",p=T(l),x=i.get().user&&i.get().user.editorFont||"book",[d,f]=useState(n||"pdf"),[m,y]=useState(()=>({titlePage:!0,toc:!0,font:x,lang:l,include:{}})),w=b=>y(v=>({...v,...b}));if(!r)return null;const h=i.resolvePage(r.page),g={...m,page:h,author:i.get().user&&i.get().user.name||""},k=useMemo(()=>buildBookHTML(r,g),[r,m,JSON.stringify(h)]),S=r.chapters.filter(b=>m.include[b.id]!==!1).length;function E(b){const v=r.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(b==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(r,g))){a(p("exp_toast_pdf"));return}downloadBlob(v+".html","text/html;charset=utf-8",buildBookHTML(r,g)),a(p("exp_toast_pdf_tauri"));return}const R=window.open("","_blank");if(!R){a(p("exp_err_popup"));return}R.document.write(buildBookHTML(r,g)),R.document.close(),setTimeout(()=>{R.focus(),R.print()},700),a(p("exp_toast_pdf"))}else if(b==="docx")try{downloadBlob(v+".docx",SipruFormats.DOCX_MIME,buildBookDocx(r,g)),a(p("exp_toast_docx_real"))}catch{a(p("exp_err_docx"))}else b==="txt"?(downloadBlob(v+".txt","text/plain;charset=utf-8",buildPlain(r,g,!1)),a(p("exp_toast_txt"))):b==="md"&&(downloadBlob(v+".md","text/markdown;charset=utf-8",buildPlain(r,g,!0)),a(p("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+c,onMouseDown:s},React.createElement("div",{className:"modal export-modal",onMouseDown:b=>b.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},p("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},r.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>w({titlePage:!0,toc:!0,font:x}),title:p("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",p("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:s},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_format_label")),React.createElement("div",{className:"exp-formats"},[["pdf","export"],["docx","note"],["txt","type"],["md","code"]].map(([b,v])=>React.createElement("button",{key:b,className:"exp-fmt"+(d===b?" on":""),onClick:()=>f(b)},React.createElement(Icon,{name:v,size:20}),React.createElement("span",{className:"mono"},b.toUpperCase()))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_chapters_label")," \xB7 ",S," ",p("exp_of")," ",r.chapters.length),React.createElement("ul",{className:"exp-chaps"},r.chapters.map((b,v)=>React.createElement("li",{key:b.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:m.include[b.id]!==!1,onChange:R=>w({include:{...m.include,[b.id]:R.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(v+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},b.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([b,v])=>React.createElement("label",{key:b,className:"exp-toggle"},React.createElement("span",{className:"switch"+(m[b]?" on":""),onClick:()=>w({[b]:!m[b]})},React.createElement("span",null)),p(v))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent exp-go",onClick:()=>E(d)},React.createElement(Icon,{name:"download",size:16})," ",p("exp_do")," \xB7 ",d.toUpperCase()))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:r,opts:g,lang:l})))))}function buildNoteHTML(i,e){const o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Lora', Georgia, serif":"'Source Serif 4', Georgia, serif",n=e.page||{},a=pageDimsMM(n),{mt:c,mr:s,mb:r,ml:l}=SipruFormats.fitMargins(a.w,a.h,{mt:n.mt!=null?n.mt:20,mr:n.mr!=null?n.mr:18,mb:n.mb!=null?n.mb:20,ml:n.ml!=null?n.ml:18}),p=Math.round(a.w/5.4)+"em",x=Math.round(Math.min(l,s)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${escText(i.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${c}mm ${s}mm ${r}mm ${l}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${o}; font-size: ${n.fontSize||12}pt; line-height: ${n.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${n.spaceAfter!=null?n.spaceAfter:.8}em; text-indent: ${n.indent!=null?n.indent:0}em; text-align: ${(n.align||"left")==="justify"?"justify":n.align||"left"}; }
    p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; border-left: 3px solid #c2542f; padding-left: 1em; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; }
    :where(.n-wrap > :is(h1, h2, h3, h4, h5, h6, blockquote, ul, ol, aside), .n-wrap li) {
      text-align: ${(n.align||"left")==="justify"?"justify":n.align||"left"}; }
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
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${escText(i.title)}</h1></div>`:""}${chapterBody(i.content||"")}</div></body></html>`}function NoteExportModal({note:i,onClose:e,onToast:o,lang:n,defaultFont:a,page:c}){const[s,r]=useDismiss(e),l=T(n||"en"),[p,x]=useState("pdf"),[d,f]=useState({font:a||"book",titlePage:!0}),m=h=>f(g=>({...g,...h})),y={...d,page:c};function w(h){const g=i.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(h==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(i,y))){o(l("exp_toast_pdf"));return}downloadBlob(g+".html","text/html;charset=utf-8",buildNoteHTML(i,y)),o(l("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){o(l("exp_err_popup"));return}k.document.write(buildNoteHTML(i,y)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),o(l("exp_toast_pdf"))}else if(h==="docx")try{downloadBlob(g+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:d.titlePage?i.title:"",sections:[{html:i.content||""}],font:d.font,page:c||null})),o(l("exp_toast_docx_real"))}catch{o(l("exp_err_docx"))}else h==="txt"?(downloadBlob(g+".txt","text/plain;charset=utf-8",htmlToText(i.content)),o(l("exp_toast_txt"))):h==="md"&&(downloadBlob(g+".md","text/markdown;charset=utf-8","# "+i.title+`

`+htmlToMd(i.content)),o(l("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+s,onMouseDown:r},React.createElement("div",{className:"modal export-modal",onMouseDown:h=>h.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},l("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},i.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>m({font:a||"book",titlePage:!0}),title:l("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",l("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:r},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_format_label")),React.createElement("div",{className:"exp-formats"},[["pdf","export"],["docx","note"],["txt","type"],["md","code"]].map(([h,g])=>React.createElement("button",{key:h,className:"exp-fmt"+(p===h?" on":""),onClick:()=>x(h)},React.createElement(Icon,{name:g,size:20}),React.createElement("span",{className:"mono"},h.toUpperCase()))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(d.titlePage?" on":""),onClick:()=>m({titlePage:!d.titlePage})},React.createElement("span",null)),l("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent exp-go",onClick:()=>w(p)},React.createElement(Icon,{name:"download",size:16})," ",l("exp_do")," \xB7 ",p.toUpperCase()))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(NotePagedPreview,{note:i,opts:y})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
