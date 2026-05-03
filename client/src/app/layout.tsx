import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Memory Hack — Multiplayer Memory Battle",
  description:
    "Game memori multiplayer real-time! Tantang temanmu, hafalkan posisi emoji, dan buktikan siapa yang paling jago mengingat.",
  openGraph: {
    title: "Memory Hack",
    description: "Real-time multiplayer memory battle game",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${nunito.variable} antialiased font-nunito`}>
        {children}
      </body>
    </html>
  );
}
