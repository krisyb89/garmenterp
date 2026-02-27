// src/app/layout.js
import './globals.css';
import { I18nProvider } from '@/i18n/I18nProvider';

export const metadata = {
  title: 'OHO Global',
  description: 'OHO Global - Garment Trading & Manufacturing ERP',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <I18nProvider>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
