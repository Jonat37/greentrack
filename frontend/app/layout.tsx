import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GreenTrack",
  description: "Rastreabilidade de reciclagem na blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
