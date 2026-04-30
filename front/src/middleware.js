import { NextResponse } from 'next/server';

/**
 * CSP middleware com infraestrutura para nonce — aplicado em TODA rota
 * do app. Hoje ainda emite 'unsafe-inline' em script-src/style-src porque
 * Next 16 não propaga o nonce do request header pra <script> tags em
 * rotas pré-renderizadas (◯ Static no build output). Validado em
 * 2026-04-30: o nonce é gerado e injetado no header, mas as `<script>`
 * geradas no build não recebem o atributo nonce.
 *
 * Quando Next 16+ resolver isso (ou se migrarmos páginas críticas para
 * `export const dynamic = 'force-dynamic'`), removemos 'unsafe-inline'
 * mantendo só o nonce. A infraestrutura aqui já está pronta para isso.
 *
 * Defesas que SEGUEM ativas:
 *  - script-src 'self' bloqueia scripts de outros domínios
 *  - connect-src restrito a self + backend (anti-exfil)
 *  - frame-ancestors 'none' anti-clickjacking
 *  - object-src 'none' bloqueia plugins legados
 *  - base-uri 'self' contra injeção de <base>
 *  - upgrade-insecure-requests força HTTPS em sub-recursos
 */

function buildCsp(nonce) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const wsUrl = apiUrl.replace(/^http/, 'ws');

  return [
    "default-src 'self'",
    // 'nonce-...' fica no header pra evolução futura mas não é honrado
    // ainda porque as tags <script> geradas no build não têm nonce=.
    // 'unsafe-inline' é o que efetivamente permite os scripts inline do Next.
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
    `connect-src 'self' ${apiUrl} ${wsUrl}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function middleware(request) {
  // Web Crypto API gera UUID v4 — disponível no Edge Runtime.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  // Propagar o CSP pro Next gerar <Script nonce={...}> automaticamente.
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Header enforçado pelo browser.
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    // Aplica em todas as rotas exceto: api routes, assets estáticos do Next,
    // imagens otimizadas, prefetches RSC e favicons. Incluir essas só polui
    // o nonce sem benefício de segurança (são bytes estáticos servidos pelo Next).
    {
      source:
        '/((?!api|_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
