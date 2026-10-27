import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';
import { NotificationsProvider } from '@/lib/notifications-context';
import { NotificationToast } from '@/components/notifications/NotificationToast';

export const metadata: Metadata = {
  title: 'StudyRoom | UTB',
  description: 'Plataforma de estudio simultáneo y gestión de tutorías académicas de la Universidad Tecnológica de Bolívar.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>
          <NotificationsProvider>
            {children}
            <NotificationToast />
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
