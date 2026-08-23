function BookPreview({html:n,title:e,edition:o,lang:i}){const s=useRef(null),l=useRef(null),[m,r]=useState(!1),[a,c]=useState(!1),b=T(i||"en"),{headings:d,htmlWithIds:f}=useMemo(()=>{const h=document.createElement("div");h.innerHTML=chapterBody(n||"");const w=[];let v=0;return h.querySelectorAll("h1, h2, h3").forEach(y=>{const k="bh-"+v++;y.id=k,w.push({id:k,level:parseInt(y.tagName[1]),text:y.textContent.trim()})}),{headings:w,htmlWithIds:h.innerHTML}},[n]),p=useMemo(()=>{const h=document.createElement("div");h.innerHTML=n||"";const w=(h.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(w/280))},[n]);useEffect(()=>{const h=s.current;if(!h)return;const w=()=>r(h.scrollTop>320);return h.addEventListener("scroll",w,{passive:!0}),()=>h.removeEventListener("scroll",w)},[]);function g(){s.current&&s.current.scrollTo({top:0,behavior:"smooth"})}const[u,x]=useState(null);return useEffect(()=>{if(!u)return;x(null);const h=l.current&&l.current.querySelector("#"+u);if(!h||!s.current)return;const w=s.current.getBoundingClientRect().top,v=h.getBoundingClientRect().top;s.current.scrollBy({top:v-w-24,behavior:"smooth"})},[u]),React.createElement("div",{className:"preview-scroll",ref:s},d.length>0&&React.createElement("div",{className:"preview-anchors"+(a?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>c(h=>!h)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,b(a?"anchors_hide":"anchors_show"))),a&&React.createElement("nav",{className:"anchors-nav"},d.map(h=>React.createElement("button",{key:h.id,className:"anchor-item anchor-item--h"+h.level,onClick:()=>{c(!1),x(h.id)}},h.text)))),React.createElement("div",{className:"book book--"+o},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:l,dangerouslySetInnerHTML:{__html:f}})),React.createElement("div",{className:"book-foot mono"},b("preview_label")," \xB7 \u2248\u2009",p,"\u2009",i==="ru"?"\u0441\u0442\u0440.":"p.")),m&&React.createElement("button",{className:"scroll-top-btn",onClick:g,title:b("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(n){const e=document.createElement("div");e.innerHTML=n||"";const o=e.querySelector(".fn-defs");let i="";if(o){const s=Array.prototype.map.call(o.children,(l,m)=>m+1+". "+(l.textContent||""));o.remove(),s.length&&(i=`

---
`+s.join(`
`))}return((e.textContent||"")+i).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(n){return String(n==null?"":n).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(n){let e="";return n.childNodes.forEach(o=>{if(o.nodeType===3){e+=mdEscapeText(o.textContent);return}if(o.nodeType!==1)return;const i=o.tagName.toLowerCase();if(i==="br"){e+=`  
`;return}if(i==="sup"&&o.classList&&o.classList.contains("fn")){e+="[^"+(o.textContent||"").trim()+"]";return}if(i==="code"){const l=o.textContent||"";let m="`";for(;l.indexOf(m)>=0;)m+="`";const r=/^`|`$/.test(l)?" ":"";e+=m+r+l+r+m;return}const s=inlineToMd(o);i==="strong"||i==="b"?e+="**"+s+"**":i==="em"||i==="i"?e+="*"+s+"*":i==="u"?e+="<u>"+s+"</u>":i==="s"||i==="strike"?e+="~~"+s+"~~":i==="a"?e+="["+s+"]("+(o.getAttribute("href")||"")+")":e+=s}),e}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let o="";const i=[],s=r=>(i.push(r),"v"+(i.length-1)+""),l=[],m=e.querySelector(".fn-defs");return m&&(Array.prototype.forEach.call(m.children,r=>l.push((r.textContent||"").replace(/\s*\n\s*/g," "))),m.remove()),e.childNodes.forEach(r=>{if(r.nodeType===3){o+=mdEscapeText(r.textContent);return}const a=r.tagName?r.tagName.toLowerCase():"",c=r.getAttribute&&r.getAttribute("class")||"";if(a==="hr"&&c.indexOf("page-break")>=0){o+=`
<!-- page-break -->

`;return}if(a==="hr"&&c.indexOf("scene-sep")>=0){o+=`
<!-- scene: `+(r.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(r.getAttribute("data-s")||"draft")+` -->

`;return}if(a==="figure"&&c.indexOf("epigraph")>=0){const f=r.querySelector("blockquote"),p=r.querySelector("figcaption"),g=f?inlineToMd(f):"",u=p?inlineToMd(p):"";if(!g.trim()&&!u.trim())return;o+=`
::: epigraph
`+g+`
`+(u.trim()?"-- "+u+`
`:"")+`:::

`;return}if(a==="pre"){const p=(r.querySelector("code")||r).textContent||"";if(c.indexOf("math")>=0){o+=`
`+s(`$$
`+p+`
$$`)+`

`;return}let g="```";for(;new RegExp("^\\s*"+g,"m").test(p);)g+="`";o+=`
`+s(g+(r.getAttribute("data-lang")||"")+`
`+p+`
`+g)+`

`;return}if(a==="table"){const f=Array.prototype.map.call(r.querySelectorAll("tr"),u=>Array.prototype.map.call(u.children,x=>inlineToMd(x).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!f.length)return;const p=f.reduce((u,x)=>Math.max(u,x.length),0),g=u=>{const x=u.slice();for(;x.length<p;)x.push("");return"| "+x.join(" | ")+" |"};o+=`
`+g(f[0])+`
|`+" --- |".repeat(p)+`
`+f.slice(1).map(g).join(`
`)+`

`;return}if(a==="aside"&&c.indexOf("note")>=0){const f=inlineToMd(r);if(!f.trim())return;o+=`
::: note
`+f+`
:::

`;return}const b=inlineToMd(r);if(!b.trim()&&a!=="hr")return;const d=c.match(/\bal-(l|c|r|j)\b/);if(a==="h1")o+=`
# `+b+`

`;else if(a==="h2")o+=`
## `+b+`

`;else if(a==="h3")o+=`
### `+b+`

`;else if(a==="blockquote")o+="> "+b.replace(/\n/g,`
> `)+`

`;else if(a==="hr")o+=`
---

`;else if(a==="ul")r.querySelectorAll("li").forEach(f=>o+="- "+inlineToMd(f)+`
`),o+=`
`;else if(a==="ol"){let f=1;r.querySelectorAll("li").forEach(p=>o+=f+++". "+inlineToMd(p)+`
`),o+=`
`}else a==="p"&&d?o+='<p class="al-'+d[1]+'">'+b.replace(/\n/g," ")+`</p>

`:o+=b+`

`}),o=o.replace(/\n{3,}/g,`

`).trim(),l.length&&(o+=`

`+l.map((r,a)=>"[^"+(a+1)+"]: "+r).join(`
`)),o.replace(/\x01v(\d+)\x02/g,(r,a)=>i[+a])}function splitNotes(n){const e=document.createElement("div");e.innerHTML=n||"";const o=e.querySelector(".fn-defs"),i=[];return o&&(Array.prototype.forEach.call(o.children,s=>i.push(s.textContent||"")),o.remove()),{html:e.innerHTML,notes:i}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(n){const e=n&&n.size==="custom"?{w:n.w||210,h:n.h||297}:PAGE_MM[n&&n.size]||PAGE_MM.a4;return n&&n.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(n){return{...n||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1,noFluid:!0}}function StaticSheet({geom:n,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:n.pageW,height:n.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:n.pageW,height:n.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:n.mt,left:n.ml,width:n.contentW,height:n.contentH}},e))}function PaginatedChapter({html:n,geom:e,title:o}){const i=useRef(null),s=useRef([]),l=useRef(0),[m,r]=useState([[]]);function a(){const p=i.current;if(!p)return;const g=footnoteList(p),u={};g.forEach(h=>{u[h.id]=h});const x=paginateArea(p,e,s.current);r(x.notes.map(h=>h.map(w=>u[w]).filter(Boolean)))}useEffect(()=>{i.current&&(i.current.innerHTML=n||""),s.current=[],l.current=0,a()},[n,e]);function c(p){const g=s.current;let u=!1;for(let x=0;x<p.length;x++){const h=p[x]?p[x]+Math.round(12*e.scale):0;Math.abs((g[x]||0)-h)>2&&(g[x]=h,u=!0)}g.length>p.length&&(g.length=p.length,u=!0),u&&l.current<3?(l.current++,a()):l.current=0}const d=m.length*(e.pageH+e.gap)-e.gap,f={width:e.pageW,height:d,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:f},React.createElement(PageLayer,{pages:m,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:c}),React.createElement("div",{ref:i,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:n,opts:e,lang:o}){const i=T(o||"en"),s=useRef(null),[l,m]=useState(0);useEffect(()=>{const d=s.current;if(!d)return;const f=()=>{d.clientWidth&&m(Math.max(160,d.clientWidth-48))};f();let p=null;return window.ResizeObserver?(p=new ResizeObserver(f),p.observe(d)):window.addEventListener("resize",f),()=>{p?p.disconnect():window.removeEventListener("resize",f)}},[]);const r=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),a=useMemo(()=>{const d=pageGeometry(r,l);return d.leading=r.leading,d.align=r.align,d.indent=r.indent,d.padL=r.padL,d.padR=r.padR,d.spaceBefore=r.spaceBefore,d.spaceAfter=r.spaceAfter,d.hyphens=r.hyphens,d.pg=r,d},[r,l]),c=n.chapters.filter(d=>e.include[d.id]!==!1),b=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:s,style:{"--ed-font":b}},e.titlePage&&React.createElement(StaticSheet,{geom:a},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title),n.synopsis&&React.createElement("p",{className:"b-syn"},n.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:a},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,i("toc_title")),React.createElement("ol",null,c.map(d=>React.createElement("li",{key:d.id},d.title))))),c.map(d=>React.createElement(PaginatedChapter,{key:d.id,html:d.content||"",geom:a,title:d.title})),!c.length&&React.createElement("div",{className:"exp-pages-empty mono"},i("exp_of")))}function NotePagedPreview({note:n,opts:e}){const o=useRef(null),[i,s]=useState(0);useEffect(()=>{const a=o.current;if(!a)return;const c=()=>{a.clientWidth&&s(Math.max(160,a.clientWidth-48))};c();let b=null;return window.ResizeObserver?(b=new ResizeObserver(c),b.observe(a)):window.addEventListener("resize",c),()=>{b?b.disconnect():window.removeEventListener("resize",c)}},[]);const l=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),m=useMemo(()=>{const a=pageGeometry(l,i);return a.leading=l.leading,a.align=l.align,a.indent=l.indent,a.padL=l.padL,a.padR=l.padR,a.spaceBefore=l.spaceBefore,a.spaceAfter=l.spaceAfter,a.hyphens=l.hyphens,a.pg=l,a},[l,i]),r=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:o,style:{"--ed-font":r}},e.titlePage&&React.createElement(StaticSheet,{geom:m},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title))),React.createElement(PaginatedChapter,{html:n.content||"",geom:m,title:n.title}))}function printHTML(n){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const o=()=>setTimeout(()=>e.remove(),6e4);try{const i=e.contentDocument;i.open(),i.write(n),i.close();const s=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}o()};return i.readyState==="complete"?setTimeout(s,500):e.contentWindow.addEventListener("load",()=>setTimeout(s,500)),!0}catch{return e.remove(),!1}}function downloadBlob(n,e,o){const i=window.__TAURI__;if(i&&i.dialog&&i.fs){const r=o instanceof Uint8Array?o:new TextEncoder().encode(o),a=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";i.dialog.save({defaultPath:n,filters:a?[{name:a.toUpperCase(),extensions:[a]}]:void 0}).then(c=>c&&i.fs.writeFile(c,r)).catch(()=>{});return}const s=new Blob([o],{type:e}),l=URL.createObjectURL(s),m=document.createElement("a");m.href=l,m.download=n,document.body.appendChild(m),m.click(),m.remove(),setTimeout(()=>URL.revokeObjectURL(l),1500)}const BLOCK_CSS=`
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
`;function escText(n){return String(n==null?"":n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(n){const{html:e,notes:o}=splitNotes(n);return o.length?e+'<ol class="b-notes">'+o.map(i=>"<li>"+escText(i)+"</li>").join("")+"</ol>":e}function buildBookHTML(n,e){const o=n.chapters.filter(p=>e.include[p.id]!==!1),i=e.page||{},s=pageDimsMM(i),l=i.mt!=null?i.mt:20,m=i.mr!=null?i.mr:18,r=i.mb!=null?i.mb:20,a=i.ml!=null?i.ml:18,c=Math.round(s.w/5.4)+"em",b=Math.round(Math.min(a,m)*2.6)+"px",d=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let f="";return e.titlePage&&(f+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(f+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${o.map(p=>`<li><span>${p.title}</span></li>`).join("")}</ol></section>`),o.forEach((p,g)=>{f+=`<section class="b-chap">${chapterBody(p.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${s.w}mm ${s.h}mm; margin: ${l}mm ${m}mm ${r}mm ${a}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${d}; font-size: ${i.fontSize||12}pt; line-height: ${i.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
    .b-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; }
    .b-title h1 { font-size: 30pt; line-height: 1.06; margin: 18px 0 16px; font-weight: 600; letter-spacing: -.015em; }
    .b-syn { font-style: italic; color: #6b6457; font-size: 13pt; margin: 0 auto; max-width: 30em; }
    .b-toc h2 { font-size: 15pt; font-weight: 600; margin: 0 0 .9em; letter-spacing: -.01em; }
    .b-toc ol { line-height: 2.05; padding-left: 1.3em; color: #3a382f; margin: 0; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${i.spaceAfter!=null?i.spaceAfter:.6}em; text-indent: ${i.indent!=null?i.indent:1.5}em; text-align: ${(i.align||"justify")==="justify"?"justify":i.align}; }
    h1 + p, h2 + p, h3 + p, blockquote + p, ul + p, ol + p, hr + p, p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; text-align: left; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "\u2736"; color: #c2542f; }
${BLOCK_CSS}
    /* on-screen preview: a single clean, centred book column */
    @media screen {
      body { padding: 60px 0 80px; }
      body > section { max-width: ${c}; margin: 0 auto; padding: 0 ${b}; }
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
  </style></head><body>${f}</body></html>`}function buildPlain(n,e,o){const i=n.chapters.filter(l=>e.include[l.id]!==!1);let s="";return e.titlePage&&(s+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(s+=t("toc_title",e.lang||"en").toUpperCase()+`
`+i.map((l,m)=>m+1+". "+l.title).join(`
`)+`


`),i.forEach(l=>{s+=(o?htmlToMd(l.content):htmlToText(l.content))+`


`}),s.trim()+`
`}function buildBookDocx(n,e){const o=n.chapters.filter(s=>e.include[s.id]!==!1),i=[];return e.toc&&i.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+o.map(s=>"<li>"+s.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),o.forEach((s,l)=>{i.push({html:s.content||"",pageBreakBefore:l>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:i,font:e.font,page:e.page||null,bookTitle:n.title,author:e.author||""})}function ExportModal({store:n,projectId:e,onClose:o,initialFormat:i,onToast:s}){const[l,m]=useDismiss(o),r=n.get().projects.find(v=>v.id===e),a=n.get().user&&n.get().user.lang||"en",c=T(a),b=n.get().user&&n.get().user.editorFont||"book",[d,f]=useState(()=>({titlePage:!0,toc:!0,font:b,lang:a,include:{}})),p=v=>f(y=>({...y,...v}));if(!r)return null;const g=n.resolvePage(r.page),u={...d,page:g,author:n.get().user&&n.get().user.name||""},x=useMemo(()=>buildBookHTML(r,u),[r,d,JSON.stringify(g)]),h=r.chapters.filter(v=>d.include[v.id]!==!1).length;function w(v){const y=r.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(v==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(r,u))){s(c("exp_toast_pdf"));return}downloadBlob(y+".html","text/html;charset=utf-8",buildBookHTML(r,u)),s(c("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){s(c("exp_err_popup"));return}k.document.write(buildBookHTML(r,u)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),s(c("exp_toast_pdf"))}else if(v==="docx")try{downloadBlob(y+".docx",SipruFormats.DOCX_MIME,buildBookDocx(r,u)),s(c("exp_toast_docx_real"))}catch{s(c("exp_err_docx"))}else v==="txt"?(downloadBlob(y+".txt","text/plain;charset=utf-8",buildPlain(r,u,!1)),s(c("exp_toast_txt"))):v==="md"&&(downloadBlob(y+".md","text/markdown;charset=utf-8",buildPlain(r,u,!0)),s(c("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+l,onMouseDown:m},React.createElement("div",{className:"modal export-modal",onMouseDown:v=>v.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},c("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},r.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>p({titlePage:!0,toc:!0,font:b}),title:c("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",c("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:m},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},c("exp_chapters_label")," \xB7 ",h," ",c("exp_of")," ",r.chapters.length),React.createElement("ul",{className:"exp-chaps"},r.chapters.map((v,y)=>React.createElement("li",{key:v.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:d.include[v.id]!==!1,onChange:k=>p({include:{...d.include,[v.id]:k.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(y+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},v.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},c("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([v,y])=>React.createElement("label",{key:v,className:"exp-toggle"},React.createElement("span",{className:"switch"+(d[v]?" on":""),onClick:()=>p({[v]:!d[v]})},React.createElement("span",null)),c(y))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>w("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>w("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>w("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>w("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:r,opts:u,lang:a})))))}function buildNoteHTML(n,e){const o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif",i=e.page||{},s=pageDimsMM(i),l=i.mt!=null?i.mt:20,m=i.mr!=null?i.mr:18,r=i.mb!=null?i.mb:20,a=i.ml!=null?i.ml:18,c=Math.round(s.w/5.4)+"em",b=Math.round(Math.min(a,m)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${s.w}mm ${s.h}mm; margin: ${l}mm ${m}mm ${r}mm ${a}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${o}; font-size: ${i.fontSize||12}pt; line-height: ${i.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${i.spaceAfter!=null?i.spaceAfter:.8}em; text-indent: ${i.indent!=null?i.indent:0}em; text-align: ${(i.align||"left")==="justify"?"justify":i.align||"left"}; }
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
      .n-wrap { max-width: ${c}; margin: 0 auto; padding: 0 ${b}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${n.title}</h1></div>`:""}${chapterBody(n.content||"")}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:o,lang:i,defaultFont:s,page:l}){const[m,r]=useDismiss(e),a=T(i||"en"),[c,b]=useState({font:s||"book",titlePage:!0}),d=g=>b(u=>({...u,...g})),f={...c,page:l};function p(g){const u=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(g==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(n,f))){o(a("exp_toast_pdf"));return}downloadBlob(u+".html","text/html;charset=utf-8",buildNoteHTML(n,f)),o(a("exp_toast_pdf_tauri"));return}const x=window.open("","_blank");if(!x){o(a("exp_err_popup"));return}x.document.write(buildNoteHTML(n,f)),x.document.close(),setTimeout(()=>{x.focus(),x.print()},700),o(a("exp_toast_pdf"))}else if(g==="docx")try{downloadBlob(u+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:c.titlePage?n.title:"",sections:[{html:n.content||""}],font:c.font,page:l||null})),o(a("exp_toast_docx_real"))}catch{o(a("exp_err_docx"))}else g==="txt"?(downloadBlob(u+".txt","text/plain;charset=utf-8",htmlToText(n.content)),o(a("exp_toast_txt"))):g==="md"&&(downloadBlob(u+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),o(a("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+m,onMouseDown:r},React.createElement("div",{className:"modal export-modal",onMouseDown:g=>g.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},a("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>d({font:s||"book",titlePage:!0}),title:a("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",a("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:r},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},a("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(c.titlePage?" on":""),onClick:()=>d({titlePage:!c.titlePage})},React.createElement("span",null)),a("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>p("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>p("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>p("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>p("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(NotePagedPreview,{note:n,opts:f})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
