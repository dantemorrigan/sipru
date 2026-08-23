function BookPreview({html:n,title:e,edition:i,lang:o}){const r=useRef(null),d=useRef(null),[f,a]=useState(!1),[s,l]=useState(!1),v=T(o||"en"),{headings:c,htmlWithIds:u}=useMemo(()=>{const p=document.createElement("div");p.innerHTML=chapterBody(n||"");const x=[];let y=0;return p.querySelectorAll("h1, h2, h3").forEach(b=>{const w="bh-"+y++;b.id=w,x.push({id:w,level:parseInt(b.tagName[1]),text:b.textContent.trim()})}),{headings:x,htmlWithIds:p.innerHTML}},[n]),m=useMemo(()=>{const p=document.createElement("div");p.innerHTML=n||"";const x=(p.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(x/280))},[n]);useEffect(()=>{const p=r.current;if(!p)return;const x=()=>a(p.scrollTop>320);return p.addEventListener("scroll",x,{passive:!0}),()=>p.removeEventListener("scroll",x)},[]);function h(){r.current&&r.current.scrollTo({top:0,behavior:"smooth"})}function g(p){const x=d.current&&d.current.querySelector("#"+p);if(!x||!r.current)return;const y=r.current.getBoundingClientRect().top,b=x.getBoundingClientRect().top;r.current.scrollBy({top:b-y-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:r},c.length>0&&React.createElement("div",{className:"preview-anchors"+(s?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>l(p=>!p)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,v(s?"anchors_hide":"anchors_show"))),s&&React.createElement("nav",{className:"anchors-nav"},c.map(p=>React.createElement("button",{key:p.id,className:"anchor-item anchor-item--h"+p.level,onClick:()=>{g(p.id),l(!1)}},p.text)))),React.createElement("div",{className:"book book--"+i},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:d,dangerouslySetInnerHTML:{__html:u}})),React.createElement("div",{className:"book-foot mono"},v("preview_label")," \xB7 \u2248\u2009",m,"\u2009",o==="ru"?"\u0441\u0442\u0440.":"p.")),f&&React.createElement("button",{className:"scroll-top-btn",onClick:h,title:v("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(n){const e=document.createElement("div");e.innerHTML=n||"";const i=e.querySelector(".fn-defs");let o="";if(i){const r=Array.prototype.map.call(i.children,(d,f)=>f+1+". "+(d.textContent||""));i.remove(),r.length&&(o=`

---
`+r.join(`
`))}return((e.textContent||"")+o).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(n){return String(n==null?"":n).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(n){let e="";return n.childNodes.forEach(i=>{if(i.nodeType===3){e+=mdEscapeText(i.textContent);return}if(i.nodeType!==1)return;const o=i.tagName.toLowerCase();if(o==="br"){e+=`  
`;return}if(o==="sup"&&i.classList&&i.classList.contains("fn")){e+="[^"+(i.textContent||"").trim()+"]";return}if(o==="code"){const d=i.textContent||"";let f="`";for(;d.indexOf(f)>=0;)f+="`";const a=/^`|`$/.test(d)?" ":"";e+=f+a+d+a+f;return}const r=inlineToMd(i);o==="strong"||o==="b"?e+="**"+r+"**":o==="em"||o==="i"?e+="*"+r+"*":o==="u"?e+="<u>"+r+"</u>":o==="s"||o==="strike"?e+="~~"+r+"~~":o==="a"?e+="["+r+"]("+(i.getAttribute("href")||"")+")":e+=r}),e}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let i="";const o=[],r=a=>(o.push(a),"v"+(o.length-1)+""),d=[],f=e.querySelector(".fn-defs");return f&&(Array.prototype.forEach.call(f.children,a=>d.push((a.textContent||"").replace(/\s*\n\s*/g," "))),f.remove()),e.childNodes.forEach(a=>{if(a.nodeType===3){i+=mdEscapeText(a.textContent);return}const s=a.tagName?a.tagName.toLowerCase():"",l=a.getAttribute&&a.getAttribute("class")||"";if(s==="hr"&&l.indexOf("page-break")>=0){i+=`
<!-- page-break -->

`;return}if(s==="hr"&&l.indexOf("scene-sep")>=0){i+=`
<!-- scene: `+(a.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(a.getAttribute("data-s")||"draft")+` -->

`;return}if(s==="figure"&&l.indexOf("epigraph")>=0){const u=a.querySelector("blockquote"),m=a.querySelector("figcaption"),h=u?inlineToMd(u):"",g=m?inlineToMd(m):"";if(!h.trim()&&!g.trim())return;i+=`
::: epigraph
`+h+`
`+(g.trim()?"-- "+g+`
`:"")+`:::

`;return}if(s==="pre"){const m=(a.querySelector("code")||a).textContent||"";if(l.indexOf("math")>=0){i+=`
`+r(`$$
`+m+`
$$`)+`

`;return}let h="```";for(;new RegExp("^\\s*"+h,"m").test(m);)h+="`";i+=`
`+r(h+(a.getAttribute("data-lang")||"")+`
`+m+`
`+h)+`

`;return}if(s==="table"){const u=Array.prototype.map.call(a.querySelectorAll("tr"),g=>Array.prototype.map.call(g.children,p=>inlineToMd(p).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!u.length)return;const m=u.reduce((g,p)=>Math.max(g,p.length),0),h=g=>{const p=g.slice();for(;p.length<m;)p.push("");return"| "+p.join(" | ")+" |"};i+=`
`+h(u[0])+`
|`+" --- |".repeat(m)+`
`+u.slice(1).map(h).join(`
`)+`

`;return}if(s==="aside"&&l.indexOf("note")>=0){const u=inlineToMd(a);if(!u.trim())return;i+=`
::: note
`+u+`
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

`;else if(s==="ul")a.querySelectorAll("li").forEach(u=>i+="- "+inlineToMd(u)+`
`),i+=`
`;else if(s==="ol"){let u=1;a.querySelectorAll("li").forEach(m=>i+=u+++". "+inlineToMd(m)+`
`),i+=`
`}else s==="p"&&c?i+='<p class="al-'+c[1]+'">'+v.replace(/\n/g," ")+`</p>

`:i+=v+`

`}),i=i.replace(/\n{3,}/g,`

`).trim(),d.length&&(i+=`

`+d.map((a,s)=>"[^"+(s+1)+"]: "+a).join(`
`)),i.replace(/\x01v(\d+)\x02/g,(a,s)=>o[+s])}function splitNotes(n){const e=document.createElement("div");e.innerHTML=n||"";const i=e.querySelector(".fn-defs"),o=[];return i&&(Array.prototype.forEach.call(i.children,r=>o.push(r.textContent||"")),i.remove()),{html:e.innerHTML,notes:o}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(n){const e=n&&n.size==="custom"?{w:n.w||210,h:n.h||297}:PAGE_MM[n&&n.size]||PAGE_MM.a4;return n&&n.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(n){return{...n||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1}}function StaticSheet({geom:n,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:n.pageW,height:n.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:n.pageW,height:n.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:n.mt,left:n.ml,width:n.contentW,height:n.contentH}},e))}function PaginatedChapter({html:n,geom:e,title:i}){const o=useRef(null),r=useRef([]),d=useRef(0),[f,a]=useState([[]]);function s(){const m=o.current;if(!m)return;const h=footnoteList(m),g={};h.forEach(x=>{g[x.id]=x});const p=paginateArea(m,e,r.current);a(p.notes.map(x=>x.map(y=>g[y]).filter(Boolean)))}useEffect(()=>{o.current&&(o.current.innerHTML=n||""),r.current=[],d.current=0,s()},[n,e]);function l(m){const h=r.current;let g=!1;for(let p=0;p<m.length;p++){const x=m[p]?m[p]+Math.round(12*e.scale):0;Math.abs((h[p]||0)-x)>2&&(h[p]=x,g=!0)}h.length>m.length&&(h.length=m.length,g=!0),g&&d.current<3?(d.current++,s()):d.current=0}const c=f.length*(e.pageH+e.gap)-e.gap,u={width:e.pageW,height:c,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:u},React.createElement(PageLayer,{pages:f,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:l}),React.createElement("div",{ref:o,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:n,opts:e,lang:i}){const o=T(i||"en"),r=useRef(null),[d,f]=useState(0);useEffect(()=>{const c=r.current;if(!c)return;const u=()=>{c.clientWidth&&f(Math.max(160,c.clientWidth-48))};u();let m=null;return window.ResizeObserver?(m=new ResizeObserver(u),m.observe(c)):window.addEventListener("resize",u),()=>{m?m.disconnect():window.removeEventListener("resize",u)}},[]);const a=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),s=useMemo(()=>{const c=pageGeometry(a,d);return c.leading=a.leading,c.align=a.align,c.indent=a.indent,c.padL=a.padL,c.padR=a.padR,c.spaceBefore=a.spaceBefore,c.spaceAfter=a.spaceAfter,c.hyphens=a.hyphens,c.pg=a,c},[a,d]),l=n.chapters.filter(c=>e.include[c.id]!==!1),v=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:r,style:{"--ed-font":v}},e.titlePage&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title),n.synopsis&&React.createElement("p",{className:"b-syn"},n.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:s},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,o("toc_title")),React.createElement("ol",null,l.map(c=>React.createElement("li",{key:c.id},c.title))))),l.map(c=>React.createElement(PaginatedChapter,{key:c.id,html:c.content||"",geom:s,title:c.title})),!l.length&&React.createElement("div",{className:"exp-pages-empty mono"},o("exp_of")))}function printHTML(n){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const i=()=>setTimeout(()=>e.remove(),6e4);try{const o=e.contentDocument;o.open(),o.write(n),o.close();const r=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}i()};return o.readyState==="complete"?setTimeout(r,500):e.contentWindow.addEventListener("load",()=>setTimeout(r,500)),!0}catch{return e.remove(),!1}}function downloadBlob(n,e,i){const o=window.__TAURI__;if(o&&o.dialog&&o.fs){const a=i instanceof Uint8Array?i:new TextEncoder().encode(i),s=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";o.dialog.save({defaultPath:n,filters:s?[{name:s.toUpperCase(),extensions:[s]}]:void 0}).then(l=>l&&o.fs.writeFile(l,a)).catch(()=>{});return}const r=new Blob([i],{type:e}),d=URL.createObjectURL(r),f=document.createElement("a");f.href=d,f.download=n,document.body.appendChild(f),f.click(),f.remove(),setTimeout(()=>URL.revokeObjectURL(d),1500)}const BLOCK_CSS=`
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
`;function escText(n){return String(n==null?"":n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(n){const{html:e,notes:i}=splitNotes(n);return i.length?e+'<ol class="b-notes">'+i.map(o=>"<li>"+escText(o)+"</li>").join("")+"</ol>":e}function buildBookHTML(n,e){const i=n.chapters.filter(m=>e.include[m.id]!==!1),o=e.page||{},r=pageDimsMM(o),d=o.mt!=null?o.mt:20,f=o.mr!=null?o.mr:18,a=o.mb!=null?o.mb:20,s=o.ml!=null?o.ml:18,l=Math.round(r.w/5.4)+"em",v=Math.round(Math.min(s,f)*2.6)+"px",c=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let u="";return e.titlePage&&(u+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(u+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${i.map(m=>`<li><span>${m.title}</span></li>`).join("")}</ol></section>`),i.forEach((m,h)=>{u+=`<section class="b-chap">${chapterBody(m.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
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
  </style></head><body>${u}</body></html>`}function buildPlain(n,e,i){const o=n.chapters.filter(d=>e.include[d.id]!==!1);let r="";return e.titlePage&&(r+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(r+=t("toc_title",e.lang||"en").toUpperCase()+`
`+o.map((d,f)=>f+1+". "+d.title).join(`
`)+`


`),o.forEach(d=>{r+=(i?htmlToMd(d.content):htmlToText(d.content))+`


`}),r.trim()+`
`}function buildBookDocx(n,e){const i=n.chapters.filter(r=>e.include[r.id]!==!1),o=[];return e.toc&&o.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+i.map(r=>"<li>"+r.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),i.forEach((r,d)=>{o.push({html:r.content||"",pageBreakBefore:d>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:o,font:e.font,page:e.page||null,bookTitle:n.title,author:e.author||""})}function ExportModal({store:n,projectId:e,onClose:i,initialFormat:o,onToast:r}){const[d,f]=useDismiss(i),a=n.get().projects.find(b=>b.id===e),s=n.get().user&&n.get().user.lang||"en",l=T(s),v=n.get().user&&n.get().user.editorFont||"book",[c,u]=useState(()=>({titlePage:!0,toc:!0,font:v,lang:s,include:{}})),m=b=>u(w=>({...w,...b}));if(!a)return null;const h=n.resolvePage(a.page),g={...c,page:h,author:n.get().user&&n.get().user.name||""},p=useMemo(()=>buildBookHTML(a,g),[a,c,JSON.stringify(h)]),x=a.chapters.filter(b=>c.include[b.id]!==!1).length;function y(b){const w=a.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(b==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(a,g))){r(l("exp_toast_pdf"));return}downloadBlob(w+".html","text/html;charset=utf-8",buildBookHTML(a,g)),r(l("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){r(l("exp_err_popup"));return}k.document.write(buildBookHTML(a,g)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),r(l("exp_toast_pdf"))}else if(b==="docx")try{downloadBlob(w+".docx",SipruFormats.DOCX_MIME,buildBookDocx(a,g)),r(l("exp_toast_docx_real"))}catch{r(l("exp_err_docx"))}else b==="txt"?(downloadBlob(w+".txt","text/plain;charset=utf-8",buildPlain(a,g,!1)),r(l("exp_toast_txt"))):b==="md"&&(downloadBlob(w+".md","text/markdown;charset=utf-8",buildPlain(a,g,!0)),r(l("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+d,onMouseDown:f},React.createElement("div",{className:"modal export-modal",onMouseDown:b=>b.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},l("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},a.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>m({titlePage:!0,toc:!0,font:v}),title:l("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",l("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:f},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_chapters_label")," \xB7 ",x," ",l("exp_of")," ",a.chapters.length),React.createElement("ul",{className:"exp-chaps"},a.chapters.map((b,w)=>React.createElement("li",{key:b.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:c.include[b.id]!==!1,onChange:k=>m({include:{...c.include,[b.id]:k.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(w+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},b.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([b,w])=>React.createElement("label",{key:b,className:"exp-toggle"},React.createElement("span",{className:"switch"+(c[b]?" on":""),onClick:()=>m({[b]:!c[b]})},React.createElement("span",null)),l(w))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>y("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>y("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>y("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>y("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:a,opts:g,lang:s})))))}function buildNoteHTML(n,e){const i=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif",o=e.page||{},r=pageDimsMM(o),d=o.mt!=null?o.mt:20,f=o.mr!=null?o.mr:18,a=o.mb!=null?o.mb:20,s=o.ml!=null?o.ml:18,l=Math.round(r.w/5.4)+"em",v=Math.round(Math.min(s,f)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
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
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${n.title}</h1></div>`:""}${chapterBody(n.content||"")}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:i,lang:o,defaultFont:r,page:d}){const[f,a]=useDismiss(e),s=T(o||"en"),[l,v]=useState({font:r||"book",titlePage:!0}),c=g=>v(p=>({...p,...g})),u={...l,page:d},m=useMemo(()=>buildNoteHTML(n,u),[n,l,d]);function h(g){const p=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(g==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(n,u))){i(s("exp_toast_pdf"));return}downloadBlob(p+".html","text/html;charset=utf-8",buildNoteHTML(n,u)),i(s("exp_toast_pdf_tauri"));return}const x=window.open("","_blank");if(!x){i(s("exp_err_popup"));return}x.document.write(buildNoteHTML(n,u)),x.document.close(),setTimeout(()=>{x.focus(),x.print()},700),i(s("exp_toast_pdf"))}else if(g==="docx")try{downloadBlob(p+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:l.titlePage?n.title:"",sections:[{html:n.content||""}],font:l.font,page:d||null})),i(s("exp_toast_docx_real"))}catch{i(s("exp_err_docx"))}else g==="txt"?(downloadBlob(p+".txt","text/plain;charset=utf-8",htmlToText(n.content)),i(s("exp_toast_txt"))):g==="md"&&(downloadBlob(p+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),i(s("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+f,onMouseDown:a},React.createElement("div",{className:"modal export-modal",onMouseDown:g=>g.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},s("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>c({font:r||"book",titlePage:!0}),title:s("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",s("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:a},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},s("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(l.titlePage?" on":""),onClick:()=>c({titlePage:!l.titlePage})},React.createElement("span",null)),s("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>h("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>h("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>h("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>h("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:m})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
