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
const tokens=c=>String(c||'').split(/,\s*/).map(x=>x.trim()).filter(Boolean);
const link=(s,txt)=>`<a class="lnk" data-sk="${s.i}">${esc(txt||s.n)}</a>`;
const money=v=>typeof v==='number'?v.toLocaleString('es-ES')+' po':(v||'—');

/* ---------- tema y pestañas ---------- */
try{const t=localStorage.getItem('hm-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}
$('#theme').onclick=()=>{const d=document.documentElement,cur=d.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');d.dataset.theme=cur==='dark'?'light':'dark';try{localStorage.setItem('hm-theme',d.dataset.theme)}catch(e){}};
function tab(id){$$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===id));$$('main>section').forEach(s=>s.hidden=s.id!==id);closeDrawer()}
$$('#tabs button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));

/* ---------- habilidades ---------- */
const st={q:'',tipo:'',libro:'',clase:'',precio:null,dif:null,cars:new Set(),sort:'n',desc:false};
const uniq=a=>[...new Set(a)].sort((x,y)=>x.localeCompare(y,'es'));
uniq(skills.map(s=>s.tipo).filter(Boolean)).forEach(v=>$('#f-tipo').add(new Option(v,v)));
uniq(skills.flatMap(s=>acr(s.libro))).forEach(v=>$('#f-libro').add(new Option(v,v)));
uniq(skills.flatMap(s=>tokens(s.clases)).filter(c=>c!=='Todas')).forEach(v=>$('#f-clase').add(new Option(v,v)));
$('#chips').innerHTML='<span class="stat">Característica:</span>'+CARS.map(c=>`<button class="chip" data-c="${c}">${c}</button>`).join('');
$$('#chips .chip').forEach(b=>b.onclick=()=>{const c=b.dataset.c;st.cars.has(c)?st.cars.delete(c):st.cars.add(c);b.classList.toggle('on');renderTbl()});
const COLS=[['n','Habilidad'],['tipo','Tipo','hide-s'],['pc','PC'],['car','Car.'],['die','Dado'],['req','Requisito','hide-s'],['precio','Precio'],['dif','Dif.','hide-s'],['libro','Libro'],['clases','Clases','hide-s']];
$('#tbl thead').innerHTML='<tr>'+COLS.map(c=>`<th data-k="${c[0]}" class="${c[2]||''}">${c[1]}</th>`).join('')+'</tr>';
$$('#tbl th').forEach(th=>th.onclick=()=>{const k=th.dataset.k;st.desc=st.sort===k?!st.desc:false;st.sort=k;renderTbl()});
const bind=(id,k,f=v=>v)=>$(id).addEventListener('input',e=>{st[k]=f(e.target.value);renderTbl()});
bind('#q','q',norm);bind('#f-tipo','tipo');bind('#f-libro','libro');bind('#f-clase','clase');
bind('#f-precio','precio',v=>v===''?null:+v);bind('#f-dif','dif',v=>v===''?null:+v);
$('#reset').onclick=()=>{Object.assign(st,{q:'',tipo:'',libro:'',clase:'',precio:null,dif:null});st.cars.clear();['#q','#f-tipo','#f-libro','#f-clase','#f-precio','#f-dif'].forEach(i=>$(i).value='');$$('#chips .chip').forEach(b=>b.classList.remove('on'));renderTbl()};
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
  const rows=skills.filter(pass).sort(cmp);
  $('#count').textContent=rows.length+' de '+skills.length+' habilidades';
  $$('#tbl th').forEach(th=>{th.classList.toggle('s',th.dataset.k===st.sort);th.classList.toggle('d',th.dataset.k===st.sort&&st.desc)});
  $('#tbl tbody').innerHTML=rows.map(s=>`<tr data-i="${s.i}"><td class="n">${esc(s.n)}</td><td class="hide-s">${esc(s.tipo)}</td><td class="num">${esc(s.pc)}</td><td>${esc(s.car)}</td><td class="num">${s.die==='*'||s.die==='NA'?esc(s.die):'d'+esc(s.die)}</td><td class="hide-s">${esc(s.req)}</td><td class="num">${typeof s.precio==='number'?s.precio:esc(s.precio)}</td><td class="num hide-s">${esc(s.dif)}</td><td>${esc(s.libro)}</td><td class="hide-s">${esc(s.clases)}</td></tr>`).join('');
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
  <dt>Libro</dt><dd>${esc(s.libro)}</dd><dt>Clases</dt><dd>${esc(s.clases)}</dd>
  ${rev?`<dt>Requisito de</dt><dd>${rev}</dd>`:''}${su?`<dt>En conjuntos</dt><dd>${su}</dd>`:''}</dl>
  <button class="ghost" id="todes">Ver descripción</button> <button class="ghost" id="tocre">Añadir al creador de conjuntos</button>`;
  $('#drawer').hidden=false;$('#close').onclick=closeDrawer;$('#todes').onclick=()=>{tab('des');$('#qd').value=s.n.replace(/\s*\([^()]*\)\s*$/,'');renderDes()};$('#tocre').onclick=()=>{tab('cre');addSkill(s)};
}
document.addEventListener('click',e=>{const a=e.target.closest('a[data-sk]');if(a){e.preventDefault();openSkill(skills[+a.dataset.sk])}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});

/* ---------- conjuntos ---------- */
function suiteCard(c,kind){
  const comps=(c.comp||[]).map(n=>{const s=findSkill(n);if(s)return link(s,n);const o=suiteByN.get(norm(n));return `<span class="tag">${esc(n)}${o?' (conjunto)':''}</span>`}).join(' · ');
  const rq=c.req?parseReq(c.req).map(r=>r.s?link(r.s,r.t):esc(r.t)).join(', ')||esc(c.req):'';
  return `<details class="card" data-n="${esc(norm(c.n+' '+(c.comp||[]).join(' ')))}"><summary><b>${esc(c.n)}</b><span class="stat">PC <strong>${esc(c.pc)}</strong> · ${esc(c.car)} · ${c.die==='*'||c.die==='NA'?esc(c.die):'d'+esc(c.die)} · <strong>${typeof c.precio==='number'?c.precio:esc(c.precio||'—')}</strong> po · dif ${esc(c.dif==null?'':c.dif)}</span><span class="tag">${esc(c.libro)}</span></summary>
  <div class="body">${comps?`<p><b>Habilidades:</b> ${comps}</p>`:''}${rq&&kind!=='mine'?`<p><b>Requisito:</b> ${rq}</p>`:''}${c.clases?`<p class="stat">Clases: ${esc(c.clases)}</p>`:''}</div></details>`}
$('#conlist').innerHTML='<h3>Conjuntos del grupo (HJ 4.05)</h3>'+D.conjuntos.map(c=>suiteCard(c,'mine')).join('')+'<h3>Conjuntos oficiales</h3>'+D.oficiales.map(c=>suiteCard(c,'of')).join('')+'<h3>Estilos de combate</h3>'+D.estilos.map(c=>suiteCard(c,'st')).join('');
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
  $('#builder').innerHTML=pick.length?`<div class="tablewrap"><table><thead><tr><th>Habilidad</th><th>PC</th><th>Car.</th><th>Dado</th><th>Requisito</th><th>Precio</th><th>Dif.</th><th>Libro</th><th></th></tr></thead><tbody>${pick.map((s,i)=>`<tr><td class="n">${link(s)}</td><td class="num">${esc(s.pc)}</td><td>${esc(s.car)}</td><td class="num">${s.die==='*'||s.die==='NA'?esc(s.die):'d'+esc(s.die)}</td><td>${esc(s.req)}</td><td class="num">${esc(s.precio)}</td><td class="num">${esc(s.dif)}</td><td>${esc(s.libro)}</td><td><button class="rm" data-rm="${i}" title="Quitar">✕</button></td></tr>`).join('')}</tbody></table></div>
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

/* ---------- dudas ---------- */
$('#dudlist').innerHTML='<h3>Dudas abiertas</h3>'+(D.dudas.length?D.dudas.map(d=>`<div class="duda"><b>${esc(d.n)}</b> <span class="tag">${esc(d.fuente)}</span><br>${esc(d.duda)}<br><span class="stat">${esc(d.hecho)}</span></div>`).join(''):'<p>Ninguna.</p>');

renderTbl();renderBuilder();
})();
