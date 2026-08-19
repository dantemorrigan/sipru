function BookPreview({html:i,title:e,edition:s,lang:m}){const n=useRef(null),a=useRef(null),[b,c]=useState(!1),[p,h]=useState(!1),l=T(m||"en"),{headings:g,htmlWithIds:f}=useMemo(()=>{const r=document.createElement("div");r.innerHTML=i||"";const u=[];let w=0;return r.querySelectorAll("h1, h2, h3").forEach(v=>{const N="bh-"+w++;v.id=N,u.push({id:N,level:parseInt(v.tagName[1]),text:v.textContent.trim()})}),{headings:u,htmlWithIds:r.innerHTML}},[i]),x=useMemo(()=>{const r=document.createElement("div");r.innerHTML=i||"";const u=(r.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(u/280))},[i]);useEffect(()=>{const r=n.current;if(!r)return;const u=()=>c(r.scrollTop>320);return r.addEventListener("scroll",u,{passive:!0}),()=>r.removeEventListener("scroll",u)},[]);function o(){n.current&&n.current.scrollTo({top:0,behavior:"smooth"})}function d(r){const u=a.current&&a.current.querySelector("#"+r);if(!u||!n.current)return;const w=n.current.getBoundingClientRect().top,v=u.getBoundingClientRect().top;n.current.scrollBy({top:v-w-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:n},g.length>0&&React.createElement("div",{className:"preview-anchors"+(p?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>h(r=>!r)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,l(p?"anchors_hide":"anchors_show"))),p&&React.createElement("nav",{className:"anchors-nav"},g.map(r=>React.createElement("button",{key:r.id,className:"anchor-item anchor-item--h"+r.level,onClick:()=>{d(r.id),h(!1)}},r.text)))),React.createElement("div",{className:"book book--"+s},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:a,dangerouslySetInnerHTML:{__html:f}})),React.createElement("div",{className:"book-foot mono"},l("preview_label")," \xB7 \u2248\u2009",x,"\u2009",m==="ru"?"\u0441\u0442\u0440.":"p.")),b&&React.createElement("button",{className:"scroll-top-btn",onClick:o,title:l("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(i){const e=document.createElement("div");return e.innerHTML=i||"",(e.textContent||"").replace(/\n{3,}/g,`

`).trim()}function htmlToMd(i){const e=document.createElement("div");e.innerHTML=i||"";let s="";return e.childNodes.forEach(m=>{if(m.nodeType===3){s+=m.textContent;return}const n=m.tagName?m.tagName.toLowerCase():"",a=(m.textContent||"").trim();if(!(!a&&n!=="hr"))if(n==="h1")s+=`
# `+a+`

`;else if(n==="h2")s+=`
## `+a+`

`;else if(n==="h3")s+=`
### `+a+`

`;else if(n==="blockquote")s+="> "+a.replace(/\n/g,`
> `)+`

`;else if(n==="hr")s+=`
---

`;else if(n==="ul")m.querySelectorAll("li").forEach(b=>s+="- "+b.textContent.trim()+`
`),s+=`
`;else if(n==="ol"){let b=1;m.querySelectorAll("li").forEach(c=>s+=b+++". "+c.textContent.trim()+`
`),s+=`
`}else s+=a+`

`}),s.replace(/\n{3,}/g,`

`).trim()}function downloadBlob(i,e,s){const m=new Blob([s],{type:e}),n=URL.createObjectURL(m),a=document.createElement("a");a.href=n,a.download=i,document.body.appendChild(a),a.click(),a.remove(),setTimeout(()=>URL.revokeObjectURL(n),1500)}const MARGINS={narrow:"14mm",normal:"22mm",wide:"32mm"},SCREEN_PADS={narrow:"12px",normal:"28px",wide:"60px"},PAPER={a4:{label:"A4",size:"210mm 297mm",em:"38em"},letter:{label:"Letter",size:"8.5in 11in",em:"40em"},a5:{label:"A5",size:"148mm 210mm",em:"28em"},b5:{label:"B5",size:"176mm 250mm",em:"33em"},a6:{label:"A6",size:"105mm 148mm",em:"22em"}};function buildBookHTML(i,e){const s=i.chapters.filter(a=>e.include[a.id]!==!1),m=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let n="";return e.titlePage&&(n+=`<section class="b-title"><div class="b-kicker">WRITED.</div><h1>${i.title}</h1>${i.synopsis?`<p class="b-syn">${i.synopsis}</p>`:""}</section>`),e.toc&&(n+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${s.map(a=>`<li><span>${a.title}</span></li>`).join("")}</ol></section>`),s.forEach((a,b)=>{n+=`<section class="b-chap${e.merge?" merged":""}">${a.content||""}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
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
  </style></head><body>${n}</body></html>`}function buildPlain(i,e,s){const m=i.chapters.filter(a=>e.include[a.id]!==!1);let n="";return e.titlePage&&(n+=i.title.toUpperCase()+`
`+(i.synopsis||"")+`


`),e.toc&&(n+=t("toc_title",e.lang||"en").toUpperCase()+`
`+m.map((a,b)=>b+1+". "+a.title).join(`
`)+`


`),m.forEach(a=>{n+=(s?htmlToMd(a.content):htmlToText(a.content))+`


`}),n.trim()+`
`}function buildBookDocx(i,e){const s=i.chapters.filter(n=>e.include[n.id]!==!1),m=[];return e.toc&&m.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+s.map(n=>"<li>"+n.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage&&!e.merge}),s.forEach((n,a)=>{m.push({html:n.content||"",pageBreakBefore:!e.merge&&(a>0||e.toc||e.titlePage)})}),WritedFormats.buildDocx({title:e.titlePage?i.title:"",subtitle:e.titlePage&&i.synopsis||"",sections:m,paperSize:e.paperSize,margin:e.margin,font:e.font})}function ExportModal({store:i,projectId:e,onClose:s,initialFormat:m,onToast:n}){const a=i.get().projects.find(o=>o.id===e),b=i.get().user&&i.get().user.lang||"en",c=T(b),[p,h]=useState(()=>({merge:!1,titlePage:!0,toc:!0,margin:"normal",font:"book",leading:1.7,paperSize:"a4",lang:b,include:{}})),l=o=>h(d=>({...d,...o}));if(!a)return null;const g=useMemo(()=>buildBookHTML(a,p),[a,p]),f=a.chapters.filter(o=>p.include[o.id]!==!1).length;function x(o){const d=a.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(o==="pdf"){const r=window.open("","_blank");if(!r){n(c("exp_err_popup"));return}r.document.write(buildBookHTML(a,p)),r.document.close(),setTimeout(()=>{r.focus(),r.print()},700),n(c("exp_toast_pdf"))}else if(o==="docx")try{downloadBlob(d+".docx",WritedFormats.DOCX_MIME,buildBookDocx(a,p)),n(c("exp_toast_docx_real"))}catch{n(c("exp_err_docx"))}else o==="txt"?(downloadBlob(d+".txt","text/plain;charset=utf-8",buildPlain(a,p,!1)),n(c("exp_toast_txt"))):o==="md"&&(downloadBlob(d+".md","text/markdown;charset=utf-8",buildPlain(a,p,!0)),n(c("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim",onMouseDown:s},React.createElement("div",{className:"modal export-modal",onMouseDown:o=>o.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},c("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},a.title)),React.createElement("button",{className:"icon-btn",onClick:s},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},c("exp_chapters_label")," \xB7 ",f," ",c("exp_of")," ",a.chapters.length),React.createElement("ul",{className:"exp-chaps"},a.chapters.map((o,d)=>React.createElement("li",{key:o.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:p.include[o.id]!==!1,onChange:r=>l({include:{...p.include,[o.id]:r.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(d+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},o.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},c("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"],["merge","exp_merge"]].map(([o,d])=>React.createElement("label",{key:o,className:"exp-toggle"},React.createElement("span",{className:"switch"+(p[o]?" on":""),onClick:()=>l({[o]:!p[o]})},React.createElement("span",null)),c(d)))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},c("exp_section_typeset")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},c("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([o,d])=>React.createElement("button",{key:o,className:"seg-btn"+(p.paperSize===o?" on":""),onClick:()=>l({paperSize:o})},d.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},c("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([o,d])=>React.createElement("button",{key:o,className:"seg-btn"+(p.margin===o?" on":""),onClick:()=>l({margin:o})},c(d))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},c("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([o,d])=>React.createElement("button",{key:o,className:"seg-btn"+(p.font===o?" on":""),onClick:()=>l({font:o})},d)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},c("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:p.leading,onChange:o=>l({leading:parseFloat(o.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},p.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>x("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>x("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>x("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>x("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:g})))))}function buildNoteHTML(i,e){const s=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";return`<!doctype html><html><head><meta charset="utf-8"><title>${i.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${s}; font-size: 12pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; word-break: break-word; }
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
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">WRITED.</div><h1 class="n-title">${i.title}</h1></div>`:""}${i.content||""}</div></body></html>`}function NoteExportModal({note:i,onClose:e,onToast:s,lang:m}){const n=T(m||"en"),[a,b]=useState({margin:"normal",font:"book",leading:1.7,paperSize:"a4",titlePage:!0}),c=l=>b(g=>({...g,...l})),p=useMemo(()=>buildNoteHTML(i,a),[i,a]);function h(l){const g=i.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(l==="pdf"){const f=window.open("","_blank");if(!f){s(n("exp_err_popup"));return}f.document.write(buildNoteHTML(i,a)),f.document.close(),setTimeout(()=>{f.focus(),f.print()},700),s(n("exp_toast_pdf"))}else if(l==="docx")try{downloadBlob(g+".docx",WritedFormats.DOCX_MIME,WritedFormats.buildDocx({title:a.titlePage?i.title:"",sections:[{html:i.content||""}],paperSize:a.paperSize,margin:a.margin,font:a.font})),s(n("exp_toast_docx_real"))}catch{s(n("exp_err_docx"))}else l==="txt"?(downloadBlob(g+".txt","text/plain;charset=utf-8",htmlToText(i.content)),s(n("exp_toast_txt"))):l==="md"&&(downloadBlob(g+".md","text/markdown;charset=utf-8","# "+i.title+`

`+htmlToMd(i.content)),s(n("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim",onMouseDown:e},React.createElement("div",{className:"modal export-modal",onMouseDown:l=>l.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},n("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},i.title)),React.createElement("button",{className:"icon-btn",onClick:e},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},n("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(a.titlePage?" on":""),onClick:()=>c({titlePage:!a.titlePage})},React.createElement("span",null)),n("exp_note_title_opt"))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},n("exp_section_layout")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},n("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([l,g])=>React.createElement("button",{key:l,className:"seg-btn"+(a.paperSize===l?" on":""),onClick:()=>c({paperSize:l})},g.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},n("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([l,g])=>React.createElement("button",{key:l,className:"seg-btn"+(a.margin===l?" on":""),onClick:()=>c({margin:l})},n(g))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},n("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([l,g])=>React.createElement("button",{key:l,className:"seg-btn"+(a.font===l?" on":""),onClick:()=>c({font:l})},g)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},n("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:a.leading,onChange:l=>c({leading:parseFloat(l.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},a.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>h("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>h("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>h("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>h("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:p})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
