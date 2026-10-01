# ADM · AV1

Site de revisão de **Administração de Empresas (SI015, CESAR School 2026.2)**, aulas 01 a 06.
Estático (HTML + CSS + JS puro, sem build), no design system da MXC.

## O que tem

- **Organograma** (página inicial): a matéria em árvore, raiz → 6 aulas → 39 tópicos. Marca o que já estudou ali mesmo.
- **Aula** (`#/aula/a1`): o conteúdo de cada tópico em ramos, mais o quadro "Não confunda".
- **Atividades** (`#/atividades/a1`): objetivas corrigidas na hora, discursivas e estudo de caso (o gabarito só aparece depois de responder).
- **Simulado** (`#/simulado`): 15 objetivas sorteadas das 6 aulas, nota no fim.
- **Exportar** (`#/exportar`): gera um texto com respostas, gabarito e instrução de correção pra colar numa IA; backup e restauração em JSON.

As respostas ficam no `localStorage` do navegador de quem usa (nada vai pra servidor).

## Duas edições, duas branches

| Branch | Edição | Onde publica | Diferença |
|---|---|---|---|
| `main` | amigos | GitHub Pages (repo público) | `js/edicao.js` só declara `EDICAO = "amigos"` |
| `mateus` | Mateus | Cloudflare Pages, projeto `adm-av1-mateus` | `js/edicao.js` traz `window.MXC`: aplicação de cada tópico na MXC e tarefas MXC por aula |

A **única** diferença entre as branches é `js/edicao.js`. A branch `mateus` **não vai pro repositório público**:
ela vive no remoto privado `privado`.

### Atualizar conteúdo

1. Edita na `main` (`js/conteudo.js`, `js/atividades.js`, `js/app.js`, `css/style.css`), commit, `git push origin main` (o GitHub Pages republica sozinho).
2. `git checkout mateus && git merge main && git push privado mateus`
3. `npx wrangler pages deploy . --project-name adm-av1-mateus --branch main --commit-dirty=true`

### Rodar local

```bash
python3 -m http.server 8970
```
