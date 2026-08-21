function BookPreview({html:n,title:e,edition:o,lang:d}){const i=useRef(null),r=useRef(null),[l,s]=useState(!1),[b,m]=useState(!1),g=T(d||"en"),{headings:x,htmlWithIds:c}=useMemo(()=>{const a=document.createElement("div");a.innerHTML=n||"";const p=[];let u=0;return a.querySelectorAll("h1, h2, h3").forEach(w=>{const N="bh-"+u++;w.id=N,p.push({id:N,level:parseInt(w.tagName[1]),text:w.textContent.trim()})}),{headings:p,htmlWithIds:a.innerHTML}},[n]),f=useMemo(()=>{const a=document.createElement("div");a.innerHTML=n||"";const p=(a.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(p/280))},[n]);useEffect(()=>{const a=i.current;if(!a)return;const p=()=>s(a.scrollTop>320);return a.addEventListener("scroll",p,{passive:!0}),()=>a.removeEventListener("scroll",p)},[]);function h(){i.current&&i.current.scrollTo({top:0,behavior:"smooth"})}function v(a){const p=r.current&&r.current.querySelector("#"+a);if(!p||!i.current)return;const u=i.current.getBoundingClientRect().top,w=p.getBoundingClientRect().top;i.current.scrollBy({top:w-u-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:i},x.length>0&&React.createElement("div",{className:"preview-anchors"+(b?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>m(a=>!a)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,g(b?"anchors_hide":"anchors_show"))),b&&React.createElement("nav",{className:"anchors-nav"},x.map(a=>React.createElement("button",{key:a.id,className:"anchor-item anchor-item--h"+a.level,onClick:()=>{v(a.id),m(!1)}},a.text)))),React.createElement("div",{className:"book book--"+o},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:r,dangerouslySetInnerHTML:{__html:c}})),React.createElement("div",{className:"book-foot mono"},g("preview_label")," \xB7 \u2248\u2009",f,"\u2009",d==="ru"?"\u0441\u0442\u0440.":"p.")),l&&React.createElement("button",{className:"scroll-top-btn",onClick:h,title:g("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(n){const e=document.createElement("div");return e.innerHTML=n||"",(e.textContent||"").replace(/\n{3,}/g,`

`).trim()}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let o="";return e.childNodes.forEach(d=>{if(d.nodeType===3){o+=d.textContent;return}const i=d.tagName?d.tagName.toLowerCase():"",r=(d.textContent||"").trim();if(!(!r&&i!=="hr"))if(i==="h1")o+=`
# `+r+`

`;else if(i==="h2")o+=`
## `+r+`

`;else if(i==="h3")o+=`
### `+r+`

`;else if(i==="blockquote")o+="> "+r.replace(/\n/g,`
> `)+`

`;else if(i==="hr")o+=`
---

`;else if(i==="ul")d.querySelectorAll("li").forEach(l=>o+="- "+l.textContent.trim()+`
`),o+=`
`;else if(i==="ol"){let l=1;d.querySelectorAll("li").forEach(s=>o+=l+++". "+s.textContent.trim()+`
`),o+=`
`}else o+=r+`

`}),o.replace(/\n{3,}/g,`

`).trim()}function downloadBlob(n,e,o){const d=window.__TAURI__;if(d&&d.dialog&&d.fs){const s=o instanceof Uint8Array?o:new TextEncoder().encode(o),b=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";d.dialog.save({defaultPath:n,filters:b?[{name:b.toUpperCase(),extensions:[b]}]:void 0}).then(m=>m&&d.fs.writeFile(m,s)).catch(()=>{});return}const i=new Blob([o],{type:e}),r=URL.createObjectURL(i),l=document.createElement("a");l.href=r,l.download=n,document.body.appendChild(l),l.click(),l.remove(),setTimeout(()=>URL.revokeObjectURL(r),1500)}const MARGINS={narrow:"14mm",normal:"22mm",wide:"32mm"},SCREEN_PADS={narrow:"12px",normal:"28px",wide:"60px"},PAPER={a4:{label:"A4",size:"210mm 297mm",em:"38em"},letter:{label:"Letter",size:"8.5in 11in",em:"40em"},a5:{label:"A5",size:"148mm 210mm",em:"28em"},b5:{label:"B5",size:"176mm 250mm",em:"33em"},a6:{label:"A6",size:"105mm 148mm",em:"22em"}};function buildBookHTML(n,e){const o=n.chapters.filter(r=>e.include[r.id]!==!1),d=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let i="";return e.titlePage&&(i+=`<section class="b-title"><div class="b-kicker">WRITED.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(i+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${o.map(r=>`<li><span>${r.title}</span></li>`).join("")}</ol></section>`),o.forEach((r,l)=>{i+=`<section class="b-chap${e.merge?" merged":""}">${r.content||""}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${(PAPER[e.paperSize]||PAPER.a4).size}; margin: ${MARGINS[e.margin]}; }
    * { box-sizing: border-box; }
    body { font-family: ${d}; font-size: 12pt; line-height: ${e.leading}; color: #1f1d18; background: #fff; margin: 0; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overflow-wrap: break-word; word-break: break-word; }
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
  </style></head><body>${i}</body></html>`}function buildPlain(n,e,o){const d=n.chapters.filter(r=>e.include[r.id]!==!1);let i="";return e.titlePage&&(i+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(i+=t("toc_title",e.lang||"en").toUpperCase()+`
`+d.map((r,l)=>l+1+". "+r.title).join(`
`)+`


`),d.forEach(r=>{i+=(o?htmlToMd(r.content):htmlToText(r.content))+`


`}),i.trim()+`
`}function buildBookDocx(n,e){const o=n.chapters.filter(i=>e.include[i.id]!==!1),d=[];return e.toc&&d.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+o.map(i=>"<li>"+i.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage&&!e.merge}),o.forEach((i,r)=>{d.push({html:i.content||"",pageBreakBefore:!e.merge&&(r>0||e.toc||e.titlePage)})}),WritedFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:d,paperSize:e.paperSize,margin:e.margin,font:e.font})}function ExportModal({store:n,projectId:e,onClose:o,initialFormat:d,onToast:i}){const[r,l]=useDismiss(o),s=n.get().projects.find(a=>a.id===e),b=n.get().user&&n.get().user.lang||"en",m=T(b),[g,x]=useState(()=>({merge:!1,titlePage:!0,toc:!0,margin:"normal",font:"book",leading:1.7,paperSize:"a4",lang:b,include:{}})),c=a=>x(p=>({...p,...a}));if(!s)return null;const f=useMemo(()=>buildBookHTML(s,g),[s,g]),h=s.chapters.filter(a=>g.include[a.id]!==!1).length;function v(a){const p=s.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(a==="pdf"){if(window.__TAURI__){downloadBlob(p+".html","text/html;charset=utf-8",buildBookHTML(s,g)),i(m("exp_toast_pdf_tauri"));return}const u=window.open("","_blank");if(!u){i(m("exp_err_popup"));return}u.document.write(buildBookHTML(s,g)),u.document.close(),setTimeout(()=>{u.focus(),u.print()},700),i(m("exp_toast_pdf"))}else if(a==="docx")try{downloadBlob(p+".docx",WritedFormats.DOCX_MIME,buildBookDocx(s,g)),i(m("exp_toast_docx_real"))}catch{i(m("exp_err_docx"))}else a==="txt"?(downloadBlob(p+".txt","text/plain;charset=utf-8",buildPlain(s,g,!1)),i(m("exp_toast_txt"))):a==="md"&&(downloadBlob(p+".md","text/markdown;charset=utf-8",buildPlain(s,g,!0)),i(m("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+r,onMouseDown:l},React.createElement("div",{className:"modal export-modal",onMouseDown:a=>a.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},m("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},s.title)),React.createElement("button",{className:"icon-btn",onClick:l},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_chapters_label")," \xB7 ",h," ",m("exp_of")," ",s.chapters.length),React.createElement("ul",{className:"exp-chaps"},s.chapters.map((a,p)=>React.createElement("li",{key:a.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:g.include[a.id]!==!1,onChange:u=>c({include:{...g.include,[a.id]:u.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(p+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},a.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"],["merge","exp_merge"]].map(([a,p])=>React.createElement("label",{key:a,className:"exp-toggle"},React.createElement("span",{className:"switch"+(g[a]?" on":""),onClick:()=>c({[a]:!g[a]})},React.createElement("span",null)),m(p)))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},m("exp_section_typeset")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([a,p])=>React.createElement("button",{key:a,className:"seg-btn"+(g.paperSize===a?" on":""),onClick:()=>c({paperSize:a})},p.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([a,p])=>React.createElement("button",{key:a,className:"seg-btn"+(g.margin===a?" on":""),onClick:()=>c({margin:a})},m(p))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([a,p])=>React.createElement("button",{key:a,className:"seg-btn"+(g.font===a?" on":""),onClick:()=>c({font:a})},p)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},m("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:g.leading,onChange:a=>c({leading:parseFloat(a.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},g.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>v("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>v("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>v("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>v("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:f})))))}function buildNoteHTML(n,e){const o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
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
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">WRITED.</div><h1 class="n-title">${n.title}</h1></div>`:""}${n.content||""}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:o,lang:d}){const[i,r]=useDismiss(e),l=T(d||"en"),[s,b]=useState({margin:"normal",font:"book",leading:1.7,paperSize:"a4",titlePage:!0}),m=c=>b(f=>({...f,...c})),g=useMemo(()=>buildNoteHTML(n,s),[n,s]);function x(c){const f=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(c==="pdf"){if(window.__TAURI__){downloadBlob(f+".html","text/html;charset=utf-8",buildNoteHTML(n,s)),o(l("exp_toast_pdf_tauri"));return}const h=window.open("","_blank");if(!h){o(l("exp_err_popup"));return}h.document.write(buildNoteHTML(n,s)),h.document.close(),setTimeout(()=>{h.focus(),h.print()},700),o(l("exp_toast_pdf"))}else if(c==="docx")try{downloadBlob(f+".docx",WritedFormats.DOCX_MIME,WritedFormats.buildDocx({title:s.titlePage?n.title:"",sections:[{html:n.content||""}],paperSize:s.paperSize,margin:s.margin,font:s.font})),o(l("exp_toast_docx_real"))}catch{o(l("exp_err_docx"))}else c==="txt"?(downloadBlob(f+".txt","text/plain;charset=utf-8",htmlToText(n.content)),o(l("exp_toast_txt"))):c==="md"&&(downloadBlob(f+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),o(l("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+i,onMouseDown:r},React.createElement("div",{className:"modal export-modal",onMouseDown:c=>c.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},l("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("button",{className:"icon-btn",onClick:r},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(s.titlePage?" on":""),onClick:()=>m({titlePage:!s.titlePage})},React.createElement("span",null)),l("exp_note_title_opt"))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},l("exp_section_layout")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},l("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([c,f])=>React.createElement("button",{key:c,className:"seg-btn"+(s.paperSize===c?" on":""),onClick:()=>m({paperSize:c})},f.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},l("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([c,f])=>React.createElement("button",{key:c,className:"seg-btn"+(s.margin===c?" on":""),onClick:()=>m({margin:c})},l(f))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},l("exp_font")),React.createElement("div",{className:"seg seg--sm"},[["book","Newsreader"],["article","Spectral"],["mono","Mono"]].map(([c,f])=>React.createElement("button",{key:c,className:"seg-btn"+(s.font===c?" on":""),onClick:()=>m({font:c})},f)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},l("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:s.leading,onChange:c=>m({leading:parseFloat(c.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},s.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>x("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>x("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>x("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>x("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:g})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
