function BookPreview({html:n,title:e,edition:o,lang:i}){const a=useRef(null),l=useRef(null),[c,s]=useState(!1),[r,p]=useState(!1),b=T(i||"en"),{headings:d,htmlWithIds:f}=useMemo(()=>{const h=document.createElement("div");h.innerHTML=chapterBody(n||"");const w=[];let v=0;return h.querySelectorAll("h1, h2, h3").forEach(y=>{const k="bh-"+v++;y.id=k,w.push({id:k,level:parseInt(y.tagName[1]),text:y.textContent.trim()})}),{headings:w,htmlWithIds:h.innerHTML}},[n]),m=useMemo(()=>{const h=document.createElement("div");h.innerHTML=n||"";const w=(h.textContent||"").trim().split(/\s+/).filter(Boolean).length;return Math.max(1,Math.round(w/280))},[n]);useEffect(()=>{const h=a.current;if(!h)return;const w=()=>s(h.scrollTop>320);return h.addEventListener("scroll",w,{passive:!0}),()=>h.removeEventListener("scroll",w)},[]);function g(){a.current&&a.current.scrollTo({top:0,behavior:"smooth"})}const[u,x]=useState(null);return useEffect(()=>{if(!u)return;x(null);const h=l.current&&l.current.querySelector("#"+u);if(!h||!a.current)return;const w=a.current.getBoundingClientRect().top,v=h.getBoundingClientRect().top;a.current.scrollBy({top:v-w-24,behavior:"smooth"})},[u]),React.createElement("div",{className:"preview-scroll",ref:a},d.length>0&&React.createElement("div",{className:"preview-anchors"+(r?" open":"")},React.createElement("button",{className:"anchors-toggle",onClick:()=>p(h=>!h)},React.createElement(Icon,{name:"panel",size:14}),React.createElement("span",null,b(r?"anchors_hide":"anchors_show"))),r&&React.createElement("nav",{className:"anchors-nav"},d.map(h=>React.createElement("button",{key:h.id,className:"anchor-item anchor-item--h"+h.level,onClick:()=>{p(!1),x(h.id)}},h.text)))),React.createElement("div",{className:"book book--"+o},React.createElement("div",{className:"book-page"},React.createElement("div",{className:"book-content",ref:l,dangerouslySetInnerHTML:{__html:f}})),React.createElement("div",{className:"book-foot mono"},b("preview_label")," \xB7 \u2248\u2009",m,"\u2009",i==="ru"?"\u0441\u0442\u0440.":"p.")),c&&React.createElement("button",{className:"scroll-top-btn",onClick:g,title:b("scroll_top")},React.createElement(Icon,{name:"chevron",size:18,style:{transform:"rotate(180deg)"}})))}const TXT_BLOCK={P:1,DIV:1,H1:1,H2:1,H3:1,BLOCKQUOTE:1,LI:1,UL:1,OL:1,FIGURE:1,FIGCAPTION:1,ASIDE:1,HR:1,PRE:1,TABLE:1,TR:1,SECTION:1};function blockText(n){const e=[];let o="";const i=()=>{const a=o.split(`
`).map(l=>l.replace(/\s+/g," ").trim()).join(`
`).replace(/^\n+|\n+$/g,"");a&&e.push(a),o=""};return(function a(l){for(let c=l.firstChild;c;c=c.nextSibling){if(c.nodeType===3){o+=c.nodeValue;continue}if(c.nodeType===1){if(c.tagName==="BR"){o+=`
`;continue}TXT_BLOCK[c.tagName]?(i(),a(c),i()):a(c)}}})(n),i(),e.join(`

`)}function htmlToText(n){const e=document.createElement("div");e.innerHTML=n||"";const o=e.querySelector(".fn-defs");let i="";if(o){const a=Array.prototype.map.call(o.children,(l,c)=>c+1+". "+(l.textContent||""));o.remove(),a.length&&(i=`

---
`+a.join(`
`))}return(blockText(e)+i).replace(/\n{3,}/g,`

`).trim()}function mdEscapeText(n){return String(n==null?"":n).replace(/[\\*_~[\]`$]/g,e=>"\\"+e)}function inlineToMd(n){let e="";return n.childNodes.forEach(o=>{if(o.nodeType===3){e+=mdEscapeText(o.textContent);return}if(o.nodeType!==1)return;const i=o.tagName.toLowerCase();if(i==="br"){e+=`  
`;return}if(i==="sup"&&o.classList&&o.classList.contains("fn")){e+="[^"+(o.textContent||"").trim()+"]";return}if(i==="code"){const l=o.textContent||"";let c="`";for(;l.indexOf(c)>=0;)c+="`";const s=/^`|`$/.test(l)?" ":"";e+=c+s+l+s+c;return}const a=inlineToMd(o);i==="strong"||i==="b"?e+="**"+a+"**":i==="em"||i==="i"?e+="*"+a+"*":i==="u"?e+="<u>"+a+"</u>":i==="s"||i==="strike"?e+="~~"+a+"~~":i==="a"?e+="["+a+"]("+(o.getAttribute("href")||"")+")":e+=a}),e}function htmlToMd(n){const e=document.createElement("div");e.innerHTML=n||"";let o="";const i=[],a=s=>(i.push(s),"v"+(i.length-1)+""),l=[],c=e.querySelector(".fn-defs");return c&&(Array.prototype.forEach.call(c.children,s=>l.push((s.textContent||"").replace(/\s*\n\s*/g," "))),c.remove()),e.childNodes.forEach(s=>{if(s.nodeType===3){o+=mdEscapeText(s.textContent);return}const r=s.tagName?s.tagName.toLowerCase():"",p=s.getAttribute&&s.getAttribute("class")||"";if(r==="hr"&&p.indexOf("page-break")>=0){o+=`
<!-- page-break -->

`;return}if(r==="hr"&&p.indexOf("scene-sep")>=0){o+=`
<!-- scene: `+(s.getAttribute("data-t")||"").replace(/[|\-]{2,}|-->/g," ")+" | "+(s.getAttribute("data-s")||"draft")+` -->

`;return}if(r==="figure"&&p.indexOf("epigraph")>=0){const f=s.querySelector("blockquote"),m=s.querySelector("figcaption"),g=f?inlineToMd(f):"",u=m?inlineToMd(m):"";if(!g.trim()&&!u.trim())return;o+=`
::: epigraph
`+g+`
`+(u.trim()?"-- "+u+`
`:"")+`:::

`;return}if(r==="pre"){const m=(s.querySelector("code")||s).textContent||"";if(p.indexOf("math")>=0){o+=`
`+a(`$$
`+m+`
$$`)+`

`;return}let g="```";for(;new RegExp("^\\s*"+g,"m").test(m);)g+="`";o+=`
`+a(g+(s.getAttribute("data-lang")||"")+`
`+m+`
`+g)+`

`;return}if(r==="table"){const f=Array.prototype.map.call(s.querySelectorAll("tr"),u=>Array.prototype.map.call(u.children,x=>inlineToMd(x).replace(/\n/g," ").replace(/\|/g,"\\|").trim()));if(!f.length)return;const m=f.reduce((u,x)=>Math.max(u,x.length),0),g=u=>{const x=u.slice();for(;x.length<m;)x.push("");return"| "+x.join(" | ")+" |"};o+=`
`+g(f[0])+`
|`+" --- |".repeat(m)+`
`+f.slice(1).map(g).join(`
`)+`

`;return}if(r==="aside"&&p.indexOf("note")>=0){const f=inlineToMd(s);if(!f.trim())return;o+=`
::: note
`+f+`
:::

`;return}const b=inlineToMd(s);if(!b.trim()&&r!=="hr")return;const d=p.match(/\bal-(l|c|r|j)\b/);if(r==="h1")o+=`
# `+b+`

`;else if(r==="h2")o+=`
## `+b+`

`;else if(r==="h3")o+=`
### `+b+`

`;else if(r==="blockquote")o+="> "+b.replace(/\n/g,`
> `)+`

`;else if(r==="hr")o+=`
---

`;else if(r==="ul")s.querySelectorAll("li").forEach(f=>o+="- "+inlineToMd(f)+`
`),o+=`
`;else if(r==="ol"){let f=1;s.querySelectorAll("li").forEach(m=>o+=f+++". "+inlineToMd(m)+`
`),o+=`
`}else r==="p"&&d?o+='<p class="al-'+d[1]+'">'+b.replace(/\n/g," ")+`</p>

`:o+=b+`

`}),o=o.replace(/\n{3,}/g,`

`).trim(),l.length&&(o+=`

`+l.map((s,r)=>"[^"+(r+1)+"]: "+s).join(`
`)),o.replace(/\x01v(\d+)\x02/g,(s,r)=>i[+r])}function splitNotes(n){const e=document.createElement("div");e.innerHTML=n||"";const o=e.querySelector(".fn-defs"),i=[];return o&&(Array.prototype.forEach.call(o.children,a=>i.push(a.textContent||"")),o.remove()),{html:e.innerHTML,notes:i}}const EXPORT_FONT_MAP={book:"var(--book)",article:"var(--book-alt)",mono:"var(--mono)"},PAGE_MM={a4:{w:210,h:297},a5:{w:148,h:210},b5:{w:176,h:250},a6:{w:105,h:148},letter:{w:215.9,h:279.4},legal:{w:215.9,h:355.6}};function pageDimsMM(n){const e=n&&n.size==="custom"?{w:n.w||210,h:n.h||297}:PAGE_MM[n&&n.size]||PAGE_MM.a4;return n&&n.orient==="landscape"?{w:e.h,h:e.w}:e}function exportPageGeom(n){return{...n||{},hdr:{on:!1,l:"",c:"",r:""},ftr:{on:!1,l:"",c:"",r:""},firstBare:!0,mirror:!1,numFrom:1,zoom:1,noFluid:!0}}function StaticSheet({geom:n,children:e}){return React.createElement("div",{className:"ed-paper exp-sheet",style:{width:n.pageW,height:n.pageH}},React.createElement("div",{className:"ed-pagelayer"},React.createElement("div",{className:"ed-pagebox",style:{top:0,width:n.pageW,height:n.pageH}})),React.createElement("div",{className:"exp-sheet-body",style:{top:n.mt,left:n.ml,width:n.contentW,height:n.contentH}},e))}function PaginatedChapter({html:n,geom:e,title:o}){const i=useRef(null),a=useRef([]),l=useRef(0),[c,s]=useState([[]]);function r(){const m=i.current;if(!m)return;const g=footnoteList(m),u={};g.forEach(h=>{u[h.id]=h});const x=paginateArea(m,e,a.current);s(x.notes.map(h=>h.map(w=>u[w]).filter(Boolean)))}useEffect(()=>{i.current&&(i.current.innerHTML=(o?"<h1>"+escText(o)+"</h1>":"")+(n||"")),a.current=[],l.current=0,r()},[n,e,o]);function p(m){const g=a.current;let u=!1;for(let x=0;x<m.length;x++){const h=m[x]?m[x]+Math.round(12*e.scale):0;Math.abs((g[x]||0)-h)>2&&(g[x]=h,u=!0)}g.length>m.length&&(g.length=m.length,u=!0),u&&l.current<3?(l.current++,r()):l.current=0}const d=c.length*(e.pageH+e.gap)-e.gap,f={width:e.pageW,height:d,"--pg-font":e.fontPx+"px","--pg-lead":e.leading,"--pg-align":e.align==="justify"?"justify":e.align,"--pg-indent":e.indent+"em","--pg-padl":e.padL+"em","--pg-padr":e.padR+"em","--pg-before":e.spaceBefore+"em","--pg-after":e.spaceAfter+"em","--pg-hyphens":e.hyphens?"auto":"manual"};return React.createElement("div",{className:"ed-paper",style:f},React.createElement(PageLayer,{pages:c,geom:e,pg:e.pg,ctx:{},onFootnote:()=>{},onMeasure:p}),React.createElement("div",{ref:i,className:"ed-area exp-area",style:{top:e.mt,left:e.ml,width:e.contentW}}))}function BookPagedPreview({project:n,opts:e,lang:o}){const i=T(o||"en"),a=useRef(null),[l,c]=useState(0);useEffect(()=>{const d=a.current;if(!d)return;const f=()=>{d.clientWidth&&c(Math.max(160,d.clientWidth-48))};f();let m=null;return window.ResizeObserver?(m=new ResizeObserver(f),m.observe(d)):window.addEventListener("resize",f),()=>{m?m.disconnect():window.removeEventListener("resize",f)}},[]);const s=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),r=useMemo(()=>{const d=pageGeometry(s,l);return d.leading=s.leading,d.align=s.align,d.indent=s.indent,d.padL=s.padL,d.padR=s.padR,d.spaceBefore=s.spaceBefore,d.spaceAfter=s.spaceAfter,d.hyphens=s.hyphens,d.pg=s,d},[s,l]),p=n.chapters.filter(d=>e.include[d.id]!==!1),b=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:a,style:{"--ed-font":b}},e.titlePage&&React.createElement(StaticSheet,{geom:r},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title),n.synopsis&&React.createElement("p",{className:"b-syn"},n.synopsis))),e.toc&&React.createElement(StaticSheet,{geom:r},React.createElement("div",{className:"exp-toc-page"},React.createElement("h2",null,i("toc_title")),React.createElement("ol",null,p.map(d=>React.createElement("li",{key:d.id},d.title))))),p.map(d=>React.createElement(PaginatedChapter,{key:d.id,html:d.content||"",geom:r,title:d.title})),!p.length&&React.createElement("div",{className:"exp-pages-empty mono"},i("exp_of")))}function NotePagedPreview({note:n,opts:e}){const o=useRef(null),[i,a]=useState(0);useEffect(()=>{const r=o.current;if(!r)return;const p=()=>{r.clientWidth&&a(Math.max(160,r.clientWidth-48))};p();let b=null;return window.ResizeObserver?(b=new ResizeObserver(p),b.observe(r)):window.addEventListener("resize",p),()=>{b?b.disconnect():window.removeEventListener("resize",p)}},[]);const l=useMemo(()=>exportPageGeom(e.page),[JSON.stringify(e.page)]),c=useMemo(()=>{const r=pageGeometry(l,i);return r.leading=l.leading,r.align=l.align,r.indent=l.indent,r.padL=l.padL,r.padR=l.padR,r.spaceBefore=l.spaceBefore,r.spaceAfter=l.spaceAfter,r.hyphens=l.hyphens,r.pg=l,r},[l,i]),s=EXPORT_FONT_MAP[e.font]||EXPORT_FONT_MAP.book;return React.createElement("div",{className:"exp-pages",ref:o,style:{"--ed-font":s}},e.titlePage&&React.createElement(StaticSheet,{geom:c},React.createElement("div",{className:"exp-title-page"},React.createElement("div",{className:"b-kicker"},"SIPRU."),React.createElement("h1",null,n.title))),React.createElement(PaginatedChapter,{html:n.content||"",geom:c,title:n.title}))}function printHTML(n){const e=document.createElement("iframe");e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:-10000px;top:0;width:820px;height:1160px;border:0;opacity:0;",document.body.appendChild(e);const o=()=>setTimeout(()=>e.remove(),6e4);try{const i=e.contentDocument;i.open(),i.write(n),i.close();const a=()=>{try{e.contentWindow.focus(),e.contentWindow.print()}catch{}o()};return i.readyState==="complete"?setTimeout(a,500):e.contentWindow.addEventListener("load",()=>setTimeout(a,500)),!0}catch{return e.remove(),!1}}function downloadBlob(n,e,o){const i=window.__TAURI__;if(i&&i.dialog&&i.fs){const s=o instanceof Uint8Array?o:new TextEncoder().encode(o),r=n.includes(".")?n.slice(n.lastIndexOf(".")+1):"";i.dialog.save({defaultPath:n,filters:r?[{name:r.toUpperCase(),extensions:[r]}]:void 0}).then(p=>p&&i.fs.writeFile(p,s)).catch(()=>{});return}const a=new Blob([o],{type:e}),l=URL.createObjectURL(a),c=document.createElement("a");c.href=l,c.download=n,document.body.appendChild(c),c.click(),c.remove(),setTimeout(()=>URL.revokeObjectURL(l),1500)}const BLOCK_CSS=`
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
`;function escText(n){return String(n==null?"":n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function chapterBody(n){const{html:e,notes:o}=splitNotes(n);return o.length?e+'<ol class="b-notes">'+o.map(i=>"<li>"+escText(i)+"</li>").join("")+"</ol>":e}function buildBookHTML(n,e){const o=n.chapters.filter(m=>e.include[m.id]!==!1),i=e.page||{},a=pageDimsMM(i),l=i.mt!=null?i.mt:20,c=i.mr!=null?i.mr:18,s=i.mb!=null?i.mb:20,r=i.ml!=null?i.ml:18,p=Math.round(a.w/5.4)+"em",b=Math.round(Math.min(r,c)*2.6)+"px",d=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif";let f="";return e.titlePage&&(f+=`<section class="b-title"><div class="b-kicker">SIPRU.</div><h1>${n.title}</h1>${n.synopsis?`<p class="b-syn">${n.synopsis}</p>`:""}</section>`),e.toc&&(f+=`<section class="b-toc"><h2>${t("toc_title",e.lang||"ru")}</h2><ol>${o.map(m=>`<li><span>${m.title}</span></li>`).join("")}</ol></section>`),o.forEach((m,g)=>{f+=`<section class="b-chap"><h1>${escText(m.title)}</h1>${chapterBody(m.content||"")}</section>`}),`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${l}mm ${c}mm ${s}mm ${r}mm; }
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
      body > section { max-width: ${p}; margin: 0 auto; padding: 0 ${b}; }
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
  </style></head><body>${f}</body></html>`}function buildPlain(n,e,o){const i=n.chapters.filter(l=>e.include[l.id]!==!1);let a="";return e.titlePage&&(a+=n.title.toUpperCase()+`
`+(n.synopsis||"")+`


`),e.toc&&(a+=t("toc_title",e.lang||"en").toUpperCase()+`
`+i.map((l,c)=>c+1+". "+l.title).join(`
`)+`


`),i.forEach(l=>{const c=(l.title||"").trim();c&&(a+=(o?"# "+c:c.toUpperCase())+`

`),a+=(o?htmlToMd(l.content):htmlToText(l.content))+`


`}),a.trim()+`
`}function buildBookDocx(n,e){const o=n.chapters.filter(a=>e.include[a.id]!==!1),i=[];return e.toc&&i.push({heading:t("toc_title",e.lang||"en"),html:"<ol>"+o.map(a=>"<li>"+a.title.replace(/[<>&]/g," ")+"</li>").join("")+"</ol>",pageBreakBefore:e.titlePage}),o.forEach((a,l)=>{i.push({heading:a.title||"",html:a.content||"",pageBreakBefore:l>0||e.toc||e.titlePage})}),SipruFormats.buildDocx({title:e.titlePage?n.title:"",subtitle:e.titlePage&&n.synopsis||"",sections:i,font:e.font,page:e.page||null,bookTitle:n.title,author:e.author||""})}function ExportModal({store:n,projectId:e,onClose:o,initialFormat:i,onToast:a}){const[l,c]=useDismiss(o),s=n.get().projects.find(v=>v.id===e),r=n.get().user&&n.get().user.lang||"en",p=T(r),b=n.get().user&&n.get().user.editorFont||"book",[d,f]=useState(()=>({titlePage:!0,toc:!0,font:b,lang:r,include:{}})),m=v=>f(y=>({...y,...v}));if(!s)return null;const g=n.resolvePage(s.page),u={...d,page:g,author:n.get().user&&n.get().user.name||""},x=useMemo(()=>buildBookHTML(s,u),[s,d,JSON.stringify(g)]),h=s.chapters.filter(v=>d.include[v.id]!==!1).length;function w(v){const y=s.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"book";if(v==="pdf"){if(window.__TAURI__){if(printHTML(buildBookHTML(s,u))){a(p("exp_toast_pdf"));return}downloadBlob(y+".html","text/html;charset=utf-8",buildBookHTML(s,u)),a(p("exp_toast_pdf_tauri"));return}const k=window.open("","_blank");if(!k){a(p("exp_err_popup"));return}k.document.write(buildBookHTML(s,u)),k.document.close(),setTimeout(()=>{k.focus(),k.print()},700),a(p("exp_toast_pdf"))}else if(v==="docx")try{downloadBlob(y+".docx",SipruFormats.DOCX_MIME,buildBookDocx(s,u)),a(p("exp_toast_docx_real"))}catch{a(p("exp_err_docx"))}else v==="txt"?(downloadBlob(y+".txt","text/plain;charset=utf-8",buildPlain(s,u,!1)),a(p("exp_toast_txt"))):v==="md"&&(downloadBlob(y+".md","text/markdown;charset=utf-8",buildPlain(s,u,!0)),a(p("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+l,onMouseDown:c},React.createElement("div",{className:"modal export-modal",onMouseDown:v=>v.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},p("exp_book_eyebrow")),React.createElement("h2",{className:"modal-title"},s.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>m({titlePage:!0,toc:!0,font:b}),title:p("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",p("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:c},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_chapters_label")," \xB7 ",h," ",p("exp_of")," ",s.chapters.length),React.createElement("ul",{className:"exp-chaps"},s.chapters.map((v,y)=>React.createElement("li",{key:v.id,className:"exp-chap"},React.createElement("label",null,React.createElement("input",{type:"checkbox",checked:d.include[v.id]!==!1,onChange:k=>m({include:{...d.include,[v.id]:k.target.checked}})}),React.createElement("span",{className:"exp-chap-num mono"},String(y+1).padStart(2,"0")),React.createElement("span",{className:"exp-chap-t"},v.title)))))),React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},p("exp_section_structure")),[["titlePage","exp_title_page"],["toc","exp_toc"]].map(([v,y])=>React.createElement("label",{key:v,className:"exp-toggle"},React.createElement("span",{className:"switch"+(d[v]?" on":""),onClick:()=>m({[v]:!d[v]})},React.createElement("span",null)),p(y))))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>w("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>w("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>w("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>w("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(BookPagedPreview,{project:s,opts:u,lang:r})))))}function buildNoteHTML(n,e){const o=e.font==="mono"?"'JetBrains Mono', monospace":e.font==="article"?"'Spectral', Georgia, serif":"'Newsreader', Georgia, serif",i=e.page||{},a=pageDimsMM(i),l=i.mt!=null?i.mt:20,c=i.mr!=null?i.mr:18,s=i.mb!=null?i.mb:20,r=i.ml!=null?i.ml:18,p=Math.round(a.w/5.4)+"em",b=Math.round(Math.min(r,c)*2.6)+"px";return`<!doctype html><html><head><meta charset="utf-8"><title>${n.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,wght@0,400;0,600;1,400&family=Spectral:wght@400;600&family=JetBrains+Mono&display=swap" rel="stylesheet">
  <style>
    @page { size: ${a.w}mm ${a.h}mm; margin: ${l}mm ${c}mm ${s}mm ${r}mm; }
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
      .n-wrap { max-width: ${p}; margin: 0 auto; padding: 0 ${b}; }
    }
  </style></head><body><div class="n-wrap">${e.titlePage?`<div class="n-head"><div class="n-kicker">SIPRU.</div><h1 class="n-title">${n.title}</h1></div>`:""}${chapterBody(n.content||"")}</div></body></html>`}function NoteExportModal({note:n,onClose:e,onToast:o,lang:i,defaultFont:a,page:l}){const[c,s]=useDismiss(e),r=T(i||"en"),[p,b]=useState({font:a||"book",titlePage:!0}),d=g=>b(u=>({...u,...g})),f={...p,page:l};function m(g){const u=n.title.replace(/[^\wа-яёА-ЯЁ\- ]+/gi,"").trim()||"note";if(g==="pdf"){if(window.__TAURI__){if(printHTML(buildNoteHTML(n,f))){o(r("exp_toast_pdf"));return}downloadBlob(u+".html","text/html;charset=utf-8",buildNoteHTML(n,f)),o(r("exp_toast_pdf_tauri"));return}const x=window.open("","_blank");if(!x){o(r("exp_err_popup"));return}x.document.write(buildNoteHTML(n,f)),x.document.close(),setTimeout(()=>{x.focus(),x.print()},700),o(r("exp_toast_pdf"))}else if(g==="docx")try{downloadBlob(u+".docx",SipruFormats.DOCX_MIME,SipruFormats.buildDocx({title:p.titlePage?n.title:"",sections:[{html:n.content||""}],font:p.font,page:l||null})),o(r("exp_toast_docx_real"))}catch{o(r("exp_err_docx"))}else g==="txt"?(downloadBlob(u+".txt","text/plain;charset=utf-8",htmlToText(n.content)),o(r("exp_toast_txt"))):g==="md"&&(downloadBlob(u+".md","text/markdown;charset=utf-8","# "+n.title+`

`+htmlToMd(n.content)),o(r("exp_toast_md")))}return React.createElement("div",{className:"modal-scrim"+c,onMouseDown:s},React.createElement("div",{className:"modal export-modal",onMouseDown:g=>g.stopPropagation()},React.createElement("div",{className:"export-side"},React.createElement("div",{className:"modal-head"},React.createElement("div",null,React.createElement("div",{className:"eyebrow"},r("exp_note_eyebrow")),React.createElement("h2",{className:"modal-title"},n.title)),React.createElement("div",{className:"modal-head-actions"},React.createElement("button",{className:"pset-reset",onClick:()=>d({font:a||"book",titlePage:!0}),title:r("exp_reset")},React.createElement(Icon,{name:"reset",size:13})," ",r("exp_reset")),React.createElement("button",{className:"icon-btn",onClick:s},React.createElement(Icon,{name:"close",size:18})))),React.createElement("div",{className:"exp-scroll"},React.createElement("div",{className:"exp-grp"},React.createElement("div",{className:"exp-grp-h mono"},r("exp_section_decoration")),React.createElement("label",{className:"exp-toggle"},React.createElement("span",{className:"switch"+(p.titlePage?" on":""),onClick:()=>d({titlePage:!p.titlePage})},React.createElement("span",null)),r("exp_note_title_opt")))),React.createElement("div",{className:"exp-actions"},React.createElement("button",{className:"btn btn--accent",onClick:()=>m("pdf")},React.createElement(Icon,{name:"download",size:15})," PDF"),React.createElement("button",{className:"btn",onClick:()=>m("docx")},"DOCX"),React.createElement("button",{className:"btn",onClick:()=>m("txt")},"TXT"),React.createElement("button",{className:"btn",onClick:()=>m("md")},"MD"))),React.createElement("div",{className:"export-preview export-preview--pages"},React.createElement("div",{className:"export-preview-inner export-preview-inner--pages"},React.createElement(NotePagedPreview,{note:n,opts:f})))))}Object.assign(window,{BookPreview,ExportModal,NoteExportModal,htmlToText,htmlToMd,downloadBlob,buildBookDocx});
