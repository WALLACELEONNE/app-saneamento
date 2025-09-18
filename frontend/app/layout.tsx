import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { Footer } from '@/components/footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'Sistema de Saneamento - Controle de Estoque',
    template: '%s | Sistema de Saneamento',
  },
  description:
    'Sistema integrado para controle de estoque e materiais de saneamento com comparação entre SIAGRI e CIGAM',
  keywords: [
    'saneamento',
    'estoque',
    'materiais',
    'SIAGRI',
    'CIGAM',
    'controle',
    'inventário',
  ],
  authors: [{ name: 'Sistema de Saneamento' }],
  creator: 'Sistema de Saneamento',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'Sistema de Saneamento - Controle de Estoque',
    description:
      'Sistema integrado para controle de estoque e materiais de saneamento',
    siteName: 'Sistema de Saneamento',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sistema de Saneamento - Controle de Estoque',
    description:
      'Sistema integrado para controle de estoque e materiais de saneamento',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
              {modal}
              <Footer />
            </div>
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}