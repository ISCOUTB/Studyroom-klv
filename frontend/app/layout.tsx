import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { CatalogoProvider } from '@/lib/catalogo';
import { NotificationsProvider } from '@/lib/notifications-context';
import { NotificationToast } from '@/components/notifications/NotificationToast';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'StudyRoom | UTB',
  description: 'Plataforma de estudio simultáneo y gestión de tutorías académicas de la Universidad Tecnológica de Bolívar.',
};

// Aplica el tema antes del primer pintado para evitar el destello claro.
const scriptTema = `
try {
  var guardado = localStorage.getItem('studyroom-theme');
  var oscuro = guardado
    ? guardado === 'dark'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (oscuro) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <CatalogoProvider>
              <NotificationsProvider>
                {children}
                <NotificationToast />
              </NotificationsProvider>
            </CatalogoProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
