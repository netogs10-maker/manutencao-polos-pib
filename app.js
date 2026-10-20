'use strict';
const POLOS=['Almirante Tamandaré','Boqueirão','Campo Comprido','Campo Largo','Portão','Parolin','Piraquara','Uberaba'];
const SECOES={'Hidrantes':['Teste de pressão','Mangueiras','Esguicho','Abrigo','Registro'],'Extintores':['Validade','Lacre','Manômetro','Sinalização','Acesso desobstruído','Recarga'],'Alarmes':['Acionadores','Central','Sirenes','Teste de disparo'],'Vistoria técnica':['Saídas de emergência','Iluminação de emergência','Sinalização','Instalações elétricas aparentes','Rotas de fuga']};
const DIAS=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ST_TXT={concluida:'Concluída',pendente:'Pendente',atrasada:'Atrasada'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DEMO=localStorage.getItem('demo')==='1';
const DBN=DEMO?'pib-polos-exemplo':'pib-polos';
const CFGK=DEMO?'cfg-exemplo':'cfg';
// ---------- config ----------
function defCfg(){const r={};POLOS.forEach((p,i)=>r[p]={semana:Math.floor(i/2)+1,dia:i%2?4:2});return{regra:r,inicio:'2026-11',ajustes:{},equipe:'Antônio Neto'}}
let cfg=JSON.parse(localStorage.getItem(CFGK)||'null')||defCfg();
const saveCfg=()=>localStorage.setItem(CFGK,JSON.stringify(cfg));
const ym=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const iso=d=>ym(d)+'-'+String(d.getDate()).padStart(2,'0');
const pd=s=>{const[a,b,c]=s.split('-').map(Number);return new Date(a,b-1,c||1)};
const fmt=s=>{const d=pd(s);return d.toLocaleDateString('pt-BR')+' ('+DIAS[d.getDay()]+')'};
const mesNome=m=>{const d=pd(m);return MESES[d.getMonth()]+' de '+d.getFullYear()};
const addMes=(m,n)=>{const d=pd(m);d.setMonth(d.getMonth()+n);return ym(d)};
function dataPrevista(polo,mes){const k=polo+'|'+mes;if(cfg.ajustes[k])return cfg.ajustes[k];const{semana,dia}=cfg.regra[polo];const d=pd(mes);let c=0;while(true){if(d.getDay()===dia&&++c===semana)return iso(d);d.setDate(d.getDate()+1)}}
const mesesPiloto=()=>[0,1,2].map(i=>addMes(cfg.inicio,i));
// ---------- IndexedDB ----------
let dbp;function db(){return dbp||(dbp=new Promise((ok,er)=>{const r=indexedDB.open(DBN,1);r.onupgradeneeded=()=>{r.result.createObjectStore('visitas',{keyPath:'id'});r.result.createObjectStore('midias',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>er(r.error)}))}
async function tx(st,mode,fn){const d=await db();return new Promise((ok,er)=>{const t=d.transaction(st,mode);const s=t.objectStore(st);const r=fn(s);t.oncomplete=()=>ok(r&&r.result);t.onerror=()=>er(t.error)})}
const getAll=st=>tx(st,'readonly',s=>s.getAll());const get=(st,k)=>tx(st,'readonly',s=>s.get(k));const put=(st,v)=>tx(st,'readwrite',s=>s.put(v));const del=(st,k)=>tx(st,'readwrite',s=>s.delete(k));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const visitaId=(polo,mes)=>polo+'|'+mes;
function novaVisita(polo,mes){const itens={};for(const[s,l]of Object.entries(SECOES))l.forEach(i=>itens[s+'::'+i]={st:'',obs:'',midias:[],por:''});return{id:visitaId(polo,mes),polo,mes,prevista:dataPrevista(polo,mes),equipe:cfg.equipe,inicio:new Date().toISOString(),itens,concluida:false}}
function status(polo,mes,v){if(v&&v.concluida)return'concluida';return dataPrevista(polo,mes)<iso(new Date())?'atrasada':'pendente'}
const ncs=v=>v?Object.values(v.itens).filter(i=>i.st==='NC'):[];
// ---------- mídia ----------
function comprimir(file){return new Promise(ok=>{const img=new Image();img.onload=()=>{const m=1280,s=Math.min(1,m/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=img.width*s;c.height=img.height*s;c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(b=>ok(b),'image/jpeg',.72);URL.revokeObjectURL(img.src)};img.onerror=()=>ok(file);img.src=URL.createObjectURL(file)})}
const blobURL=b=>URL.createObjectURL(b);
const toDataURL=b=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(b)});
// ---------- rotas ----------
const R={};window.addEventListener('hashchange',go);
async function go(){const[h,...a]=(location.hash.slice(1)||'painel').split('/');document.querySelectorAll('nav a').forEach(x=>x.classList.toggle('on',x.getAttribute('href')==='#'+h));window.scrollTo(0,0);$('#app').innerHTML='<p class="muted">Carregando…</p>';await(R[h]||R.painel)(...a.map(decodeURIComponent))}
const mesAtual=()=>ym(new Date());
async function mapaVisitas(){const m={};(await getAll('visitas')).forEach(v=>m[v.id]=v);return m}
const exTag=()=>DEMO?' <span class="ex">EXEMPLO</span>':'';
R.painel=async()=>{const V=await mapaVisitas();const mes=mesAtual();let c=0,nc=0,at=0;let h='';
for(const p of POLOS){const v=V[visitaId(p,mes)];const s=status(p,mes,v);if(s==='concluida')c++;if(s==='atrasada')at++;const n=ncs(v).length;nc+=n;
const ult=Object.values(V).filter(x=>x.polo===p&&x.concluida).sort((a,b)=>b.fim>a.fim?1:-1)[0];
h+=`<a class="card polo" style="text-decoration:none;color:inherit" href="#visita/${encodeURIComponent(p)}/${mes}"><div><b>${p}</b><div class="muted">Prevista: ${fmt(dataPrevista(p,mes))}<br>Última visita: ${ult?new Date(ult.fim).toLocaleDateString('pt-BR'):'—'} · Não conformidades: <b style="color:${n?'var(--red)':'inherit'}">${n}</b></div></div><span class="st ${s}">${ST_TXT[s]}</span></a>`}
$('#app').innerHTML=`<h2>Painel – ${mesNome(mes)}${exTag()}</h2><div class="grid"><div class="card kpi"><b>${c}/8</b><small>visitas concluídas</small></div><div class="card kpi"><b style="color:var(--red)">${nc}</b><small>não conformidades</small></div><div class="card kpi"><b>${8-c-at}</b><small>pendentes</small></div><div class="card kpi"><b style="color:var(--red)">${at}</b><small>atrasadas</small></div></div>${h}`};
R.calendario=async(mes)=>{mes=mes||mesAtual();const V=await mapaVisitas();
const rows=POLOS.map(p=>({p,d:dataPrevista(p,mes)})).sort((a,b)=>a.d<b.d?-1:1).map(({p,d})=>{const s=status(p,mes,V[visitaId(p,mes)]);return`<div class="card"><div class="polo"><div><b>${p}</b><div class="muted">${fmt(d)}</div></div><span class="st ${s}">${ST_TXT[s]}</span></div><input type="date" value="${d}" onchange="ajustar('${p}','${mes}',this.value)"><a class="btn sec" href="#visita/${encodeURIComponent(p)}/${mes}">${s==='concluida'?'Ver visita':'Iniciar / continuar visita'}</a></div>`}).join('');
const regra=POLOS.map(p=>`<tr><td>${p}</td><td><select onchange="regra('${p}','semana',this.value)">${[1,2,3,4].map(n=>`<option ${cfg.regra[p].semana==n?'selected':''} value="${n}">${n}ª</option>`).join('')}</select></td><td><select onchange="regra('${p}','dia',this.value)">${[1,2,3,4,5,6,0].map(n=>`<option ${cfg.regra[p].dia==n?'selected':''} value="${n}">${DIAS[n]}</option>`).join('')}</select></td></tr>`).join('');
$('#app').innerHTML=`<h2>Agenda fixa mensal${exTag()}</h2><div class="grid"><a class="btn out" href="#calendario/${addMes(mes,-1)}">◀ Anterior</a><a class="btn out" href="#calendario/${addMes(mes,1)}">Próximo ▶</a></div><h3>${mesNome(mes)}</h3><p class="muted">Altere a data de um mês específico no campo de data (exceção). A regra fixa fica abaixo.</p>${rows}<h3>Regra fixa (todo mês)</h3><div class="card"><table><tr><th>Polo</th><th>Semana</th><th>Dia</th></tr>${regra}</table><button class="btn out" onclick="if(confirm('Voltar à agenda padrão?')){cfg.regra=defCfg().regra;cfg.ajustes={};saveCfg();go()}">Restaurar padrão (2 polos por semana, terça e quinta)</button></div>`};
window.ajustar=(p,m,v)=>{cfg.ajustes[p+'|'+m]=v;saveCfg();go()};
window.regra=(p,k,v)=>{cfg.regra[p][k]=+v;saveCfg();go()};
// ---------- visita ----------
let V0=null;
R.visita=async(polo,mes)=>{V0=await get('visitas',visitaId(polo,mes))||novaVisita(polo,mes);V0.prevista=dataPrevista(polo,mes);const urls={};
for(const it of Object.values(V0.itens))for(const id of it.midias){const m=await get('midias',id);if(m)urls[id]=m}
let h=`<h2>Visita – ${esc(polo)}${exTag()}</h2><div class="card"><div class="muted">Mês: ${mesNome(mes)} · Prevista: ${fmt(V0.prevista)}<br>Início: ${new Date(V0.inicio).toLocaleString('pt-BR')}${V0.fim?'<br>Concluída: '+new Date(V0.fim).toLocaleString('pt-BR'):''}</div><label>Equipe (nomes)</label><input id="equipe" value="${esc(V0.equipe)}" oninput="V0.equipe=this.value;salvar()"></div>`;
for(const[s,l]of Object.entries(SECOES)){h+=`<h3>${s}</h3><div class="card">`;l.forEach(i=>{const k=s+'::'+i,it=V0.itens[k];
h+=`<div class="item" data-k="${esc(k)}"><b>${i}</b><div class="opts">${[['OK','OK'],['NC','Não conforme'],['NA','N/A']].map(([v,t])=>`<button class="${it.st===v?'sel '+v:''}" onclick="marcar(this,'${v}')">${t}</button>`).join('')}</div>
<textarea rows="2" placeholder="Observação" oninput="item(this).obs=this.value;salvar()">${esc(it.obs)}</textarea><input placeholder="Responsável pelo item" value="${esc(it.por)}" oninput="item(this).por=this.value;salvar()">
<label class="muted" style="display:block;margin-bottom:6px"><input type="checkbox" style="width:auto" ${it.corrigido?'checked':''} onchange="item(this).corrigido=this.checked;salvar()"> Não conformidade corrigida</label><label class="file">📷 Foto<input type="file" accept="image/*" capture="environment" multiple onchange="anexar(this)"></label><label class="file">🎥 Vídeo<input type="file" accept="video/*" capture="environment" onchange="anexar(this)"></label>
<div class="thumbs">${it.midias.map(id=>urls[id]?(urls[id].tipo.startsWith('video')?`<video src="${blobURL(urls[id].blob)}" controls></video>`:`<img src="${blobURL(urls[id].blob)}">`):'').join('')}</div>${it.quando?`<div class="muted">Registrado em ${new Date(it.quando).toLocaleString('pt-BR')}</div>`:''}</div>`});h+='</div>'}
h+=`<h3>Assinatura do responsável</h3><div class="card"><input id="assNome" placeholder="Nome de quem assina" value="${esc(V0.assNome||'')}" oninput="V0.assNome=this.value;salvar()"><canvas class="sig" id="sig"></canvas><button class="btn out" onclick="V0.assinatura='';salvar();go()">Limpar assinatura</button></div>
<button class="btn" id="concluir" onclick="concluir()">✔ Concluir visita</button><button class="btn sec" onclick="pdfVisita(V0)">📄 Gerar relatório (PDF)</button><button class="btn out" onclick="if(confirm('Apagar esta visita?')){del('visitas',V0.id);location.hash='#painel'}">Apagar visita</button>`;
$('#app').innerHTML=h;assinatura()};
const item=el=>V0.itens[el.closest('.item').dataset.k];
let tS;window.salvar=()=>{clearTimeout(tS);tS=setTimeout(()=>put('visitas',V0),300)};
window.marcar=(b,v)=>{const it=item(b);it.st=v;it.quando=new Date().toISOString();if(!it.por)it.por=V0.equipe.split(',')[0];b.parentNode.querySelectorAll('button').forEach(x=>x.className='');b.className='sel '+v;put('visitas',V0)};
window.anexar=async inp=>{const it=item(inp);const th=inp.closest('.item').querySelector('.thumbs');for(const f of inp.files){let b=f;if(f.type.startsWith('image'))b=await comprimir(f);const id=uid();await put('midias',{id,blob:b,tipo:b.type||f.type,nome:f.name,quando:new Date().toISOString()});it.midias.push(id);
const el=document.createElement(b.type.startsWith('video')||f.type.startsWith('video')?'video':'img');el.src=blobURL(b);if(el.tagName==='VIDEO')el.controls=true;th.appendChild(el)}await put('visitas',V0);inp.value=''};
function assinatura(){const c=$('#sig');const r=c.getBoundingClientRect();c.width=r.width;c.height=r.height;const g=c.getContext('2d');g.lineWidth=2.5;g.lineCap='round';g.strokeStyle='#0b1f3a';
if(V0.assinatura){const i=new Image();i.onload=()=>g.drawImage(i,0,0,c.width,c.height);i.src=V0.assinatura}let d=false;const P=e=>{const b=c.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top]};
c.onpointerdown=e=>{d=true;g.beginPath();g.moveTo(...P(e))};c.onpointermove=e=>{if(d){g.lineTo(...P(e));g.stroke()}};c.onpointerup=c.onpointerleave=()=>{if(d){d=false;V0.assinatura=c.toDataURL();salvar()}}}
window.concluir=async()=>{const pend=Object.values(V0.itens).filter(i=>!i.st).length;if(pend&&!confirm(pend+' item(ns) sem marcação. Concluir mesmo assim?'))return;V0.concluida=true;V0.fim=new Date().toISOString();await put('visitas',V0);alert('Visita concluída e salva neste aparelho.');go()};
// ---------- PDF ----------
const NAVY=[11,31,58],RED=[200,16,46],GOLD=[224,165,38];
function pdfBase(titulo,sub){const doc=new jspdf.jsPDF({unit:'mm',format:'a4'});doc._y=0;doc._t=titulo;doc._s=sub;cab(doc);return doc}
function cab(doc){doc.setFillColor(...NAVY);doc.rect(0,0,210,24,'F');doc.setFillColor(...RED);doc.rect(0,24,210,2,'F');doc.setTextColor(255);doc.setFontSize(14);doc.setFont('helvetica','bold');doc.text('NR Treinamentos Assessoria Curitiba – '+doc._t,12,11);doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(...GOLD);doc.text(doc._s+(DEMO?'   [EXEMPLO – dados fictícios]':''),12,18);doc.setTextColor(30);doc._y=34}
function esp(doc,h){if(doc._y+h>282){doc.addPage();cab(doc)}}
function linha(doc,txt,o={}){doc.setFontSize(o.size||10);doc.setFont('helvetica',o.bold?'bold':'normal');doc.setTextColor(...(o.cor||[30,30,30]));const l=doc.splitTextToSize(String(txt),o.w||186);esp(doc,l.length*(o.size||10)*.42+1);doc.text(l,o.x||12,doc._y);doc._y+=l.length*(o.size||10)*.42+1.5}
function secao(doc,t){esp(doc,12);doc._y+=2;doc.setFillColor(...GOLD);doc.rect(12,doc._y-4.5,2,6,'F');linha(doc,t,{bold:true,size:12,cor:NAVY,x:16})}
function rodape(doc){const n=doc.getNumberOfPages();for(let i=1;i<=n;i++){doc.setPage(i);doc.setFontSize(8);doc.setTextColor(120);doc.text('Gerado em '+new Date().toLocaleString('pt-BR')+' · página '+i+'/'+n,12,292)}}
async function corpoVisita(doc,v){const n=ncs(v);linha(doc,`Polo: ${v.polo}    Mês: ${mesNome(v.mes)}`,{bold:true,size:12,cor:NAVY});
linha(doc,`Data prevista: ${fmt(v.prevista||dataPrevista(v.polo,v.mes))}   Início: ${new Date(v.inicio).toLocaleString('pt-BR')}   ${v.fim?'Conclusão: '+new Date(v.fim).toLocaleString('pt-BR'):'Situação: em andamento'}`);
linha(doc,'Equipe: '+(v.equipe||'—'));const t=Object.values(v.itens);linha(doc,`Resumo: ${t.filter(i=>i.st==='OK').length} OK · ${n.length} não conformes · ${t.filter(i=>i.st==='NA').length} N/A · ${t.filter(i=>!i.st).length} sem marcação`,{bold:true});
if(n.length){secao(doc,'NÃO CONFORMIDADES');for(const[k,i]of Object.entries(v.itens))if(i.st==='NC'){esp(doc,10);doc.setFillColor(253,231,234);const l=doc.splitTextToSize(k.replace('::',' › ')+(i.obs?' – '+i.obs:''),180);doc.rect(12,doc._y-4,186,l.length*4.3+2,'F');linha(doc,l.join(' '),{bold:true,cor:RED,x:14,w:182})}}
for(const[s,l]of Object.entries(SECOES)){secao(doc,s);for(const it of l){const i=v.itens[s+'::'+it];const st={OK:'OK',NC:'NÃO CONFORME',NA:'N/A'}[i.st]||'—';esp(doc,8);doc.setFontSize(10);doc.setFont('helvetica','bold');doc.setTextColor(...(i.st==='NC'?RED:i.st==='OK'?[30,142,62]:[100,100,100]));doc.text(st,160,doc._y);linha(doc,it+(i.por?'  ('+i.por+')':''),{w:140});if(i.obs)linha(doc,'Obs.: '+i.obs,{size:9,cor:[90,90,90],x:16,w:140});
const ims=[];let vid=0;for(const id of i.midias){const m=await get('midias',id);if(!m)continue;if(m.tipo.startsWith('image'))ims.push(m);else vid++}
if(ims.length){esp(doc,32);let x=16;for(const m of ims.slice(0,5)){try{doc.addImage(await toDataURL(m.blob),'JPEG',x,doc._y,36,27)}catch(e){}x+=38}doc._y+=30}if(vid)linha(doc,`🎥 ${vid} vídeo(s) anexado(s) – disponíveis no aplicativo/backup`.replace('🎥 ',''),{size:9,cor:NAVY,x:16})}}
secao(doc,'ASSINATURA');esp(doc,34);if(v.assinatura)try{doc.addImage(v.assinatura,'PNG',14,doc._y,70,20)}catch(e){}doc._y+=22;doc.setDrawColor(80);doc.line(14,doc._y,100,doc._y);doc._y+=4;linha(doc,(v.assNome||'Responsável')+' – NR Treinamentos Assessoria',{size:9})}
async function compartilhar(doc,nome){const blob=doc.output('blob');const f=new File([blob],nome,{type:'application/pdf'});window._ultimoPDF=blob;
if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:nome,text:'Relatório da NR Treinamentos Assessoria'});return}catch(e){if(e.name==='AbortError')return}}
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=nome;a.click()}
window.pdfVisita=async v=>{const doc=pdfBase('Relatório de visita',v.polo+' · '+mesNome(v.mes));await corpoVisita(doc,v);rodape(doc);await compartilhar(doc,`Relatorio_${v.polo.replace(/\W+/g,'_')}_${v.mes}.pdf`)};
function indicadores(V,meses){let prev=0,feitas=0,prazo=0,nc=0,corr=0;for(const m of meses)for(const p of POLOS){prev++;const v=V[visitaId(p,m)];if(v&&v.concluida){feitas++;if(v.fim.slice(0,10)<=dataPrevista(p,m))prazo++}for(const i of ncs(v)){nc++}if(v)corr+=Object.values(v.itens).filter(i=>i.corrigido).length}return{prev,feitas,prazo,nc,corr}}
async function pdfPeriodo(meses,titulo){const V=await mapaVisitas();const doc=pdfBase(titulo,meses.length>1?mesNome(meses[0])+' a '+mesNome(meses.at(-1)):mesNome(meses[0]));const k=indicadores(V,meses);
secao(doc,'INDICADORES');linha(doc,`Visitas previstas: ${k.prev}   Realizadas: ${k.feitas}   No prazo: ${k.prazo} (${k.prev?Math.round(k.prazo/k.prev*100):0}%)`,{bold:true});linha(doc,`Não conformidades encontradas: ${k.nc}   Corrigidas: ${k.corr}`,{bold:true});
for(const m of meses){secao(doc,'Resumo – '+mesNome(m));for(const p of POLOS){const v=V[visitaId(p,m)];const s=status(p,m,v);linha(doc,`${p}: ${ST_TXT[s]} · prevista ${fmt(dataPrevista(p,m))}${v&&v.fim?' · realizada '+new Date(v.fim).toLocaleDateString('pt-BR'):''} · NC: ${ncs(v).length}`,{cor:s==='atrasada'?RED:[30,30,30]});
for(const[kk,i]of Object.entries(v?v.itens:{}))if(i.st==='NC')linha(doc,'   • '+kk.replace('::',' › ')+(i.obs?' – '+i.obs:'')+(i.corrigido?' (corrigida)':''),{size:9,cor:RED,x:18})}}
for(const m of meses)for(const p of POLOS){const v=V[visitaId(p,m)];if(v&&v.concluida&&meses.length===1){doc.addPage();cab(doc);await corpoVisita(doc,v)}}
rodape(doc);await compartilhar(doc,`Relatorio_${titulo.replace(/\W+/g,'_')}_${meses[0]}.pdf`)}
R.relatorios=async()=>{const V=await mapaVisitas();const lista=Object.values(V).sort((a,b)=>a.id<b.id?-1:1);const mes=mesAtual();
$('#app').innerHTML=`<h2>Relatórios${exTag()}</h2><div class="card"><label>Mês do relatório consolidado</label><input type="month" id="mesR" value="${mes}"><button class="btn sec" onclick="pdfPeriodo([$('#mesR').value],'Relatório mensal consolidado')">📄 Relatório mensal (todos os polos)</button><button class="btn gold" onclick="pdfPeriodo(mesesPiloto(),'Relatório final do piloto (3 meses)')">📊 Relatório final do piloto – 3 meses</button></div><h3>Por visita</h3>${lista.length?lista.map(v=>`<div class="card polo"><div><b>${esc(v.polo)}</b><div class="muted">${mesNome(v.mes)} · ${v.concluida?'Concluída':'Em andamento'} · NC: ${ncs(v).length}</div></div><button class="btn sec" style="width:auto;padding:10px 14px" onclick="abrirPDF('${esc(v.id)}')">PDF</button></div>`).join(''):'<p class="muted">Nenhuma visita registrada ainda.</p>'}`};
window.abrirPDF=async id=>pdfVisita(await get('visitas',id));
// ---------- proposta ----------
R.proposta=async()=>{const V=await mapaVisitas();const ms=mesesPiloto();const k=indicadores(V,ms);
const crono=ms.map(m=>`<h3>${mesNome(m)}</h3><div class="card"><table>${POLOS.map(p=>({p,d:dataPrevista(p,m)})).sort((a,b)=>a.d<b.d?-1:1).map(({p,d})=>`<tr><td>${p}</td><td><input type="date" value="${d}" style="margin:0;padding:6px" onchange="ajustar('${p}','${m}',this.value)"></td></tr>`).join('')}</table></div>`).join('');
$('#app').innerHTML=`<div class="banner"><h2>Proposta – Piloto de 3 meses</h2><p>Manutenção preventiva mensal nos 8 polos da PIB Curitiba</p><p>Responsável: Antônio Neto e equipe de brigada</p></div>
<h3>Objetivo</h3><div class="card">Demonstrar, em 3 meses, a qualidade e a eficiência de uma rotina fixa de manutenção preventiva: cada polo recebe 1 visita por mês em data marcada, com checklist técnico, registro em fotos e vídeos e relatório entregue à liderança. Ao final, a PIB decide com base em indicadores reais.</div>
<h3>O que cada visita inclui</h3><div class="card">${Object.entries(SECOES).map(([s,l])=>`<b>${s}:</b> ${l.join(', ').toLowerCase()}.`).join('<br>')}<br><br>Cada item é marcado como OK, Não conforme ou N/A, com observação, fotos/vídeos, responsável e data/hora automáticas.</div>
<h3>Cronograma – 24 visitas (8 polos × 3 meses)</h3><div class="card"><label>Mês de início do piloto</label><input type="month" value="${cfg.inicio}" onchange="cfg.inicio=this.value;saveCfg();go()"><span class="muted">Padrão: 2 polos por semana, terças e quintas. As datas podem ser ajustadas abaixo.</span></div>${crono}
<h3>Entregas</h3><div class="card">✓ Relatório por visita com fotos, vídeos, não conformidades e assinatura<br>✓ Relatório mensal consolidado dos 8 polos<br>✓ Relatório final dos 3 meses com indicadores: visitas realizadas no prazo, não conformidades encontradas e corrigidas<br>✓ Painel de acompanhamento com a situação de cada polo</div>
<h3>Indicadores do piloto${exTag()}</h3><div class="grid"><div class="card kpi"><b>${k.feitas}/${k.prev}</b><small>visitas realizadas</small></div><div class="card kpi"><b>${k.prev?Math.round(k.prazo/k.prev*100):0}%</b><small>no prazo</small></div><div class="card kpi"><b style="color:var(--red)">${k.nc}</b><small>NC encontradas</small></div><div class="card kpi"><b style="color:var(--ok)">${k.corr}</b><small>NC corrigidas</small></div></div>
<h3>Relatórios de exemplo</h3><div class="card">${DEMO?'':'<p class="muted">Ative o modo Exemplo em Ajustes para ver relatórios com dados fictícios.</p>'}<button class="btn sec" onclick="pdfPeriodo([cfg.inicio],'Relatório mensal consolidado')">📄 Relatório mensal</button><button class="btn gold" onclick="pdfPeriodo(mesesPiloto(),'Relatório final do piloto (3 meses)')">📊 Relatório final – 3 meses</button></div>
<h3>Investimento</h3><div class="card"><b>A definir.</b></div>`};
// ---------- ajustes / backup ----------
R.config=async()=>{$('#app').innerHTML=`<h2>Ajustes</h2><div class="card"><label>Equipe padrão (nomes separados por vírgula)</label><input value="${esc(cfg.equipe)}" onchange="cfg.equipe=this.value;saveCfg()"></div>
<h3>Modo Exemplo (apresentação)</h3><div class="card"><p>${DEMO?'<b style="color:var(--red)">Ativado.</b> Você está vendo dados FICTÍCIOS de exemplo, separados dos dados reais.':'Desativado. Você está vendo os dados reais.'}</p><button class="btn gold" onclick="localStorage.setItem('demo','${DEMO?0:1}');location.hash='#painel';location.reload()">${DEMO?'Voltar aos dados reais':'Ativar modo Exemplo'}</button>${DEMO?'<button class="btn out" onclick="gerarExemplo()">Recriar dados de exemplo</button>':''}</div>
<h3>Backup</h3><div class="card"><p class="muted">Os dados ficam só neste aparelho. Exporte o backup com frequência (ex.: após cada visita) e guarde no Google Drive ou WhatsApp.</p><button class="btn sec" onclick="exportar()">⬇ Exportar backup (.zip)</button><label class="btn out">⬆ Importar backup<input type="file" accept=".zip" style="display:none" onchange="importar(this.files[0])"></label></div>
<div class="card muted"><b>Limitação:</b> sem sincronização na nuvem – cada celular guarda seus próprios dados. Uma versão futura pode sincronizar a equipe toda (ex.: Firebase ou Supabase), com acesso pela liderança.</div>`};
window.exportar=async()=>{const z=new JSZip();const vs=await getAll('visitas'),ms=await getAll('midias');z.file('dados.json',JSON.stringify({versao:1,cfg,visitas:vs,midias:ms.map(m=>({id:m.id,tipo:m.tipo,nome:m.nome,quando:m.quando}))}));ms.forEach(m=>z.file('midias/'+m.id,m.blob));
const b=await z.generateAsync({type:'blob'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=`backup-brigada-pib-${iso(new Date())}${DEMO?'-exemplo':''}.zip`;a.click()};
window.importar=async f=>{if(!f)return;const z=await JSZip.loadAsync(f);const d=JSON.parse(await z.file('dados.json').async('string'));for(const m of d.midias){const fz=z.file('midias/'+m.id);if(fz)await put('midias',{...m,blob:new Blob([await fz.async('arraybuffer')],{type:m.tipo})})}for(const v of d.visitas)await put('visitas',v);if(d.cfg){cfg=d.cfg;saveCfg()}alert('Backup importado: '+d.visitas.length+' visita(s).');go()};
// ---------- exemplo ----------
function fotoEx(txt,cor){const c=document.createElement('canvas');c.width=640;c.height=480;const g=c.getContext('2d');g.fillStyle=cor;g.fillRect(0,0,640,480);g.fillStyle='#fff';g.font='bold 40px sans-serif';g.textAlign='center';g.fillText('EXEMPLO',320,200);g.font='28px sans-serif';g.fillText(txt,320,260);return new Promise(ok=>c.toBlob(ok,'image/jpeg',.7))}
window.gerarExemplo=async()=>{if(!DEMO)return;const d=await db();await new Promise(ok=>{const t=d.transaction(['visitas','midias'],'readwrite');t.objectStore('visitas').clear();t.objectStore('midias').clear();t.oncomplete=ok});
const hoje=iso(new Date());const meses=[...new Set([addMes(mesAtual(),-1),mesAtual(),...mesesPiloto()])];const nomes=['Antônio Neto','Carlos Silva','Juliana Rocha','Marcos Lima'];
const probl=[['Extintores::Validade','Extintor PQS 4kg do salão vencido – enviado para recarga'],['Hidrantes::Mangueiras','Mangueira com ressecamento no abrigo 2'],['Vistoria técnica::Iluminação de emergência','2 luminárias sem bateria no corredor'],['Alarmes::Sirenes','Sirene do 1º andar com som baixo'],['Extintores::Acesso desobstruído','Cadeiras empilhadas na frente do extintor']];
let n=0;for(const m of meses)for(const p of POLOS){const prev=dataPrevista(p,m);n++;const v=novaVisita(p,m);v.equipe=nomes.slice(0,2+(n%2)).join(', ');v.inicio=prev+'T09:00:00';
for(const[k,i]of Object.entries(v.itens)){i.st=k.includes('Recarga')&&n%2?'NA':'OK';i.por=nomes[n%4];i.quando=prev+'T09:30:00'}
const pr=probl[n%probl.length];if(n%2){v.itens[pr[0]].st='NC';v.itens[pr[0]].obs=pr[1];v.itens[pr[0]].corrigido=n%4===1;const id=uid();await put('midias',{id,blob:await fotoEx(pr[0].split('::')[1],'#c8102e'),tipo:'image/jpeg',nome:'ex.jpg'});v.itens[pr[0]].midias.push(id)}
const id2=uid();await put('midias',{id:id2,blob:await fotoEx('Hidrante – '+p,'#0b1f3a'),tipo:'image/jpeg',nome:'ex.jpg'});v.itens['Hidrantes::Teste de pressão'].midias.push(id2);v.itens['Hidrantes::Teste de pressão'].obs='Pressão estática 4,5 kgf/cm² (exemplo)';
v.concluida=!(m===mesesPiloto()[2]&&n%4===0);if(!v.concluida){await put('visitas',v);continue}v.fim=prev+(n%6===0?'T23:59:00':'T11:00:00');if(n%6===0){const d2=pd(prev);d2.setDate(d2.getDate()+3);v.fim=iso(d2)+'T11:00:00'}v.assNome='Antônio Neto';await put('visitas',v)}
localStorage.setItem('exemploOk','1');go()};
// ---------- início ----------
if(DEMO){$('#demoTag').classList.remove('hidden');document.title='[EXEMPLO] '+document.title}
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
(async()=>{if(DEMO&&!(await getAll('visitas')).length)await gerarExemplo();go()})();
