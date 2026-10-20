/* Motor do algoritmo genético (sem DOM). Carregado antes de ui.js; as
   funções e a classe Motor ficam disponíveis como escopo global compartilhado. */
/* ======================================================
   Motor do algoritmo genético (sem dependências, sem DOM).
   Valores monetários em centavos e benefícios em centésimos (inteiros),
   para evitar erros de ponto flutuante.
   ====================================================================== */
const LETRAS = 'ABCDEFGHIJKLMNO';
const brl = c => (c/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmtPts = h => { const v=h/100; return Number.isInteger(v)?String(v):v.toLocaleString('pt-BR',{maximumFractionDigits:2}); };
const gstr = g => g.join('');

function mulberry32(seed){
  let a = (seed>>>0);
  return function(){
    a = (a + 0x6D2B79F5)>>>0;
    let t = a;
    t = Math.imul(t ^ (t>>>15), t | 1);
    t ^= t + Math.imul(t ^ (t>>>7), t | 61);
    return ((t ^ (t>>>14))>>>0) / 4294967296;
  };
}

function avaliar(g,P,orcC){
  let c=0,b=0; const esc=[];
  g.forEach((x,i)=>{ if(x===1){ c+=P[i].custoC; b+=P[i].benH; esc.push(i); } });
  return { g:g.slice(), custoC:c, benH:b, saldoC:orcC-c, apt:b, escolhidos:esc, viavel:c<=orcC };
}

/* Enquanto custo > orçamento, remove o projeto selecionado de menor razão
   benefício/custo; empate => menor índice (varredura crescente, comparação estrita). */
function reparar(g,P,orcC){
  g=g.slice(); const passos=[];
  let c=avaliar(g,P,orcC).custoC;
  while(c>orcC){
    let pior=Infinity, idx=-1;
    for(let i=0;i<g.length;i++){
      if(g[i]===1){ const r=P[i].benH/P[i].custoC; if(r<pior){ pior=r; idx=i; } }
    }
    g[idx]=0; c-=P[idx].custoC;
    passos.push({removido:idx, g:g.slice(), razao:pior});
  }
  return {g,passos};
}

function cruzar(a,b,corte){ return [a.slice(0,corte).concat(b.slice(corte)), b.slice(0,corte).concat(a.slice(corte))]; }

function mutar(g,taxa,rng){
  const bits=[];
  const r=g.map((x,i)=>{ if(rng()<taxa/100){ bits.push(i); return 1-x; } return x; });
  return {g:r,bits};
}

/* idxs: índices distintos dos candidatos. Maior aptidão; empate => menor índice. */
function vencedorTorneio(pop,idxs){
  const s=[...idxs].sort((a,b)=>a-b); let v=s[0];
  for(const i of s) if(pop[i].apt>pop[v].apt) v=i;
  return v;
}

const clonar = ind => ({...ind, g:ind.g.slice(), escolhidos:ind.escolhidos.slice()});

class Motor{
  constructor(cfg){ this.cfg=cfg; this.reiniciar(); }
  get terminou(){ return this.gen>=this.cfg.geracoes; }

  reiniciar(){
    const c=this.cfg, P=c.projetos;
    this.rng=mulberry32(c.seed);            // restabelece a semente
    this.gen=0; this.pop=[]; this.hist=[]; this.logs=[]; this.melhor=null;
    const eventos=[];
    for(let i=0;i<c.pop;i++){
      const g0=Array.from({length:P.length},()=>this.rng()<0.5?0:1);
      const rep=reparar(g0,P,c.orcC);
      const ind=avaliar(rep.g,P,c.orcC);
      this.pop.push(ind);
      eventos.push({tipo:'init',n:i,g0,rep,ind});
    }
    this.logs.push({gen:0,elites:[],eventos});
    this.registrar();
  }

  registrar(){
    let soma=0,best=-1,bi=0;
    this.pop.forEach((x,i)=>{ soma+=x.apt; if(x.apt>best){ best=x.apt; bi=i; } });
    if(!this.melhor || best>this.melhor.apt) this.melhor=clonar(this.pop[bi]);
    this.hist.push({gen:this.gen, melhor:best, media:soma/this.cfg.pop, acum:this.melhor.apt});
  }

  torneio(){
    const c=this.cfg, set=new Set();
    while(set.size<c.torneio) set.add(Math.floor(this.rng()*c.pop));
    const cand=[...set].sort((a,b)=>a-b);
    return {cand, v:vencedorTorneio(this.pop,cand)};
  }

  avancar(){
    if(this.terminou) return null;
    const c=this.cfg, P=c.projetos, L=P.length, prev=this.pop;
    const nova=[], elites=[];
    if(c.elite>0){
      const ord=prev.map((ind,i)=>({ind,i})).sort((a,b)=>b.ind.apt-a.ind.apt||a.i-b.i);
      for(let k=0;k<c.elite;k++){ nova.push(clonar(ord[k].ind)); elites.push({de:ord[k].i, ind:ord[k].ind}); }
    }
    const eventos=[];
    while(nova.length<c.pop){
      const t1=this.torneio(), t2=this.torneio();          // pais sempre da população anterior
      const p1={i:t1.v, cand:t1.cand, ind:prev[t1.v]}, p2={i:t2.v, cand:t2.cand, ind:prev[t2.v]};
      let a=p1.ind.g.slice(), b=p2.ind.g.slice(), cruzou=false, corte=null;
      if(this.rng()<c.cx/100){
        cruzou=true; corte=1+Math.floor(this.rng()*(L-1));  // entre 1º e penúltimo gene
        [a,b]=cruzar(a,b,corte);
      }
      const pre=[a.slice(),b.slice()];
      const m1=mutar(a,c.mut,this.rng), m2=mutar(b,c.mut,this.rng);
      const r1=reparar(m1.g,P,c.orcC), r2=reparar(m2.g,P,c.orcC);
      const f1=avaliar(r1.g,P,c.orcC), f2=avaliar(r2.g,P,c.orcC);
      nova.push(f1);
      let descartado=false;
      if(nova.length<c.pop) nova.push(f2); else descartado=true;
      eventos.push({tipo:'par',n:eventos.length,p1,p2,cruzou,corte,pre,m:[m1,m2],rep:[r1,r2],f:[f1,f2],descartado});
    }
    this.pop=nova; this.gen++;
    this.logs.push({gen:this.gen,elites,eventos});
    this.registrar();
    return this.logs[this.gen];
  }
}

/* ---------- Texto dos logs ---------- */
const ordGene = k => `${k+1}º`;
function listaGenes(bits){
  const o=bits.map(ordGene);
  return bits.length===1 ? `gene ${o[0]}` : `genes ${o.slice(0,-1).join(', ')} e ${o[o.length-1]}`;
}
function partesEvento(ev){
  if(ev.tipo==='init'){
    const passos=ev.rep.passos;
    return {
      sel:`Sorteio inicial do indivíduo ${ev.n+1}: ${gstr(ev.g0)}`,
      cruz:null, mut:null,
      rep: passos.length ? `reparação: ${gstr(ev.g0)} → ${passos.map(p=>gstr(p.g)).join(' → ')}` : 'não necessária (solução viável)',
      res:`${gstr(ev.ind.g)} (aptidão ${fmtPts(ev.ind.apt)})`
    };
  }
  const t=(p)=>`#${p.i+1} ${gstr(p.ind.g)} (aptidão ${fmtPts(p.ind.apt)}; torneio entre ${p.cand.map(x=>'#'+(x+1)).join(', ')})`;
  const cruz = ev.cruzou
    ? `corte após o ${ev.corte}º gene; filhos: ${gstr(ev.pre[0])} e ${gstr(ev.pre[1])}`
    : `sem cruzamento; filhos copiam os pais: ${gstr(ev.pre[0])} e ${gstr(ev.pre[1])}`;
  const ms=[]; ev.m.forEach((m,k)=>{ if(m.bits.length) ms.push(`mutação no ${listaGenes(m.bits)} do filho ${k+1}: ${gstr(m.g)}`); });
  const rs=[]; ev.rep.forEach((r,k)=>{ if(r.passos.length) rs.push(`reparação do filho ${k+1}: ${gstr(ev.m[k].g)} → ${r.passos.map(p=>gstr(p.g)).join(' → ')}`); });
  return {
    sel:`Pais: ${t(ev.p1)} e ${t(ev.p2)}`,
    cruz,
    mut: ms.length?ms.join('; '):'nenhum gene mutado',
    rep: rs.length?rs.join('; '):'não necessária',
    res:`filho 1 = ${gstr(ev.f[0].g)} (aptidão ${fmtPts(ev.f[0].apt)}); filho 2 = ${gstr(ev.f[1].g)} (aptidão ${fmtPts(ev.f[1].apt)})${ev.descartado?' — descartado (sem vaga)':''}`
  };
}
function txtEvento(ev){
  const p=partesEvento(ev);
  if(ev.tipo==='init') return `${p.sel}; ${p.rep}; resultado ${p.res}`;
  return `${p.sel}; ${p.cruz}; ${p.mut}; ${p.rep}; ${p.res}`;
}
function txtElite(e){ return `Elite: indivíduo #${e.de+1} (${gstr(e.ind.g)}, aptidão ${fmtPts(e.ind.apt)}) copiado sem modificações`; }
function txtGeracao(lg){
  const out=[lg.gen===0?'Geração 0 (população inicial)':`Geração ${lg.gen}`];
  lg.elites.forEach(e=>out.push('  '+txtElite(e)));
  lg.eventos.forEach(ev=>out.push('  '+txtEvento(ev)));
  return out.join('\n');
}

/* ---------- Testes de validação (seção 6) ---------- */
const REF=[
  {nome:'Melhoria da iluminação',custoC:400000,benH:700},
  {nome:'Instalação de bicicletários',custoC:300000,benH:500},
  {nome:'Aquisição de bancos',custoC:200000,benH:300},
  {nome:'Reforma de espaço de convivência',custoC:500000,benH:800}
];
function cfgRef(extra){ return {projetos:REF,orcC:700000,pop:20,geracoes:50,cx:80,mut:5,torneio:2,elite:1,seed:42,...extra}; }

function executarTestes(){
  const R=[]; const ok=(nome,cond,det)=>R.push({nome,ok:!!cond,det});
  const O=700000;

  // 6.2
  let e=avaliar([1,1,0,0],REF,O);
  ok('6.2 Avaliação de 1100 (orçamento R$ 7.000)', e.custoC===700000&&e.benH===1200&&e.saldoC===0&&e.viavel&&e.apt===1200,
     `projetos A e B; custo ${brl(e.custoC)}; benefício ${fmtPts(e.benH)}; saldo ${brl(e.saldoC)}; viável; aptidão ${fmtPts(e.apt)}`);
  const tab={'0000':[0,0],'1000':[4000,7],'0100':[3000,5],'0010':[2000,3],'0001':[5000,8],'1100':[7000,12],'1010':[6000,10],'0110':[5000,8],'0011':[7000,11]};
  let tabOk=true, nv=0;
  for(let n=0;n<16;n++){
    const g=[3,2,1,0].map(k=>(n>>k)&1), a=avaliar(g,REF,O), r=tab[gstr(g)];
    if(r){ nv++; if(!(a.viavel&&a.custoC===r[0]*100&&a.benH===r[1]*100)) tabOk=false; } else if(a.viavel) tabOk=false;
  }
  ok('6.2 Tabela das soluções viáveis', tabOk&&nv===9, `9 soluções viáveis conferidas (custo e benefício); as outras 7 combinações são inviáveis`);

  // 6.3
  let r=reparar([1,1,1,1],REF,O);
  let trilha=['1111',...r.passos.map(p=>gstr(p.g))];
  ok('6.3 Reparação de 1111', trilha.join(',')==='1111,1101,1100' && r.passos[0].removido===2 && r.passos[1].removido===3,
     `${trilha.join(' → ')}; removidos C e depois D; custo final ${brl(avaliar(r.g,REF,O).custoC)}; benefício ${fmtPts(avaliar(r.g,REF,O).benH)}`);

  // 6.4
  const [f1,f2]=cruzar([1,1,0,0],[0,0,1,1],2);
  const f1m=f1.slice(); f1m[0]=1-f1m[0];
  const r1=reparar(f1m,REF,O), r2=reparar(f2,REF,O);
  const a1=avaliar(r1.g,REF,O), a2=avaliar(r2.g,REF,O);
  ok('6.4 Cruzamento 11|00 + 00|11', gstr(f1)==='1111'&&gstr(f2)==='0000', `filho 1 = ${gstr(f1)}; filho 2 = ${gstr(f2)}`);
  ok('6.4 Mutação do 1º gene do filho 1', gstr(f1m)==='0111', `filho 1 = ${gstr(f1m)}; filho 2 = ${gstr(f2)}`);
  ok('6.4 Reparação e avaliação dos filhos',
     [gstr(f1m),...r1.passos.map(p=>gstr(p.g))].join('>')==='0111>0101>0100' && r2.passos.length===0 &&
     gstr(a1.g)==='0100'&&a1.custoC===300000&&a1.apt===500&&gstr(a2.g)==='0000'&&a2.custoC===0&&a2.apt===0,
     `filho 1: 0111 → 0101 → 0100, custo ${brl(a1.custoC)}, aptidão ${fmtPts(a1.apt)}; filho 2: 0000, custo ${brl(a2.custoC)}, aptidão ${fmtPts(a2.apt)}`);
  const g4=[1,0,1,1,0,1];
  const m0=mutar(g4,0,()=>0), m100=mutar(g4,100,()=>0.9999999);
  ok('6.4 Limites da mutação', m0.bits.length===0&&gstr(m0.g)===gstr(g4)&&m100.bits.length===6&&m100.g.every((x,i)=>x===1-g4[i]),
     `0%: nenhum gene invertido; 100%: ${gstr(g4)} → ${gstr(m100.g)}`);
  const mc=new Motor(cfgRef({cx:0,mut:0,elite:0,seed:7})); const lg=mc.avancar();
  ok('6.4 Cruzamento 0% (filhos copiam os pais)', lg.eventos.every(v=>!v.cruzou&&gstr(v.pre[0])===gstr(v.p1.ind.g)&&gstr(v.pre[1])===gstr(v.p2.ind.g)),
     `${lg.eventos.length} pares verificados com cruzamento 0% e mutação 0%`);
  const popT=[{apt:700},{apt:1100},{apt:1200}];
  ok('6.4 Torneio 1000 (7), 0011 (11), 1100 (12)', vencedorTorneio(popT,[0,1,2])===2, 'vencedor: 1100 (aptidão 12)');
  const popE=[{apt:300},{apt:500},{apt:500},{apt:500}];
  ok('6.4 Empate no torneio → menor índice', vencedorTorneio(popE,[3,2,1])===1, 'candidatos #4, #3, #2 com mesma aptidão; vencedor: #2 (menor índice)');

  // 6.6
  const m0o=new Motor(cfgRef({orcC:0,seed:3}));
  ok('6.6 Orçamento R$ 0', m0o.pop.every(i=>gstr(i.g)==='0000'&&i.custoC===0&&i.apt===0), `toda a população inicial (${m0o.pop.length}) = 0000`);
  e=avaliar([1,1,1,1],REF,1400000);
  ok('6.6 Orçamento R$ 14.000 avalia 1111', e.viavel&&e.custoC===1400000&&e.benH===2300&&e.saldoC===0, `custo ${brl(e.custoC)}; benefício ${fmtPts(e.benH)}; saldo ${brl(e.saldoC)}; viável`);

  // 6.5 execução completa
  const m=new Motor(cfgRef()); while(!m.terminou) m.avancar();
  let mono=true, monoMel=true;
  for(let i=1;i<m.hist.length;i++){ if(m.hist[i].acum<m.hist[i-1].acum) mono=false; if(m.hist[i].melhor<m.hist[i-1].melhor) monoMel=false; }
  const fin=avaliar(m.melhor.g,REF,O);
  ok('6.5 Histórico com 51 registros', m.hist.length===51, `${m.hist.length} registros (geração 0 + 50)`);
  ok('6.5 Melhor acumulado nunca diminui', mono, `acumulado final: ${fmtPts(m.hist[50].acum)}`);
  ok('6.5 Com elite 1, melhor da população não diminui', monoMel, 'verificado em todas as gerações');
  ok('6.5 Solução final consistente', fin.viavel&&fin.custoC<=O&&fin.benH<=1200&&fin.benH===m.melhor.benH&&fin.custoC===m.melhor.custoC,
     `cromossomo ${gstr(fin.g)}; custo ${brl(fin.custoC)}; benefício ${fmtPts(fin.benH)}; saldo ${brl(fin.saldoC)} (semente 42)`);

  const comp={};
  for(const taxa of [1,20]){
    const finais=[1,2,3,4,5].map(seed=>{ const mm=new Motor(cfgRef({mut:taxa,seed})); while(!mm.terminou) mm.avancar(); return mm.melhor.apt; });
    comp[taxa]={finais, media:finais.reduce((s,x)=>s+x,0)/5, qtd:finais.filter(x=>x===1200).length};
  }
  return {R,comp};
}
/* ==ENGINE-END== ====================================================== */
