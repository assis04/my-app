/** @type {import('next').NextConfig} */

// Monta connect-src dinâmico a partir do NEXT_PUBLIC_API_URL.
// Inclui o equivalente ws/wss porque o socket.io conecta via mesmo host.
function buildConnectSrc() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const wsUrl = apiUrl.replace(/^http/, 'ws');
  return `'self' ${apiUrl} ${wsUrl}`;
}

// CSP. Stack: Next 16 + React 19 + Tailwind v4 + lucide + recharts +
// socket.io-client. Sem CDNs, sem analytics, sem scripts inline manuais.
//
// Por que 'unsafe-inline' em script-src: Next 16 (App Router + reactCompiler
// + RSC) injeta múltiplos <script> inline para hidratação e payloads RSC.
// Sem nonce-based middleware, esses scripts são bloqueados (tela branca).
// Endurecer com nonce-based via middleware.ts é follow-up — listado como
// Task #10 em specs/qa-fixes-plan.md (P2).
//
// Por que 'unsafe-inline' em style-src: Next/Tailwind injetam <style> tags
// runtime. Mesma evolução: nonce no follow-up.
//
// Defesas que SEGUEM ativas mesmo com 'unsafe-inline' em script-src/style-src:
//  - script-src bloqueia scripts de outros domínios
//  - connect-src restrito a self + backend (bloqueia exfil pra outros hosts)
//  - frame-ancestors 'none' impede clickjacking
//  - object-src 'none' bloqueia plugins legados
//  - base-uri 'self' bloqueia injeção de <base>
//  - upgrade-insecure-requests força HTTPS em sub-recursos
//
// img-src inclui data: e blob: para SVG inline (recharts) e previews locais.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src ${buildConnectSrc()}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const nextConfig = {
  output: 'standalone',
  reactCompiler: true,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
