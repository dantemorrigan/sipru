function BookPreview({html:n,title:e,edition:a,lang:i}){const o=useRef(null),l=useRef(null),[r,s]=useState(!1),[h,m]=useState(!1),f=T(i||"en"),{headings:p,htmlWithIds:d}=useMemo(()=>{const u=document.createElement("div");u.innerHTML=chapterBody(n||"");const x=[];let c=0;return u.querySelectorAll("h1, h2, h3").forEach(v=>{const w="bh-"+c++;v.id=w,x.push({id:w,level:parseInt(v.tagName[1]),text:v.textContent.trim()})}),{headings:x,htmlWithIds:u.innerHTML}},[n]),g=useMemo(()=>{const u=document.createElement("div");u.innerHTML=n||"";const x=(u.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(x/280))},[n]);useEffect(()=>{const u=o.current;if(!u)return;const x=()=>s(u.scrollTop>320);return u.addEventListener("scroll",x,{passive:!0}),()=>u.removeEventListener("scroll",x)},[]);function b(){o.current&&o.current.scrollTo({top:0,behavior:"smooth"})}function y(u){const x=l.current&&l.current.querySelector("#"+u);if(!x||!o.current)return;const c=o.current.getBoundingClientRect().top,v=x.getBoundingClientRect().top;o.current.scrollBy({top:v-c-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:o},p.length>0&&React.createElement("div",{className:"preview-anchors"+(h?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>m(u=>!u)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,f(h?"anchors_hide":"anchors_show"))),h&&React.createElement("nav",{className:"anchors-nav"},p.map(u=>React.createElement("button",{key:u.id,className:"anchor-item anchor-item--h"+u.level,onClick:()=>{y(u.id),m(!1)}},u.text)))),React.createElement("div",{className:"book book--"+a},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:l,dangerouslySetInnerHTML:{__html:d}})),React.createElement("div",{className:"book-foot mono"},f("preview_label")," \xB7 \u2248\u2009",g,"\u2009",i==="ru"?"\u0441\u0442\u0440.":"p.")),r&&React.createElement("button",{className:"scroll-top-btn",onClick:b,title:f("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(n){const e=document.createElement("div");e.innerHTML=n||"";const a=e.querySelector(".fn-defs");let i="";if(a){const o=Array.prototype.map.call(a.children,(l,r)=>r+1+". "+(l.textContent||""));a.remove(),o.length&&(i=`

---
`+o.join(`
`))}return((e.textContent||"")+i).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(n){return String(n==null?"":n).replace(/[\\*_~[\]]/g,e=>"\\"+e)}function inlineToMd(n){let e="";return n.childNodes.forEach(a=>{if(a.nodeType===3){e+=mdEscapeText(a.textContent);return}if(a.nodeType!==1)return;const i=a.tagName.toLowerCase();if(i==="br"){e+=`  
`;return}if(i==="sup"&&a.classList&&a.classList.contains("fn")){e+="[^"+(a.textContent||"").trim()+"]";return}const o=inlineToMd(a);i==="strong"||i==="b"?e+="**"+o+"**":i==="em"||i==="i"?e+="*"+o+"*":i==="u"?e+="<u>"+o+"</u>":i==="s"||i==="strike"?e+="~~"+o+"~~":i==="a"?e+="["+o+"]("+(a.getAttribute("href")||"")+")":e+=o}),e}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let a="";const i=[],o=e.querySelector(".fn-defs");return o&&(Array.prototype.forEach.call(o.children,l=>i.push((l.textContent||"").replace(/\s*\n\s*/g," "))),o.remove()),e.childNodes.forEach(l=>{if(l.nodeType===3){a+=mdEscapeText(l.textContent);return}const r=l.tagName?l.tagName.toLowerCase():"",s=l.getAttribute&&l.getAttribute("class")||"";if(r==="hr"&&s.indexOf("page-break")>=0){a+=`
<!-- page-break -->

`;return}if(r==="hr"&&s.indexOf("scene-sep")>=0){a+=`
<!-- scene: `+(l.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(l.getAttribute("data-s")||"draft")+` -->

`;return}if(r==="figure"&&s.indexOf("epigraph")>=0){const f=l.querySelector("blockquote"),p=l.querySelector("figcaption"),d=f?inlineToMd(f):"",g=p?inlineToMd(p):"";if(!d.trim()&&!g.trim())return;a+=`
::: epigraph
`+d+`
`+(g.trim()?"-- "+g+`
`:"")+`:::

`;return}if(r==="aside"&&s.indexOf("note")>=0){const f=inlineToMd(l);if(!f.trim())return;a+=`
::: note
`+f+`
:::

`;return}const h=inlineToMd(l);if(!h.trim()&&r!=="hr")return;const m=s.match(/\bal-(l|c|r|j)\b/);if(r==="h1")a+=`
# `+h+`

`;else if(r==="h2")a+=`
## `+h+`

`;else if(r==="h3")a+=`
### `+h+`

`;else if(r==="blockquote")a+="> "+h.replace(/\n/g,`
> `)+`

`;else if(r==="hr")a+=`
---

`;else if(r==="ul")l.querySelectorAll("li").forEach(f=>a+="- "+inlineToMd(f)+`
`),a+=`
`;else if(r==="ol"){let f=1;l.querySelectorAll("li").forEach(p=>a+=f+++". "+inlineToMd(p)+`
`),a+=`
`}else r==="p"&&m?a+='<p class="al-'+m[1]+'">'+h.replace(/\n/g," ")+`</p>

`:a+=h+`

`}),a=a.replace(/\n{3,}/g,`

`).trim(),i.length&&(a+=`

`+i.map((l,r)=>"[^"+(r+1)+"]: "+l).join(`
`)),a}function splitNotes(n){const e=document.createElement("div");e.innerHTML=n||"";const a=e.querySelector(".fn-defs"),i=[];return a&&(Array.prototype.forEach.call(a.children,o=>i.push(o.textContent||"")),a.remove()),{html:e.innerHTML,notes:i}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAPER_MM={a4:{w:210,h:297},letter:{w:215.9,h:279.4},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148}},MARGIN_MM={narrow:14,normal:22,wide:32},PAPER_FONT_PT={a4:12,letter:12,b5:11.5,a5:10.5,a6:8.5};function exportPageGeom(n){const e=PAPER_MM[n.paperSize]||PAPER_MM.a4,a=MARGIN_MM[n.margin]!=null?MARGIN_MM[n.margin]:MARGIN_MM.normal,i=n.page||{};return{size:"custom",orient:"portrait",w:e.w,h:e.h,mt:a,mr:a,mb:a,ml:a,fontSize:PAPER_FONT_PT[n.paperSize]||12,leading:n.leading||1.7,align:i.align||"justify",indent:i.indent!=null?i.indent:1.5,padL:i.padL||0,padR:i.padR||0,spaceBefore:i.spaceBefore||0,spaceAfter:i.spaceAfter!=null?i.spaceAfter:.6,hyphens:i.hyphens!==!1,hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1}}function StaticSheet({geom:n,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:n.pageW,height:n.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:n.pageW,height:n.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:n.mt,left:n.ml,width:n.contentW,height:n.contentH}},e))}function PaginatedChapter({html:n,geom:e,title:a}){const i=useRef(null),o=useRef([]),l=useRef(0),[r,s]=useState([[]]);function h(){const g=i.current;if(!g)return;const b=footnoteList(g),y={};b.forEach(x=>{y[x.id]=x});const u=paginateArea(g,e,o.current);s(u.notes.map(x=>x.map(c=>y[c]).filter(Boolean)))}useEffect(()=>{i.current&&(i.current.innerHTML=n||""),o.current=[],l.current=0,h()},[n,e]);function m(g){const b=o.current;let y=!1;for(let u=0;u<g.length;u++){const x=g[u]?g[u]+Math.round(12*e.scale):0;Math.abs((b[u]||0)-x)>2&&(b[u]=x,y=!0)}b.length>g.length&&(b.length=g.length,y=!0),y&&l.current<3?(l.current++,h()):l.current=0}const p=r.length*(e.pageH+e.gap)-e.gap,d={width:e.pageW,height:p,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:d},React.createElement(PageLayer,{pages:r,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:m}),React.createElement("div",{ref:i,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:n,opts:e,lang:a}){const i=T(a||"en"),o=useRef(null),[l,r]=useState(0);useEffect(()=>{const p=o.current;if(!p)return;const d=()=>{p.clientWidth&&r(Math.max(160,p.clientWidth-48))};d();let g=null;return window.ResizeObserver?(g=new ResizeObserver(d),g.observe(p)):window.addEventListener("resize",d),()=>{g?g.disconnect():window.removeEventListener("resize",d)}},[]);const s=useMemo(()=>exportPageGeom(e),[e.paperSize,e.margin,e.leading,JSON.stringify(e.page)]),h=useMemo(()=>{const p=pageGeometry(s,l);return p.leading=s.leading,p.align=s.align,p.indent=s.indent,p.padL=s.padL,p.padR=s.padR,p.spaceBefore=s.spaceBefore,p.spaceAfter=s.spaceAfter,p.hyphens=s.hyphens,p.pg=s,p},[s,l]),m=n.chapters.filter(p=>e.include[p.id]!==!1),f=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:o,style:{"--ed-font":f}},e.titlePage&&React.createElement(StaticSheet,{geom:h},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title),n.synopsis&&React.createElement("p",{className:"b-syn"},n.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:h},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,i("toc_title")),React.createElement("ol",null,m.map(p=>React.createElement("li",{key:p.id},p.title))))),m.map(p=>React.createElement(PaginatedChapter,{key:p.id,html:p.content||"",geom:h,title:p.title})),!m.length&&React.createElement("div",{className:"exp-pages-empty mono"},i("exp_of")))}function printHTML(n){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const a=()=>setTimeout(()=>e.remove(),6e4);try{const i=e.contentDocument;i.open(),i.write(n),i.close();const o=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}a()};return i.readyState==="complete"?setTimeout(o,500):e.contentWindow.addEventListener("load",()=>setTimeout(o,500)),!0}catch{return e.remove(),!1}}function downloadBlob(n,e,a){const i=window.__TAURI__;if(i&&i.dialog&&i.fs){const s=a instanceof Uint8Array?a:new TextEncoder().encode(a),h=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";i.dialog.save({defaultPath:n,filters:h?[{name:h.toUpperCase(),extensions:[h]}]:void 0}).then(m=>m&&i.fs.writeFile(m,s)).catch(()=>{});return}const o=new Blob([a],{type:e}),l=URL.createObjectURL(o),r=document.createElement("a");r.href=l,r.download=n,document.body.appendChild(r),r.click(),r.remove(),setTimeout(()=>URL.revokeObjectURL(l),1500)}const BLOCK_CSS=`
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
`;function escText(n){return String(n==null?"":n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(n){const{html:e,notes:a}=splitNotes(n);return a.length?e+'<ol class="b-notes">'+a.map(i=>"<li>"+escText(i)+"</li>").join("")+"</ol>":e}const MARGINS={narrow:"14mm",normal:"22mm",wide:"32mm"},SCREEN_PADS={narrow:"12px",normal:"28px",wide:"60px"},PAPER={a4:{label:"A4",size:"210mm 297mm",em:"38em"},letter:{label:"Letter",size:"8.5in 11in",em:"40em"},a5:{label:"A5",size:"148mm 210mm",em:"28em"},b5:{label:"B5",size:"176mm 250mm",em:"33em"},a6:{label:"A6",size:"105mm 148mm",em:"22em"}};function buildBookHTML(n,e){const a=n.chapters.filter(r=>e.include[r.id]!==!1),i=e.page||null,o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let l="";return e.titlePage&&(l+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(l+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${a.map(r=>`<li><span>${r.title}</span></li>`).join("")}</ol></section>`),a.forEach((r,s)=>{l+=`<section class="b-chap${e.merge?" merged":""}">${chapterBody(r.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${o}; font-size: ${PAPER_FONT_PT[e.paperSize]||12}pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
    .b-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; }
    .b-title h1 { font-size: 30pt; line-height: 1.06; margin: 18px 0 16px; font-weight: 600; letter-spacing: -.015em; }
    .b-syn { font-style: italic; color: #6b6457; font-size: 13pt; margin: 0 auto; max-width: 30em; }
    .b-toc h2 { font-size: 15pt; font-weight: 600; margin: 0 0 .9em; letter-spacing: -.01em; }
    .b-toc ol { line-height: 2.05; padding-left: 1.3em; color: #3a382f; margin: 0; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 ${i?i.spaceAfter:0}em; text-indent: ${i?i.indent:1.5}em; text-align: ${i?i.align==="justify"?"justify":i.align:"justify"}; }
    h1 + p, h2 + p, h3 + p, blockquote + p, ul + p, ol + p, hr + p, p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; text-align: left; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "\u2736"; color: #c2542f; }
${BLOCK_CSS}
    /* on-screen preview: a single clean, centred book column */
    @media screen {
      body { padding: 60px 0 80px; }
      body > section { max-width: ${(PAPER[e.paperSize]||PAPER.a4).em}; margin: 0 auto; padding: 0 ${SCREEN_PADS[e.margin]}; }
      .b-title { text-align: center; padding-bottom: 46px; margin-bottom: 46px; border-bottom: ${e.merge?"none":"1px solid #e9e3d5"}; }
      .b-toc { padding-bottom: 40px; margin-bottom: ${e.merge?"24px":"40px"}; border-bottom: ${e.merge?"none":"1px solid #e9e3d5"}; }
      .b-chap + .b-chap { margin-top: ${e.merge?"0":"44px"}; }
      .b-chap h1 { padding-top: ${e.merge?"0":"26px"}; }
      .b-chap:first-of-type h1 { padding-top: 0; }
    }
    /* print / PDF: real pagination */
    @media print {
      .b-title { text-align: center; padding-top: 34vh; page-break-after: always; }
      .b-toc { page-break-after: always; padding-top: 12%; }
      .b-chap { ${e.merge?"page-break-before: avoid; break-before: avoid;":"page-break-before: always; break-before: page;"} }
      .b-chap:first-of-type { page-break-before: avoid; break-before: avoid; }
      h1 { ${e.merge?"":"padding-top: 6%;"} }
    }
  </style></head><body>${l}</body></html>`}function buildPlain(n,e,a){const i=n.chapters.filter(l=>e.include[l.id]!==!1);let o="";return e.titlePage&&(o+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(o+=t("toc_title",e.lang||"en").toUpperCase()+`
`+i.map((l,r)=>r+1+". "+l.title).join(`
`)+`


`),i.forEach(l=>{o+=(a?htmlToMd(l.content):htmlToText(l.content))+`


`}),o.trim()+`
`}function buildBookDocx(n,e){const a=n.chapters.filter(o=>e.include[o.id]!==!1),i=[];return e.toc&&i.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+a.map(o=>"<li>"+o.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage&&!e.merge}),a.forEach((o,l)=>{i.push({html:o.content||"",pageBreakBefore:!e.merge&&(l>0||e.toc||e.titlePage)})}),SipruFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:i,paperSize:e.paperSize,margin:e.margin,font:e.font,page:e.page||null,bookTitle:n.title,author:e.author||""})}function ExportModal({store:n,projectId:e,onClose:a,initialFormat:i,onToast:o}){const[l,r]=useDismiss(a),s=n.get().projects.find(c=>c.id===e),h=n.get().user&&n.get().user.lang||"en",m=T(h),[f,p]=useState(()=>({merge:!1,titlePage:!0,toc:!0,margin:"normal",font:"book",leading:1.7,paperSize:"a4",lang:h,include:{}})),d=c=>p(v=>({...v,...c}));if(!s)return null;const g=n.resolvePage(s.page),b={...f,page:g,author:n.get().user&&n.get().user.name||""},y=useMemo(()=>buildBookHTML(s,b),[s,f,JSON.stringify(g)]),u=s.chapters.filter(c=>f.include[c.id]!==!1).length;function x(c){const v=s.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(c==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(s,b))){o(m("exp_toast_pdf"));return}downloadBlob(v+".html","text/html;charset=utf-8",buildBookHTML(s,b)),o(m("exp_toast_pdf_tauri"));return}const w=window.open("","_blank");if(!w){o(m("exp_err_popup"));return}w.document.write(buildBookHTML(s,b)),w.document.close(),setTimeout(()=>{w.focus(),w.print()},700),o(m("exp_toast_pdf"))}else if(c==="docx")try{downloadBlob(v+".docx",SipruFormats.DOCX_MIME,buildBookDocx(s,b)),o(m("exp_toast_docx_real"))}catch{o(m("exp_err_docx"))}else c==="txt"?(downloadBlob(v+".txt","text/plain;charset=utf-8",buildPlain(s,b,!1)),o(m("exp_toast_txt"))):c==="md"&&(downloadBlob(v+".md","text/markdown;charset=utf-8",buildPlain(s,b,!0)),o(m("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+l,onMouseDown:r},React.createElement("div",{className:"modal export-modal",onMouseDown:c=>c.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},m("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},s.title)),React.createElement("button",{className:"icon-btn",onClick:r},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_chapters_label")," \xB7 ",u," ",m("exp_of")," ",s.chapters.length),React.createElement("ul",{className:"exp-chaps"},s.chapters.map((c,v)=>React.createElement("li",{key:c.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:f.include[c.id]!==!1,onChange:w=>d({include:{...f.include,[c.id]:w.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(v+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},c.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"],["merge","exp_merge"]].map(([c,v])=>React.createElement("label",{key:c,className:"exp-toggle"},React.createElement("span",{className:"switch"+(f[c]?" on":""),onClick:()=>d({[c]:!f[c]})},React.createElement("span",null)),m(v)))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_section_typeset")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([c,v])=>React.createElement("button",{key:c,className:"seg-btn"+(f.paperSize===c?" on":""),onClick:()=>d({paperSize:c})},v.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([c,v])=>React.createElement("button",{key:c,className:"seg-btn"+(f.margin===c?" on":""),onClick:()=>d({margin:c})},m(v))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([c,v])=>React.createElement("button",{key:c,className:"seg-btn"+(f.font===c?" on":""),onClick:()=>d({font:c})},v)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:f.leading,onChange:c=>d({leading:parseFloat(c.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},f.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>x("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>x("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>x("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>x("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:s,opts:b,lang:h})))))}function buildNoteHTML(n,e){const a=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${a}; font-size: ${PAPER_FONT_PT[e.paperSize]||12}pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
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
      .n-wrap { max-width: ${(PAPER[e.paperSize]||PAPER.a4).em}; margin: 0 auto; padding: 0 ${SCREEN_PADS[e.margin]}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${n.title}</h1></div>`:""}${chapterBody(n.content||"")}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:a,lang:i}){const[o,l]=useDismiss(e),r=T(i||"en"),[s,h]=useState({margin:"normal",font:"book",leading:1.7,paperSize:"a4",titlePage:!0}),m=d=>h(g=>({...g,...d})),f=useMemo(()=>buildNoteHTML(n,s),[n,s]);function p(d){const g=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(d==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(n,s))){a(r("exp_toast_pdf"));return}downloadBlob(g+".html","text/html;charset=utf-8",buildNoteHTML(n,s)),a(r("exp_toast_pdf_tauri"));return}const b=window.open("","_blank");if(!b){a(r("exp_err_popup"));return}b.document.write(buildNoteHTML(n,s)),b.document.close(),setTimeout(()=>{b.focus(),b.print()},700),a(r("exp_toast_pdf"))}else if(d==="docx")try{downloadBlob(g+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:s.titlePage?n.title:"",sections:[{html:n.content||""}],paperSize:s.paperSize,margin:s.margin,font:s.font})),a(r("exp_toast_docx_real"))}catch{a(r("exp_err_docx"))}else d==="txt"?(downloadBlob(g+".txt","text/plain;charset=utf-8",htmlToText(n.content)),a(r("exp_toast_txt"))):d==="md"&&(downloadBlob(g+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),a(r("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+o,onMouseDown:l},React.createElement("div",{className:"modal export-modal",onMouseDown:d=>d.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},r("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("button",{className:"icon-btn",onClick:l},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(s.titlePage?" on":""),onClick:()=>m({titlePage:!s.titlePage})},React.createElement("span",null)),r("exp_note_title_opt"))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_section_layout")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([d,g])=>React.createElement("button",{key:d,className:"seg-btn"+(s.paperSize===d?" on":""),onClick:()=>m({paperSize:d})},g.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([d,g])=>React.createElement("button",{key:d,className:"seg-btn"+(s.margin===d?" on":""),onClick:()=>m({margin:d})},r(g))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([d,g])=>React.createElement("button",{key:d,className:"seg-btn"+(s.font===d?" on":""),onClick:()=>m({font:d})},g)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:s.leading,onChange:d=>m({leading:parseFloat(d.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},s.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>p("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>p("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>p("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>p("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:f})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
