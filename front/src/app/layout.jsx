import './globals.css';

export const metadata = {
  title: 'Meu CRM',
  description: 'Sistema de gestão',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  )
}