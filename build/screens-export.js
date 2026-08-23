function BookPreview({html:n,title:e,edition:i,lang:o}){const a=useRef(null),r=useRef(null),[d,s]=useState(!1),[c,p]=useState(!1),h=T(o||"en"),{headings:l,htmlWithIds:x}=useMemo(()=>{const m=document.createElement("div");m.innerHTML=chapterBody(n||"");const g=[];let y=0;return m.querySelectorAll("h1, h2, h3").forEach(u=>{const w="bh-"+y++;u.id=w,g.push({id:w,level:parseInt(u.tagName[1]),text:u.textContent.trim()})}),{headings:g,htmlWithIds:m.innerHTML}},[n]),f=useMemo(()=>{const m=document.createElement("div");m.innerHTML=n||"";const g=(m.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(g/280))},[n]);useEffect(()=>{const m=a.current;if(!m)return;const g=()=>s(m.scrollTop>320);return m.addEventListener("scroll",g,{passive:!0}),()=>m.removeEventListener("scroll",g)},[]);function v(){a.current&&a.current.scrollTo({top:0,behavior:"smooth"})}function b(m){const g=r.current&&r.current.querySelector("#"+m);if(!g||!a.current)return;const y=a.current.getBoundingClientRect().top,u=g.getBoundingClientRect().top;a.current.scrollBy({top:u-y-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:a},l.length>0&&React.createElement("div",{className:"preview-anchors"+(c?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>p(m=>!m)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,h(c?"anchors_hide":"anchors_show"))),c&&React.createElement("nav",{className:"anchors-nav"},l.map(m=>React.createElement("button",{key:m.id,className:"anchor-item anchor-item--h"+m.level,onClick:()=>{b(m.id),p(!1)}},m.text)))),React.createElement("div",{className:"book book--"+i},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:r,dangerouslySetInnerHTML:{__html:x}})),React.createElement("div",{className:"book-foot mono"},h("preview_label")," \xB7 \u2248\u2009",f,"\u2009",o==="ru"?"\u0441\u0442\u0440.":"p.")),d&&React.createElement("button",{className:"scroll-top-btn",onClick:v,title:h("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(n){const e=document.createElement("div");e.innerHTML=n||"";const i=e.querySelector(".fn-defs");let o="";if(i){const a=Array.prototype.map.call(i.children,(r,d)=>d+1+". "+(r.textContent||""));i.remove(),a.length&&(o=`

---
`+a.join(`
`))}return((e.textContent||"")+o).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(n){return String(n==null?"":n).replace(/[\\*_~[\]]/g,e=>"\\"+e)}function inlineToMd(n){let e="";return n.childNodes.forEach(i=>{if(i.nodeType===3){e+=mdEscapeText(i.textContent);return}if(i.nodeType!==1)return;const o=i.tagName.toLowerCase();if(o==="br"){e+=`  
`;return}if(o==="sup"&&i.classList&&i.classList.contains("fn")){e+="[^"+(i.textContent||"").trim()+"]";return}if(o==="code"){e+="`"+(i.textContent||"")+"`";return}const a=inlineToMd(i);o==="strong"||o==="b"?e+="**"+a+"**":o==="em"||o==="i"?e+="*"+a+"*":o==="u"?e+="<u>"+a+"</u>":o==="s"||o==="strike"?e+="~~"+a+"~~":o==="a"?e+="["+a+"]("+(i.getAttribute("href")||"")+")":e+=a}),e}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let i="";const o=[],a=e.querySelector(".fn-defs");return a&&(Array.prototype.forEach.call(a.children,r=>o.push((r.textContent||"").replace(/\s*\n\s*/g," "))),a.remove()),e.childNodes.forEach(r=>{if(r.nodeType===3){i+=mdEscapeText(r.textContent);return}const d=r.tagName?r.tagName.toLowerCase():"",s=r.getAttribute&&r.getAttribute("class")||"";if(d==="hr"&&s.indexOf("page-break")>=0){i+=`
<!-- page-break -->

`;return}if(d==="hr"&&s.indexOf("scene-sep")>=0){i+=`
<!-- scene: `+(r.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(r.getAttribute("data-s")||"draft")+` -->

`;return}if(d==="figure"&&s.indexOf("epigraph")>=0){const h=r.querySelector("blockquote"),l=r.querySelector("figcaption"),x=h?inlineToMd(h):"",f=l?inlineToMd(l):"";if(!x.trim()&&!f.trim())return;i+=`
::: epigraph
`+x+`
`+(f.trim()?"-- "+f+`
`:"")+`:::

`;return}if(d==="aside"&&s.indexOf("note")>=0){const h=inlineToMd(r);if(!h.trim())return;i+=`
::: note
`+h+`
:::

`;return}const c=inlineToMd(r);if(!c.trim()&&d!=="hr")return;const p=s.match(/\bal-(l|c|r|j)\b/);if(d==="h1")i+=`
# `+c+`

`;else if(d==="h2")i+=`
## `+c+`

`;else if(d==="h3")i+=`
### `+c+`

`;else if(d==="blockquote")i+="> "+c.replace(/\n/g,`
> `)+`

`;else if(d==="hr")i+=`
---

`;else if(d==="ul")r.querySelectorAll("li").forEach(h=>i+="- "+inlineToMd(h)+`
`),i+=`
`;else if(d==="ol"){let h=1;r.querySelectorAll("li").forEach(l=>i+=h+++". "+inlineToMd(l)+`
`),i+=`
`}else d==="p"&&p?i+='<p class="al-'+p[1]+'">'+c.replace(/\n/g," ")+`</p>

`:i+=c+`

`}),i=i.replace(/\n{3,}/g,`

`).trim(),o.length&&(i+=`

`+o.map((r,d)=>"[^"+(d+1)+"]: "+r).join(`
`)),i}function splitNotes(n){const e=document.createElement("div");e.innerHTML=n||"";const i=e.querySelector(".fn-defs"),o=[];return i&&(Array.prototype.forEach.call(i.children,a=>o.push(a.textContent||"")),i.remove()),{html:e.innerHTML,notes:o}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(n){const e=n&&n.size==="custom"?{w:n.w||210,h:n.h||297}:PAGE_MM[n&&n.size]||PAGE_MM.a4;return n&&n.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(n){return{...n||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1}}function StaticSheet({geom:n,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:n.pageW,height:n.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:n.pageW,height:n.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:n.mt,left:n.ml,width:n.contentW,height:n.contentH}},e))}function PaginatedChapter({html:n,geom:e,title:i}){const o=useRef(null),a=useRef([]),r=useRef(0),[d,s]=useState([[]]);function c(){const f=o.current;if(!f)return;const v=footnoteList(f),b={};v.forEach(g=>{b[g.id]=g});const m=paginateArea(f,e,a.current);s(m.notes.map(g=>g.map(y=>b[y]).filter(Boolean)))}useEffect(()=>{o.current&&(o.current.innerHTML=n||""),a.current=[],r.current=0,c()},[n,e]);function p(f){const v=a.current;let b=!1;for(let m=0;m<f.length;m++){const g=f[m]?f[m]+Math.round(12*e.scale):0;Math.abs((v[m]||0)-g)>2&&(v[m]=g,b=!0)}v.length>f.length&&(v.length=f.length,b=!0),b&&r.current<3?(r.current++,c()):r.current=0}const l=d.length*(e.pageH+e.gap)-e.gap,x={width:e.pageW,height:l,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:x},React.createElement(PageLayer,{pages:d,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:p}),React.createElement("div",{ref:o,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:n,opts:e,lang:i}){const o=T(i||"en"),a=useRef(null),[r,d]=useState(0);useEffect(()=>{const l=a.current;if(!l)return;const x=()=>{l.clientWidth&&d(Math.max(160,l.clientWidth-48))};x();let f=null;return window.ResizeObserver?(f=new ResizeObserver(x),f.observe(l)):window.addEventListener("resize",x),()=>{f?f.disconnect():window.removeEventListener("resize",x)}},[]);const s=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),c=useMemo(()=>{const l=pageGeometry(s,r);return l.leading=s.leading,l.align=s.align,l.indent=s.indent,l.padL=s.padL,l.padR=s.padR,l.spaceBefore=s.spaceBefore,l.spaceAfter=s.spaceAfter,l.hyphens=s.hyphens,l.pg=s,l},[s,r]),p=n.chapters.filter(l=>e.include[l.id]!==!1),h=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:a,style:{"--ed-font":h}},e.titlePage&&React.createElement(StaticSheet,{geom:c},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title),n.synopsis&&React.createElement("p",{className:"b-syn"},n.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:c},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,o("toc_title")),React.createElement("ol",null,p.map(l=>React.createElement("li",{key:l.id},l.title))))),p.map(l=>React.createElement(PaginatedChapter,{key:l.id,html:l.content||"",geom:c,title:l.title})),!p.length&&React.createElement("div",{className:"exp-pages-empty mono"},o("exp_of")))}function printHTML(n){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const i=()=>setTimeout(()=>e.remove(),6e4);try{const o=e.contentDocument;o.open(),o.write(n),o.close();const a=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}i()};return o.readyState==="complete"?setTimeout(a,500):e.contentWindow.addEventListener("load",()=>setTimeout(a,500)),!0}catch{return e.remove(),!1}}function downloadBlob(n,e,i){const o=window.__TAURI__;if(o&&o.dialog&&o.fs){const s=i instanceof Uint8Array?i:new TextEncoder().encode(i),c=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";o.dialog.save({defaultPath:n,filters:c?[{name:c.toUpperCase(),extensions:[c]}]:void 0}).then(p=>p&&o.fs.writeFile(p,s)).catch(()=>{});return}const a=new Blob([i],{type:e}),r=URL.createObjectURL(a),d=document.createElement("a");d.href=r,d.download=n,document.body.appendChild(d),d.click(),d.remove(),setTimeout(()=>URL.revokeObjectURL(r),1500)}const BLOCK_CSS=`
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
`;function escText(n){return String(n==null?"":n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(n){const{html:e,notes:i}=splitNotes(n);return i.length?e+'<ol class="b-notes">'+i.map(o=>"<li>"+escText(o)+"</li>").join("")+"</ol>":e}function buildBookHTML(n,e){const i=n.chapters.filter(f=>e.include[f.id]!==!1),o=e.page||{},a=pageDimsMM(o),r=o.mt!=null?o.mt:20,d=o.mr!=null?o.mr:18,s=o.mb!=null?o.mb:20,c=o.ml!=null?o.ml:18,p=Math.round(a.w/5.4)+"em",h=Math.round(Math.min(c,d)*2.6)+"px",l=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let x="";return e.titlePage&&(x+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(x+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${i.map(f=>`<li><span>${f.title}</span></li>`).join("")}</ol></section>`),i.forEach((f,v)=>{x+=`<section class="b-chap">${chapterBody(f.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${r}mm ${d}mm ${s}mm ${c}mm; }
    * { box-sizing: border-box; }
    body { font-family: ${l}; font-size: ${o.fontSize||12}pt; line-height: ${o.leading||1.7}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
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
      body > section { max-width: ${p}; margin: 0 auto; padding: 0 ${h}; }
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
  </style></head><body>${x}</body></html>`}function buildPlain(n,e,i){const o=n.chapters.filter(r=>e.include[r.id]!==!1);let a="";return e.titlePage&&(a+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(a+=t("toc_title",e.lang||"en").toUpperCase()+`
`+o.map((r,d)=>d+1+". "+r.title).join(`
`)+`


`),o.forEach(r=>{a+=(i?htmlToMd(r.content):htmlToText(r.content))+`


`}),a.trim()+`
`}function buildBookDocx(n,e){const i=n.chapters.filter(a=>e.include[a.id]!==!1),o=[];return e.toc&&o.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+i.map(a=>"<li>"+a.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),i.forEach((a,r)=>{o.push({html:a.content||"",pageBreakBefore:r>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:o,font:e.font,page:e.page||null,bookTitle:n.title,author:e.author||""})}function ExportModal({store:n,projectId:e,onClose:i,initialFormat:o,onToast:a}){const[r,d]=useDismiss(i),s=n.get().projects.find(u=>u.id===e),c=n.get().user&&n.get().user.lang||"en",p=T(c),h=n.get().user&&n.get().user.editorFont||"book",[l,x]=useState(()=>({titlePage:!0,toc:!0,font:h,lang:c,include:{}})),f=u=>x(w=>({...w,...u}));if(!s)return null;const v=n.resolvePage(s.page),b={...l,page:v,author:n.get().user&&n.get().user.name||""},m=useMemo(()=>buildBookHTML(s,b),[s,l,JSON.stringify(v)]),g=s.chapters.filter(u=>l.include[u.id]!==!1).length;function y(u){const w=s.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(u==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(s,b))){a(p("exp_toast_pdf"));return}downloadBlob(w+".html","text/html;charset=utf-8",buildBookHTML(s,b)),a(p("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){a(p("exp_err_popup"));return}k.document.write(buildBookHTML(s,b)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),a(p("exp_toast_pdf"))}else if(u==="docx")try{downloadBlob(w+".docx",SipruFormats.DOCX_MIME,buildBookDocx(s,b)),a(p("exp_toast_docx_real"))}catch{a(p("exp_err_docx"))}else u==="txt"?(downloadBlob(w+".txt","text/plain;charset=utf-8",buildPlain(s,b,!1)),a(p("exp_toast_txt"))):u==="md"&&(downloadBlob(w+".md","text/markdown;charset=utf-8",buildPlain(s,b,!0)),a(p("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+r,onMouseDown:d},React.createElement("div",{className:"modal export-modal",onMouseDown:u=>u.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},p("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},s.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>f({titlePage:!0,toc:!0,font:h}),title:p("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",p("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:d},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_chapters_label")," \xB7 ",g," ",p("exp_of")," ",s.chapters.length),React.createElement("ul",{className:"exp-chaps"},s.chapters.map((u,w)=>React.createElement("li",{key:u.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:l.include[u.id]!==!1,onChange:k=>f({include:{...l.include,[u.id]:k.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(w+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},u.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([u,w])=>React.createElement("label",{key:u,className:"exp-toggle"},React.createElement("span",{className:"switch"+(l[u]?" on":""),onClick:()=>f({[u]:!l[u]})},React.createElement("span",null)),p(w))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>y("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>y("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>y("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>y("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:s,opts:b,lang:c})))))}function buildNoteHTML(n,e){const i=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif",o=e.page||{},a=pageDimsMM(o),r=o.mt!=null?o.mt:20,d=o.mr!=null?o.mr:18,s=o.mb!=null?o.mb:20,c=o.ml!=null?o.ml:18,p=Math.round(a.w/5.4)+"em",h=Math.round(Math.min(c,d)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${r}mm ${d}mm ${s}mm ${c}mm; }
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
      .n-wrap { max-width: ${p}; margin: 0 auto; padding: 0 ${h}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${n.title}</h1></div>`:""}${chapterBody(n.content||"")}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:i,lang:o,defaultFont:a,page:r}){const[d,s]=useDismiss(e),c=T(o||"en"),[p,h]=useState({font:a||"book",titlePage:!0}),l=b=>h(m=>({...m,...b})),x={...p,page:r},f=useMemo(()=>buildNoteHTML(n,x),[n,p,r]);function v(b){const m=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(b==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(n,x))){i(c("exp_toast_pdf"));return}downloadBlob(m+".html","text/html;charset=utf-8",buildNoteHTML(n,x)),i(c("exp_toast_pdf_tauri"));return}const g=window.open("","_blank");if(!g){i(c("exp_err_popup"));return}g.document.write(buildNoteHTML(n,x)),g.document.close(),setTimeout(()=>{g.focus(),g.print()},700),i(c("exp_toast_pdf"))}else if(b==="docx")try{downloadBlob(m+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:p.titlePage?n.title:"",sections:[{html:n.content||""}],font:p.font,page:r||null})),i(c("exp_toast_docx_real"))}catch{i(c("exp_err_docx"))}else b==="txt"?(downloadBlob(m+".txt","text/plain;charset=utf-8",htmlToText(n.content)),i(c("exp_toast_txt"))):b==="md"&&(downloadBlob(m+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),i(c("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+d,onMouseDown:s},React.createElement("div",{className:"modal export-modal",onMouseDown:b=>b.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},c("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>l({font:a||"book",titlePage:!0}),title:c("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",c("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:s},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},c("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(p.titlePage?" on":""),onClick:()=>l({titlePage:!p.titlePage})},React.createElement("span",null)),c("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>v("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>v("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>v("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>v("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:f})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
