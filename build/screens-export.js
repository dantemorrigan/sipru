function BookPreview({html:n,title:e,edition:a,lang:i}){const o=useRef(null),s=useRef(null),[p,r]=useState(!1),[d,g]=useState(!1),u=T(i||"en"),{headings:l,htmlWithIds:v}=useMemo(()=>{const f=document.createElement("div");f.innerHTML=chapterBody(n||"");const x=[];let y=0;return f.querySelectorAll("h1, h2, h3").forEach(m=>{const w="bh-"+y++;m.id=w,x.push({id:w,level:parseInt(m.tagName[1]),text:m.textContent.trim()})}),{headings:x,htmlWithIds:f.innerHTML}},[n]),c=useMemo(()=>{const f=document.createElement("div");f.innerHTML=n||"";const x=(f.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(x/280))},[n]);useEffect(()=>{const f=o.current;if(!f)return;const x=()=>r(f.scrollTop>320);return f.addEventListener("scroll",x,{passive:!0}),()=>f.removeEventListener("scroll",x)},[]);function b(){o.current&&o.current.scrollTo({top:0,behavior:"smooth"})}function h(f){const x=s.current&&s.current.querySelector("#"+f);if(!x||!o.current)return;const y=o.current.getBoundingClientRect().top,m=x.getBoundingClientRect().top;o.current.scrollBy({top:m-y-80,behavior:"smooth"})}return React.createElement("div",{className:"preview-scroll",ref:o},l.length>0&&React.createElement("div",{className:"preview-anchors"+(d?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>g(f=>!f)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,u(d?"anchors_hide":"anchors_show"))),d&&React.createElement("nav",{className:"anchors-nav"},l.map(f=>React.createElement("button",{key:f.id,className:"anchor-item anchor-item--h"+f.level,onClick:()=>{h(f.id),g(!1)}},f.text)))),React.createElement("div",{className:"book book--"+a},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:s,dangerouslySetInnerHTML:{__html:v}})),React.createElement("div",{className:"book-foot mono"},u("preview_label")," \xB7 \u2248\u2009",c,"\u2009",i==="ru"?"\u0441\u0442\u0440.":"p.")),p&&React.createElement("button",{className:"scroll-top-btn",onClick:b,title:u("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}function htmlToText(n){const e=document.createElement("div");e.innerHTML=n||"";const a=e.querySelector(".fn-defs");let i="";if(a){const o=Array.prototype.map.call(a.children,(s,p)=>p+1+". "+(s.textContent||""));a.remove(),o.length&&(i=`

---
`+o.join(`
`))}return((e.textContent||"")+i).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(n){return String(n==null?"":n).replace(/[\\*_~[\]]/g,e=>"\\"+e)}function inlineToMd(n){let e="";return n.childNodes.forEach(a=>{if(a.nodeType===3){e+=mdEscapeText(a.textContent);return}if(a.nodeType!==1)return;const i=a.tagName.toLowerCase();if(i==="br"){e+=`  
`;return}if(i==="sup"&&a.classList&&a.classList.contains("fn")){e+="[^"+(a.textContent||"").trim()+"]";return}const o=inlineToMd(a);i==="strong"||i==="b"?e+="**"+o+"**":i==="em"||i==="i"?e+="*"+o+"*":i==="u"?e+="<u>"+o+"</u>":i==="s"||i==="strike"?e+="~~"+o+"~~":i==="a"?e+="["+o+"]("+(a.getAttribute("href")||"")+")":e+=o}),e}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let a="";const i=[],o=e.querySelector(".fn-defs");return o&&(Array.prototype.forEach.call(o.children,s=>i.push((s.textContent||"").replace(/\s*\n\s*/g," "))),o.remove()),e.childNodes.forEach(s=>{if(s.nodeType===3){a+=mdEscapeText(s.textContent);return}const p=s.tagName?s.tagName.toLowerCase():"",r=s.getAttribute&&s.getAttribute("class")||"";if(p==="hr"&&r.indexOf("page-break")>=0){a+=`
<!-- page-break -->

`;return}if(p==="hr"&&r.indexOf("scene-sep")>=0){a+=`
<!-- scene: `+(s.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(s.getAttribute("data-s")||"draft")+` -->

`;return}if(p==="figure"&&r.indexOf("epigraph")>=0){const u=s.querySelector("blockquote"),l=s.querySelector("figcaption"),v=u?inlineToMd(u):"",c=l?inlineToMd(l):"";if(!v.trim()&&!c.trim())return;a+=`
::: epigraph
`+v+`
`+(c.trim()?"-- "+c+`
`:"")+`:::

`;return}if(p==="aside"&&r.indexOf("note")>=0){const u=inlineToMd(s);if(!u.trim())return;a+=`
::: note
`+u+`
:::

`;return}const d=inlineToMd(s);if(!d.trim()&&p!=="hr")return;const g=r.match(/\bal-(l|c|r|j)\b/);if(p==="h1")a+=`
# `+d+`

`;else if(p==="h2")a+=`
## `+d+`

`;else if(p==="h3")a+=`
### `+d+`

`;else if(p==="blockquote")a+="> "+d.replace(/\n/g,`
> `)+`

`;else if(p==="hr")a+=`
---

`;else if(p==="ul")s.querySelectorAll("li").forEach(u=>a+="- "+inlineToMd(u)+`
`),a+=`
`;else if(p==="ol"){let u=1;s.querySelectorAll("li").forEach(l=>a+=u+++". "+inlineToMd(l)+`
`),a+=`
`}else p==="p"&&g?a+='<p class="al-'+g[1]+'">'+d.replace(/\n/g," ")+`</p>

`:a+=d+`

`}),a=a.replace(/\n{3,}/g,`

`).trim(),i.length&&(a+=`

`+i.map((s,p)=>"[^"+(p+1)+"]: "+s).join(`
`)),a}function splitNotes(n){const e=document.createElement("div");e.innerHTML=n||"";const a=e.querySelector(".fn-defs"),i=[];return a&&(Array.prototype.forEach.call(a.children,o=>i.push(o.textContent||"")),a.remove()),{html:e.innerHTML,notes:i}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAPER_MM={a4:{w:210,h:297},letter:{w:215.9,h:279.4},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148}},MARGIN_MM={narrow:14,normal:22,wide:32},PAPER_FONT_PT={a4:12,letter:12,b5:11.5,a5:10.5,a6:8.5};function exportPageGeom(n){const e=PAPER_MM[n.paperSize]||PAPER_MM.a4,a=MARGIN_MM[n.margin]!=null?MARGIN_MM[n.margin]:MARGIN_MM.normal,i=n.page||{};return{size:"custom",orient:"portrait",w:e.w,h:e.h,mt:a,mr:a,mb:a,ml:a,fontSize:PAPER_FONT_PT[n.paperSize]||12,leading:n.leading||1.7,align:i.align||"justify",indent:i.indent!=null?i.indent:1.5,padL:i.padL||0,padR:i.padR||0,spaceBefore:i.spaceBefore||0,spaceAfter:i.spaceAfter!=null?i.spaceAfter:.6,hyphens:i.hyphens!==!1,hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1}}function StaticSheet({geom:n,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:n.pageW,height:n.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:n.pageW,height:n.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:n.mt,left:n.ml,width:n.contentW,height:n.contentH}},e))}function PaginatedChapter({html:n,geom:e,title:a}){const i=useRef(null),o=useRef([]),s=useRef(0),[p,r]=useState([[]]);function d(){const c=i.current;if(!c)return;const b=footnoteList(c),h={};b.forEach(x=>{h[x.id]=x});const f=paginateArea(c,e,o.current);r(f.notes.map(x=>x.map(y=>h[y]).filter(Boolean)))}useEffect(()=>{i.current&&(i.current.innerHTML=n||""),o.current=[],s.current=0,d()},[n,e]);function g(c){const b=o.current;let h=!1;for(let f=0;f<c.length;f++){const x=c[f]?c[f]+Math.round(12*e.scale):0;Math.abs((b[f]||0)-x)>2&&(b[f]=x,h=!0)}b.length>c.length&&(b.length=c.length,h=!0),h&&s.current<3?(s.current++,d()):s.current=0}const l=p.length*(e.pageH+e.gap)-e.gap,v={width:e.pageW,height:l,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:v},React.createElement(PageLayer,{pages:p,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:g}),React.createElement("div",{ref:i,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:n,opts:e,lang:a}){const i=T(a||"en"),o=useRef(null),[s,p]=useState(0);useEffect(()=>{const l=o.current;if(!l)return;const v=()=>{l.clientWidth&&p(Math.max(160,l.clientWidth-48))};v();let c=null;return window.ResizeObserver?(c=new ResizeObserver(v),c.observe(l)):window.addEventListener("resize",v),()=>{c?c.disconnect():window.removeEventListener("resize",v)}},[]);const r=useMemo(()=>exportPageGeom(e),[e.paperSize,e.margin,e.leading,JSON.stringify(e.page)]),d=useMemo(()=>{const l=pageGeometry(r,s);return l.leading=r.leading,l.align=r.align,l.indent=r.indent,l.padL=r.padL,l.padR=r.padR,l.spaceBefore=r.spaceBefore,l.spaceAfter=r.spaceAfter,l.hyphens=r.hyphens,l.pg=r,l},[r,s]),g=n.chapters.filter(l=>e.include[l.id]!==!1),u=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:o,style:{"--ed-font":u}},e.titlePage&&React.createElement(StaticSheet,{geom:d},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title),n.synopsis&&React.createElement("p",{className:"b-syn"},n.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:d},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,i("toc_title")),React.createElement("ol",null,g.map(l=>React.createElement("li",{key:l.id},l.title))))),g.map(l=>React.createElement(PaginatedChapter,{key:l.id,html:l.content||"",geom:d,title:l.title})),!g.length&&React.createElement("div",{className:"exp-pages-empty mono"},i("exp_of")))}function printHTML(n){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const a=()=>setTimeout(()=>e.remove(),6e4);try{const i=e.contentDocument;i.open(),i.write(n),i.close();const o=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}a()};return i.readyState==="complete"?setTimeout(o,500):e.contentWindow.addEventListener("load",()=>setTimeout(o,500)),!0}catch{return e.remove(),!1}}function downloadBlob(n,e,a){const i=window.__TAURI__;if(i&&i.dialog&&i.fs){const r=a instanceof Uint8Array?a:new TextEncoder().encode(a),d=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";i.dialog.save({defaultPath:n,filters:d?[{name:d.toUpperCase(),extensions:[d]}]:void 0}).then(g=>g&&i.fs.writeFile(g,r)).catch(()=>{});return}const o=new Blob([a],{type:e}),s=URL.createObjectURL(o),p=document.createElement("a");p.href=s,p.download=n,document.body.appendChild(p),p.click(),p.remove(),setTimeout(()=>URL.revokeObjectURL(s),1500)}const BLOCK_CSS=`
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
`;function escText(n){return String(n==null?"":n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(n){const{html:e,notes:a}=splitNotes(n);return a.length?e+'<ol class="b-notes">'+a.map(i=>"<li>"+escText(i)+"</li>").join("")+"</ol>":e}const MARGINS={narrow:"14mm",normal:"22mm",wide:"32mm"},SCREEN_PADS={narrow:"12px",normal:"28px",wide:"60px"},PAPER={a4:{label:"A4",size:"210mm 297mm",em:"38em"},letter:{label:"Letter",size:"8.5in 11in",em:"40em"},a5:{label:"A5",size:"148mm 210mm",em:"28em"},b5:{label:"B5",size:"176mm 250mm",em:"33em"},a6:{label:"A6",size:"105mm 148mm",em:"22em"}};function buildBookHTML(n,e){const a=n.chapters.filter(p=>e.include[p.id]!==!1),i=e.page||null,o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let s="";return e.titlePage&&(s+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(s+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${a.map(p=>`<li><span>${p.title}</span></li>`).join("")}</ol></section>`),a.forEach((p,r)=>{s+=`<section class="b-chap${e.merge?" merged":""}">${chapterBody(p.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
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
  </style></head><body>${s}</body></html>`}function buildPlain(n,e,a){const i=n.chapters.filter(s=>e.include[s.id]!==!1);let o="";return e.titlePage&&(o+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(o+=t("toc_title",e.lang||"en").toUpperCase()+`
`+i.map((s,p)=>p+1+". "+s.title).join(`
`)+`


`),i.forEach(s=>{o+=(a?htmlToMd(s.content):htmlToText(s.content))+`


`}),o.trim()+`
`}function buildBookDocx(n,e){const a=n.chapters.filter(o=>e.include[o.id]!==!1),i=[];return e.toc&&i.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+a.map(o=>"<li>"+o.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage&&!e.merge}),a.forEach((o,s)=>{i.push({html:o.content||"",pageBreakBefore:!e.merge&&(s>0||e.toc||e.titlePage)})}),SipruFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:i,paperSize:e.paperSize,margin:e.margin,font:e.font,page:e.page||null,bookTitle:n.title,author:e.author||""})}function ExportModal({store:n,projectId:e,onClose:a,initialFormat:i,onToast:o}){const[s,p]=useDismiss(a),r=n.get().projects.find(m=>m.id===e),d=n.get().user&&n.get().user.lang||"en",g=T(d),u=n.get().user&&n.get().user.editorFont||"book",[l,v]=useState(()=>({merge:!1,titlePage:!0,toc:!0,margin:"normal",font:u,leading:1.7,paperSize:"a4",lang:d,include:{}})),c=m=>v(w=>({...w,...m}));if(!r)return null;const b=n.resolvePage(r.page),h={...l,page:b,author:n.get().user&&n.get().user.name||""},f=useMemo(()=>buildBookHTML(r,h),[r,l,JSON.stringify(b)]),x=r.chapters.filter(m=>l.include[m.id]!==!1).length;function y(m){const w=r.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(m==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(r,h))){o(g("exp_toast_pdf"));return}downloadBlob(w+".html","text/html;charset=utf-8",buildBookHTML(r,h)),o(g("exp_toast_pdf_tauri"));return}const N=window.open("","_blank");if(!N){o(g("exp_err_popup"));return}N.document.write(buildBookHTML(r,h)),N.document.close(),setTimeout(()=>{N.focus(),N.print()},700),o(g("exp_toast_pdf"))}else if(m==="docx")try{downloadBlob(w+".docx",SipruFormats.DOCX_MIME,buildBookDocx(r,h)),o(g("exp_toast_docx_real"))}catch{o(g("exp_err_docx"))}else m==="txt"?(downloadBlob(w+".txt","text/plain;charset=utf-8",buildPlain(r,h,!1)),o(g("exp_toast_txt"))):m==="md"&&(downloadBlob(w+".md","text/markdown;charset=utf-8",buildPlain(r,h,!0)),o(g("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+s,onMouseDown:p},React.createElement("div",{className:"modal export-modal",onMouseDown:m=>m.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},g("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},r.title)),React.createElement("button",{className:"icon-btn",onClick:p},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},g("exp_chapters_label")," \xB7 ",x," ",g("exp_of")," ",r.chapters.length),React.createElement("ul",{className:"exp-chaps"},r.chapters.map((m,w)=>React.createElement("li",{key:m.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:l.include[m.id]!==!1,onChange:N=>c({include:{...l.include,[m.id]:N.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(w+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},m.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},g("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"],["merge","exp_merge"]].map(([m,w])=>React.createElement("label",{key:m,className:"exp-toggle"},React.createElement("span",{className:"switch"+(l[m]?" on":""),onClick:()=>c({[m]:!l[m]})},React.createElement("span",null)),g(w)))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},g("exp_section_typeset")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},g("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([m,w])=>React.createElement("button",{key:m,className:"seg-btn"+(l.paperSize===m?" on":""),onClick:()=>c({paperSize:m})},w.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},g("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([m,w])=>React.createElement("button",{key:m,className:"seg-btn"+(l.margin===m?" on":""),onClick:()=>c({margin:m})},g(w))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},g("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:l.leading,onChange:m=>c({leading:parseFloat(m.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},l.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>y("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>y("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>y("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>y("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:r,opts:h,lang:d})))))}function buildNoteHTML(n,e){const a=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
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
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${n.title}</h1></div>`:""}${chapterBody(n.content||"")}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:a,lang:i,defaultFont:o}){const[s,p]=useDismiss(e),r=T(i||"en"),[d,g]=useState({margin:"normal",font:o||"book",leading:1.7,paperSize:"a4",titlePage:!0}),u=c=>g(b=>({...b,...c})),l=useMemo(()=>buildNoteHTML(n,d),[n,d]);function v(c){const b=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(c==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(n,d))){a(r("exp_toast_pdf"));return}downloadBlob(b+".html","text/html;charset=utf-8",buildNoteHTML(n,d)),a(r("exp_toast_pdf_tauri"));return}const h=window.open("","_blank");if(!h){a(r("exp_err_popup"));return}h.document.write(buildNoteHTML(n,d)),h.document.close(),setTimeout(()=>{h.focus(),h.print()},700),a(r("exp_toast_pdf"))}else if(c==="docx")try{downloadBlob(b+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:d.titlePage?n.title:"",sections:[{html:n.content||""}],paperSize:d.paperSize,margin:d.margin,font:d.font})),a(r("exp_toast_docx_real"))}catch{a(r("exp_err_docx"))}else c==="txt"?(downloadBlob(b+".txt","text/plain;charset=utf-8",htmlToText(n.content)),a(r("exp_toast_txt"))):c==="md"&&(downloadBlob(b+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),a(r("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+s,onMouseDown:p},React.createElement("div",{className:"modal export-modal",onMouseDown:c=>c.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},r("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("button",{className:"icon-btn",onClick:p},React.createElement(Icon,{name:"close",size:18}))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(d.titlePage?" on":""),onClick:()=>u({titlePage:!d.titlePage})},React.createElement("span",null)),r("exp_note_title_opt"))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_section_layout")),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_paper")),React.createElement("div",{className:"seg seg--sm"},Object.entries(PAPER).map(([c,b])=>React.createElement("button",{key:c,className:"seg-btn"+(d.paperSize===c?" on":""),onClick:()=>u({paperSize:c})},b.label)))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_margins")),React.createElement("div",{className:"seg seg--sm"},[["narrow","exp_margin_narrow"],["normal","exp_margin_normal"],["wide","exp_margin_wide"]].map(([c,b])=>React.createElement("button",{key:c,className:"seg-btn"+(d.margin===c?" on":""),onClick:()=>u({margin:c})},r(b))))),React.createElement("div",{className:"exp-row"},React.createElement("span",{className:"exp-lbl"},r("exp_leading")),React.createElement("input",{type:"range",min:"1.3",max:"2.2",step:"0.1",value:d.leading,onChange:c=>u({leading:parseFloat(c.target.value)}),className:"exp-range"}),React.createElement("span",{className:"mono exp-val"},d.leading.toFixed(1))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>v("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>v("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>v("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>v("md")},"MD"))),React.createElement("div",{className:"export-preview"},React.createElement("div",{className:"export-preview-inner"},React.createElement("iframe",{className:"book-iframe",title:"preview",srcDoc:l})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
