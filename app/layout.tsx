import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import { GoogleAnalytics } from "@next/third-parties/google";

const siteUrl = "https://www.alvesmobilidade.com.br";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Alves Mobilidade Executiva | Transporte Executivo Premium em BH", template: "%s | Alves Mobilidade Executiva" },
  description: "Transporte executivo premium em Belo Horizonte e Região Metropolitana. Transfer aeroportuário, mobilidade corporativa, eventos, viagens e corridas agendadas com conforto, segurança e pontualidade.",
  keywords: ["transporte executivo belo horizonte", "mobilidade executiva bh", "transfer confins", "motorista executivo bh", "transporte premium belo horizonte"],
  authors: [{ name: "Alves Mobilidade Executiva" }],
  creator: "Alves Mobilidade Executiva",
  publisher: "Alves Mobilidade Executiva",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  verification: { google: "az6wA9QSXZNyF-uYtEYZl3zQ7Gm9-FMAWzo3_SNHCag" },
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Alves Mobilidade Executiva",
    description: "Mobilidade executiva premium em Belo Horizonte para empresas e clientes particulares.",
    url: siteUrl,
    siteName: "Alves Mobilidade Executiva",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/images/hero-byd.jpg", width: 1200, height: 630, alt: "Alves Mobilidade Executiva" }],
  },
  twitter: { card: "summary_large_image", title: "Alves Mobilidade Executiva", description: "Mobilidade executiva premium em Belo Horizonte.", images: ["/images/hero-byd.jpg"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
      <GoogleAnalytics gaId="G-ZRK4D4XD7B" />
    </html>
  );
}
