function BookPreview({html:i,title:e,edition:o,lang:n}){const a=useRef(null),c=useRef(null),[l,r]=useState(!1),[s,d]=useState(!1),x=T(n||"en"),{headings:p,htmlWithIds:f}=useMemo(()=>{const g=document.createElement("div");g.innerHTML=chapterBody(i||"");const v=[];let u=0;return g.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach(y=>{const k="bh-"+u++;y.id=k,v.push({id:k,level:parseInt(y.tagName[1]),text:y.textContent.trim()})}),{headings:v,htmlWithIds:g.innerHTML}},[i]),m=useMemo(()=>{const g=document.createElement("div");g.innerHTML=i||"";const v=(g.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(v/280))},[i]);useEffect(()=>{const g=a.current;if(!g)return;const v=()=>r(g.scrollTop>320);return g.addEventListener("scroll",v,{passive:!0}),()=>g.removeEventListener("scroll",v)},[]);function b(){a.current&&a.current.scrollTo({top:0,behavior:"smooth"})}const[h,w]=useState(null);return useEffect(()=>{if(!h)return;w(null);const g=c.current&&c.current.querySelector("#"+h);if(!g||!a.current)return;const v=a.current.getBoundingClientRect().top,u=g.getBoundingClientRect().top;a.current.scrollBy({top:u-v-24,behavior:"smooth"})},[h]),React.createElement("div",{className:"preview-scroll",ref:a},p.length>0&&React.createElement("div",{className:"preview-anchors"+(s?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>d(g=>!g)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,x(s?"anchors_hide":"anchors_show"))),s&&React.createElement("nav",{className:"anchors-nav"},p.map(g=>React.createElement("button",{key:g.id,className:"anchor-item anchor-item--h"+g.level,onClick:()=>{d(!1),w(g.id)}},g.text)))),React.createElement("div",{className:"book book--"+o},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:c,dangerouslySetInnerHTML:{__html:f}})),React.createElement("div",{className:"book-foot mono"},x("preview_label")," \xB7 \u2248\u2009",m,"\u2009",n==="ru"?"\u0441\u0442\u0440.":"p.")),l&&React.createElement("button",{className:"scroll-top-btn",onClick:b,title:x("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}const TXT_BLOCK={P:1,DIV:1,H1:1,H2:1,H3:1,H4:1,H5:1,H6:1,BLOCKQUOTE:1,LI:1,UL:1,OL:1,FIGURE:1,FIGCAPTION:1,ASIDE:1,HR:1,PRE:1,TABLE:1,TR:1,SECTION:1};function blockText(i){const e=[];let o="";const n=()=>{const a=o.split(`
`).map(c=>c.replace(/[^\S\n]+/g," ").trim()).join(`
`).replace(/^\n+|\n+$/g,"");a&&e.push(a),o=""};return(function a(c){for(let l=c.firstChild;l;l=l.nextSibling){if(l.nodeType===3){o+=l.nodeValue;continue}if(l.nodeType===1){if(l.tagName==="BR"){o+=`
`;continue}if(l.tagName==="PRE"){n(),e.push((l.textContent||"").replace(/^\n+|\n+$/g,""));continue}if(l.tagName==="TD"||l.tagName==="TH"){o.trim()&&(o+="  |  "),a(l);continue}if(l.tagName==="IMG"){const r=(l.getAttribute("alt")||"").trim();r&&(o+="["+r+"]");continue}if(l.tagName==="INPUT"){o+=l.hasAttribute("checked")?"[x] ":"[ ] ";continue}TXT_BLOCK[l.tagName]?(n(),a(l),n()):a(l)}}})(i),n(),e.join(`

`)}function htmlToText(i){const e=document.createElement("div");e.innerHTML=i||"";const o=e.querySelector(".fn-defs");let n="";if(o){const a=Array.prototype.map.call(o.children,(c,l)=>l+1+". "+(c.textContent||""));o.remove(),a.length&&(n=`

---
`+a.join(`
`))}return(blockText(e)+n).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(i){return String(i==null?"":i).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(i){let e="";return i.childNodes.forEach(o=>{if(o.nodeType===3){e+=mdEscapeText(o.textContent);return}if(o.nodeType!==1)return;const n=o.tagName.toLowerCase();if(n==="br"){e+=`  
`;return}if(n==="sup"&&o.classList&&o.classList.contains("fn")){e+="[^"+(o.textContent||"").trim()+"]";return}if(n==="code"){const c=o.textContent||"";let l="`";for(;c.indexOf(l)>=0;)l+="`";const r=/^`|`$/.test(c)?" ":"";e+=l+r+c+r+l;return}if(n==="img"){const c=o.getAttribute("src")||"",l=o.getAttribute("title");e+="!["+mdEscapeText(o.getAttribute("alt")||"")+"]("+c+(l?' "'+l.replace(/"/g,"")+'"':"")+")";return}if(n==="input")return;const a=inlineToMd(o);if(n==="strong"||n==="b")e+="**"+a+"**";else if(n==="em"||n==="i")e+="*"+a+"*";else if(n==="u")e+="<u>"+a+"</u>";else if(n==="mark")e+="=="+a+"==";else if(n==="s"||n==="strike")e+="~~"+a+"~~";else if(n==="a"){const c=o.getAttribute("href")||"",l=o.getAttribute("title");!l&&a.trim()===c.trim()&&/^(https?:|mailto:)/i.test(c)?e+="<"+c+">":e+="["+a+"]("+c+(l?' "'+l.replace(/"/g,"")+'"':"")+")"}else e+=a}),e}function listToMd(i,e,o){const n=i.tagName.toLowerCase()==="ol";o=o||"";let a="",c=1;return Array.prototype.forEach.call(i.children,l=>{if(l.tagName.toLowerCase()!=="li")return;const r=[],s=document.createElement("div");Array.prototype.forEach.call(l.childNodes,f=>{const m=f.nodeType===1?f.tagName.toLowerCase():"";m==="ul"||m==="ol"?r.push(f):s.appendChild(f.cloneNode(!0))});const d=l.querySelector(":scope > input[type=checkbox]")?l.querySelector(":scope > input[type=checkbox]").hasAttribute("checked")?"[x] ":"[ ] ":"",x=inlineToMd(s).replace(/\s*\n\s*/g," ").trim(),p=n?c+++". ":"- ";a+=o+p+d+x+`
`,r.forEach(f=>{a+=listToMd(f,e+1,o+" ".repeat(p.length))})}),a}function quoteToMd(i){const e=[];let o=null;return Array.prototype.forEach.call(i.childNodes,n=>{if((n.nodeType===1?n.tagName.toLowerCase():"")==="blockquote"){o=null,e.push(quoteToMd(n).replace(/^/gm,"> "));return}o||(o=document.createElement("div"),e.push(o)),o.appendChild(n.cloneNode(!0))}),e.map(n=>typeof n=="string"?n:inlineToMd(n)).filter(n=>n.trim()).join(`
`).replace(/\s+$/,"")}function guardBlockStart(i){return String(i||"").split(`
`).map(e=>e.replace(/^(\s*)(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|={3,}$|-{3,}$)/,(o,n,a)=>n+"\\"+a)).join(`
`)}function htmlToMd(i){const e=document.createElement("div");e.innerHTML=i||"";let o="";const n=[],a=r=>(n.push(r),"v"+(n.length-1)+""),c=[],l=e.querySelector(".fn-defs");return l&&(Array.prototype.forEach.call(l.children,r=>c.push((r.textContent||"").replace(/\s*\n\s*/g," "))),l.remove()),e.childNodes.forEach(r=>{if(r.nodeType===3){o+=mdEscapeText(r.textContent);return}const s=r.tagName?r.tagName.toLowerCase():"",d=r.getAttribute&&r.getAttribute("class")||"";if(s==="hr"&&d.indexOf("page-break")>=0){o+=`
<!-- page-break -->

`;return}if(s==="hr"&&d.indexOf("scene-sep")>=0){o+=`
<!-- scene: `+(r.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(r.getAttribute("data-s")||"draft")+` -->

`;return}if(s==="figure"&&d.indexOf("epigraph")>=0){const f=r.querySelector("blockquote"),m=r.querySelector("figcaption"),b=f?inlineToMd(f):"",h=m?inlineToMd(m):"";if(!b.trim()&&!h.trim())return;o+=`
::: epigraph
`+b+`
`+(h.trim()?"-- "+h+`
`:"")+`:::

`;return}if(s==="pre"){const m=(r.querySelector("code")||r).textContent||"";if(d.indexOf("math")>=0){o+=`
`+a(`$$
`+m+`
$$`)+`

`;return}let b="```";for(;new RegExp("^\\s*"+b,"m").test(m);)b+="`";o+=`
`+a(b+(r.getAttribute("data-lang")||"")+`
`+m+`
`+b)+`

`;return}if(s==="table"){const f=Array.prototype.map.call(r.querySelectorAll("tr"),v=>Array.prototype.map.call(v.children,u=>inlineToMd(u).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!f.length)return;const m=f.reduce((v,u)=>Math.max(v,u.length),0),b=v=>{const u=v.slice();for(;u.length<m;)u.push("");return"| "+u.join(" | ")+" |"},h=r.querySelector("tr"),w=h?Array.prototype.slice.call(h.children):[],g=[];for(let v=0;v<m;v++){const u=w[v]&&w[v].getAttribute("class")||"";g.push(u.indexOf("ta-c")>=0?":---:":u.indexOf("ta-r")>=0?"---:":u.indexOf("ta-l")>=0?":---":"---")}o+=`
`+b(f[0])+`
| `+g.join(" | ")+` |
`+f.slice(1).map(b).join(`
`)+`

`;return}if(s==="aside"&&d.indexOf("note")>=0){const f=inlineToMd(r);if(!f.trim())return;o+=`
::: note
`+f+`
:::

`;return}const x=inlineToMd(r);if(!x.trim()&&s!=="hr")return;const p=d.match(/\bal-(l|c|r|j)\b/);/^h[1-6]$/.test(s)?o+=`
`+"#".repeat(+s.charAt(1))+" "+x+`

`:s==="blockquote"?o+=quoteToMd(r).replace(/^/gm,"> ")+`

`:s==="hr"?o+=`
---

`:s==="ul"||s==="ol"?o+=`
`+listToMd(r,0)+`
`:s==="p"&&p?o+='<p class="al-'+p[1]+'">'+x.replace(/\n/g," ")+`</p>

`:o+=guardBlockStart(x)+`

`}),o=o.replace(/\n{3,}/g,`

`).trim(),c.length&&(o+=`

`+c.map((r,s)=>"[^"+(s+1)+"]: "+r).join(`
`)),o.replace(/\x01v(\d+)\x02/g,(r,s)=>n[+s])}function splitNotes(i){const e=document.createElement("div");e.innerHTML=i||"";const o=e.querySelector(".fn-defs"),n=[];return o&&(Array.prototype.forEach.call(o.children,a=>n.push(a.textContent||"")),o.remove()),{html:e.innerHTML,notes:n}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(i){const e=i&&i.size==="custom"?{w:i.w||210,h:i.h||297}:PAGE_MM[i&&i.size]||PAGE_MM.a4;return i&&i.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(i){return{...i||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1,noFluid:!0}}function StaticSheet({geom:i,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:i.pageW,height:i.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:i.pageW,height:i.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:i.mt,left:i.ml,width:i.contentW,height:i.contentH}},e))}function PaginatedChapter({html:i,geom:e,title:o}){const n=useRef(null),a=useRef([]),c=useRef(0),[l,r]=useState([[]]);function s(){const m=n.current;if(!m)return;const b=footnoteList(m),h={};b.forEach(g=>{h[g.id]=g});const w=paginateArea(m,e,a.current);r(w.notes.map(g=>g.map(v=>h[v]).filter(Boolean)))}useEffect(()=>{n.current&&(n.current.innerHTML=(o?"<h1>"+escText(o)+"</h1>":"")+(i||"")),a.current=[],c.current=0,s()},[i,e,o]);function d(m){const b=a.current;let h=!1;for(let w=0;w<m.length;w++){const g=m[w]?m[w]+Math.round(12*e.scale):0;Math.abs((b[w]||0)-g)>2&&(b[w]=g,h=!0)}b.length>m.length&&(b.length=m.length,h=!0),h&&c.current<3?(c.current++,s()):c.current=0}const p=l.length*(e.pageH+e.gap)-e.gap,f={width:e.pageW,height:p,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:f},React.createElement(PageLayer,{pages:l,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:d}),React.createElement("div",{ref:n,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:i,opts:e,lang:o}){const n=T(o||"en"),a=useRef(null),[c,l]=useState(0);useEffect(()=>{const p=a.current;if(!p)return;const f=()=>{p.clientWidth&&l(Math.max(160,p.clientWidth-48))};f();let m=null;return window.ResizeObserver?(m=new ResizeObserver(f),m.observe(p)):window.addEventListener("resize",f),()=>{m?m.disconnect():window.removeEventListener("resize",f)}},[]);const r=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),s=useMemo(()=>{const p=pageGeometry(r,c);return p.leading=r.leading,p.align=r.align,p.indent=r.indent,p.padL=r.padL,p.padR=r.padR,p.spaceBefore=r.spaceBefore,p.spaceAfter=r.spaceAfter,p.hyphens=r.hyphens,p.pg=r,p},[r,c]),d=i.chapters.filter(p=>e.include[p.id]!==!1),x=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:a,style:{"--ed-font":x}},e.titlePage&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,i.title),i.synopsis&&React.createElement("p",{className:"b-syn"},i.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,n("toc_title")),React.createElement("ol",null,d.map(p=>React.createElement("li",{key:p.id},p.title))))),d.map(p=>React.createElement(PaginatedChapter,{key:p.id,html:p.content||"",geom:s,title:p.title})),!d.length&&React.createElement("div",{className:"exp-pages-empty mono"},n("exp_of")))}function NotePagedPreview({note:i,opts:e}){const o=useRef(null),[n,a]=useState(0);useEffect(()=>{const s=o.current;if(!s)return;const d=()=>{s.clientWidth&&a(Math.max(160,s.clientWidth-48))};d();let x=null;return window.ResizeObserver?(x=new ResizeObserver(d),x.observe(s)):window.addEventListener("resize",d),()=>{x?x.disconnect():window.removeEventListener("resize",d)}},[]);const c=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),l=useMemo(()=>{const s=pageGeometry(c,n);return s.leading=c.leading,s.align=c.align,s.indent=c.indent,s.padL=c.padL,s.padR=c.padR,s.spaceBefore=c.spaceBefore,s.spaceAfter=c.spaceAfter,s.hyphens=c.hyphens,s.pg=c,s},[c,n]),r=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:o,style:{"--ed-font":r}},e.titlePage&&React.createElement(StaticSheet,{geom:l},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,i.title))),React.createElement(PaginatedChapter,{html:i.content||"",geom:l,title:i.title}))}function printHTML(i){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const o=()=>setTimeout(()=>e.remove(),6e4);try{const n=e.contentDocument;n.open(),n.write(i),n.close();const a=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}o()};return n.readyState==="complete"?setTimeout(a,500):e.contentWindow.addEventListener("load",()=>setTimeout(a,500)),!0}catch{return e.remove(),!1}}function downloadBlob(i,e,o){const n=window.__TAURI__;if(n&&n.dialog&&n.fs){const r=o instanceof Uint8Array?o:new TextEncoder().encode(o),s=i.includes(".")?i.slice(i.lastIndexOf(".")+1):"";n.dialog.save({defaultPath:i,filters:s?[{name:s.toUpperCase(),extensions:[s]}]:void 0}).then(d=>d&&n.fs.writeFile(d,r)).catch(()=>{});return}const a=new Blob([o],{type:e}),c=URL.createObjectURL(a),l=document.createElement("a");l.href=c,l.download=i,document.body.appendChild(l),l.click(),l.remove(),setTimeout(()=>URL.revokeObjectURL(c),1500)}const BLOCK_CSS=`
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
`;function escText(i){return String(i==null?"":i).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(i){const{html:e,notes:o}=splitNotes(i);return o.length?e+'<ol class="b-notes">'+o.map(n=>"<li>"+escText(n)+"</li>").join("")+"</ol>":e}function buildBookHTML(i,e){const o=i.chapters.filter(m=>e.include[m.id]!==!1),n=e.page||{},a=pageDimsMM(n),c=n.mt!=null?n.mt:20,l=n.mr!=null?n.mr:18,r=n.mb!=null?n.mb:20,s=n.ml!=null?n.ml:18,d=Math.round(a.w/5.4)+"em",x=Math.round(Math.min(s,l)*2.6)+"px",p=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let f="";return e.titlePage&&(f+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${i.title}</h1>${i.synopsis?`<p class="b-syn">${i.synopsis}</p>`:""}</section>`),e.toc&&(f+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${o.map(m=>`<li><span>${m.title}</span></li>`).join("")}</ol></section>`),o.forEach((m,b)=>{f+=`<section class="b-chap"><h1>${escText(m.title)}</h1>${chapterBody(m.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${c}mm ${l}mm ${r}mm ${s}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${p}; font-size: ${n.fontSize||12}pt; line-height: ${n.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
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
      body > section { max-width: ${d}; margin: 0 auto; padding: 0 ${x}; }
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
`+n.map((c,l)=>l+1+". "+c.title).join(`
`)+`


`),n.forEach(c=>{const l=(c.title||"").trim();l&&(a+=(o?"# "+l:l.toUpperCase())+`

`),a+=(o?htmlToMd(c.content):htmlToText(c.content))+`


`}),a.trim()+`
`}function buildBookDocx(i,e){const o=i.chapters.filter(a=>e.include[a.id]!==!1),n=[];return e.toc&&n.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+o.map(a=>"<li>"+a.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),o.forEach((a,c)=>{n.push({heading:a.title||"",html:a.content||"",pageBreakBefore:c>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?i.title:"",subtitle:e.titlePage&&i.synopsis||"",sections:n,font:e.font,page:e.page||null,bookTitle:i.title,author:e.author||""})}function ExportModal({store:i,projectId:e,onClose:o,initialFormat:n,onToast:a}){const[c,l]=useDismiss(o),r=i.get().projects.find(u=>u.id===e),s=i.get().user&&i.get().user.lang||"en",d=T(s),x=i.get().user&&i.get().user.editorFont||"book",[p,f]=useState(()=>({titlePage:!0,toc:!0,font:x,lang:s,include:{}})),m=u=>f(y=>({...y,...u}));if(!r)return null;const b=i.resolvePage(r.page),h={...p,page:b,author:i.get().user&&i.get().user.name||""},w=useMemo(()=>buildBookHTML(r,h),[r,p,JSON.stringify(b)]),g=r.chapters.filter(u=>p.include[u.id]!==!1).length;function v(u){const y=r.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(u==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(r,h))){a(d("exp_toast_pdf"));return}downloadBlob(y+".html","text/html;charset=utf-8",buildBookHTML(r,h)),a(d("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){a(d("exp_err_popup"));return}k.document.write(buildBookHTML(r,h)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),a(d("exp_toast_pdf"))}else if(u==="docx")try{downloadBlob(y+".docx",SipruFormats.DOCX_MIME,buildBookDocx(r,h)),a(d("exp_toast_docx_real"))}catch{a(d("exp_err_docx"))}else u==="txt"?(downloadBlob(y+".txt","text/plain;charset=utf-8",buildPlain(r,h,!1)),a(d("exp_toast_txt"))):u==="md"&&(downloadBlob(y+".md","text/markdown;charset=utf-8",buildPlain(r,h,!0)),a(d("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+c,onMouseDown:l},React.createElement("div",{className:"modal export-modal",onMouseDown:u=>u.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},d("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},r.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>m({titlePage:!0,toc:!0,font:x}),title:d("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",d("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:l},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},d("exp_chapters_label")," \xB7 ",g," ",d("exp_of")," ",r.chapters.length),React.createElement("ul",{className:"exp-chaps"},r.chapters.map((u,y)=>React.createElement("li",{key:u.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:p.include[u.id]!==!1,onChange:k=>m({include:{...p.include,[u.id]:k.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(y+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},u.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},d("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([u,y])=>React.createElement("label",{key:u,className:"exp-toggle"},React.createElement("span",{className:"switch"+(p[u]?" on":""),onClick:()=>m({[u]:!p[u]})},React.createElement("span",null)),d(y))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>v("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>v("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>v("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>v("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:r,opts:h,lang:s})))))}function buildNoteHTML(i,e){const o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif",n=e.page||{},a=pageDimsMM(n),c=n.mt!=null?n.mt:20,l=n.mr!=null?n.mr:18,r=n.mb!=null?n.mb:20,s=n.ml!=null?n.ml:18,d=Math.round(a.w/5.4)+"em",x=Math.round(Math.min(s,l)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${c}mm ${l}mm ${r}mm ${s}mm; }
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
      .n-wrap { max-width: ${d}; margin: 0 auto; padding: 0 ${x}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${i.title}</h1></div>`:""}${chapterBody(i.content||"")}</div></body></html>`}function NoteExportModal({note:i,onClose:e,onToast:o,lang:n,defaultFont:a,page:c}){const[l,r]=useDismiss(e),s=T(n||"en"),[d,x]=useState({font:a||"book",titlePage:!0}),p=b=>x(h=>({...h,...b})),f={...d,page:c};function m(b){const h=i.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(b==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(i,f))){o(s("exp_toast_pdf"));return}downloadBlob(h+".html","text/html;charset=utf-8",buildNoteHTML(i,f)),o(s("exp_toast_pdf_tauri"));return}const w=window.open("","_blank");if(!w){o(s("exp_err_popup"));return}w.document.write(buildNoteHTML(i,f)),w.document.close(),setTimeout(()=>{w.focus(),w.print()},700),o(s("exp_toast_pdf"))}else if(b==="docx")try{downloadBlob(h+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:d.titlePage?i.title:"",sections:[{html:i.content||""}],font:d.font,page:c||null})),o(s("exp_toast_docx_real"))}catch{o(s("exp_err_docx"))}else b==="txt"?(downloadBlob(h+".txt","text/plain;charset=utf-8",htmlToText(i.content)),o(s("exp_toast_txt"))):b==="md"&&(downloadBlob(h+".md","text/markdown;charset=utf-8","# "+i.title+`

`+htmlToMd(i.content)),o(s("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+l,onMouseDown:r},React.createElement("div",{className:"modal export-modal",onMouseDown:b=>b.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},s("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},i.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>p({font:a||"book",titlePage:!0}),title:s("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",s("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:r},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},s("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(d.titlePage?" on":""),onClick:()=>p({titlePage:!d.titlePage})},React.createElement("span",null)),s("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>m("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>m("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>m("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>m("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(NotePagedPreview,{note:i,opts:f})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
