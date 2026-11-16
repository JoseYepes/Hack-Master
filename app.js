(function(){
'use strict';
const D=window.DATA, $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const stripP=s=>s.replace(/\s*\([^()]*(\([^()]*\))?[^()]*\)\s*$/,'').trim();
const CARS=['FUE','DES','CON','INT','SAB','CAR'];
const DICE=[4,6,8,10,12,20];

/* ---------- índices ---------- */
const skills=D.skills; const byN=new Map();
skills.forEach((s,i)=>{s.i=i;s.h=norm(s.n);byN.set(norm(s.n),s);const a=norm(stripP(s.n));if(!byN.has(a))byN.set(a,s);
  const m=s.n.match(/\(([^()]*)\)\s*$/);if(m){const e=norm(m[1].replace(/[\[\]]/g,''));if(!byN.has(e))byN.set(e,s)}});
const suiteByN=new Map([...D.conjuntos,...D.oficiales,...D.estilos].map(c=>[norm(c.n),c]));
function findSkill(t){t=t.trim().replace(/\s+\d+%\+?$/,'');return byN.get(norm(t))||byN.get(norm(stripP(t)))||null}
function parseReq(req){
  if(!req||/^(n|\?|na)$/i.test(req.trim()))return [];
  return req.split(/,\s+(?![^()]*\))|\s+o\s+/).map(t=>t.trim()).filter(Boolean).map(t=>({t,s:findSkill(t)}));
}
skills.forEach(s=>{s.reqs=parseReq(s.req)});
const reqOf=new Map();skills.forEach(s=>s.reqs.forEach(r=>{if(r.s){(reqOf.get(r.s.i)||reqOf.set(r.s.i,[]).get(r.s.i)).push(s)}}));
const inSuites=new Map();D.conjuntos.forEach(c=>c.comp.forEach(n=>{const s=findSkill(n);if(s)(inSuites.get(s.i)||inSuites.set(s.i,[]).get(s.i)).push(c)}));
const acr=l=>String(l||'').split(/\s*\/\s*/).map(x=>{const m=x.trim().match(/^(.*\S)\s+\S+$/);return m?m[1]:x.trim()}).filter(Boolean);
const GLOS=[
['MJ','Manual del Jugador','Player’s Handbook, edición en castellano. Las páginas son las impresas.'],
['GMG','Guía del Director de Juego','GameMaster’s Guide.'],
['CG','Guía del Combatiente','Combatant’s Guide to Slaughtering Foes.'],
['GrG','Guía del Timador','Griftmaster’s Guide (el suplemento del grupo ladrón).'],
['SSG','Guía del Hechicero','Spellslinger’s Guide to Wurld Domination.'],
['ZG','Guía del Zelote','Zealot’s Guide to Wurld Conversion (en castellano: «Guía del Zelote para la Conversión Mundial»).'],
['PFG','Guía de las Hadas Pixie','The HackMaster Adventurer’s Guide to Pixie Fairies.'],
['KODT','Knights of the Dinner Table','Revista/suplemento de la serie Knights of the Dinner Table.'],
['HJ','HackJournal','Revista oficial. «HJ 4.05» = HackJournal 4.05 (reglas de conjuntos de habilidades); «HJ2» y «HJ8» = números 2 y 8.']];
const GLm=new Map(GLOS.map(g=>[g[0],g]));
const bookTip=b=>{const g=GLm.get(b);return g?g[1]+' ('+g[2]+')':''};
// «MJ 319 / CG 112» -> [{b:'MJ',p:'319'},{b:'CG',p:'112'}]
const refs=l=>String(l||'').split(/\s*\/\s*/).map(x=>{x=x.trim();const m=x.match(/^(.*?)\s+(\d[\d.\-]*)$/);return m?{b:m[1],p:m[2]}:{b:x,p:''}}).filter(r=>r.b);
const pagCell=s=>s.refs.map(r=>`<abbr title="${esc(bookTip(r.b))}">${esc(r.b)}</abbr>${r.p?' '+esc(r.p):''}`).join(' / ');
skills.forEach(s=>{s.refs=refs(s.libro);s.pag=parseFloat((s.refs[0]&&s.refs[0].p)||'')||0;s.ref=s.refs.map(r=>r.b).join('/')+'|'+String(s.pag).padStart(5,'0')});
const tokens=c=>String(c||'').split(/,\s*/).map(x=>x.trim()).filter(Boolean);
const link=(s,txt)=>`<a class="lnk" data-sk="${s.i}">${esc(txt||s.n)}</a>`;
const money=v=>typeof v==='number'?v.toLocaleString('es-ES')+' po':(v||'—');

const setHH=()=>document.documentElement.style.setProperty('--hh',document.querySelector('header').offsetHeight+'px');
addEventListener('resize',setHH);addEventListener('load',setHH);setHH();
/* ---------- tema y pestañas ---------- */
try{const t=localStorage.getItem('hm-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
$('#theme').onclick=()=>{const d=document.documentElement,cur=d.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');d.dataset.theme=cur==='dark'?'light':'dark';try{localStorage.setItem('hm-theme',d.dataset.theme)}catch(e){}};
function tab(id){setTimeout(setHH,0);$$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===id));$$('main>section').forEach(s=>s.hidden=s.id!==id);closeDrawer()}
$$('#tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));

/* ---------- habilidades ---------- */
const st={q:'',tipo:'',libro:'',clase:'',precio:null,dif:null,cars:new Set(),sort:'n',desc:false};
const uniq=a=>[...new Set(a)].sort((x,y)=>x.localeCompare(y,'es'));
uniq(skills.map(s=>s.tipo).filter(Boolean)).forEach(v=>$('#f-tipo').add(new Option(v,v)));
uniq(skills.flatMap(s=>acr(s.libro))).forEach(v=>$('#f-libro').add(new Option(v+(GLm.has(v)?' — '+GLm.get(v)[1]:''),v)));
uniq(skills.flatMap(s=>tokens(s.clases)).filter(c=>c!=='Todas')).forEach(v=>$('#f-clase').add(new Option(v,v)));
$('#chips').innerHTML='<span class="stat">Característica:</span>'+CARS.map(c=>`<button class="chip" data-c="${c}">${c}</button>`).join('');
$$('#chips .chip').forEach(b=>b.onclick=()=>{const c=b.dataset.c;st.cars.has(c)?st.cars.delete(c):st.cars.add(c);b.classList.toggle('on');renderTbl()});
const COLS=[['n','Habilidad'],['tipo','Tipo'],['pc','PC'],['car','Car.'],['die','Dado'],['req','Requisito'],['precio','Precio'],['dif','Dif.'],['ref','Página'],['clases','Clases']];
$('#tbl thead').innerHTML='<tr>'+COLS.map(c=>`<th data-k="${c[0]}" class="${c[2]||''}">${c[1]}</th>`).join('')+'</tr>';
COLS.forEach(c=>$('#sortsel').add(new Option(c[1],c[0])));
$('#sortsel').onchange=e=>{st.sort=e.target.value;renderTbl()};
$('#sortdir').onclick=()=>{st.desc=!st.desc;renderTbl()};
$$('#tbl th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;st.desc=st.sort===k?!st.desc:false;st.sort=k;renderTbl()});
const bind=(id,k,f=v=>v)=>$(id).addEventListener('input',e=>{st[k]=f(e.target.value);renderTbl()});
bind('#q','q',norm);bind('#f-tipo','tipo');bind('#f-libro','libro');bind('#f-clase','clase');
bind('#f-precio','precio',v=>v===''?null:+v);bind('#f-dif','dif',v=>v===''?null:+v);
$('#reset').onclick=()=>{Object.assign(st,{q:'',tipo:'',libro:'',clase:'',precio:null,dif:null});updFiltBadge();st.cars.clear();['#q','#f-tipo','#f-libro','#f-clase','#f-precio','#f-dif'].forEach(i=>$(i).value='');$$('#chips .chip').forEach(b=>b.classList.remove('on'));renderTbl()};
const fp=$('#filtpanel');
function activeFilters(){return (st.tipo?1:0)+(st.libro?1:0)+(st.clase?1:0)+(st.precio!=null?1:0)+(st.dif!=null?1:0)+st.cars.size}
function updFiltBadge(){const n=activeFilters();$('#filtbtn').textContent='Filtros'+(n?' ('+n+')':'')+(fp.classList.contains('open')?' ▲':' ▼')}
$('#filtbtn').onclick=()=>{fp.classList.toggle('open');updFiltBadge()};
function pass(s){
  if(st.q&&!st.q.split(/\s+/).every(w=>s.h.includes(w)))return false;
  if(st.tipo&&s.tipo!==st.tipo)return false;
  if(st.libro&&!acr(s.libro).includes(st.libro))return false;
  if(st.clase&&!(s.clases==='Todas'||tokens(s.clases).includes(st.clase)))return false;
  if(st.precio!=null&&!(typeof s.precio==='number'&&s.precio<=st.precio))return false;
  if(st.dif!=null&&!(typeof s.dif==='number'&&s.dif<=st.dif))return false;
  if(st.cars.size&&![...st.cars].some(c=>s.car.includes(c)))return false;
  return true}
function cmp(a,b){const k=st.sort;let x=a[k],y=b[k];const nx=typeof x==='number',ny=typeof y==='number';let r;
  if(nx&&ny)r=x-y;else if(nx)r=-1;else if(ny)r=1;else r=String(x).localeCompare(String(y),'es');return st.desc?-r:r}
function renderTbl(){
  updFiltBadge();
  const rows=skills.filter(pass).sort(cmp);
  $('#count').textContent=rows.length+' de '+skills.length+' habilidades';
  $('#sortsel').value=st.sort;$('#sortdir').textContent=st.desc?'↓':'↑';
  $$('#tbl th').forEach(th=>{th.classList.toggle('s',th.dataset.k===st.sort);th.classList.toggle('d',th.dataset.k===st.sort&&st.desc)});
  const dd=s=>s.die==='*'||s.die==='NA'?esc(s.die):'d'+esc(s.die);
  $('#tbl tbody').innerHTML=rows.map(s=>`<tr data-i="${s.i}"><td class="n">${esc(s.n)}</td><td data-l="Tipo" class="tp">${esc(s.tipo)}</td><td data-l="PC" class="num">${esc(s.pc)}</td><td data-l="Car.">${esc(s.car)}</td><td data-l="Dado" class="num">${dd(s)}</td><td data-l="Requisito" class="rq">${esc(s.req)}</td><td data-l="Precio" class="num">${typeof s.precio==='number'?s.precio+' po':esc(s.precio)}</td><td data-l="Dif." class="num">${esc(s.dif)}</td><td data-l="Página">${pagCell(s)}</td><td data-l="Clases" class="cl">${esc(s.clases)}</td></tr>`).join('');
}
$('#tbl tbody').onclick=e=>{const tr=e.target.closest('tr');if(tr)openSkill(skills[+tr.dataset.i])};

/* ---------- cajón de detalle ---------- */
function closeDrawer(){$('#drawer').hidden=true}
function openSkill(s){
  const rq=s.reqs.length?s.reqs.map(r=>r.s?link(r.s,r.t):esc(r.t)).join(', '):(s.req||'N');
  const rev=(reqOf.get(s.i)||[]).map(x=>link(x)).join(', ');
  const su=(inSuites.get(s.i)||[]).map(c=>`<span class="tag">${esc(c.n)}</span>`).join('');
  $('#drawer').innerHTML=`<button class="ghost x" id="close">✕</button><h2>${esc(s.n)}</h2><div class="stat">${esc(s.tipo)}</div>
  <dl><dt>PC</dt><dd>${esc(s.pc)}</dd><dt>Característica</dt><dd>${esc(s.car)}</dd><dt>Dado maestría</dt><dd>${s.die==='*'?'* (automática)':s.die==='NA'?'NA':'d'+esc(s.die)}</dd>
  <dt>Requisito</dt><dd>${rq}</dd><dt>Precio curso</dt><dd>${money(s.precio)}</dd><dt>Dificultad</dt><dd>${esc(s.dif)}%</dd>
  <dt>Página</dt><dd>${pagCell(s)}</dd><dt>Clases</dt><dd>${esc(s.clases)}</dd>
  ${rev?`<dt>Requisito de</dt><dd>${rev}</dd>`:''}${su?`<dt>En conjuntos</dt><dd>${su}</dd>`:''}</dl>
  <button class="ghost" id="todes">Ver descripción</button> <button class="ghost" id="tocre">Añadir al creador de conjuntos</button>`;
  $('#drawer').hidden=false;$('#close').onclick=closeDrawer;$('#todes').onclick=()=>{tab('des');$('#qd').value=s.n.replace(/\s*\([^()]*\)\s*$/,'');renderDes()};$('#tocre').onclick=()=>{tab('cre');addSkill(s)};
}
document.addEventListener('click',e=>{const a=e.target.closest('a[data-sk]');if(a){e.preventDefault();openSkill(skills[+a.dataset.sk])}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});

/* ---------- conjuntos ---------- */
const dieTxt=d=>d==='*'||d==='NA'?esc(d):(d===''||d==null?'—':'d'+esc(d));
const statRow=(name,o)=>`<tr><td class="n">${name}</td><td class="num" data-l="PC">${esc(o.pc)}</td><td data-l="Car.">${esc(o.car)}</td><td class="num" data-l="Dado">${dieTxt(o.die)}</td><td data-l="Requisito">${esc(o.req||'')}</td><td class="num" data-l="Precio">${typeof o.precio==='number'?o.precio.toLocaleString('es-ES'):esc(o.precio||'—')}</td><td class="num" data-l="Dif.">${esc(o.dif==null?'':o.dif)}</td></tr>`;
// fila desglosada de una habilidad (o de un conjunto incluido dentro de otro), como en el Excel
function compRow(n,self,txt){
  const s=findSkill(n);if(s)return statRow(link(s,txt),s);
  const o=suiteByN.get(norm(n));if(o&&o!==self)return statRow(esc(txt||o.n)+' <span class="tag">conjunto</span>',o);
  return `<tr><td class="n">${esc(txt||n)}</td><td colspan="6" class="stat">${txt?'':'No está en la lista de habilidades'}</td></tr>`}
const compTable=rows=>`<div class="tablewrap"><table class="gt ct"><thead><tr><th>Habilidad</th><th>PC</th><th>Car.</th><th>Dado</th><th>Requisito</th><th>Precio</th><th>Dif.</th></tr></thead><tbody>${rows}</tbody></table></div>`;
function suiteCard(c,kind){
  const st=kind==='st';
  const rows=st?parseReq(c.req).map(r=>compRow(r.t,c,r.t)).join(''):(c.comp||[]).map(n=>compRow(n,c)).join('');
  return `<details class="card" data-n="${esc(norm(c.n+' '+(c.comp||[]).join(' ')+(st?' '+c.req:'')))}"><summary><b>${esc(c.n)}</b><span class="stat">${st?'':`PC <strong>${esc(c.pc)}</strong> · `}${esc(c.car)} · ${dieTxt(c.die)} · <strong>${typeof c.precio==='number'?c.precio.toLocaleString('es-ES'):esc(c.precio||'—')}</strong> po · dif ${esc(c.dif===''||c.dif==null?'—':c.dif)}</span>${st?`<span class="tag">${esc(c.libro)}</span>`:''}</summary>
  <div class="body">${rows?(st?'<p class="stat">Requisitos del estilo:</p>':'')+compTable(rows):'<p class="help">Sin requisitos.</p>'}${c.clases?`<p class="stat">Clases: ${esc(c.clases)}</p>`:''}</div></details>`}
$('#conlist').innerHTML='<h3>Conjuntos del grupo</h3>'+D.conjuntos.map(c=>suiteCard(c,'mine')).join('')+'<h3>Conjuntos oficiales</h3>'+D.oficiales.filter(c=>(c.comp||[]).length).map(c=>suiteCard(c,'of')).join('')+'<h3>Estilos de combate</h3>'+D.estilos.map(c=>suiteCard(c,'st')).join('');
$('#qc').addEventListener('input',e=>{const q=norm(e.target.value).split(/\s+/).filter(Boolean);$$('#conlist .card').forEach(c=>c.hidden=!q.every(w=>c.dataset.n.includes(w)))});

/* ---------- creador ---------- */
let pick=[];
function addSkill(s,auto=true){
  if(pick.includes(s))return;pick.push(s);
  if(auto&&$('#autoreq').checked)s.reqs.forEach(r=>{if(r.s&&r.s!==s&&!pick.includes(r.s)&&r.s.reqs.every(x=>x.s!==s))addSkill(r.s,true)});
  renderBuilder()}
function calc(){
  const n=pick.length;if(!n)return null;
  const sum=k=>pick.reduce((a,s)=>a+(typeof s[k]==='number'?s[k]:0),0);
  const dice=pick.map(s=>+s.die).filter(x=>x>0);
  let die='*';if(dice.length){const avg=dice.reduce((a,b)=>a+b,0)/dice.length;die='d'+DICE.filter(d=>d<=Math.max(4,avg)).pop()}
  const cnt={};pick.forEach(s=>s.car.split(/[,/]\s*/).forEach(c=>{c=c.trim().toUpperCase();if(CARS.includes(c))cnt[c]=(cnt[c]||0)+1}));
  const top=Math.max(0,...Object.values(cnt));const car=Object.keys(cnt).filter(c=>cnt[c]===top).slice(0,3).join(', ')||'—';
  const dif=Math.max(...pick.map(s=>typeof s.dif==='number'?s.dif:-Infinity))+5;
  const sets=pick.map(s=>s.clases).filter(c=>c&&c!=='Todas').map(tokens);
  let cl='Todas';if(sets.length){const com=sets[0].filter(x=>sets.every(z=>z.includes(x)));cl=com.length?com.join(', '):'Sin clase común';}
  return {pc:sum('pc')-1,precio:Math.round(sum('precio')*1.1),dif:isFinite(dif)?dif:'—',die,car,cl,sumPC:sum('pc'),sumP:sum('precio')}}
function renderBuilder(){
  const r=calc(),w=[];
  if(pick.length>5)w.push(`Tienes ${pick.length} habilidades: el HJ 4.05 permite un máximo de 5 (los requisitos cuentan).`);
  pick.forEach(s=>s.reqs.forEach(q=>{if(q.s&&!pick.includes(q.s))w.push(`«${s.n}» requiere ${q.s.n}, que no está en el conjunto.`)}));
  if(r&&r.cl==='Sin clase común')w.push('Las habilidades no comparten ninguna clase: el conjunto no lo puede estudiar nadie.');
  $('#builder').innerHTML=pick.length?`<div class="tablewrap"><table><thead><tr><th>Habilidad</th><th>PC</th><th>Car.</th><th>Dado</th><th>Requisito</th><th>Precio</th><th>Dif.</th><th>Página</th><th></th></tr></thead><tbody>${pick.map((s,i)=>`<tr><td class="n">${link(s)}</td><td class="num">${esc(s.pc)}</td><td>${esc(s.car)}</td><td class="num">${s.die==='*'||s.die==='NA'?esc(s.die):'d'+esc(s.die)}</td><td>${esc(s.req)}</td><td class="num">${esc(s.precio)}</td><td class="num">${esc(s.dif)}</td><td>${pagCell(s)}</td><td><button class="rm" data-rm="${i}" title="Quitar">✕</button></td></tr>`).join('')}</tbody></table></div>
  <div class="result"><div><small>PC (suma−1)</small><strong>${r.pc}</strong></div><div><small>Característica</small><strong>${esc(r.car)}</strong></div><div><small>Dado</small><strong>${esc(r.die)}</strong></div><div><small>Curso (×1,1)</small><strong>${r.precio} po</strong></div><div><small>Dificultad (máx+5)</small><strong>${r.dif}%</strong></div><div><small>Clases</small><strong style="font-size:15px">${esc(r.cl)}</strong></div></div>
  ${w.map(x=>`<div class="warn">⚠ ${esc(x)}</div>`).join('')}${pick.length<=5&&!w.length?'<div class="okk">✓ Cumple las reglas del HJ 4.05.</div>':''}
  <p><button class="ghost" id="copy">Copiar resumen</button></p>`:'<p class="help">Busca y añade habilidades para empezar.</p>';
  $$('#builder [data-rm]').forEach(b=>b.onclick=()=>{pick.splice(+b.dataset.rm,1);renderBuilder()});
  const cp=$('#copy');if(cp)cp.onclick=()=>{const t=`Conjunto: ${pick.map(s=>s.n).join(', ')}\nPC ${r.pc} · ${r.car} · ${r.die} · ${r.precio} po · dificultad ${r.dif}% · ${r.cl}`;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>cp.textContent='¡Copiado!').catch(()=>prompt('Copia el texto:',t))};
}
$('#clear').onclick=()=>{pick=[];renderBuilder()};
let hl=0,cur=[];
function suggest(){
  const q=norm($('#qs').value).split(/\s+/).filter(Boolean);
  if(!q.length){$('#sugg').hidden=true;return}
  cur=skills.filter(s=>!pick.includes(s)&&q.every(w=>s.h.includes(w))).slice(0,12);hl=0;
  $('#sugg').innerHTML=cur.map((s,i)=>`<li data-i="${i}" class="${i?'':'hl'}">${esc(s.n)} <span class="stat">· ${esc(s.libro)} · ${esc(s.precio)} po</span></li>`).join('')||'<li>Sin resultados</li>';
  $('#sugg').hidden=false}
$('#qs').addEventListener('input',suggest);
$('#qs').addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();hl=Math.max(0,Math.min(cur.length-1,hl+(e.key==='ArrowDown'?1:-1)));$$('#sugg li').forEach((li,i)=>li.classList.toggle('hl',i===hl))}
  if(e.key==='Enter'&&cur[hl]){addSkill(cur[hl]);$('#qs').value='';$('#sugg').hidden=true}});
$('#sugg').onclick=e=>{const li=e.target.closest('li[data-i]');if(li){addSkill(cur[+li.dataset.i]);$('#qs').value='';$('#sugg').hidden=true;$('#qs').focus()}};

/* ---------- descripciones ---------- */
function renderDes(){
  const q=norm($('#qd').value.trim());
  const L=(D.descripciones||[]).filter(x=>!q||norm(x.n+' '+x.d).includes(q));
  $('#dcount').textContent=L.length+' de '+(D.descripciones||[]).length+' habilidades';
  $('#deslist').innerHTML=L.slice(0,200).map(x=>`<div class="duda"><b>${esc(x.n)}</b> <span class="tag">${esc(x.libro)}</span><br>${esc(x.d)}</div>`).join('')+(L.length>200?'<p class="stat">Mostrando 200; afina la búsqueda.</p>':'');
}
$('#qd').addEventListener('input',renderDes);renderDes();

/* ---------- glosario ---------- */
$('#glos').innerHTML=`<table class="gt"><thead><tr><th>Sigla</th><th>Libro</th><th>Notas</th><th>Habilidades</th></tr></thead><tbody>`+GLOS.map(g=>`<tr><td><b>${esc(g[0])}</b></td><td>${esc(g[1])}</td><td>${esc(g[2])}</td><td class="num" data-l="Habilidades con este libro">${skills.filter(s=>s.refs.some(r=>r.b===g[0])).length||'—'}</td></tr>`).join('')+`</tbody></table>`;

/* ---------- guía: tareas, reglas de la calle y procedimientos ---------- */
(function(){
  const G=window.GUIA;
  if(!G){$('#guialist').innerHTML='<p class="warn">Falta guia.js. Genéralo con build_guia.py (ver LEEME.txt).</p>';return}
  $('#gtoc').innerHTML=G.grupos.map(g=>`<div class="gtg"><b>${esc(g.t)}</b>${g.items.map(i=>`<a class="chip" href="#g-${i.id}">${esc(i.t)}</a>`).join('')}</div>`).join('');
  $('#guialist').innerHTML=G.grupos.map(g=>`<div class="ggrp"><h2 class="gh">${esc(g.t)}</h2>${g.intro?`<div class="gbody gintro">${g.intro}</div>`:''}`+
    g.items.map(i=>`<details class="card gcard" id="g-${i.id}"><summary><b>${esc(i.t)}</b></summary><div class="body gbody">${i.html||'<p class="help">Apartado pendiente de redactar en la guía.</p>'}</div></details>`).join('')+'</div>').join('');
  const cards=$$('#guialist .gcard');cards.forEach(c=>c._h=norm(c.textContent));
  const total=cards.length,allBtn=$('#gall');
  const updAll=()=>{allBtn.textContent=cards.some(c=>!c.hidden&&!c.open)?'Desplegar todo':'Plegar todo'};
  function renderGuia(){
    const q=norm($('#qg').value).trim(),ws=q.split(/\s+/).filter(Boolean);let n=0;
    cards.forEach(c=>{const ok=ws.every(w=>c._h.includes(w));c.hidden=!ok;if(ok)n++;if(q.length>1)c.open=ok});
    $$('#guialist .ggrp').forEach(g=>g.hidden=![...g.querySelectorAll('.gcard')].some(c=>!c.hidden));
    $('#gtoc').hidden=!!q;
    $('#gcount').textContent=q?`${n} de ${total} apartados contienen «${$('#qg').value.trim()}»`:`${total} apartados`;
    updAll();
  }
  $('#qg').addEventListener('input',renderGuia);
  allBtn.onclick=()=>{const abrir=cards.some(c=>!c.hidden&&!c.open);cards.forEach(c=>{if(!c.hidden)c.open=abrir});updAll()};
  cards.forEach(c=>c.addEventListener('toggle',updAll));
  function go(id){const c=document.getElementById(id);if(!c||!c.classList.contains('gcard'))return false;
    if(c.hidden){$('#qg').value='';renderGuia()}
    tab('gui');c.open=true;setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'start'}),30);return true}
  $('#gtoc').addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const id=a.getAttribute('href').slice(1);if(go(id))try{history.replaceState(null,'','#'+id)}catch(x){}});
  $('#guialist').addEventListener('click',e=>{if(e.target.tagName==='IMG')window.open(e.target.src,'_blank')});
  renderGuia();
  const h=decodeURIComponent(location.hash.slice(1));
  if(h==='gui'||h==='dow')tab(h);else if(h.indexOf('g-')===0)go(h);
})();


renderTbl();renderBuilder();
})();
