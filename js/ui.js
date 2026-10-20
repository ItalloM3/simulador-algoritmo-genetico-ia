(function(){
'use strict';
/* Interface: lê os campos, valida, controla a execução e desenha as telas.
   Usa o motor definido em engine.js. */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let projUI=[
  {nome:'Melhoria da iluminação',custo:'4000.00',ben:'7'},
  {nome:'Instalação de bicicletários',custo:'3000.00',ben:'5'},
  {nome:'Aquisição de bancos',custo:'2000.00',ben:'3'},
  {nome:'Reforma de espaço de convivência',custo:'5000.00',ben:'8'}
];
let motor=null, snapshot='', rodando=false, timer=null, vg=0, histRend=0;
const MIN_P=4, MAX_P=15;

/* ---------- Lista de projetos ---------- */
function renderProjetos(){
  const box=$('#lista-proj'); box.innerHTML='';
  projUI.forEach((p,i)=>{
    const d=document.createElement('div');
    d.innerHTML=`<div class="proj">
      <span class="letra" title="Posição ${i+1} do cromossomo">${LETRAS[i]}</span>
      <input type="text" data-i="${i}" data-k="nome" value="${esc(p.nome)}" aria-label="Nome do projeto ${LETRAS[i]}" autocomplete="off">
      <input type="text" data-i="${i}" data-k="custo" value="${esc(p.custo)}" inputmode="decimal" aria-label="Custo do projeto ${LETRAS[i]} em reais" autocomplete="off">
      <input type="text" data-i="${i}" data-k="ben" value="${esc(p.ben)}" inputmode="decimal" aria-label="Benefício do projeto ${LETRAS[i]} em pontos" autocomplete="off">
      <button type="button" class="btn mini" data-rem="${i}" aria-label="Remover projeto ${LETRAS[i]}" ${projUI.length<=MIN_P?'disabled':''}>×</button>
      <div class="rowerr" id="perr-${i}"></div></div>`;
    box.appendChild(d.firstElementChild);
  });
  $('#btn-add').disabled=projUI.length>=MAX_P;
  $('#cont-proj').textContent=`${projUI.length} de ${MAX_P} projetos (mínimo ${MIN_P})`;
}
$('#lista-proj').addEventListener('input',e=>{
  const t=e.target; if(t.dataset.i===undefined) return;
  projUI[+t.dataset.i][t.dataset.k]=t.value; aoAlterar();
});
$('#lista-proj').addEventListener('click',e=>{
  const b=e.target.closest('[data-rem]'); if(!b||b.disabled) return;
  if(projUI.length<=MIN_P) return;
  projUI.splice(+b.dataset.rem,1); renderProjetos(); aoAlterar();
});
$('#btn-add').addEventListener('click',()=>{
  if(projUI.length>=MAX_P) return;
  projUI.push({nome:`Projeto ${LETRAS[projUI.length]}`,custo:'1000.00',ben:'1'});
  renderProjetos(); aoAlterar();
  const ins=document.querySelectorAll('#lista-proj input[data-k=nome]'); ins[ins.length-1].focus();
});

/* ---------- Validação ---------- */
const reInt=/^\d+$/, reSeed=/^-?\d+$/, reDin=/^\d+([.,]\d{1,2})?$/, rePct=/^\d+([.,]\d+)?$/;
function lerDin(s){ s=String(s).trim(); if(s==='') return {e:'Campo obrigatório.'}; if(!reDin.test(s)) return {e:'Use um número com até 2 casas decimais.'};
  const v=Number(s.replace(',','.')); if(!Number.isFinite(v)||v>1e10) return {e:'Valor muito grande.'}; return {v}; }
function lerInt(s){ s=String(s).trim(); if(s==='') return {e:'Campo obrigatório.'}; if(!reInt.test(s)) return {e:'Digite um número inteiro.'};
  const v=Number(s); if(!Number.isSafeInteger(v)) return {e:'Valor muito grande.'}; return {v}; }

function validar(){
  let ok=true; const cfg={};
  const marca=(id,msg)=>{ const el=$('#'+id), er=$('#err-'+id); if(er) er.textContent=msg||''; el.setAttribute('aria-invalid',msg?'true':'false'); if(msg){ ok=false; const d=el.closest('details'); if(d) d.open=true; } };

  // projetos
  cfg.projetos=[];
  projUI.forEach((p,i)=>{
    const msgs=[]; const nome=p.nome.trim();
    if(!nome) msgs.push('Informe o nome.');
    const c=lerDin(p.custo); let custoC=0;
    if(c.e) msgs.push('Custo: '+c.e); else { custoC=Math.round(c.v*100); if(custoC<=0) msgs.push('Custo: deve ser maior que zero.'); }
    const b=lerDin(p.ben); let benH=0;
    if(b.e) msgs.push('Benefício: '+b.e);
    else benH=Math.round(b.v*100);
    const row=document.querySelectorAll('#lista-proj .proj')[i];
    if(row){
      row.querySelector('[data-k=nome]').setAttribute('aria-invalid',!nome);
      row.querySelector('[data-k=custo]').setAttribute('aria-invalid',!!c.e||custoC<=0);
      row.querySelector('[data-k=ben]').setAttribute('aria-invalid',!!b.e);
      row.querySelector('.rowerr').textContent=msgs.join(' ');
    }
    if(msgs.length) ok=false;
    cfg.projetos.push({nome,custoC,benH});
  });
  if(projUI.length<MIN_P||projUI.length>MAX_P) ok=false;

  // orçamento
  const o=lerDin($('#orc').value); marca('orc',o.e); if(!o.e) cfg.orcC=Math.round(o.v*100);

  // inteiros
  const pop=lerInt($('#pop').value); let m=pop.e; if(!m&&pop.v<2) m='O tamanho mínimo é 2.'; marca('pop',m); if(!m) cfg.pop=pop.v;
  const ger=lerInt($('#ger').value); m=ger.e; if(!m&&ger.v<1) m='O mínimo é 1 geração.'; marca('ger',m); if(!m) cfg.geracoes=ger.v;

  for(const [id,chave] of [['cx','cx'],['mut','mut']]){
    const s=$('#'+id).value.trim(); let msg='', v;
    if(s==='') msg='Campo obrigatório.'; else if(!rePct.test(s)) msg='Digite um percentual entre 0 e 100.';
    else { v=Number(s.replace(',','.')); if(!(v>=0&&v<=100)) msg='O percentual deve estar entre 0 e 100.'; }
    marca(id,msg); if(!msg) cfg[chave]=v;
  }

  const popOk=cfg.pop!==undefined;
  $('#dica-tor').textContent=popOk?`Inteiro entre 2 e ${cfg.pop}.`:'Inteiro entre 2 e o tamanho da população.';
  $('#dica-eli').textContent=popOk?`Inteiro entre 0 e ${cfg.pop-1}.`:'Inteiro entre 0 e população − 1.';
  const tor=lerInt($('#tor').value); m=tor.e;
  if(!m&&tor.v<2) m='O tamanho mínimo é 2.';
  if(!m&&popOk&&tor.v>cfg.pop) m=`Não pode passar de ${cfg.pop} (tamanho da população).`;
  if(!m&&!popOk) m='Corrija o tamanho da população.';
  marca('tor',m); if(!m) cfg.torneio=tor.v;
  const eli=lerInt($('#eli').value); m=eli.e;
  if(!m&&popOk&&eli.v>cfg.pop-1) m=`Não pode passar de ${cfg.pop-1} (população − 1).`;
  if(!m&&!popOk) m='Corrija o tamanho da população.';
  marca('eli',m); if(!m) cfg.elite=eli.v;

  const sd=$('#seed').value.trim(); m='';
  if(sd==='') m='Campo obrigatório.'; else if(!reSeed.test(sd)||!Number.isSafeInteger(Number(sd))) m='Digite um número inteiro.';
  marca('seed',m); if(!m) cfg.seed=Number(sd);

  return ok?cfg:null;
}
function rawSnapshot(){ return JSON.stringify([projUI,['orc','pop','ger','cx','mut','tor','eli','seed'].map(i=>$('#'+i).value.trim())]); }

function aoAlterar(){ validar(); atualizarBotoes(); }
['orc','pop','ger','cx','mut','tor','eli','seed'].forEach(id=>$('#'+id).addEventListener('input',aoAlterar));

/* ---------- Estado e botões ---------- */
function atualizarBotoes(){
  const cfg=validar();
  const sujo=rawSnapshot()!==snapshot;
  const fim=motor&&motor.terminou;
  const podeAvancar=!!cfg&&!sujo&&!rodando&&!fim;
  $('#btn-exec').disabled=!podeAvancar;
  $('#btn-passo').disabled=!podeAvancar;
  $('#btn-pausa').disabled=!rodando;
  $('#btn-reset').disabled=!cfg;
  $('#cfg').disabled=rodando;
  const av=$('#aviso');
  if(!cfg){ av.hidden=false; av.textContent='Há campos inválidos. Corrija-os para executar ou reiniciar.'; }
  else if(sujo){ av.hidden=false; av.textContent='Dados ou parâmetros alterados. Clique em Reiniciar para aplicar as mudanças.'; }
  else av.hidden=true;
  const v=k=>$('#'+k).value.trim();
  $('#resumo-fino').textContent=`Cruzamento ${v('cx')}% · mutação ${v('mut')}% · torneio ${v('tor')} · elite ${v('eli')} · semente ${v('seed')}`;
  const st=$('#estado'); st.className='estado';
  if(rodando){ st.textContent='Executando'; st.classList.add('run'); }
  else if(fim){ st.textContent='Concluído'; st.classList.add('fim'); }
  else if(sujo) st.textContent='Reinício necessário';
  else if(motor&&motor.gen>0) st.textContent='Pausado';
  else st.textContent='Pronto';
}

/* ---------- Ciclo de execução ---------- */
function parar(){ rodando=false; clearTimeout(timer); timer=null; }
function passo(auto){
  motor.avancar(); vg=motor.gen;
  atualizarTudo(); selecionarEvento(0,$('#chk-anim').checked,auto);
}
function ciclo(){
  if(!rodando) return;
  passo(true);
  if(motor.terminou){ parar(); atualizarBotoes(); return; }
  timer=setTimeout(ciclo,+$('#veloc').value);
}
$('#btn-exec').addEventListener('click',()=>{ if(motor.terminou) return; rodando=true; atualizarBotoes(); ciclo(); });
$('#btn-pausa').addEventListener('click',()=>{ parar(); atualizarBotoes(); });
$('#btn-passo').addEventListener('click',()=>{ if(motor.terminou) return; passo(false); atualizarBotoes(); });
$('#btn-reset').addEventListener('click',reiniciar);

function reiniciar(){
  parar();
  const cfg=validar(); if(!cfg){ atualizarBotoes(); return; }
  motor=new Motor(cfg); snapshot=rawSnapshot(); vg=0; histRend=0; $('#hist').innerHTML='';
  atualizarTudo(); selecionarEvento(0,false,false); atualizarBotoes();
}

/* ---------- Renderização ---------- */
function bitsHTML(g,cls=''){ return `<span class="bits ${cls}">${g.map((x,i)=>`<span class="bit b${x}" title="${esc(motor.cfg.projetos[i].nome)}"><b>${x}</b><i>${LETRAS[i]}</i></span>`).join('')}</span>`; }
function nomesDe(esc_){ return esc_.length?esc_.map(i=>motor.cfg.projetos[i].nome).join(', '):'nenhum projeto'; }

function atualizarTudo(){
  const m=motor, h=m.hist[m.hist.length-1];
  $('#m-gen').textContent=m.gen; $('#m-gen-de').textContent=`de ${m.cfg.geracoes}`;
  $('#m-barra').style.width=(100*m.gen/m.cfg.geracoes)+'%';
  $('#m-melhor').textContent=fmtPts(h.melhor);
  $('#m-media').textContent=(h.media/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  $('#m-acum').textContent=fmtPts(h.acum);
  atualizarSolucao(); atualizarGrafico(); atualizarHistorico(); atualizarPopulacao(); atualizarLog();
  atualizarBotoes();
}

function atualizarSolucao(){
  const b=motor.melhor;
  $('#tag-final').hidden=!motor.terminou;
  $('#sol').innerHTML=`
    <div><div class="contador">Cromossomo</div>${bitsHTML(b.g,'lg')}
      <div class="chips">${b.escolhidos.length?b.escolhidos.map(i=>`<span class="chip">${LETRAS[i]} · ${esc(motor.cfg.projetos[i].nome)}</span>`).join(''):'<span class="vazio">Nenhum projeto selecionado</span>'}</div></div>
    <dl>
      <dt>Custo total</dt><dd>${brl(b.custoC)}</dd>
      <dt>Benefício total</dt><dd>${fmtPts(b.benH)} pontos</dd>
      <dt>Saldo do orçamento</dt><dd>${brl(b.saldoC)}</dd>
      <dt>Situação</dt><dd class="viavel">Viável · aptidão ${fmtPts(b.apt)}</dd>
      <dt>Orçamento</dt><dd>${brl(motor.cfg.orcC)}</dd>
    </dl>`;
}

function atualizarHistorico(){
  const tb=$('#hist'), H=motor.hist;
  for(;histRend<H.length;histRend++){
    const h=H[histRend], tr=document.createElement('tr');
    tr.className='clic'; tr.dataset.g=h.gen;
    tr.innerHTML=`<td>${h.gen}</td><td>${fmtPts(h.melhor)}</td><td>${(h.media/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td><td>${fmtPts(h.acum)}</td>`;
    tb.appendChild(tr);
  }
  tb.querySelectorAll('tr.sel').forEach(r=>r.classList.remove('sel'));
  const r=tb.querySelector(`tr[data-g="${vg}"]`); if(r) r.classList.add('sel');
}
$('#hist').addEventListener('click',e=>{ const tr=e.target.closest('tr'); if(!tr) return; vg=+tr.dataset.g; atualizarLog(); atualizarHistorico(); selecionarEvento(0,false,false); mostrarAba('t-log'); });

function atualizarPopulacao(){
  const m=motor, LIM=200;
  $('#pop-nota').textContent=`População da geração ${m.gen}`+(m.gen>0&&m.cfg.elite>0?` · os ${m.cfg.elite} primeiros indivíduos são a elite preservada`:'')+(m.pop.length>LIM?` · exibindo os ${LIM} primeiros de ${m.pop.length}`:'');
  $('#pop-tab').innerHTML=m.pop.slice(0,LIM).map((ind,i)=>`<tr>
    <td>${i+1}${m.gen>0&&i<m.cfg.elite?' <span class="chip">elite</span>':''}</td><td>${bitsHTML(ind.g,'sm')}</td>
    <td class="wrap">${esc(nomesDe(ind.escolhidos))}</td><td>${brl(ind.custoC)}</td><td>${fmtPts(ind.benH)}</td><td>${brl(ind.saldoC)}</td><td><b>${fmtPts(ind.apt)}</b></td></tr>`).join('');
}

function atualizarLog(){
  vg=Math.max(0,Math.min(vg,motor.gen));
  $('#g-num').value=vg;
  $('#g-ant').disabled=vg<=0; $('#g-prox').disabled=vg>=motor.gen;
  const lg=motor.logs[vg]; let h='';
  h+=`<h3 style="margin-bottom:8px">${vg===0?'Geração 0 · população inicial':'Geração '+vg}</h3>`;
  lg.elites.forEach(e=>{ h+=`<div class="logline">${esc(txtElite(e))}</div>`; });
  if(vg>0&&motor.cfg.elite===0) h+='<div class="logline">Sem elitismo: nenhum indivíduo preservado.</div>';
  const LIM=500;
  lg.eventos.slice(0,LIM).forEach((ev,k)=>{
    const p=partesEvento(ev), sel=(selEv.gen===vg&&selEv.k===k)?' sel':'';
    h+=`<button type="button" class="logblk${sel}" data-k="${k}"><strong>${ev.tipo==='init'?'Indivíduo '+(ev.n+1):'Par '+(ev.n+1)}</strong>
      <span><span class="k">${ev.tipo==='init'?'Sorteio':'Seleção'}</span>${esc(p.sel)}</span>
      ${p.cruz?`<span><span class="k">Cruzamento</span>${esc(p.cruz)}</span><span><span class="k">Mutação</span>${esc(p.mut)}</span>`:''}
      <span><span class="k">Reparação</span>${esc(p.rep)}</span>
      <span><span class="k">Resultado</span>${esc(p.res)}</span></button>`;
  });
  if(lg.eventos.length>LIM) h+=`<p class="vazio">Exibindo os ${LIM} primeiros eventos. Use “Copiar log completo” para obter todos.</p>`;
  $('#log').innerHTML=h;
}
$('#log').addEventListener('click',e=>{ const b=e.target.closest('.logblk'); if(!b) return; selecionarEvento(+b.dataset.k,true,false); mostrarAba('t-anim'); });
$('#g-ant').addEventListener('click',()=>{ vg--; atualizarLog(); atualizarHistorico(); selecionarEvento(0,false,false); });
$('#g-prox').addEventListener('click',()=>{ vg++; atualizarLog(); atualizarHistorico(); selecionarEvento(0,false,false); });
$('#g-num').addEventListener('change',e=>{ const v=lerInt(e.target.value); vg=v.e?vg:v.v; atualizarLog(); atualizarHistorico(); selecionarEvento(0,false,false); });
$('#g-copiar').addEventListener('click',async()=>{
  const txt=motor.logs.map(txtGeracao).join('\n\n');
  try{ await navigator.clipboard.writeText(txt); $('#g-copiar').textContent='Copiado'; }catch(_){ $('#g-copiar').textContent='Não foi possível copiar'; }
  setTimeout(()=>$('#g-copiar').textContent='Copiar log completo',1800);
});

/* ---------- Gráfico (SVG manual) ---------- */
function atualizarGrafico(){
  const H=motor.hist, W=640, Ht=250, pl=44, pr=14, pt=12, pb=30;
  let maxV=1; H.forEach(h=>{ maxV=Math.max(maxV,h.melhor,h.acum,h.media); });
  const passoY=Math.max(1,Math.ceil(maxV/100/4)); const topo=passoY*4*100;
  const xs=g=>pl+(motor.cfg.geracoes===0?0:(g/motor.cfg.geracoes))*(W-pl-pr);
  const ys=v=>pt+(1-v/topo)*(Ht-pt-pb);
  let s='';
  for(let i=0;i<=4;i++){ const v=i*passoY*100, y=ys(v);
    s+=`<line x1="${pl}" x2="${W-pr}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${pl-6}" y="${y+4}" text-anchor="end" font-size="11" fill="var(--muted)">${fmtPts(v)}</text>`; }
  const nx=Math.min(5,motor.cfg.geracoes);
  for(let i=0;i<=nx;i++){ const g=Math.round(i*motor.cfg.geracoes/nx), x=xs(g);
    s+=`<text x="${x}" y="${Ht-10}" text-anchor="middle" font-size="11" fill="var(--muted)">${g}</text>`; }
  s+=`<text x="${(pl+W-pr)/2}" y="${Ht}" text-anchor="middle" font-size="10" fill="var(--muted)">geração</text>`;
  const linha=(k,cor,dash,w)=>`<polyline fill="none" stroke="${cor}" stroke-width="${w}" ${dash?'stroke-dasharray="5 4"':''} stroke-linejoin="round" points="${H.map(h=>xs(h.gen)+','+ys(h[k])).join(' ')}"/>`;
  s+=linha('media','var(--o1)',false,2)+linha('melhor','var(--o2)',true,2)+linha('acum','var(--teal)',false,3);
  if(H.length===1) s+=`<circle cx="${xs(0)}" cy="${ys(H[0].acum)}" r="4" fill="var(--teal)"/>`;
  $('#graf').innerHTML=s;
}

/* ---------- Animação: etapas construídas a partir do evento real ---------- */
const sel={frames:[],i:0,timer:null}; let selEv={gen:-1,k:-1};

function construirEtapas(ev){
  const M=motor.cfg, F=[];
  const row=(label,g,cls={},cut=null,extra='')=>({label,g,cls,cut,extra});
  const origem=(n,corte,L)=>{ const c={}; for(let i=0;i<L;i++) c[i]='o'+n; return c; };
  const L=M.projetos.length;

  const etapasReparo=(label,g0,rep)=>{
    if(!rep.passos.length){ F.push({t:'Reparação',x:'Solução viável: custo dentro do orçamento, nada a remover.',rows:[row(label,g0,{},null,'sem reparação')]}); return; }
    let prev=g0;
    rep.passos.forEach(p=>{
      const custo=avaliar(prev,M.projetos,M.orcC).custoC, pr=M.projetos[p.removido];
      F.push({t:'Reparação',x:`Custo ${brl(custo)} acima do orçamento (${brl(M.orcC)}). Remove ${LETRAS[p.removido]} · ${pr.nome}, a menor razão benefício/custo (${(p.razao*1000).toFixed(2).replace('.',',')} pts por R$ 1.000).`,
        rows:[row(label,p.g,{[p.removido]:'rem'},null,`${gstr(prev)} → ${gstr(p.g)}`)]});
      prev=p.g;
    });
  };

  if(ev.tipo==='init'){
    F.push({t:'Sorteio inicial',x:'Cada gene é sorteado com 50% de chance de ser 0 ou 1.',rows:[row('Indivíduo '+(ev.n+1),ev.g0)]});
    etapasReparo('Indivíduo '+(ev.n+1),ev.g0,ev.rep);
    F.push({t:'Avaliação',x:`Aptidão = benefício total da solução reparada.`,rows:[row('Indivíduo '+(ev.n+1),ev.ind.g,{},null,`custo ${brl(ev.ind.custoC)} · aptidão ${fmtPts(ev.ind.apt)}`)]});
    return F;
  }

  const c1=origem(1,0,L), c2=origem(2,0,L);
  const t1=`#${ev.p1.i+1} (torneio entre ${ev.p1.cand.map(x=>'#'+(x+1)).join(', ')})`, t2=`#${ev.p2.i+1} (torneio entre ${ev.p2.cand.map(x=>'#'+(x+1)).join(', ')})`;
  F.push({t:'Seleção por torneio',x:`Pai 1 = ${t1}; pai 2 = ${t2}. Vence a maior aptidão; empate vai ao menor índice.`,
    rows:[row('Pai 1',ev.p1.ind.g,c1,null,`#${ev.p1.i+1} · aptidão ${fmtPts(ev.p1.ind.apt)}`),row('Pai 2',ev.p2.ind.g,c2,null,`#${ev.p2.i+1} · aptidão ${fmtPts(ev.p2.ind.apt)}`)]});

  if(ev.cruzou){
    const k=ev.corte;
    F.push({t:'Ponto de corte',x:`Cruzamento ocorreu. Corte sorteado após o ${k}º gene.`,rows:[row('Pai 1',ev.p1.ind.g,c1,k),row('Pai 2',ev.p2.ind.g,c2,k)]});
    const f1c={},f2c={}; for(let i=0;i<L;i++){ f1c[i]=(i<k?'o1':'o2 troca'); f2c[i]=(i<k?'o2':'o1 troca'); }
    F.push({t:'Troca de segmentos',x:'Os segmentos à direita do corte trocam de pai.',rows:[row('Filho 1',ev.pre[0],f1c,k),row('Filho 2',ev.pre[1],f2c,k)]});
  } else {
    F.push({t:'Sem cruzamento',x:'O sorteio não atingiu a taxa de cruzamento: os filhos copiam os pais.',rows:[row('Filho 1',ev.pre[0],c1),row('Filho 2',ev.pre[1],c2)]});
  }

  const mc=(m)=>{ const o={}; m.bits.forEach(i=>o[i]='mut'); return o; };
  const nm=ev.m[0].bits.length+ev.m[1].bits.length;
  F.push({t:'Mutação',x: nm?`Bits invertidos: ${ev.m[0].bits.length?'filho 1 no '+listaGenes(ev.m[0].bits):'filho 1 sem mutação'}; ${ev.m[1].bits.length?'filho 2 no '+listaGenes(ev.m[1].bits):'filho 2 sem mutação'}.`:'Nenhum gene foi invertido.',
    rows:[row('Filho 1',ev.m[0].g,mc(ev.m[0])),row('Filho 2',ev.m[1].g,mc(ev.m[1]))]});

  etapasReparo('Filho 1',ev.m[0].g,ev.rep[0]);
  etapasReparo('Filho 2',ev.m[1].g,ev.rep[1]);

  F.push({t:'Descendentes avaliados',x:ev.descartado?'Só resta uma vaga: o filho 2 é descartado.':'Os dois filhos entram na nova população.',
    rows:[row('Filho 1',ev.f[0].g,{},null,`custo ${brl(ev.f[0].custoC)} · aptidão ${fmtPts(ev.f[0].apt)}`),row('Filho 2',ev.f[1].g,{},null,`custo ${brl(ev.f[1].custoC)} · aptidão ${fmtPts(ev.f[1].apt)}${ev.descartado?' · descartado':''}`)]});
  return F;
}

function rowHTML(r){
  let h=`<div class="srow"><span class="slabel">${esc(r.label)}</span><span class="bits">`;
  r.g.forEach((x,i)=>{
    if(r.cut===i) h+='<span class="cutmark" title="ponto de corte"></span>';
    h+=`<span class="bit b${x} ${r.cls[i]||''}" title="${esc(LETRAS[i]+' · '+motor.cfg.projetos[i].nome)}"><b>${x}</b><i>${LETRAS[i]}</i></span>`;
  });
  h+='</span>'; if(r.extra) h+=`<span class="sextra">${esc(r.extra)}</span>`; return h+'</div>';
}
function mostrarEtapa(i){
  const F=sel.frames; if(!F.length) return;
  i=Math.max(0,Math.min(i,F.length-1)); sel.i=i;
  const f=F[i];
  $('#palco').innerHTML=`<div class="tit">${esc(f.t)}</div><p class="txt">${esc(f.x)}</p>${f.rows.map(rowHTML).join('')}`;
  $('#a-cont').textContent=`Etapa ${i+1} de ${F.length}`;
  $('#a-ant').disabled=i===0; $('#a-prox').disabled=i===F.length-1;
}
function pararAnim(){ clearTimeout(sel.timer); sel.timer=null; $('#a-play').textContent='Reproduzir'; }
function tocarAnim(delay){
  pararAnim(); $('#a-play').textContent='Pausar animação';
  mostrarEtapa(0);
  const prox=()=>{ if(sel.i>=sel.frames.length-1){ pararAnim(); return; } sel.timer=setTimeout(()=>{ mostrarEtapa(sel.i+1); prox(); },delay); };
  prox();
}
function selecionarEvento(k,animar,automatico){
  pararAnim();
  const lg=motor.logs[vg]; if(!lg||!lg.eventos.length) return;
  k=Math.max(0,Math.min(k,lg.eventos.length-1));
  selEv={gen:vg,k};
  const s=$('#sel-ev');
  s.innerHTML=lg.eventos.slice(0,500).map((ev,i)=>`<option value="${i}">Geração ${vg} · ${ev.tipo==='init'?'indivíduo '+(ev.n+1):'par '+(ev.n+1)}${ev.tipo==='par'?` (#${ev.p1.i+1} × #${ev.p2.i+1})`:''}</option>`).join('');
  s.value=k;
  sel.frames=construirEtapas(lg.eventos[k]);
  document.querySelectorAll('#log .logblk').forEach(b=>b.classList.toggle('sel',+b.dataset.k===k));
  const v=+$('#veloc').value;
  const delay=automatico?(v>=1800?1100:(v>=700?650:0)):1100;
  if(animar&&delay>0) tocarAnim(delay);
  else mostrarEtapa(automatico?sel.frames.length-1:0);
}
$('#sel-ev').addEventListener('change',e=>selecionarEvento(+e.target.value,true,false));
$('#a-ant').addEventListener('click',()=>{ pararAnim(); mostrarEtapa(sel.i-1); });
$('#a-prox').addEventListener('click',()=>{ pararAnim(); mostrarEtapa(sel.i+1); });
$('#a-play').addEventListener('click',()=>{ if(sel.timer) pararAnim(); else tocarAnim(1100); });

/* ---------- Abas ---------- */
function mostrarAba(id){
  document.querySelectorAll('.aba').forEach(b=>{ const on=b.id===id; b.setAttribute('aria-selected',on); $('#'+b.getAttribute('aria-controls')).hidden=!on; });
}
document.querySelectorAll('.aba').forEach(b=>b.addEventListener('click',()=>mostrarAba(b.id)));

/* ---------- Testes ---------- */
let textoTestes='';
$('#btn-testes').addEventListener('click',()=>{
  const {R,comp}=executarTestes();
  const f2=v=>(v/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  let h='<ul style="padding-left:20px">'+R.map(t=>`<li><span class="${t.ok?'ok':'no'}">${t.ok?'Passou':'Falhou'}</span> · <strong>${esc(t.nome)}</strong><br><span class="contador">${esc(t.det)}</span></li>`).join('')+'</ul>';
  h+=`<h3 style="margin:14px 0 6px">6.5 · Efeito da mutação (população 20, 50 gerações, cruzamento 80%, torneio 2, elite 1, sementes 1 a 5)</h3>
  <div class="rolagem"><table><thead><tr><th>Mutação</th><th>Melhor benefício final (sementes 1 a 5)</th><th>Média</th><th>Execuções que atingiram 12</th></tr></thead><tbody>
  ${[1,20].map(t=>`<tr><td>${t}%</td><td>${comp[t].finais.map(fmtPts).join(' · ')}</td><td>${f2(comp[t].media)}</td><td>${comp[t].qtd} de 5</td></tr>`).join('')}</tbody></table></div>`;
  $('#testes-out').innerHTML=h;
  textoTestes=R.map(t=>`[${t.ok?'OK':'FALHOU'}] ${t.nome}: ${t.det}`).join('\n')+'\n\nEfeito da mutação (sementes 1 a 5):\n'+[1,20].map(t=>`Mutação ${t}%: finais ${comp[t].finais.map(fmtPts).join(', ')}; média ${f2(comp[t].media)}; atingiram 12: ${comp[t].qtd} de 5`).join('\n');
  $('#btn-copiar-testes').disabled=false;
});
$('#btn-copiar-testes').addEventListener('click',async()=>{
  try{ await navigator.clipboard.writeText(textoTestes); $('#btn-copiar-testes').textContent='Copiado'; }catch(_){ $('#btn-copiar-testes').textContent='Não foi possível copiar'; }
  setTimeout(()=>$('#btn-copiar-testes').textContent='Copiar resultado para o README',1800);
});

/* ---------- Início ---------- */
renderProjetos();
reiniciar();
})();
