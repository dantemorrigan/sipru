function BookPreview({html:n,title:e,edition:i,lang:o}){const r=useRef(null),d=useRef(null),[f,a]=useState(!1),[s,l]=useState(!1),v=T(o||"en"),{headings:c,htmlWithIds:g}=useMemo(()=>{const u=document.createElement("div");u.innerHTML=chapterBody(n||"");const w=[];let x=0;return u.querySelectorAll("h1, h2, h3").forEach(y=>{const k="bh-"+x++;y.id=k,w.push({id:k,level:parseInt(y.tagName[1]),text:y.textContent.trim()})}),{headings:w,htmlWithIds:u.innerHTML}},[n]),p=useMemo(()=>{const u=document.createElement("div");u.innerHTML=n||"";const w=(u.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(w/280))},[n]);useEffect(()=>{const u=r.current;if(!u)return;const w=()=>a(u.scrollTop>320);return u.addEventListener("scroll",w,{passive:!0}),()=>u.removeEventListener("scroll",w)},[]);function h(){r.current&&r.current.scrollTo({top:0,behavior:"smooth"})}const[m,b]=useState(null);return useEffect(()=>{if(!m)return;b(null);const u=d.current&&d.current.querySelector("#"+m);if(!u||!r.current)return;const w=r.current.getBoundingClientRect().top,x=u.getBoundingClientRect().top;r.current.scrollBy({top:x-w-24,behavior:"smooth"})},[m]),React.createElement("div",{className:"preview-scroll",ref:r},c.length>0&&React.createElement("div",{className:"preview-anchors"+(s?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>l(u=>!u)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,v(s?"anchors_hide":"anchors_show"))),s&&React.createElement("nav",{className:"anchors-nav"},c.map(u=>React.createElement("button",{key:u.id,className:"anchor-item anchor-item--h"+u.level,onClick:()=>{l(!1),b(u.id)}},u.text)))),React.createElement("div",{className:"book book--"+i},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:d,dangerouslySetInnerHTML:{__html:g}})),React.createElement("div",{className:"book-foot mono"},v("preview_label")," \xB7 \u2248\u2009",p,"\u2009",o==="ru"?"\u0441\u0442\u0440.":"p.")),f&&React.createElement("button",{className:"scroll-top-btn",onClick:h,title:v("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(n){const e=document.createElement("div");e.innerHTML=n||"";const i=e.querySelector(".fn-defs");let o="";if(i){const r=Array.prototype.map.call(i.children,(d,f)=>f+1+". "+(d.textContent||""));i.remove(),r.length&&(o=`

---
`+r.join(`
`))}return((e.textContent||"")+o).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(n){return String(n==null?"":n).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(n){let e="";return n.childNodes.forEach(i=>{if(i.nodeType===3){e+=mdEscapeText(i.textContent);return}if(i.nodeType!==1)return;const o=i.tagName.toLowerCase();if(o==="br"){e+=`  
`;return}if(o==="sup"&&i.classList&&i.classList.contains("fn")){e+="[^"+(i.textContent||"").trim()+"]";return}if(o==="code"){const d=i.textContent||"";let f="`";for(;d.indexOf(f)>=0;)f+="`";const a=/^`|`$/.test(d)?" ":"";e+=f+a+d+a+f;return}const r=inlineToMd(i);o==="strong"||o==="b"?e+="**"+r+"**":o==="em"||o==="i"?e+="*"+r+"*":o==="u"?e+="<u>"+r+"</u>":o==="s"||o==="strike"?e+="~~"+r+"~~":o==="a"?e+="["+r+"]("+(i.getAttribute("href")||"")+")":e+=r}),e}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let i="";const o=[],r=a=>(o.push(a),"v"+(o.length-1)+""),d=[],f=e.querySelector(".fn-defs");return f&&(Array.prototype.forEach.call(f.children,a=>d.push((a.textContent||"").replace(/\s*\n\s*/g," "))),f.remove()),e.childNodes.forEach(a=>{if(a.nodeType===3){i+=mdEscapeText(a.textContent);return}const s=a.tagName?a.tagName.toLowerCase():"",l=a.getAttribute&&a.getAttribute("class")||"";if(s==="hr"&&l.indexOf("page-break")>=0){i+=`
<!-- page-break -->

`;return}if(s==="hr"&&l.indexOf("scene-sep")>=0){i+=`
<!-- scene: `+(a.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(a.getAttribute("data-s")||"draft")+` -->

`;return}if(s==="figure"&&l.indexOf("epigraph")>=0){const g=a.querySelector("blockquote"),p=a.querySelector("figcaption"),h=g?inlineToMd(g):"",m=p?inlineToMd(p):"";if(!h.trim()&&!m.trim())return;i+=`
::: epigraph
`+h+`
`+(m.trim()?"-- "+m+`
`:"")+`:::

`;return}if(s==="pre"){const p=(a.querySelector("code")||a).textContent||"";if(l.indexOf("math")>=0){i+=`
`+r(`$$
`+p+`
$$`)+`

`;return}let h="```";for(;new RegExp("^\\s*"+h,"m").test(p);)h+="`";i+=`
`+r(h+(a.getAttribute("data-lang")||"")+`
`+p+`
`+h)+`

`;return}if(s==="table"){const g=Array.prototype.map.call(a.querySelectorAll("tr"),m=>Array.prototype.map.call(m.children,b=>inlineToMd(b).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!g.length)return;const p=g.reduce((m,b)=>Math.max(m,b.length),0),h=m=>{const b=m.slice();for(;b.length<p;)b.push("");return"| "+b.join(" | ")+" |"};i+=`
`+h(g[0])+`
|`+" --- |".repeat(p)+`
`+g.slice(1).map(h).join(`
`)+`

`;return}if(s==="aside"&&l.indexOf("note")>=0){const g=inlineToMd(a);if(!g.trim())return;i+=`
::: note
`+g+`
:::

`;return}const v=inlineToMd(a);if(!v.trim()&&s!=="hr")return;const c=l.match(/\bal-(l|c|r|j)\b/);if(s==="h1")i+=`
# `+v+`

`;else if(s==="h2")i+=`
## `+v+`

`;else if(s==="h3")i+=`
### `+v+`

`;else if(s==="blockquote")i+="> "+v.replace(/\n/g,`
> `)+`

`;else if(s==="hr")i+=`
---

`;else if(s==="ul")a.querySelectorAll("li").forEach(g=>i+="- "+inlineToMd(g)+`
`),i+=`
`;else if(s==="ol"){let g=1;a.querySelectorAll("li").forEach(p=>i+=g+++". "+inlineToMd(p)+`
`),i+=`
`}else s==="p"&&c?i+='<p class="al-'+c[1]+'">'+v.replace(/\n/g," ")+`</p>

`:i+=v+`

`}),i=i.replace(/\n{3,}/g,`

`).trim(),d.length&&(i+=`

`+d.map((a,s)=>"[^"+(s+1)+"]: "+a).join(`
`)),i.replace(/\x01v(\d+)\x02/g,(a,s)=>o[+s])}function splitNotes(n){const e=document.createElement("div");e.innerHTML=n||"";const i=e.querySelector(".fn-defs"),o=[];return i&&(Array.prototype.forEach.call(i.children,r=>o.push(r.textContent||"")),i.remove()),{html:e.innerHTML,notes:o}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(n){const e=n&&n.size==="custom"?{w:n.w||210,h:n.h||297}:PAGE_MM[n&&n.size]||PAGE_MM.a4;return n&&n.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(n){return{...n||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1,noFluid:!0}}function StaticSheet({geom:n,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:n.pageW,height:n.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:n.pageW,height:n.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:n.mt,left:n.ml,width:n.contentW,height:n.contentH}},e))}function PaginatedChapter({html:n,geom:e,title:i}){const o=useRef(null),r=useRef([]),d=useRef(0),[f,a]=useState([[]]);function s(){const p=o.current;if(!p)return;const h=footnoteList(p),m={};h.forEach(u=>{m[u.id]=u});const b=paginateArea(p,e,r.current);a(b.notes.map(u=>u.map(w=>m[w]).filter(Boolean)))}useEffect(()=>{o.current&&(o.current.innerHTML=n||""),r.current=[],d.current=0,s()},[n,e]);function l(p){const h=r.current;let m=!1;for(let b=0;b<p.length;b++){const u=p[b]?p[b]+Math.round(12*e.scale):0;Math.abs((h[b]||0)-u)>2&&(h[b]=u,m=!0)}h.length>p.length&&(h.length=p.length,m=!0),m&&d.current<3?(d.current++,s()):d.current=0}const c=f.length*(e.pageH+e.gap)-e.gap,g={width:e.pageW,height:c,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:g},React.createElement(PageLayer,{pages:f,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:l}),React.createElement("div",{ref:o,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:n,opts:e,lang:i}){const o=T(i||"en"),r=useRef(null),[d,f]=useState(0);useEffect(()=>{const c=r.current;if(!c)return;const g=()=>{c.clientWidth&&f(Math.max(160,c.clientWidth-48))};g();let p=null;return window.ResizeObserver?(p=new ResizeObserver(g),p.observe(c)):window.addEventListener("resize",g),()=>{p?p.disconnect():window.removeEventListener("resize",g)}},[]);const a=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),s=useMemo(()=>{const c=pageGeometry(a,d);return c.leading=a.leading,c.align=a.align,c.indent=a.indent,c.padL=a.padL,c.padR=a.padR,c.spaceBefore=a.spaceBefore,c.spaceAfter=a.spaceAfter,c.hyphens=a.hyphens,c.pg=a,c},[a,d]),l=n.chapters.filter(c=>e.include[c.id]!==!1),v=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:r,style:{"--ed-font":v}},e.titlePage&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title),n.synopsis&&React.createElement("p",{className:"b-syn"},n.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,o("toc_title")),React.createElement("ol",null,l.map(c=>React.createElement("li",{key:c.id},c.title))))),l.map(c=>React.createElement(PaginatedChapter,{key:c.id,html:c.content||"",geom:s,title:c.title})),!l.length&&React.createElement("div",{className:"exp-pages-empty mono"},o("exp_of")))}function printHTML(n){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const i=()=>setTimeout(()=>e.remove(),6e4);try{const o=e.contentDocument;o.open(),o.write(n),o.close();const r=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}i()};return o.readyState==="complete"?setTimeout(r,500):e.contentWindow.addEventListener("load",()=>setTimeout(r,500)),!0}catch{return e.remove(),!1}}function downloadBlob(n,e,i){const o=window.__TAURI__;if(o&&o.dialog&&o.fs){const a=i instanceof Uint8Array?i:new TextEncoder().encode(i),s=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";o.dialog.save({defaultPath:n,filters:s?[{name:s.toUpperCase(),extensions:[s]}]:void 0}).then(l=>l&&o.fs.writeFile(l,a)).catch(()=>{});return}const r=new Blob([i],{type:e}),d=URL.createObjectURL(r),f=document.createElement("a");f.href=d,f.download=n,document.body.appendChild(f),f.click(),f.remove(),setTimeout(()=>URL.revokeObjectURL(d),1500)}const BLOCK_CSS=`
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
`;function escText(n){return String(n==null?"":n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(n){const{html:e,notes:i}=splitNotes(n);return i.length?e+'<ol class="b-notes">'+i.map(o=>"<li>"+escText(o)+"</li>").join("")+"</ol>":e}function buildBookHTML(n,e){const i=n.chapters.filter(p=>e.include[p.id]!==!1),o=e.page||{},r=pageDimsMM(o),d=o.mt!=null?o.mt:20,f=o.mr!=null?o.mr:18,a=o.mb!=null?o.mb:20,s=o.ml!=null?o.ml:18,l=Math.round(r.w/5.4)+"em",v=Math.round(Math.min(s,f)*2.6)+"px",c=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let g="";return e.titlePage&&(g+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(g+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${i.map(p=>`<li><span>${p.title}</span></li>`).join("")}</ol></section>`),i.forEach((p,h)=>{g+=`<section class="b-chap">${chapterBody(p.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${r.w}mm ${r.h}mm; margin: ${d}mm ${f}mm ${a}mm ${s}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${c}; font-size: ${o.fontSize||12}pt; line-height: ${o.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
    .b-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; }
    .b-title h1 { font-size: 30pt; line-height: 1.06; margin: 18px 0 16px; font-weight: 600; letter-spacing: -.015em; }
    .b-syn { font-style: italic; color: #6b6457; font-size: 13pt; margin: 0 auto; max-width: 30em; }
    .b-toc h2 { font-size: 15pt; font-weight: 600; margin: 0 0 .9em; letter-spacing: -.01em; }
    .b-toc ol { line-height: 2.05; padding-left: 1.3em; color: #3a382f; margin: 0; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${o.spaceAfter!=null?o.spaceAfter:.6}em; text-indent: ${o.indent!=null?o.indent:1.5}em; text-align: ${(o.align||"justify")==="justify"?"justify":o.align}; }
    h1 + p, h2 + p, h3 + p, blockquote + p, ul + p, ol + p, hr + p, p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; text-align: left; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "\u2736"; color: #c2542f; }
${BLOCK_CSS}
    /* on-screen preview: a single clean, centred book column */
    @media screen {
      body { padding: 60px 0 80px; }
      body > section { max-width: ${l}; margin: 0 auto; padding: 0 ${v}; }
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
  </style></head><body>${g}</body></html>`}function buildPlain(n,e,i){const o=n.chapters.filter(d=>e.include[d.id]!==!1);let r="";return e.titlePage&&(r+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(r+=t("toc_title",e.lang||"en").toUpperCase()+`
`+o.map((d,f)=>f+1+". "+d.title).join(`
`)+`


`),o.forEach(d=>{r+=(i?htmlToMd(d.content):htmlToText(d.content))+`


`}),r.trim()+`
`}function buildBookDocx(n,e){const i=n.chapters.filter(r=>e.include[r.id]!==!1),o=[];return e.toc&&o.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+i.map(r=>"<li>"+r.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),i.forEach((r,d)=>{o.push({html:r.content||"",pageBreakBefore:d>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:o,font:e.font,page:e.page||null,bookTitle:n.title,author:e.author||""})}function ExportModal({store:n,projectId:e,onClose:i,initialFormat:o,onToast:r}){const[d,f]=useDismiss(i),a=n.get().projects.find(x=>x.id===e),s=n.get().user&&n.get().user.lang||"en",l=T(s),v=n.get().user&&n.get().user.editorFont||"book",[c,g]=useState(()=>({titlePage:!0,toc:!0,font:v,lang:s,include:{}})),p=x=>g(y=>({...y,...x}));if(!a)return null;const h=n.resolvePage(a.page),m={...c,page:h,author:n.get().user&&n.get().user.name||""},b=useMemo(()=>buildBookHTML(a,m),[a,c,JSON.stringify(h)]),u=a.chapters.filter(x=>c.include[x.id]!==!1).length;function w(x){const y=a.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(x==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(a,m))){r(l("exp_toast_pdf"));return}downloadBlob(y+".html","text/html;charset=utf-8",buildBookHTML(a,m)),r(l("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){r(l("exp_err_popup"));return}k.document.write(buildBookHTML(a,m)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),r(l("exp_toast_pdf"))}else if(x==="docx")try{downloadBlob(y+".docx",SipruFormats.DOCX_MIME,buildBookDocx(a,m)),r(l("exp_toast_docx_real"))}catch{r(l("exp_err_docx"))}else x==="txt"?(downloadBlob(y+".txt","text/plain;charset=utf-8",buildPlain(a,m,!1)),r(l("exp_toast_txt"))):x==="md"&&(downloadBlob(y+".md","text/markdown;charset=utf-8",buildPlain(a,m,!0)),r(l("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+d,onMouseDown:f},React.createElement("div",{className:"modal export-modal",onMouseDown:x=>x.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},l("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},a.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>p({titlePage:!0,toc:!0,font:v}),title:l("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",l("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:f},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_chapters_label")," \xB7 ",u," ",l("exp_of")," ",a.chapters.length),React.createElement("ul",{className:"exp-chaps"},a.chapters.map((x,y)=>React.createElement("li",{key:x.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:c.include[x.id]!==!1,onChange:k=>p({include:{...c.include,[x.id]:k.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(y+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},x.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([x,y])=>React.createElement("label",{key:x,className:"exp-toggle"},React.createElement("span",{className:"switch"+(c[x]?" on":""),onClick:()=>p({[x]:!c[x]})},React.createElement("span",null)),l(y))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>w("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>w("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>w("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>w("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:a,opts:m,lang:s})))))}function buildNoteHTML(n,e){const i=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif",o=e.page||{},r=pageDimsMM(o),d=o.mt!=null?o.mt:20,f=o.mr!=null?o.mr:18,a=o.mb!=null?o.mb:20,s=o.ml!=null?o.ml:18,l=Math.round(r.w/5.4)+"em",v=Math.round(Math.min(s,f)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${r.w}mm ${r.h}mm; margin: ${d}mm ${f}mm ${a}mm ${s}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${i}; font-size: ${o.fontSize||12}pt; line-height: ${o.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 .8em; }
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
      .n-wrap { max-width: ${l}; margin: 0 auto; padding: 0 ${v}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${n.title}</h1></div>`:""}${chapterBody(n.content||"")}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:i,lang:o,defaultFont:r,page:d}){const[f,a]=useDismiss(e),s=T(o||"en"),[l,v]=useState({font:r||"book",titlePage:!0}),c=m=>v(b=>({...b,...m})),g={...l,page:d},p=useMemo(()=>buildNoteHTML(n,g),[n,l,d]);function h(m){const b=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(m==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(n,g))){i(s("exp_toast_pdf"));return}downloadBlob(b+".html","text/html;charset=utf-8",buildNoteHTML(n,g)),i(s("exp_toast_pdf_tauri"));return}const u=window.open("","_blank");if(!u){i(s("exp_err_popup"));return}u.document.write(buildNoteHTML(n,g)),u.document.close(),setTimeout(()=>{u.focus(),u.print()},700),i(s("exp_toast_pdf"))}else if(m==="docx")try{downloadBlob(b+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:l.titlePage?n.title:"",sections:[{html:n.content||""}],font:l.font,page:d||null})),i(s("exp_toast_docx_real"))}catch{i(s("exp_err_docx"))}else m==="txt"?(downloadBlob(b+".txt","text/plain;charset=utf-8",htmlToText(n.content)),i(s("exp_toast_txt"))):m==="md"&&(downloadBlob(b+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),i(s("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+f,onMouseDown:a},React.createElement("div",{className:"modal export-modal",onMouseDown:m=>m.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},s("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>c({font:r||"book",titlePage:!0}),title:s("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",s("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:a},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},s("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(l.titlePage?" on":""),onClick:()=>c({titlePage:!l.titlePage})},React.createElement("span",null)),s("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>h("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>h("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>h("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>h("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:p})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
