import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, Inter, JetBrains_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

// Self-hosted at build time by next/font: no third-party requests from board pages.
// Inter is the brand's sanctioned web fallback for Satoshi (not on Google Fonts).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const dela = Dela_Gothic_One({ variable: "--font-dela", weight: "400", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "wall · Incu", template: "%s · wall" },
  description: "Tableros de mensajes y fotos para despedidas, cumpleaños y aniversarios.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${dela.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
