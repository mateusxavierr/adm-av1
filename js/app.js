// App de revisão: rotas por hash, progresso e respostas no localStorage, exportação em Markdown.
// A edição vem de js/edicao.js: "amigos" (main) ou "mateus" (branch mateus, com window.MXC).
(() => {
  const EDICAO = window.EDICAO || 'amigos';
  const MXC = EDICAO === 'mateus' ? window.MXC : null;
  const AULAS = window.AULAS;
  const ATV = window.ATIVIDADES;
  const KEY = 'adm-av1:' + EDICAO;
  const LETRAS = ['A', 'B', 'C', 'D', 'E'];
  const app = document.getElementById('app');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)');

  // ---------- ícones (traço, herdam a cor) ----------
  const svg = (d, cls = '') => `<svg class="glifo ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    dir: svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 'dir'),
    esq: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>', 'esq'),
    baixa: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', 'sobe'),
    copia: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>', 'sobe'),
    sobe: svg('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>', 'sobe'),
    dado: svg('<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="15" r="1.2" fill="currentColor"/>', 'sobe'),
    certo: '<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    errado: '<svg class="icone" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
    alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg>'
  };

  // ---------- estado ----------
  const vazio = () => ({ est: {}, mc: {}, txt: {}, env: {}, sim: null });
  let S;
  try { S = Object.assign(vazio(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = vazio(); }
  const salvar = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  if (MXC) document.getElementById('edicao').hidden = false;

  const aulaPorId = id => AULAS.find(a => a.id === id);
  const totalTopicos = AULAS.reduce((n, a) => n + a.topics.length, 0);
  const estudados = a => a.topics.filter((_, i) => S.est[a.id + '-' + i]).length;
  const totalEstudados = () => AULAS.reduce((n, a) => n + estudados(a), 0);
  const pct = (x, y) => y ? Math.round(100 * x / y) : 0;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const palavras = t => t.trim() ? t.trim().split(/\s+/).length : 0;

  function discursivas(aid) {
    const a = ATV[aid]; const out = [];
    a.disc.forEach((d, i) => out.push({ id: `${aid}-d-${i}`, tipo: 'Discursiva', n: `D${i + 1}`, ...d }));
    out.push({ id: `${aid}-caso`, tipo: 'Estudo de caso', n: 'Caso', ...a.caso });
    if (MXC) MXC.atividades[aid].forEach((m, i) => out.push({ id: `${aid}-mxc-${i}`, tipo: 'Aplicação na MXC', n: `MXC ${i + 1}`, mxc: true, ...m }));
    return out;
  }
  function placarAula(aid) {
    const mc = ATV[aid].mc;
    let resp = 0, certas = 0;
    mc.forEach((q, i) => { const r = S.mc[`${aid}-mc-${i}`]; if (r !== undefined) { resp++; if (r === q.c) certas++; } });
    const ds = discursivas(aid);
    const escritas = ds.filter(d => (S.txt[d.id] || '').trim()).length;
    return { mcTotal: mc.length, resp, certas, dTotal: ds.length, escritas };
  }

  // ---------- botão: o preenchimento nasce no ponto do cursor (lib/preenchimento.ts do site) ----------
  function marcarPonto(e) {
    const alvo = e.target.closest && e.target.closest('.btn');
    if (!alvo) return;
    if (e.type === 'pointerover' && e.relatedTarget && alvo.contains(e.relatedTarget)) return; // só na entrada, como o onPointerEnter do site
    const c = alvo.getBoundingClientRect();
    const x = e.clientX - c.left, y = e.clientY - c.top;
    const ra = Math.min(parseFloat(getComputedStyle(alvo).borderTopLeftRadius) || 0, Math.min(c.width, c.height) / 2);
    const centros = [[ra, ra], [c.width - ra, ra], [ra, c.height - ra], [c.width - ra, c.height - ra]];
    const raio = Math.max(...centros.map(([cx, cy]) => Math.hypot(cx - x, cy - y))) + ra;
    alvo.style.setProperty('--x', x + 'px');
    alvo.style.setProperty('--y', y + 'px');
    alvo.style.setProperty('--r', (raio + 1) + 'px');
  }
  document.addEventListener('pointerover', e => { if (e.pointerType !== 'touch') marcarPonto(e); });
  document.addEventListener('pointerdown', marcarPonto);

  // ---------- controle segmentado: indicador desliza até o ativo, bolha segue o hover ----------
  function seg(el, { animar = true } = {}) {
    if (!el) return;
    let ind = el.querySelector(':scope > .seg-ind'), bolha = el.querySelector(':scope > .seg-bolha');
    if (!ind) { ind = document.createElement('span'); ind.className = 'seg-ind'; ind.setAttribute('aria-hidden', 'true'); el.prepend(ind); }
    if (!bolha) {
      bolha = document.createElement('span'); bolha.className = 'seg-bolha'; bolha.setAttribute('aria-hidden', 'true'); el.prepend(bolha);
      el.addEventListener('pointerover', e => {
        const op = e.target.closest('.seg-op'); if (!op || e.pointerType === 'touch') return;
        poe(bolha, op); bolha.setAttribute('data-acesa', '');
      });
      el.addEventListener('pointerleave', () => bolha.removeAttribute('data-acesa'));
    }
    const ativo = el.querySelector('.seg-op[aria-current="page"], .seg-op[aria-pressed="true"]');
    if (!ativo) { ind.classList.remove('pronto'); return; }
    ind.classList.toggle('sem-anim', !animar || !ind.classList.contains('pronto'));
    poe(ind, ativo);
    requestAnimationFrame(() => { ind.classList.add('pronto'); ind.classList.remove('sem-anim'); });
    if (el.classList.contains('rolavel')) ativo.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function poe(alvo, op) {
    alvo.style.width = op.offsetWidth + 'px';
    alvo.style.height = op.offsetHeight + 'px';
    alvo.style.transform = `translate(${op.offsetLeft}px, ${op.offsetTop}px)`;
  }
  const nav = document.getElementById('nav');
  function marcarNav(rota) {
    nav.querySelectorAll('.seg-op').forEach(a => {
      if (a.dataset.rota === rota) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    seg(nav);
  }
  addEventListener('resize', () => document.querySelectorAll('.seg').forEach(s => seg(s, { animar: false })));
  if (document.fonts) document.fonts.ready.then(() => document.querySelectorAll('.seg').forEach(s => seg(s, { animar: false })));

  // ---------- entrada em cascata ----------
  function cascata() {
    if (reduz.matches) return;
    let i = 0;
    const alvos = app.querySelectorAll(':scope > .hero, :scope > .cab-aula, :scope > .barra-aulas, :scope > section > .secao-titulo, .placar > *, .org-moldura, .org-col, .grade-aulas > *, .tronco > *, :scope > .pegadinhas, .bloco > .questoes > *, .export > *, :scope > .questoes > *');
    alvos.forEach(el => { if (el.getBoundingClientRect().top > innerHeight * 1.4) return; el.classList.add('entra'); el.style.setProperty('--i', i++); });
  }

  // ---------- utilidades ----------
  let toastT;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
  }
  const ck = (id, label) => `<span class="ck"><input type="checkbox" data-est="${id}" ${S.est[id] ? 'checked' : ''} aria-label="${esc(label)}"><span class="box"></span></span>`;
  const ramo = l => Array.isArray(l) ? `<li>${l[0]}<ul>${l[1].map(x => `<li>${x}</li>`).join('')}</ul></li>` : `<li>${l}</li>`;
  const barra = (id, v) => `<span class="barra"><span ${id ? `data-barra="${id}"` : ''} style="width:${v}%"></span></span>`;

  // checkbox "estudei" funciona em qualquer tela
  app.addEventListener('change', e => {
    const el = e.target;
    if (!el.dataset || !el.dataset.est) return;
    const id = el.dataset.est;
    if (el.checked) S.est[id] = true; else delete S.est[id];
    salvar();
    document.querySelectorAll(`[data-est="${id}"]`).forEach(x => { x.checked = el.checked; });
    const li = el.closest('li'); if (li) li.classList.toggle('feito', el.checked);
    const art = el.closest('.topico'); if (art) art.classList.toggle('feito', el.checked);
    atualizarContadores();
  });
  function atualizarContadores() {
    AULAS.forEach(a => {
      const e = estudados(a);
      document.querySelectorAll(`[data-prog="${a.id}"]`).forEach(x => { x.textContent = `${e}/${a.topics.length}`; });
      document.querySelectorAll(`[data-barra="${a.id}"]`).forEach(x => { x.style.width = pct(e, a.topics.length) + '%'; });
      document.querySelectorAll(`[data-pct="${a.id}"]`).forEach(x => { x.textContent = pctAula(a) + '%'; });
    });
    const t = totalEstudados();
    document.querySelectorAll('[data-prog="total"]').forEach(x => { x.textContent = `${t}/${totalTopicos}`; });
  }
  // % da aula = média de tópicos estudados, objetivas respondidas e discursivas escritas
  function pctAula(a) {
    const p = placarAula(a.id);
    return Math.round((pct(estudados(a), a.topics.length) + pct(p.resp, p.mcTotal) + pct(p.escritas, p.dTotal)) / 3);
  }

  // ---------- telas ----------
  function home() {
    marcarNav('home');
    let mcT = 0, mcC = 0, dT = 0, dE = 0;
    AULAS.forEach(a => { const p = placarAula(a.id); mcT += p.resp; mcC += p.certas; dT += p.dTotal; dE += p.escritas; });
    app.innerHTML = `
      <section class="hero">
        <span class="rotulo">SI015 · Administração de Empresas · AV1</span>
        <h1>Organograma da matéria</h1>
        <p>As 6 aulas em árvore. Marque cada tópico que já estudou aqui mesmo, abra a aula pra ler o conteúdo e faça as atividades.${MXC ? ' Nesta edição, cada aula também tem tarefas aplicando o conteúdo na MXC.' : ''}</p>
        <div class="placar">
          <div class="card"><b data-prog="total">${totalEstudados()}/${totalTopicos}</b><span class="l">tópicos estudados</span></div>
          <div class="card"><b>${mcC}/${mcT}</b><span class="l">acertos nas objetivas</span></div>
          <div class="card"><b>${dE}/${dT}</b><span class="l">discursivas escritas</span></div>
        </div>
      </section>

      <section class="org-moldura" aria-labelledby="org-t">
        <header><h2 id="org-t">Mapa das 6 aulas</h2><p>Marque o quadrado quando estudar. Clique no nome pra abrir.</p></header>
        <div class="org-raiz"><div><strong>Administração de Empresas</strong><small>AV1 · ${AULAS.length} aulas · ${totalTopicos} tópicos</small></div></div>
        <div class="org-cols">
          ${AULAS.map(a => `
            <div class="org-col">
              <a class="org-aula" href="#/aula/${a.id}">
                <span class="n">${a.n}</span><span class="t">${a.title}</span><span class="p"><span data-prog="${a.id}">${estudados(a)}/${a.topics.length}</span> estudados</span>
                ${barra(a.id, pct(estudados(a), a.topics.length))}
              </a>
              <ul class="org-topicos">
                ${a.topics.map((t, i) => { const id = `${a.id}-${i}`; return `<li class="${S.est[id] ? 'feito' : ''}"><div class="org-linha">${ck(id, 'Estudei: ' + t.t)}<a href="#/aula/${a.id}/${i}">${t.t}</a></div></li>`; }).join('')}
              </ul>
            </div>`).join('')}
        </div>
      </section>

      <section aria-labelledby="atv-t">
        <div class="secao-titulo"><div><h2 id="atv-t">Atividades por aula</h2><p>Objetivas com correção na hora, discursivas com gabarito${MXC ? ' e tarefas da MXC' : ''}.</p></div><a class="btn sec mini" href="#/simulado">Simulado geral ${I.dado}</a></div>
        <div class="grade-aulas">
          ${AULAS.map(a => { const p = placarAula(a.id); return `
            <article class="card vivo cartao">
              <div class="topo-c"><span class="n">AULA ${a.n}</span><span class="pct" data-pct="${a.id}" title="Progresso geral da aula">${pctAula(a)}%</span></div>
              <h3>${a.title}</h3>
              <ul class="metricas">
                <li><span>Tópicos</span><b data-prog="${a.id}">${estudados(a)}/${a.topics.length}</b>${barra(a.id, pct(estudados(a), a.topics.length))}</li>
                <li><span>Objetivas</span><b>${p.resp}/${p.mcTotal}</b>${barra('', pct(p.resp, p.mcTotal))}</li>
                <li><span>Discursivas${MXC ? ' e MXC' : ''}</span><b>${p.escritas}/${p.dTotal}</b>${barra('', pct(p.escritas, p.dTotal))}</li>
                <li><span>Acertos</span><b>${p.resp ? `${p.certas} de ${p.resp}` : 'nenhuma ainda'}</b></li>
              </ul>
              <div class="acoes"><a class="btn mini" href="#/atividades/${a.id}">Atividades ${I.dir}</a><a class="btn sec mini" href="#/aula/${a.id}">Conteúdo</a></div>
            </article>`; }).join('')}
        </div>
      </section>`;
  }

  function aula(aid, ti) {
    const a = aulaPorId(aid); if (!a) return home();
    marcarNav('');
    const idx = AULAS.indexOf(a), ant = AULAS[idx - 1], prox = AULAS[idx + 1];
    app.innerHTML = `
      <header class="cab-aula">
        <span class="n">${a.n}</span>
        <h1>${a.title}</h1>
        <span class="meta">${a.meta}</span>
        <div class="acoes"><a class="btn mini" href="#/atividades/${a.id}">Fazer as atividades ${I.dir}</a><span class="selo"><span data-prog="${a.id}">${estudados(a)}/${a.topics.length}</span> estudados</span></div>
      </header>
      <div class="tronco">
        ${a.topics.map((t, i) => { const id = `${a.id}-${i}`; const nota = MXC && MXC.notas[id]; return `
          <article class="card topico${t.wide ? ' largo' : ''}${S.est[id] ? ' feito' : ''}" id="t-${id}">
            <div class="cab"><label>${ck(id, 'Estudei: ' + t.t)}<h2>${t.t}</h2></label></div>
            <p class="fonte">${t.s}</p>
            <ul class="ramos">${t.leaves.map(ramo).join('')}</ul>
            ${nota ? `<div class="mxc">${nota}</div>` : ''}
          </article>`; }).join('')}
      </div>
      <aside class="pegadinhas"><h2>${I.alerta}Não confunda</h2><ul>${a.traps.map(x => `<li>${x}</li>`).join('')}</ul></aside>
      <nav class="passos" aria-label="Navegação entre aulas">
        ${ant ? `<a class="btn sec" href="#/aula/${ant.id}">${I.esq} Aula ${ant.n}</a>` : '<span></span>'}
        <a class="btn" href="#/atividades/${a.id}">Atividades da aula ${a.n} ${I.dir}</a>
        ${prox ? `<a class="btn sec" href="#/aula/${prox.id}">Aula ${prox.n} ${I.dir}</a>` : `<a class="btn sec" href="#/simulado">Simulado ${I.dir}</a>`}
      </nav>`;
    if (ti !== undefined) {
      const el = document.getElementById(`t-${a.id}-${ti}`);
      if (el) { el.classList.add('alvo'); requestAnimationFrame(() => el.scrollIntoView({ block: 'start' })); }
    }
  }

  // ----- objetivas -----
  function opcaoHTML(q, id, k, estado) {
    // estado: '' | 'marcada' | 'certa' | 'errada' | 'resto'
    const icone = estado === 'certa' ? I.certo : estado === 'errada' ? I.errado : '';
    const trava = estado && estado !== 'marcada' ? 'disabled' : '';
    return `<button type="button" class="opcao ${estado === 'resto' ? '' : estado}" data-mc="${id}" data-k="${k}" ${trava} ${estado === 'marcada' ? 'aria-pressed="true"' : ''}><span class="letra">${LETRAS[k]}</span><span class="txt">${esc(q.o[k])}</span>${icone}</button>`;
  }
  function estadoOpcao(q, k, r, corrigida) {
    if (r === undefined) return '';
    if (!corrigida) return k === r ? 'marcada' : '';
    if (k === q.c) return 'certa';
    if (k === r) return 'errada';
    return 'resto';
  }
  const fbHTML = (q, r, emBranco) => `<div class="fb recuo ${r === q.c ? 'ok' : 'erro'}"><strong class="${r === q.c ? 'ok' : 'erro'}">${emBranco ? 'Em branco.' : r === q.c ? 'Certa.' : `Errada. A certa é a ${LETRAS[q.c]}.`}</strong> ${emBranco ? `A certa é a ${LETRAS[q.c]}. ` : ''}${esc(q.e)}</div>`;
  function mcHTML(q, id, n, origem, corrigida = true, r = S.mc[id]) {
    return `
      <article class="card questao" data-q="${id}">
        <div class="enun"><span class="num">${n}</span><p>${esc(q.q)}</p></div>
        ${origem ? `<p class="origem">${origem}</p>` : ''}
        <div class="opcoes recuo" role="group" aria-label="Alternativas">${q.o.map((_, k) => opcaoHTML(q, id, k, estadoOpcao(q, k, r, corrigida))).join('')}</div>
        ${corrigida && r !== undefined ? fbHTML(q, r) : corrigida && origem ? fbHTML(q, r, true) : ''}
      </article>`;
  }
  // responde no lugar (as cores transicionam, o feedback entra)
  function responderMC(art, q, id, r) {
    art.querySelectorAll('.opcao').forEach(b => {
      const k = +b.dataset.k; const est = estadoOpcao(q, k, r, true);
      const novo = document.createElement('div'); novo.innerHTML = opcaoHTML(q, id, k, est);
      const nb = novo.firstElementChild;
      b.className = nb.className; b.disabled = true; b.innerHTML = nb.innerHTML;
    });
    const fb = document.createElement('div'); fb.innerHTML = fbHTML(q, r);
    const el = fb.firstElementChild; if (!reduz.matches) el.classList.add('entra');
    art.appendChild(el);
  }

  // ----- discursivas -----
  const contHTML = t => { const n = palavras(t); return `<span class="salvo ${n ? 'on' : ''}"><i></i>${n ? `${n} palavra${n > 1 ? 's' : ''} · salvo` : 'sem resposta ainda'}</span>`; };
  const gabHTML = d => `<div class="gab recuo"><h4>${d.mxc ? 'O que uma boa resposta tem' : 'Uma resposta completa cobre'}</h4><ul>${d.g.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  function discHTML(d) {
    const txt = S.txt[d.id] || '';
    const env = !!S.env[d.id];
    return `
      <article class="card questao${d.mxc ? ' mxcq' : ''}" data-d="${d.id}">
        <div class="enun"><span class="num">${d.n}</span><p>${esc(d.q)}</p></div>
        <div class="resp recuo">
          <textarea data-txt="${d.id}" aria-label="Sua resposta" placeholder="Escreva sua resposta antes de ver o gabarito">${esc(txt)}</textarea>
          <div class="linha"><span data-cont="${d.id}">${contHTML(txt)}</span>
            ${env ? '<span class="selo ok">Gabarito liberado</span>' : `<button type="button" class="btn mini" data-env="${d.id}">${d.mxc ? 'Enviar e ver o critério' : 'Enviar e ver o gabarito'} ${I.dir}</button>`}
          </div>
        </div>
        ${env ? gabHTML(d) : ''}
      </article>`;
  }

  const segAulas = (rota, atual) => `<nav class="seg compacto rolavel" data-seg aria-label="Escolher aula">${AULAS.map(x => `<a class="seg-op" href="#/${rota}/${x.id}" ${x.id === atual ? 'aria-current="page"' : ''} aria-label="Aula ${x.n}">${x.n}</a>`).join('')}</nav>`;

  const resumoMC = p => `Objetivas: ${p.certas} ${p.certas === 1 ? "certa" : "certas"} de ${p.resp} · ${p.mcTotal} no total`;
  function atividades(aid) {
    const a = aulaPorId(aid); if (!a) return home();
    marcarNav('atividades');
    const at = ATV[aid];
    const ds = discursivas(aid);
    const p = placarAula(aid);
    app.innerHTML = `
      <header class="cab-aula">
        <span class="n">${a.n}</span>
        <h1>${a.title}</h1>
        <span class="meta">Atividades da aula. Responda primeiro, o gabarito só aparece depois.</span>
        <div class="acoes">${segAulas('atividades', aid)}</div>
      </header>
      <div class="barra-aulas">
        <div class="resumo">
          <span class="selo" data-resumo-mc="${aid}">${resumoMC(p)}</span>
          <span class="selo">Discursivas${MXC ? ' e MXC' : ''}: ${p.escritas}/${p.dTotal}</span>
        </div>
        <a class="btn sec mini" href="#/aula/${aid}">${I.esq} Reler o conteúdo</a>
      </div>

      <section class="bloco"><h2>Múltipla escolha</h2><p>Escolha uma alternativa. A correção e a explicação aparecem na hora.</p>
        <div class="questoes">${at.mc.map((q, i) => mcHTML(q, `${aid}-mc-${i}`, `Q${i + 1}`)).join('')}</div>
        <div class="acoes" style="margin-top:1rem"><button type="button" class="btn sec mini" data-refazer="${aid}">Refazer objetivas desta aula</button></div>
      </section>

      <section class="bloco"><h2>Discursivas</h2><p>Escreva como escreveria na prova. Enviar libera os pontos que uma resposta completa precisa ter, e a resposta continua editável.</p>
        <div class="questoes">${ds.filter(d => d.tipo === 'Discursiva').map(discHTML).join('')}</div>
      </section>

      <section class="bloco"><h2>Estudo de caso</h2><p>Aplique os conceitos da aula ao caso.</p>
        <div class="questoes">${ds.filter(d => d.tipo === 'Estudo de caso').map(discHTML).join('')}</div>
      </section>

      ${MXC ? `<section class="bloco"><h2>Aplicação na MXC</h2><p>O conceito da aula aplicado ao seu negócio, com dado real sempre que der. Exporte e mande pro Claude corrigir e dar nota.</p>
        <div class="questoes">${ds.filter(d => d.mxc).map(discHTML).join('')}</div>
      </section>` : ''}

      <nav class="passos" aria-label="Próximo passo">
        <a class="btn sec" href="#/aula/${aid}">${I.esq} Conteúdo da aula ${a.n}</a>
        <a class="btn" href="#/exportar">Exportar respostas ${I.dir}</a>
      </nav>`;
  }

  // cliques de questão (objetivas, simulado, enviar discursiva, refazer)
  app.addEventListener('click', e => {
    const op = e.target.closest('[data-mc]');
    if (op && !op.disabled) {
      const id = op.dataset.mc, k = +op.dataset.k;
      const art = op.closest('.questao');
      if (id.startsWith('sim-')) {
        S.sim.ans[id] = k; salvar();
        art.querySelectorAll('.opcao').forEach(b => { const on = +b.dataset.k === k; b.classList.toggle('marcada', on); if (on) b.setAttribute('aria-pressed', 'true'); else b.removeAttribute('aria-pressed'); });
        const c = document.getElementById('simResp'); if (c) c.textContent = Object.keys(S.sim.ans).length;
        return;
      }
      S.mc[id] = k; salvar();
      const [aid, , i] = id.split('-');
      responderMC(art, ATV[aid].mc[+i], id, k);
      const rs = document.querySelector(`[data-resumo-mc="${aid}"]`); if (rs) rs.textContent = resumoMC(placarAula(aid));
      return;
    }
    const env = e.target.closest('[data-env]');
    if (env) {
      const id = env.dataset.env;
      if (!(S.txt[id] || '').trim()) { toast('Escreva sua resposta antes de ver o gabarito'); const t = document.querySelector(`[data-txt="${id}"]`); if (t) t.focus(); return; }
      S.env[id] = true; salvar();
      const art = env.closest('.questao');
      const d = discursivas(id.split('-')[0]).find(x => x.id === id);
      const selo = document.createElement('span'); selo.className = 'selo ok'; selo.textContent = 'Gabarito liberado';
      env.replaceWith(selo);
      const g = document.createElement('div'); g.innerHTML = gabHTML(d);
      const el = g.firstElementChild; if (!reduz.matches) el.classList.add('entra');
      art.appendChild(el);
      return;
    }
    const ref = e.target.closest('[data-refazer]');
    if (ref) {
      const aid = ref.dataset.refazer;
      Object.keys(S.mc).forEach(k => { if (k.startsWith(aid + '-mc-')) delete S.mc[k]; });
      salvar(); atividades(aid); cascata(); toast('Objetivas zeradas');
    }
  });
  // autosave das discursivas
  let tSalvar;
  app.addEventListener('input', e => {
    const t = e.target;
    if (!t.dataset || !t.dataset.txt) return;
    S.txt[t.dataset.txt] = t.value;
    const c = document.querySelector(`[data-cont="${t.dataset.txt}"]`);
    if (c) c.innerHTML = contHTML(t.value);
    clearTimeout(tSalvar); tSalvar = setTimeout(salvar, 300);
  });

  // ---------- simulado ----------
  function novoSimulado(n) {
    const todas = [];
    AULAS.forEach(a => ATV[a.id].mc.forEach((_, i) => todas.push(`${a.id}-${i}`)));
    for (let i = todas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [todas[i], todas[j]] = [todas[j], todas[i]]; }
    S.sim = { ids: todas.slice(0, n), ans: {}, feito: false }; salvar();
  }
  function simulado() {
    marcarNav('simulado');
    if (!S.sim) novoSimulado(15);
    const sim = S.sim;
    const qs = sim.ids.map((ref, n) => { const [aid, i] = ref.split('-'); return { q: ATV[aid].mc[+i], aid, id: `sim-${aid}-${i}`, n: n + 1 }; });
    const resp = qs.filter(x => sim.ans[x.id] !== undefined).length;
    const certas = qs.filter(x => sim.ans[x.id] === x.q.c).length;
    app.innerHTML = `
      <section class="hero">
        <span class="rotulo">Todas as aulas, misturadas</span>
        <h1>Simulado</h1>
        <p>${qs.length} objetivas sorteadas das 6 aulas. Marque todas e corrija no fim, como na prova. Dá pra trocar a resposta até corrigir.</p>
        <div class="resumo">
          <span class="selo"><b id="simResp">${resp}</b>/${qs.length} respondidas</span>
          ${sim.feito ? `<span class="selo ok">Nota ${(10 * certas / qs.length).toFixed(1).replace('.', ',')} · ${certas} de ${qs.length}</span>` : ''}
        </div>
      </section>
      <div class="questoes">${qs.map(x => { const a = aulaPorId(x.aid); return mcHTML(x.q, x.id, String(x.n).padStart(2, '0'), `Aula ${a.n} · ${a.title}`, sim.feito, sim.ans[x.id]); }).join('')}</div>
      <div class="passos">
        <button type="button" class="btn sec" id="simNovo">Sortear outro simulado ${I.dado}</button>
        ${sim.feito ? '' : `<button type="button" class="btn" id="simCorrigir">Corrigir simulado ${I.dir}</button>`}
      </div>`;
    document.getElementById('simNovo').onclick = () => { novoSimulado(15); simulado(); cascata(); window.scrollTo({ top: 0 }); };
    const c = document.getElementById('simCorrigir');
    if (c) c.onclick = () => { S.sim.feito = true; salvar(); simulado(); cascata(); window.scrollTo({ top: 0 }); };
  }

  // ---------- exportar ----------
  function gerarTexto(escopo, comGab, soRespondidas) {
    const lista = escopo === 'todas' ? AULAS : [aulaPorId(escopo)];
    const hoje = new Date().toLocaleDateString('pt-BR');
    const L = [];
    if (MXC) {
      L.push('# Respostas de Mateus: Administração de Empresas (AV1)', '', `Exportado em ${hoje}. Edição Mateus (com aplicação na MXC).`, '',
        '**Pro Claude:** corrija como professor da disciplina. Em cada discursiva, estudo de caso e tarefa MXC: dê nota de 0 a 10, diga o que faltou em relação ao gabarito e escreva uma frase de como melhorar. Nas tarefas MXC, avalie também se usei o conceito certo da aula e se usei dado real da MXC em vez de frase genérica. No fim, dê a nota geral de 0 a 10 e os 3 tópicos que eu mais preciso revisar antes da prova.', '');
    } else {
      L.push('# Minhas respostas: Administração de Empresas (AV1)', '', `Exportado em ${hoje}.`, '',
        '**Instrução pra IA que for corrigir (cole tudo isto no ChatGPT, Claude ou Gemini):** você é professor de Administração de Empresas. Corrija as respostas abaixo usando o gabarito de cada questão. Em cada discursiva e estudo de caso: dê nota de 0 a 10, diga o que faltou em relação ao gabarito e escreva uma frase de como melhorar. As objetivas já vêm corrigidas. No fim, dê a nota geral de 0 a 10 e os 3 tópicos que eu mais preciso revisar antes da prova.', '');
    }
    L.push(`Tópicos marcados como estudados: ${totalEstudados()}/${totalTopicos}`, '');
    lista.forEach(a => {
      const p = placarAula(a.id);
      L.push('---', '', `## Aula ${a.n}: ${a.title}`, '', `Tópicos estudados: ${estudados(a)}/${a.topics.length}`, '');
      L.push(`### Objetivas: ${p.certas} certas de ${p.resp} respondidas (${p.mcTotal} no total)`, '');
      ATV[a.id].mc.forEach((q, i) => {
        const r = S.mc[`${a.id}-mc-${i}`];
        if (r === undefined) { if (!soRespondidas) L.push(`- Q${i + 1} (em branco): ${q.q}`); return; }
        L.push(`- Q${i + 1} ${r === q.c ? '✓' : '✗'} ${q.q}`, `  - Marquei: ${LETRAS[r]}) ${q.o[r]}${r === q.c ? '' : ` · Certa: ${LETRAS[q.c]}) ${q.o[q.c]}`}`);
      });
      L.push('');
      discursivas(a.id).forEach(d => {
        const t = (S.txt[d.id] || '').trim();
        if (!t && soRespondidas) return;
        L.push(`### ${d.tipo} · ${d.n}`, '', `**Pergunta:** ${d.q}`, '', '**Minha resposta:**', '', t || '_(sem resposta)_', '');
        if (comGab) L.push('**Gabarito (pontos esperados):**', ...d.g.map(x => `- ${x}`), '');
      });
    });
    return L.join('\n');
  }
  function baixar(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  let escopo = 'todas';
  function exportar() {
    marcarNav('exportar');
    app.innerHTML = `
      <section class="hero">
        <span class="rotulo">Correção e backup</span>
        <h1>Exportar respostas</h1>
        <p>${MXC ? 'Gera um texto com suas respostas, o gabarito e a instrução de correção. Copie e mande pro Claude: ele dá nota questão por questão e aponta o que revisar.' : 'Gera um texto com suas respostas, o gabarito e a instrução de correção. Copie e cole numa IA (ChatGPT, Claude, Gemini) pra receber nota e o que revisar.'}</p>
      </section>
      <div class="export">
        <div class="card painel">
          <div class="grupo">
            <h2>O que exportar</h2>
            <span class="campo-r">Aulas</span>
            <div class="seg compacto rolavel" id="exEscopo" role="group" aria-label="Aulas pra exportar">
              <button type="button" class="seg-op" data-esc="todas" aria-pressed="${escopo === 'todas'}">Todas</button>
              ${AULAS.map(a => `<button type="button" class="seg-op" data-esc="${a.id}" aria-pressed="${escopo === a.id}" title="${esc(a.title)}">${a.n}</button>`).join('')}
            </div>
            <label class="opt"><span class="ck"><input type="checkbox" id="exGab" checked><span class="box"></span></span>Incluir gabarito (precisa pra correção)</label>
            <label class="opt"><span class="ck"><input type="checkbox" id="exResp" checked><span class="box"></span></span>Só o que eu respondi</label>
            <div class="acoes"><button type="button" class="btn" id="exCopiar">Copiar texto ${I.copia}</button><button type="button" class="btn sec" id="exBaixar">Baixar .md ${I.baixa}</button></div>
          </div>
          <div class="grupo">
            <h2>Backup</h2>
            <p>As respostas ficam só neste navegador. Pra continuar em outro aparelho, baixe o backup aqui e restaure lá.</p>
            <div class="acoes"><button type="button" class="btn sec mini" id="bkBaixar">Baixar backup ${I.baixa}</button><label class="btn sec mini" for="bkArq" tabindex="0">Restaurar backup ${I.sobe}</label><input type="file" id="bkArq" accept="application/json,.json" hidden></div>
          </div>
          <div class="grupo">
            <div class="acoes"><button type="button" class="btn perigo mini" id="zerar">Apagar todas as respostas</button></div>
            <div class="confirma" id="zerarConf" hidden>
              <p>Isso apaga progresso, objetivas e discursivas deste navegador, e não tem volta.</p>
              <div class="acoes"><button type="button" class="btn perigo mini" id="zerarSim">Sim, apagar tudo</button><button type="button" class="btn sec mini" id="zerarNao">Cancelar</button></div>
            </div>
          </div>
        </div>
        <div class="card saida-wrap">
          <header><span>Texto gerado</span><span id="exTam"></span></header>
          <textarea id="saida" readonly aria-label="Texto gerado"></textarea>
        </div>
      </div>`;
    const saida = document.getElementById('saida');
    const gerar = () => {
      saida.value = gerarTexto(escopo, document.getElementById('exGab').checked, document.getElementById('exResp').checked);
      document.getElementById('exTam').textContent = `${palavras(saida.value)} palavras`;
    };
    const segEsc = document.getElementById('exEscopo');
    segEsc.addEventListener('click', e => {
      const b = e.target.closest('[data-esc]'); if (!b) return;
      escopo = b.dataset.esc;
      segEsc.querySelectorAll('[data-esc]').forEach(x => x.setAttribute('aria-pressed', x === b));
      seg(segEsc); gerar();
    });
    ['exGab', 'exResp'].forEach(id => document.getElementById(id).addEventListener('change', gerar));
    gerar();
    document.getElementById('exCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(saida.value); toast('Texto copiado'); }
      catch (e) { saida.focus(); saida.select(); toast('Texto selecionado: copie pelo teclado'); }
    };
    const data = () => new Date().toISOString().slice(0, 10);
    document.getElementById('exBaixar').onclick = () => { baixar(`respostas-adm-${data()}.md`, saida.value, 'text/markdown'); toast('Arquivo baixado'); };
    document.getElementById('bkBaixar').onclick = () => { baixar(`backup-adm-${EDICAO}-${data()}.json`, JSON.stringify(S, null, 1), 'application/json'); toast('Backup baixado'); };
    const rest = document.querySelector('label[for="bkArq"]');
    rest.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('bkArq').click(); } });
    document.getElementById('bkArq').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => {
        try { const d = JSON.parse(t); if (!d || typeof d !== 'object' || !('est' in d)) throw 0; S = Object.assign(vazio(), d); salvar(); gerar(); toast('Backup restaurado'); }
        catch (err) { toast('Esse arquivo não é um backup deste site'); }
      });
    };
    const conf = document.getElementById('zerarConf');
    document.getElementById('zerar').onclick = () => { conf.hidden = false; };
    document.getElementById('zerarNao').onclick = () => { conf.hidden = true; };
    document.getElementById('zerarSim').onclick = () => { S = vazio(); salvar(); gerar(); conf.hidden = true; toast('Respostas apagadas'); };
  }

  // ---------- roteador ----------
  function rota() {
    const [p, x, y] = location.hash.replace(/^#\/?/, '').split('/');
    if (p === 'aula') aula(x, y === undefined ? undefined : +y);
    else if (p === 'atividades') atividades(x || 'a1');
    else if (p === 'simulado') simulado();
    else if (p === 'exportar') exportar();
    else home();
    app.querySelectorAll('.seg').forEach(s => seg(s, { animar: false }));
    if (!(p === 'aula' && y !== undefined)) window.scrollTo({ top: 0 });
    cascata();
    if (p) app.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', rota);
  rota();
})();
