/** @type {import('next').NextConfig} */

// CSP estático em todas as rotas. Stack: Next 15.x + React 19 + Tailwind v4 +
// lucide + recharts + socket.io-client. 'unsafe-inline' em script-src/style-src
// porque Next/React injetam scripts inline para hidratação e RSC payloads
// — sem nonce-based middleware o framework não propaga nonces nas tags.
//
// Histórico: Next 16.2.4 introduziu auto-CSP nonce-based que NÃO propagava
// o nonce nas tags <script> (bug). Downgrade pra 15.x devolveu controle.
//
// Defesas que SEGUEM ativas com 'unsafe-inline':
//   - script-src 'self' bloqueia scripts de outros domínios
//   - connect-src restrito a self + backend
//   - frame-ancestors 'none' anti-clickjacking
//   - object-src 'none' bloqueia plugins legados
//   - base-uri 'self' contra injeção de <base>
//   - upgrade-insecure-requests força HTTPS

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const wsUrl = apiUrl.replace(/^http/, 'ws');

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${apiUrl} ${wsUrl}`,
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
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
