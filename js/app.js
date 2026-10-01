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
  const semTag = s => String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

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

  // ---------- utilidades de UI ----------
  let toastT;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
  }
  function marcarNav(rota) {
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.dataset.rota === rota) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  const ck = (id, label) => `<span class="ck"><input type="checkbox" data-est="${id}" ${S.est[id] ? 'checked' : ''} aria-label="${esc(label)}"><span class="box"></span></span>`;
  function ramo(l) {
    if (Array.isArray(l)) return `<li>${l[0]}<ul>${l[1].map(x => `<li>${x}</li>`).join('')}</ul></li>`;
    return `<li>${l}</li>`;
  }

  // checkbox "estudei" funciona em qualquer tela
  app.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset && el.dataset.est) {
      const id = el.dataset.est;
      if (el.checked) S.est[id] = true; else delete S.est[id];
      salvar();
      document.querySelectorAll(`[data-est="${id}"]`).forEach(x => { x.checked = el.checked; });
      const li = el.closest('li'); if (li) li.classList.toggle('feito', el.checked);
      const art = el.closest('.topico'); if (art) art.classList.toggle('feito', el.checked);
      atualizarContadores();
    }
  });
  function atualizarContadores() {
    AULAS.forEach(a => {
      const e = estudados(a);
      document.querySelectorAll(`[data-prog="${a.id}"]`).forEach(x => { x.textContent = `${e}/${a.topics.length}`; });
      document.querySelectorAll(`[data-barra="${a.id}"]`).forEach(x => { x.style.width = pct(e, a.topics.length) + '%'; });
    });
    const t = totalEstudados();
    document.querySelectorAll('[data-prog="total"]').forEach(x => { x.textContent = `${t}/${totalTopicos}`; });
    document.querySelectorAll('[data-barra="total"]').forEach(x => { x.style.width = pct(t, totalTopicos) + '%'; });
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
          <div><b data-prog="total">${totalEstudados()}/${totalTopicos}</b><span>tópicos estudados</span></div>
          <div><b>${mcC}/${mcT}</b><span>acertos nas objetivas</span></div>
          <div><b>${dE}/${dT}</b><span>discursivas escritas</span></div>
        </div>
      </section>

      <section class="org-moldura" aria-labelledby="org-t">
        <header><h2 id="org-t">Mapa das 6 aulas</h2><p>Marque o quadrado quando estudar o tópico. Clique no nome pra abrir.</p></header>
        <div class="org-raiz"><div><strong>Administração de Empresas</strong><small>AV1 · ${AULAS.length} aulas · ${totalTopicos} tópicos</small></div></div>
        <div class="org-cols">
          ${AULAS.map(a => `
            <div class="org-col">
              <a class="org-aula" href="#/aula/${a.id}">
                <span class="n">${a.n}</span><span class="t">${a.title}</span><span class="p"><span data-prog="${a.id}">${estudados(a)}/${a.topics.length}</span> estudados</span>
                <span class="barra"><span data-barra="${a.id}" style="width:${pct(estudados(a), a.topics.length)}%"></span></span>
              </a>
              <ul class="org-topicos">
                ${a.topics.map((t, i) => { const id = `${a.id}-${i}`; return `<li class="${S.est[id] ? 'feito' : ''}">${ck(id, 'Estudei: ' + t.t)}<a href="#/aula/${a.id}/${i}">${t.t}</a></li>`; }).join('')}
              </ul>
            </div>`).join('')}
        </div>
      </section>

      <section aria-labelledby="atv-t">
        <div class="secao-titulo"><h2 id="atv-t">Atividades por aula</h2><a class="btn sec mini" href="#/simulado">Fazer simulado geral</a></div>
        <div class="grade-aulas">
          ${AULAS.map(a => { const p = placarAula(a.id); return `
            <article class="cartao">
              <span class="n">AULA ${a.n}</span><h3>${a.title}</h3>
              <dl>
                <dt>Tópicos estudados</dt><dd data-prog="${a.id}">${estudados(a)}/${a.topics.length}</dd>
                <dt>Objetivas</dt><dd>${p.certas}/${p.resp} certas · ${p.mcTotal} no total</dd>
                <dt>Discursivas${MXC ? ' e MXC' : ''}</dt><dd>${p.escritas}/${p.dTotal}</dd>
              </dl>
              <div class="acoes"><a class="btn mini" href="#/atividades/${a.id}">Atividades</a><a class="btn sec mini" href="#/aula/${a.id}">Conteúdo</a></div>
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
        <div class="acoes"><a class="btn mini" href="#/atividades/${a.id}">Fazer as atividades</a><span class="selo"><span data-prog="${a.id}">${estudados(a)}/${a.topics.length}</span> estudados</span></div>
      </header>
      <div class="tronco">
        ${a.topics.map((t, i) => { const id = `${a.id}-${i}`; const nota = MXC && MXC.notas[id]; return `
          <article class="topico${t.wide ? ' largo' : ''}${S.est[id] ? ' feito' : ''}" id="t-${id}">
            <div class="cab"><label>${ck(id, 'Estudei: ' + t.t)}<h2>${t.t}</h2></label></div>
            <p class="fonte">${t.s}</p>
            <ul class="ramos">${t.leaves.map(ramo).join('')}</ul>
            ${nota ? `<div class="mxc">${nota}</div>` : ''}
          </article>`; }).join('')}
      </div>
      <aside class="pegadinhas"><h2>Não confunda</h2><ul>${a.traps.map(x => `<li>${x}</li>`).join('')}</ul></aside>
      <nav class="passos" aria-label="Navegação entre aulas">
        ${ant ? `<a class="btn sec" href="#/aula/${ant.id}">← Aula ${ant.n}</a>` : '<span></span>'}
        <a class="btn" href="#/atividades/${a.id}">Atividades da aula ${a.n}</a>
        ${prox ? `<a class="btn sec" href="#/aula/${prox.id}">Aula ${prox.n} →</a>` : '<a class="btn sec" href="#/simulado">Simulado →</a>'}
      </nav>`;
    if (ti !== undefined) {
      const el = document.getElementById(`t-${a.id}-${ti}`);
      if (el) { el.classList.add('alvo'); requestAnimationFrame(() => el.scrollIntoView({ block: 'start' })); }
    }
  }

  function mcHTML(q, id, n, origem) {
    const r = S.mc[id];
    const respondida = r !== undefined;
    return `
      <article class="questao" data-q="${id}">
        <div class="enun"><span class="num">${n}</span><p>${esc(q.q)}</p></div>
        ${origem ? `<p class="origem">${origem}</p>` : ''}
        <div class="opcoes" role="group" aria-label="Alternativas">
          ${q.o.map((o, k) => {
            let cls = '';
            if (respondida && k === q.c) cls = ' certa';
            else if (respondida && k === r) cls = ' errada';
            return `<button type="button" class="opcao${cls}" data-mc="${id}" data-k="${k}" ${respondida ? 'disabled' : ''}><span class="letra">${LETRAS[k]}</span><span>${esc(o)}</span></button>`;
          }).join('')}
        </div>
        ${respondida ? `<div class="fb"><strong class="${r === q.c ? 'ok' : 'erro'}">${r === q.c ? 'Certa.' : `Errada. A certa é a ${LETRAS[q.c]}.`}</strong> ${esc(q.e)}</div>` : ''}
      </article>`;
  }

  function discHTML(d) {
    const txt = S.txt[d.id] || '';
    const env = !!S.env[d.id];
    return `
      <article class="questao${d.mxc ? ' mxcq' : ''}" data-d="${d.id}">
        <div class="enun"><span class="num">${d.n}</span><p>${esc(d.q)}</p></div>
        <div class="resp">
          <textarea data-txt="${d.id}" aria-label="Sua resposta" placeholder="Escreva sua resposta antes de ver o gabarito">${esc(txt)}</textarea>
          <div class="linha"><span data-cont="${d.id}">${txt.trim() ? txt.trim().split(/\s+/).length + ' palavras · salvo' : 'sem resposta ainda'}</span>
            ${env ? '<span class="selo ok">gabarito liberado</span>' : `<button type="button" class="btn mini" data-env="${d.id}">Enviar e ver ${d.mxc ? 'o que conta na correção' : 'o gabarito'}</button>`}
          </div>
        </div>
        ${env ? `<div class="gab"><h4>${d.mxc ? 'O que uma boa resposta tem' : 'Uma resposta completa cobre'}</h4><ul>${d.g.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      </article>`;
  }

  function atividades(aid) {
    const a = aulaPorId(aid); if (!a) return home();
    marcarNav('atividades');
    const at = ATV[aid];
    const ds = discursivas(aid);
    const p = placarAula(aid);
    app.innerHTML = `
      <header class="cab-aula">
        <span class="n">${a.n}</span>
        <h1>Atividades · ${a.title}</h1>
        <span class="meta">Responda primeiro. O gabarito só aparece depois.</span>
        <div class="acoes">${AULAS.map(x => `<a class="btn mini ${x.id === aid ? '' : 'sec'}" href="#/atividades/${x.id}" ${x.id === aid ? 'aria-current="page"' : ''}>${x.n}</a>`).join('')}</div>
      </header>
      <div class="resumo">
        <span>Objetivas: <b>${p.certas}</b> certas de <b>${p.resp}</b> respondidas (${p.mcTotal} no total)</span>
        <span>Discursivas${MXC ? ' e MXC' : ''}: <b>${p.escritas}</b>/${p.dTotal} escritas</span>
        <a class="btn sec mini" href="#/aula/${aid}">Reler o conteúdo</a>
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
        <a class="btn sec" href="#/aula/${aid}">← Conteúdo da aula ${a.n}</a>
        <a class="btn" href="#/exportar">Exportar respostas</a>
      </nav>`;
  }

  // cliques de questão (objetivas, enviar discursiva, refazer)
  app.addEventListener('click', e => {
    const op = e.target.closest('[data-mc]');
    if (op && !op.disabled) {
      const id = op.dataset.mc, k = +op.dataset.k;
      if (id.startsWith('sim-')) { S.sim.ans[id] = k; salvar(); return simulado(); }
      S.mc[id] = k; salvar();
      const [aid, , i] = id.split('-');
      const art = op.closest('.questao');
      const novo = document.createElement('div');
      novo.innerHTML = mcHTML(ATV[aid].mc[+i], id, art.querySelector('.num').textContent, art.querySelector('.origem') ? art.querySelector('.origem').innerHTML : '');
      art.replaceWith(novo.firstElementChild);
      return;
    }
    const env = e.target.closest('[data-env]');
    if (env) {
      const id = env.dataset.env;
      if (!(S.txt[id] || '').trim()) { toast('Escreva sua resposta antes de ver o gabarito'); const t = document.querySelector(`[data-txt="${id}"]`); if (t) t.focus(); return; }
      S.env[id] = true; salvar();
      const art = env.closest('.questao');
      const aid = id.split('-')[0];
      const d = discursivas(aid).find(x => x.id === id);
      const novo = document.createElement('div'); novo.innerHTML = discHTML(d);
      art.replaceWith(novo.firstElementChild);
      return;
    }
    const ref = e.target.closest('[data-refazer]');
    if (ref) {
      const aid = ref.dataset.refazer;
      Object.keys(S.mc).forEach(k => { if (k.startsWith(aid + '-mc-')) delete S.mc[k]; });
      salvar(); atividades(aid); toast('Objetivas zeradas');
    }
  });
  // autosave das discursivas
  let tSalvar;
  app.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset && t.dataset.txt) {
      S.txt[t.dataset.txt] = t.value;
      const c = document.querySelector(`[data-cont="${t.dataset.txt}"]`);
      if (c) c.textContent = t.value.trim() ? t.value.trim().split(/\s+/).length + ' palavras · salvo' : 'sem resposta ainda';
      clearTimeout(tSalvar); tSalvar = setTimeout(salvar, 300);
    }
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
    const qs = sim.ids.map((ref, n) => {
      const [aid, i] = ref.split('-'); const q = ATV[aid].mc[+i]; return { q, aid, id: `sim-${aid}-${i}`, n: n + 1 };
    });
    const resp = qs.filter(x => sim.ans[x.id] !== undefined).length;
    const certas = qs.filter(x => sim.ans[x.id] === x.q.c).length;
    const html = x => {
      const r = sim.ans[x.id]; const a = aulaPorId(x.aid);
      const corrigido = sim.feito;
      return `<article class="questao">
        <div class="enun"><span class="num">${x.n}</span><p>${esc(x.q.q)}</p></div>
        <p class="origem">Aula ${a.n} · ${a.title}</p>
        <div class="opcoes" role="group" aria-label="Alternativas">
          ${x.q.o.map((o, k) => {
            let cls = '';
            if (corrigido && k === x.q.c) cls = ' certa';
            else if (corrigido && k === r) cls = ' errada';
            else if (!corrigido && k === r) cls = ' marcada';
            return `<button type="button" class="opcao${cls}" data-mc="${x.id}" data-k="${k}" ${corrigido ? 'disabled' : ''} ${!corrigido && k === r ? 'aria-pressed="true" style="border-color:var(--brand-ink);background:rgba(47,103,252,.12)"' : ''}><span class="letra">${LETRAS[k]}</span><span>${esc(o)}</span></button>`;
          }).join('')}
        </div>
        ${corrigido ? `<div class="fb"><strong class="${r === x.q.c ? 'ok' : 'erro'}">${r === undefined ? 'Em branco.' : r === x.q.c ? 'Certa.' : 'Errada.'}</strong> ${r === x.q.c ? '' : `A certa é a ${LETRAS[x.q.c]}. `}${esc(x.q.e)}</div>` : ''}
      </article>`;
    };
    app.innerHTML = `
      <section class="hero">
        <span class="rotulo">Todas as aulas, misturadas</span>
        <h1>Simulado</h1>
        <p>${qs.length} objetivas sorteadas das 6 aulas. Marque todas e corrija no fim, como na prova. Pode trocar a resposta até corrigir.</p>
        <div class="resumo">
          <span><b>${resp}</b>/${qs.length} respondidas</span>
          ${sim.feito ? `<span>Nota: <b>${(10 * certas / qs.length).toFixed(1).replace('.', ',')}</b> (${certas}/${qs.length})</span>` : ''}
        </div>
      </section>
      <div class="questoes">${qs.map(html).join('')}</div>
      <div class="passos">
        <button type="button" class="btn sec" id="simNovo">Sortear outro simulado</button>
        ${sim.feito ? '' : `<button type="button" class="btn" id="simCorrigir">Corrigir simulado</button>`}
      </div>`;
    document.getElementById('simNovo').onclick = () => { novoSimulado(15); simulado(); window.scrollTo(0, 0); };
    const c = document.getElementById('simCorrigir');
    if (c) c.onclick = () => { S.sim.feito = true; salvar(); simulado(); window.scrollTo(0, 0); };
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
        L.push(`### ${d.tipo} · ${d.n}`, '', `**Pergunta:** ${d.q}`, '', `**Minha resposta:**`, '', t ? t : '_(sem resposta)_', '');
        if (comGab) L.push(`**Gabarito (pontos esperados):**`, ...d.g.map(x => `- ${x}`), '');
      });
    });
    return L.join('\n');
  }
  function baixar(nome, conteudo, tipo) {
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function exportar() {
    marcarNav('exportar');
    app.innerHTML = `
      <section class="hero">
        <span class="rotulo">Correção e backup</span>
        <h1>Exportar respostas</h1>
        <p>${MXC ? 'Gera um texto com suas respostas, o gabarito e a instrução de correção. Copie e mande pro Claude: ele dá nota questão por questão e aponta o que revisar.' : 'Gera um texto com suas respostas, o gabarito e a instrução de correção. Copie e cole numa IA (ChatGPT, Claude, Gemini) pra receber nota e o que revisar.'}</p>
      </section>
      <div class="export">
        <div class="painel">
          <h2>O que exportar</h2>
          <label class="campo">Aulas
            <select id="exEscopo"><option value="todas">Todas as aulas</option>${AULAS.map(a => `<option value="${a.id}">Aula ${a.n}: ${a.title}</option>`).join('')}</select>
          </label>
          <label class="opt"><span class="ck"><input type="checkbox" id="exGab" checked><span class="box"></span></span>Incluir gabarito (precisa pra correção)</label>
          <label class="opt"><span class="ck"><input type="checkbox" id="exResp" checked><span class="box"></span></span>Só o que eu respondi</label>
          <div class="acoes"><button type="button" class="btn" id="exCopiar">Copiar texto</button><button type="button" class="btn sec" id="exBaixar">Baixar .md</button></div>
          <div class="perigo">
            <h2>Backup</h2>
            <p>As respostas ficam só neste navegador. Pra levar pra outro aparelho, baixe o backup aqui e restaure lá.</p>
            <div class="acoes"><button type="button" class="btn sec mini" id="bkBaixar">Baixar backup</button><label class="btn sec mini" for="bkArq">Restaurar backup</label><input type="file" id="bkArq" accept="application/json,.json" hidden></div>
            <div class="acoes"><button type="button" class="btn alerta mini" id="zerar">Apagar todas as respostas</button></div>
            <p id="zerarConf" hidden>Isso apaga progresso, objetivas e discursivas deste navegador e não tem volta. <button type="button" class="btn alerta mini" id="zerarSim">Sim, apagar tudo</button> <button type="button" class="btn sec mini" id="zerarNao">Cancelar</button></p>
          </div>
        </div>
        <label class="campo" style="min-width:0">Texto gerado
          <textarea id="saida" readonly></textarea>
        </label>
      </div>`;
    const saida = document.getElementById('saida');
    const gerar = () => { saida.value = gerarTexto(document.getElementById('exEscopo').value, document.getElementById('exGab').checked, document.getElementById('exResp').checked); };
    ['exEscopo', 'exGab', 'exResp'].forEach(id => document.getElementById(id).addEventListener('change', gerar));
    gerar();
    document.getElementById('exCopiar').onclick = async () => {
      try { await navigator.clipboard.writeText(saida.value); toast('Copiado'); }
      catch (e) { saida.focus(); saida.select(); toast('Texto selecionado: use Copiar do teclado'); }
    };
    const data = () => new Date().toISOString().slice(0, 10);
    document.getElementById('exBaixar').onclick = () => { baixar(`respostas-adm-${data()}.md`, saida.value, 'text/markdown'); toast('Arquivo baixado'); };
    document.getElementById('bkBaixar').onclick = () => { baixar(`backup-adm-${EDICAO}-${data()}.json`, JSON.stringify(S, null, 1), 'application/json'); toast('Backup baixado'); };
    document.getElementById('bkArq').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(t => {
        try { const d = JSON.parse(t); if (!d || typeof d !== 'object' || !('est' in d)) throw 0; S = Object.assign(vazio(), d); salvar(); gerar(); toast('Backup restaurado'); }
        catch (err) { toast('Esse arquivo não é um backup deste site'); }
      });
    };
    document.getElementById('zerar').onclick = () => { document.getElementById('zerarConf').hidden = false; };
    document.getElementById('zerarNao').onclick = () => { document.getElementById('zerarConf').hidden = true; };
    document.getElementById('zerarSim').onclick = () => { S = vazio(); salvar(); gerar(); document.getElementById('zerarConf').hidden = true; toast('Respostas apagadas'); };
  }

  // ---------- roteador ----------
  function rota() {
    const h = location.hash.replace(/^#\/?/, '').split('/');
    const [p, x, y] = h;
    if (p === 'aula') aula(x, y === undefined ? undefined : +y);
    else if (p === 'atividades') atividades(x || 'a1');
    else if (p === 'simulado') simulado();
    else if (p === 'exportar') exportar();
    else home();
    if (!(p === 'aula' && y !== undefined)) window.scrollTo(0, 0);
    if (p) app.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', rota);
  rota();
})();
