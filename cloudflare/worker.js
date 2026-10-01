// Porteiro da edição Mateus: pede senha (HTTP Basic) antes de servir o site.
// A senha é o secret SENHA do Worker (npx wrangler secret put SENHA --name <nome>); o usuário pode ser qualquer um.
const iguais = (a, b) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

export default {
  async fetch(req, env) {
    const [tipo, cred] = (req.headers.get('Authorization') || '').split(' ');
    if (env.SENHA && tipo === 'Basic' && cred) {
      let senha = '';
      try { senha = atob(cred).split(':').slice(1).join(':'); } catch (e) {}
      if (iguais(senha, env.SENHA)) return env.ASSETS.fetch(req);
    }
    return new Response('Acesso restrito.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="ADM AV1", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' }
    });
  }
};
