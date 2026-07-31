import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import { AuthProvider } from '../lib/auth';
import { WorksiteProvider } from '../lib/worksite';
import './styles.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope'
});

export const metadata: Metadata = {
  title: 'BuildFlow Web',
  description: 'Back-office Qualité/HSE BuildFlow'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={manrope.className}>
        <AuthProvider>
          <WorksiteProvider>{children}</WorksiteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
