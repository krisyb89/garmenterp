// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'Garment ERP',
  description: 'Garment Trading & Manufacturing ERP System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
