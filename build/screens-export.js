function BookPreview({html:a,title:e,edition:n,lang:i}){const r=useRef(null),s=useRef(null),[o,l]=useState(!1),[b,m]=useState(!1),d=T(i||"en"),{headings:v,htmlWithIds:p}=useMemo(()=>{const g=document.createElement("div");g.innerHTML=chapterBody(a||"");const x=[];let c=0;return g.querySelectorAll("h1, h2, h3").forEach(f=>{const w="bh-"+c++;f.id=w,x.push({id:w,level:parseInt(f.tagName[1]),text:f.textContent.trim()})}),{headings:x,htmlWithIds:g.innerHTML}},[a]),u=useMemo(()=>{const g=document.createElement("div");g.innerHTML=a||"";const x=(g.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(x/280))},[a]);useEffect(()=>{const g=r.current;if(!g)return;const x=()=>l(g.scrollTop>320);return g.addEventListener("scroll",x,{passive:!0}),()=>g.removeEventListener("scroll",x)},[]);function h(){r.current&&r.current.scrollTo({top:0,behavior:"smooth"})}function N(g){const x=s.current&&s.current.querySelector("#"+g);if(!x||!r.current)return;const c=r.current.getBoundingClientRect().top,f=x.getBoundingClientRect().top;r.current.scrollBy({top:f-c-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:r},v.length>0&&React.createElement("div",{className:"preview-anchors"+(b?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>m(g=>!g)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,d(b?"anchors_hide":"anchors_show"))),b&&React.createElement("nav",{className:"anchors-nav"},v.map(g=>React.createElement("button",{key:g.id,className:"anchor-item anchor-item--h"+g.level,onClick:()=>{N(g.id),m(!1)}},g.text)))),React.createElement("div",{className:"book book--"+n},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:s,dangerouslySetInnerHTML:{__html:p}})),React.createElement("div",{className:"book-foot mono"},d("preview_label")," \xB7 \u2248\u2009",u,"\u2009",i==="ru"?"\u0441\u0442\u0440.":"p.")),o&&React.createElement("button",{className:"scroll-top-btn",onClick:h,title:d("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(a){const e=document.createElement("div");e.innerHTML=a||"";const n=e.querySelector(".fn-defs");let i="";if(n){const r=Array.prototype.map.call(n.children,(s,o)=>o+1+". "+(s.textContent||""));n.remove(),r.length&&(i=`

---
`+r.join(`
`))}return((e.textContent||"")+i).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(a){return String(a==null?"":a).replace(/[\\*_~[\]]/g,e=>"\\"+e)}function inlineToMd(a){let e="";return a.childNodes.forEach(n=>{if(n.nodeType===3){e+=mdEscapeText(n.textContent);return}if(n.nodeType!==1)return;const i=n.tagName.toLowerCase();if(i==="br"){e+=`  
`;return}if(i==="sup"&&n.classList&&n.classList.contains("fn")){e+="[^"+(n.textContent||"").trim()+"]";return}const r=inlineToMd(n);i==="strong"||i==="b"?e+="**"+r+"**":i==="em"||i==="i"?e+="*"+r+"*":i==="u"?e+="<u>"+r+"</u>":i==="s"||i==="strike"?e+="~~"+r+"~~":i==="a"?e+="["+r+"]("+(n.getAttribute("href")||"")+")":e+=r}),e}function htmlToMd(a){const e=document.createElement("div");e.innerHTML=a||"";let n="";const i=[],r=e.querySelector(".fn-defs");return r&&(Array.prototype.forEach.call(r.children,s=>i.push((s.textContent||"").replace(/\s*\n\s*/g," "))),r.remove()),e.childNodes.forEach(s=>{if(s.nodeType===3){n+=mdEscapeText(s.textContent);return}const o=s.tagName?s.tagName.toLowerCase():"",l=s.getAttribute&&s.getAttribute("class")||"";if(o==="hr"&&l.indexOf("page-break")>=0){n+=`
<!-- page-break -->

`;return}if(o==="hr"&&l.indexOf("scene-sep")>=0){n+=`
<!-- scene: `+(s.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(s.getAttribute("data-s")||"draft")+` -->

`;return}if(o==="figure"&&l.indexOf("epigraph")>=0){const d=s.querySelector("blockquote"),v=s.querySelector("figcaption"),p=d?inlineToMd(d):"",u=v?inlineToMd(v):"";if(!p.trim()&&!u.trim())return;n+=`
::: epigraph
`+p+`
`+(u.trim()?"-- "+u+`
`:"")+`:::

`;return}if(o==="aside"&&l.indexOf("note")>=0){const d=inlineToMd(s);if(!d.trim())return;n+=`
::: note
`+d+`
:::

`;return}const b=inlineToMd(s);if(!b.trim()&&o!=="hr")return;const m=l.match(/\bal-(l|c|r|j)\b/);if(o==="h1")n+=`
# `+b+`

`;else if(o==="h2")n+=`
## `+b+`

`;else if(o==="h3")n+=`
### `+b+`

`;else if(o==="blockquote")n+="> "+b.replace(/\n/g,`
> `)+`

`;else if(o==="hr")n+=`
---

`;else if(o==="ul")s.querySelectorAll("li").forEach(d=>n+="- "+inlineToMd(d)+`
`),n+=`
`;else if(o==="ol"){let d=1;s.querySelectorAll("li").forEach(v=>n+=d+++". "+inlineToMd(v)+`
`),n+=`
`}else o==="p"&&m?n+='<p class="al-'+m[1]+'">'+b.replace(/\n/g," ")+`</p>

`:n+=b+`

`}),n=n.replace(/\n{3,}/g,`

`).trim(),i.length&&(n+=`

`+i.map((s,o)=>"[^"+(o+1)+"]: "+s).join(`
`)),n}function splitNotes(a){const e=document.createElement("div");e.innerHTML=a||"";const n=e.querySelector(".fn-defs"),i=[];return n&&(Array.prototype.forEach.call(n.children,r=>i.push(r.textContent||"")),n.remove()),{html:e.innerHTML,notes:i}}function printHTML(a){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const n=()=>setTimeout(()=>e.remove(),6e4);try{const i=e.contentDocument;i.open(),i.write(a),i.close();const r=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}n()};return i.readyState==="complete"?setTimeout(r,500):e.contentWindow.addEventListener("load",()=>setTimeout(r,500)),!0}catch{return e.remove(),!1}}function downloadBlob(a,e,n){const i=window.__TAURI__;if(i&&i.dialog&&i.fs){const l=n instanceof Uint8Array?n:new TextEncoder().encode(n),b=a.includes(".")?a.slice(a.lastIndexOf(".")+1):"";i.dialog.save({defaultPath:a,filters:b?[{name:b.toUpperCase(),extensions:[b]}]:void 0}).then(m=>m&&i.fs.writeFile(m,l)).catch(()=>{});return}const r=new Blob([n],{type:e}),s=URL.createObjectURL(r),o=document.createElement("a");o.href=s,o.download=a,document.body.appendChild(o),o.click(),o.remove(),setTimeout(()=>URL.revokeObjectURL(s),1500)}const BLOCK_CSS=`
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
`;function escText(a){return String(a==null?"":a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(a){const{html:e,notes:n}=splitNotes(a);return n.length?e+'<ol class="b-notes">'+n.map(i=>"<li>"+escText(i)+"</li>").join("")+"</ol>":e}const MARGINS={narrow:"14mm",normal:"22mm",wide:"32mm"},SCREEN_PADS={narrow:"12px",normal:"28px",wide:"60px"},PAPER={a4:{label:"A4",size:"210mm 297mm",em:"38em"},letter:{label:"Letter",size:"8.5in 11in",em:"40em"},a5:{label:"A5",size:"148mm 210mm",em:"28em"},b5:{label:"B5",size:"176mm 250mm",em:"33em"},a6:{label:"A6",size:"105mm 148mm",em:"22em"}};function buildBookHTML(a,e){const n=a.chapters.filter(o=>e.include[o.id]!==!1),i=e.page||null,r=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let s="";return e.titlePage&&(s+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${a.title}</h1>${a.synopsis?`<p class="b-syn">${a.synopsis}</p>`:""}</section>`),e.toc&&(s+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${n.map(o=>`<li><span>${o.title}</span></li>`).join("")}</ol></section>`),n.forEach((o,l)=>{s+=`<section class="b-chap${e.merge?" merged":""}">${chapterBody(o.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${a.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${r}; font-size: 12pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
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
  </style></head><body>${s}</body></html>`}function buildPlain(a,e,n){const i=a.chapters.filter(s=>e.include[s.id]!==!1);let r="";return e.titlePage&&(r+=a.title.toUpperCase()+`
`+(a.synopsis||"")+`


`),e.toc&&(r+=t("toc_title",e.lang||"en").toUpperCase()+`
`+i.map((s,o)=>o+1+". "+s.title).join(`
`)+`


`),i.forEach(s=>{r+=(n?htmlToMd(s.content):htmlToText(s.content))+`


`}),r.trim()+`
`}function buildBookDocx(a,e){const n=a.chapters.filter(r=>e.include[r.id]!==!1),i=[];return e.toc&&i.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+n.map(r=>"<li>"+r.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage&&!e.merge}),n.forEach((r,s)=>{i.push({html:r.content||"",pageBreakBefore:!e.merge&&(s>0||e.toc||e.titlePage)})}),SipruFormats.buildDocx({title:e.titlePage?a.title:"",subtitle:e.titlePage&&a.synopsis||"",sections:i,paperSize:e.paperSize,margin:e.margin,font:e.font,page:e.page||null,bookTitle:a.title,author:e.author||""})}function ExportModal({store:a,projectId:e,onClose:n,initialFormat:i,onToast:r}){const[s,o]=useDismiss(n),l=a.get().projects.find(c=>c.id===e),b=a.get().user&&a.get().user.lang||"en",m=T(b),[d,v]=useState(()=>({merge:!1,titlePage:!0,toc:!0,margin:"normal",font:"book",leading:1.7,paperSize:"a4",lang:b,include:{}})),p=c=>v(f=>({...f,...c}));if(!l)return null;const u=a.resolvePage(l.page),h={...d,page:u,author:a.get().user&&a.get().user.name||""},N=useMemo(()=>buildBookHTML(l,h),[l,d,JSON.stringify(u)]),g=l.chapters.filter(c=>d.include[c.id]!==!1).length;function x(c){const f=l.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(c==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(l,h))){r(m("exp_toast_pdf"));return}downloadBlob(f+".html","text/html;charset=utf-8",buildBookHTML(l,h)),r(m("exp_toast_pdf_tauri"));return}const w=window.open("","_blank");if(!w){r(m("exp_err_popup"));return}w.document.write(buildBookHTML(l,h)),w.document.close(),setTimeout(()=>{w.focus(),w.print()},700),r(m("exp_toast_pdf"))}else if(c==="docx")try{downloadBlob(f+".docx",SipruFormats.DOCX_MIME,buildBookDocx(l,h)),r(m("exp_toast_docx_real"))}catch{r(m("exp_err_docx"))}else c==="txt"?(downloadBlob(f+".txt","text/plain;charset=utf-8",buildPlain(l,h,!1)),r(m("exp_toast_txt"))):c==="md"&&(downloadBlob(f+".md","text/markdown;charset=utf-8",buildPlain(l,h,!0)),r(m("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+s,onMouseDown:o},React.createElement("div",{className:"modal export-modal",onMouseDown:c=>c.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},m("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},l.title)),React.createElement("button",{className:"icon-btn",onClick:o},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_chapters_label")," \xB7 ",g," ",m("exp_of")," ",l.chapters.length),React.createElement("ul",{className:"exp-chaps"},l.chapters.map((c,f)=>React.createElement("li",{key:c.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:d.include[c.id]!==!1,onChange:w=>p({include:{...d.include,[c.id]:w.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(f+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},c.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"],["merge","exp_merge"]].map(([c,f])=>React.createElement("label",{key:c,className:"exp-toggle"},React.createElement("span",{className:"switch"+(d[c]?" on":""),onClick:()=>p({[c]:!d[c]})},React.createElement("span",null)),m(f)))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_section_typeset")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([c,f])=>React.createElement("button",{key:c,className:"seg-btn"+(d.paperSize===c?" on":""),onClick:()=>p({paperSize:c})},f.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([c,f])=>React.createElement("button",{key:c,className:"seg-btn"+(d.margin===c?" on":""),onClick:()=>p({margin:c})},m(f))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([c,f])=>React.createElement("button",{key:c,className:"seg-btn"+(d.font===c?" on":""),onClick:()=>p({font:c})},f)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:d.leading,onChange:c=>p({leading:parseFloat(c.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},d.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>x("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>x("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>x("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>x("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:N})))))}function buildNoteHTML(a,e){const n=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";return`<!doctype html><html><head><meta charset="utf-8"><title>${a.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${n}; font-size: 12pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
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
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${a.title}</h1></div>`:""}${chapterBody(a.content||"")}</div></body></html>`}function NoteExportModal({note:a,onClose:e,onToast:n,lang:i}){const[r,s]=useDismiss(e),o=T(i||"en"),[l,b]=useState({margin:"normal",font:"book",leading:1.7,paperSize:"a4",titlePage:!0}),m=p=>b(u=>({...u,...p})),d=useMemo(()=>buildNoteHTML(a,l),[a,l]);function v(p){const u=a.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(p==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(a,l))){n(o("exp_toast_pdf"));return}downloadBlob(u+".html","text/html;charset=utf-8",buildNoteHTML(a,l)),n(o("exp_toast_pdf_tauri"));return}const h=window.open("","_blank");if(!h){n(o("exp_err_popup"));return}h.document.write(buildNoteHTML(a,l)),h.document.close(),setTimeout(()=>{h.focus(),h.print()},700),n(o("exp_toast_pdf"))}else if(p==="docx")try{downloadBlob(u+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:l.titlePage?a.title:"",sections:[{html:a.content||""}],paperSize:l.paperSize,margin:l.margin,font:l.font})),n(o("exp_toast_docx_real"))}catch{n(o("exp_err_docx"))}else p==="txt"?(downloadBlob(u+".txt","text/plain;charset=utf-8",htmlToText(a.content)),n(o("exp_toast_txt"))):p==="md"&&(downloadBlob(u+".md","text/markdown;charset=utf-8","# "+a.title+`

`+htmlToMd(a.content)),n(o("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+r,onMouseDown:s},React.createElement("div",{className:"modal export-modal",onMouseDown:p=>p.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},o("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},a.title)),React.createElement("button",{className:"icon-btn",onClick:s},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},o("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(l.titlePage?" on":""),onClick:()=>m({titlePage:!l.titlePage})},React.createElement("span",null)),o("exp_note_title_opt"))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},o("exp_section_layout")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},o("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([p,u])=>React.createElement("button",{key:p,className:"seg-btn"+(l.paperSize===p?" on":""),onClick:()=>m({paperSize:p})},u.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},o("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([p,u])=>React.createElement("button",{key:p,className:"seg-btn"+(l.margin===p?" on":""),onClick:()=>m({margin:p})},o(u))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},o("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([p,u])=>React.createElement("button",{key:p,className:"seg-btn"+(l.font===p?" on":""),onClick:()=>m({font:p})},u)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},o("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:l.leading,onChange:p=>m({leading:parseFloat(p.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},l.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>v("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>v("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>v("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>v("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:d})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
