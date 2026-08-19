function BookPreview({html:i,title:e,edition:o,lang:m}){const a=useRef(null),n=useRef(null),[p,r]=useState(!1),[d,b]=useState(!1),l=T(m||"en"),{headings:f,htmlWithIds:u}=useMemo(()=>{const c=document.createElement("div");c.innerHTML=i||"";const h=[];let w=0;return c.querySelectorAll("h1, h2, h3").forEach(v=>{const N="bh-"+w++;v.id=N,h.push({id:N,level:parseInt(v.tagName[1]),text:v.textContent.trim()})}),{headings:h,htmlWithIds:c.innerHTML}},[i]),x=useMemo(()=>{const c=document.createElement("div");c.innerHTML=i||"";const h=(c.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(h/280))},[i]);useEffect(()=>{const c=a.current;if(!c)return;const h=()=>r(c.scrollTop>320);return c.addEventListener("scroll",h,{passive:!0}),()=>c.removeEventListener("scroll",h)},[]);function s(){a.current&&a.current.scrollTo({top:0,behavior:"smooth"})}function g(c){const h=n.current&&n.current.querySelector("#"+c);if(!h||!a.current)return;const w=a.current.getBoundingClientRect().top,v=h.getBoundingClientRect().top;a.current.scrollBy({top:v-w-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:a},f.length>0&&React.createElement("div",{className:"preview-anchors"+(d?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>b(c=>!c)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,l(d?"anchors_hide":"anchors_show"))),d&&React.createElement("nav",{className:"anchors-nav"},f.map(c=>React.createElement("button",{key:c.id,className:"anchor-item anchor-item--h"+c.level,onClick:()=>{g(c.id),b(!1)}},c.text)))),React.createElement("div",{className:"book book--"+o},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:n,dangerouslySetInnerHTML:{__html:u}})),React.createElement("div",{className:"book-foot mono"},l("preview_label")," \xB7 \u2248\u2009",x,"\u2009",m==="ru"?"\u0441\u0442\u0440.":"p.")),p&&React.createElement("button",{className:"scroll-top-btn",onClick:s,title:l("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(i){const e=document.createElement("div");return e.innerHTML=i||"",(e.textContent||"").replace(/\n{3,}/g,`

`).trim()}function htmlToMd(i){const e=document.createElement("div");e.innerHTML=i||"";let o="";return e.childNodes.forEach(m=>{if(m.nodeType===3){o+=m.textContent;return}const a=m.tagName?m.tagName.toLowerCase():"",n=(m.textContent||"").trim();if(!(!n&&a!=="hr"))if(a==="h1")o+=`
# `+n+`

`;else if(a==="h2")o+=`
## `+n+`

`;else if(a==="h3")o+=`
### `+n+`

`;else if(a==="blockquote")o+="> "+n.replace(/\n/g,`
> `)+`

`;else if(a==="hr")o+=`
---

`;else if(a==="ul")m.querySelectorAll("li").forEach(p=>o+="- "+p.textContent.trim()+`
`),o+=`
`;else if(a==="ol"){let p=1;m.querySelectorAll("li").forEach(r=>o+=p+++". "+r.textContent.trim()+`
`),o+=`
`}else o+=n+`

`}),o.replace(/\n{3,}/g,`

`).trim()}function downloadBlob(i,e,o){const m=window.__TAURI__;if(m&&m.dialog&&m.fs){const r=o instanceof Uint8Array?o:new TextEncoder().encode(o),d=i.includes(".")?i.slice(i.lastIndexOf(".")+1):"";m.dialog.save({defaultPath:i,filters:d?[{name:d.toUpperCase(),extensions:[d]}]:void 0}).then(b=>b&&m.fs.writeFile(b,r)).catch(()=>{});return}const a=new Blob([o],{type:e}),n=URL.createObjectURL(a),p=document.createElement("a");p.href=n,p.download=i,document.body.appendChild(p),p.click(),p.remove(),setTimeout(()=>URL.revokeObjectURL(n),1500)}const MARGINS={narrow:"14mm",normal:"22mm",wide:"32mm"},SCREEN_PADS={narrow:"12px",normal:"28px",wide:"60px"},PAPER={a4:{label:"A4",size:"210mm 297mm",em:"38em"},letter:{label:"Letter",size:"8.5in 11in",em:"40em"},a5:{label:"A5",size:"148mm 210mm",em:"28em"},b5:{label:"B5",size:"176mm 250mm",em:"33em"},a6:{label:"A6",size:"105mm 148mm",em:"22em"}};function buildBookHTML(i,e){const o=i.chapters.filter(n=>e.include[n.id]!==!1),m=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let a="";return e.titlePage&&(a+=`<section class="b-title"><div class="b-kicker">WRITED.</div><h1>${i.title}</h1>${i.synopsis?`<p class="b-syn">${i.synopsis}</p>`:""}</section>`),e.toc&&(a+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${o.map(n=>`<li><span>${n.title}</span></li>`).join("")}</ol></section>`),o.forEach((n,p)=>{a+=`<section class="b-chap${e.merge?" merged":""}">${n.content||""}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${m}; font-size: 12pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
    .b-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; }
    .b-title h1 { font-size: 30pt; line-height: 1.06; margin: 18px 0 16px; font-weight: 600; letter-spacing: -.015em; }
    .b-syn { font-style: italic; color: #6b6457; font-size: 13pt; margin: 0 auto; max-width: 30em; }
    .b-toc h2 { font-size: 15pt; font-weight: 600; margin: 0 0 .9em; letter-spacing: -.01em; }
    .b-toc ol { line-height: 2.05; padding-left: 1.3em; color: #3a382f; margin: 0; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0; text-indent: 1.5em; text-align: justify; }
    h1 + p, h2 + p, h3 + p, blockquote + p, ul + p, ol + p, hr + p, p:first-child { text-indent: 0; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; text-align: left; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "\u2736"; color: #c2542f; }
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
  </style></head><body>${a}</body></html>`}function buildPlain(i,e,o){const m=i.chapters.filter(n=>e.include[n.id]!==!1);let a="";return e.titlePage&&(a+=i.title.toUpperCase()+`
`+(i.synopsis||"")+`


`),e.toc&&(a+=t("toc_title",e.lang||"en").toUpperCase()+`
`+m.map((n,p)=>p+1+". "+n.title).join(`
`)+`


`),m.forEach(n=>{a+=(o?htmlToMd(n.content):htmlToText(n.content))+`


`}),a.trim()+`
`}function buildBookDocx(i,e){const o=i.chapters.filter(a=>e.include[a.id]!==!1),m=[];return e.toc&&m.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+o.map(a=>"<li>"+a.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage&&!e.merge}),o.forEach((a,n)=>{m.push({html:a.content||"",pageBreakBefore:!e.merge&&(n>0||e.toc||e.titlePage)})}),WritedFormats.buildDocx({title:e.titlePage?i.title:"",subtitle:e.titlePage&&i.synopsis||"",sections:m,paperSize:e.paperSize,margin:e.margin,font:e.font})}function ExportModal({store:i,projectId:e,onClose:o,initialFormat:m,onToast:a}){const n=i.get().projects.find(s=>s.id===e),p=i.get().user&&i.get().user.lang||"en",r=T(p),[d,b]=useState(()=>({merge:!1,titlePage:!0,toc:!0,margin:"normal",font:"book",leading:1.7,paperSize:"a4",lang:p,include:{}})),l=s=>b(g=>({...g,...s}));if(!n)return null;const f=useMemo(()=>buildBookHTML(n,d),[n,d]),u=n.chapters.filter(s=>d.include[s.id]!==!1).length;function x(s){const g=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(s==="pdf"){if(window.__TAURI__){downloadBlob(g+".html","text/html;charset=utf-8",buildBookHTML(n,d)),a(r("exp_toast_pdf_tauri"));return}const c=window.open("","_blank");if(!c){a(r("exp_err_popup"));return}c.document.write(buildBookHTML(n,d)),c.document.close(),setTimeout(()=>{c.focus(),c.print()},700),a(r("exp_toast_pdf"))}else if(s==="docx")try{downloadBlob(g+".docx",WritedFormats.DOCX_MIME,buildBookDocx(n,d)),a(r("exp_toast_docx_real"))}catch{a(r("exp_err_docx"))}else s==="txt"?(downloadBlob(g+".txt","text/plain;charset=utf-8",buildPlain(n,d,!1)),a(r("exp_toast_txt"))):s==="md"&&(downloadBlob(g+".md","text/markdown;charset=utf-8",buildPlain(n,d,!0)),a(r("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim",onMouseDown:o},React.createElement("div",{className:"modal export-modal",onMouseDown:s=>s.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},r("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("button",{className:"icon-btn",onClick:o},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_chapters_label")," \xB7 ",u," ",r("exp_of")," ",n.chapters.length),React.createElement("ul",{className:"exp-chaps"},n.chapters.map((s,g)=>React.createElement("li",{key:s.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:d.include[s.id]!==!1,onChange:c=>l({include:{...d.include,[s.id]:c.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(g+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},s.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"],["merge","exp_merge"]].map(([s,g])=>React.createElement("label",{key:s,className:"exp-toggle"},React.createElement("span",{className:"switch"+(d[s]?" on":""),onClick:()=>l({[s]:!d[s]})},React.createElement("span",null)),r(g)))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_section_typeset")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([s,g])=>React.createElement("button",{key:s,className:"seg-btn"+(d.paperSize===s?" on":""),onClick:()=>l({paperSize:s})},g.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([s,g])=>React.createElement("button",{key:s,className:"seg-btn"+(d.margin===s?" on":""),onClick:()=>l({margin:s})},r(g))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([s,g])=>React.createElement("button",{key:s,className:"seg-btn"+(d.font===s?" on":""),onClick:()=>l({font:s})},g)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:d.leading,onChange:s=>l({leading:parseFloat(s.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},d.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>x("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>x("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>x("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>x("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:f})))))}function buildNoteHTML(i,e){const o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";return`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${o}; font-size: 12pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
    h1 { font-size: 21pt; font-weight: 600; margin: 0 0 .8em; letter-spacing: -.01em; }
    h2 { font-size: 15pt; font-weight: 600; margin: 1.3em 0 .4em; }
    h3 { font-size: 12.5pt; font-weight: 600; margin: 1.1em 0 .3em; }
    p { margin: 0 0 .8em; }
    blockquote { margin: 1.1em 1.6em; font-style: italic; color: #555; border-left: 3px solid #c2542f; padding-left: 1em; }
    ul, ol { padding-left: 1.5em; margin: .4em 0; } li { margin-bottom: .3em; }
    hr { border: none; text-align: center; margin: 1.6em 0; }
    hr:after { content: "\u2736"; color: #c2542f; }
    .n-head { margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #e9e3d5; }
    .n-kicker { font-family: 'JetBrains Mono', monospace; letter-spacing: .42em; font-size: 9pt; color: #c2542f; text-transform: uppercase; margin-bottom: 10px; }
    .n-title { font-size: 26pt; font-weight: 600; letter-spacing: -.015em; line-height: 1.1; margin: 0; }
    @media screen {
      body { padding: 60px 0 80px; }
      .n-wrap { max-width: ${(PAPER[e.paperSize]||PAPER.a4).em}; margin: 0 auto; padding: 0 ${SCREEN_PADS[e.margin]}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">WRITED.</div><h1 class="n-title">${i.title}</h1></div>`:""}${i.content||""}</div></body></html>`}function NoteExportModal({note:i,onClose:e,onToast:o,lang:m}){const a=T(m||"en"),[n,p]=useState({margin:"normal",font:"book",leading:1.7,paperSize:"a4",titlePage:!0}),r=l=>p(f=>({...f,...l})),d=useMemo(()=>buildNoteHTML(i,n),[i,n]);function b(l){const f=i.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(l==="pdf"){if(window.__TAURI__){downloadBlob(f+".html","text/html;charset=utf-8",buildNoteHTML(i,n)),o(a("exp_toast_pdf_tauri"));return}const u=window.open("","_blank");if(!u){o(a("exp_err_popup"));return}u.document.write(buildNoteHTML(i,n)),u.document.close(),setTimeout(()=>{u.focus(),u.print()},700),o(a("exp_toast_pdf"))}else if(l==="docx")try{downloadBlob(f+".docx",WritedFormats.DOCX_MIME,WritedFormats.buildDocx({title:n.titlePage?i.title:"",sections:[{html:i.content||""}],paperSize:n.paperSize,margin:n.margin,font:n.font})),o(a("exp_toast_docx_real"))}catch{o(a("exp_err_docx"))}else l==="txt"?(downloadBlob(f+".txt","text/plain;charset=utf-8",htmlToText(i.content)),o(a("exp_toast_txt"))):l==="md"&&(downloadBlob(f+".md","text/markdown;charset=utf-8","# "+i.title+`

`+htmlToMd(i.content)),o(a("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim",onMouseDown:e},React.createElement("div",{className:"modal export-modal",onMouseDown:l=>l.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},a("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},i.title)),React.createElement("button",{className:"icon-btn",onClick:e},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},a("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(n.titlePage?" on":""),onClick:()=>r({titlePage:!n.titlePage})},React.createElement("span",null)),a("exp_note_title_opt"))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},a("exp_section_layout")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},a("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([l,f])=>React.createElement("button",{key:l,className:"seg-btn"+(n.paperSize===l?" on":""),onClick:()=>r({paperSize:l})},f.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},a("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([l,f])=>React.createElement("button",{key:l,className:"seg-btn"+(n.margin===l?" on":""),onClick:()=>r({margin:l})},a(f))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},a("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([l,f])=>React.createElement("button",{key:l,className:"seg-btn"+(n.font===l?" on":""),onClick:()=>r({font:l})},f)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},a("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:n.leading,onChange:l=>r({leading:parseFloat(l.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},n.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>b("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>b("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>b("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>b("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:d})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
