// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'OHO Global',
  description: 'OHO Global - Garment Trading & Manufacturing ERP',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
