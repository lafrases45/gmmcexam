import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/components/providers/QueryProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import ToastContainer from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "GMMC EMIS | Exam & Student Management",
  description: "Official Student and Exam Information System of Gupteshwor Mahadev Multiple Campus.",
  keywords: ["GMMC", "Gupteshwor Mahadev Multiple Campus", "Pokhara", "EMIS", "Exam Management"],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GMMC EMIS",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
        <QueryProvider>
          <AuthProvider>
            {children}
            <ToastContainer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
