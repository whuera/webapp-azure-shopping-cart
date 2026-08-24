import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portal Controller",
  description: "Panel de administración empresarial",
};

/** Inline script that runs before hydration to avoid flash of wrong theme */
const themeScript = `
  try {
    var t = localStorage.getItem('portal-theme');
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : 'dark');
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="dark">
      <head>
        {/* Anti-flash: set theme before paint */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
