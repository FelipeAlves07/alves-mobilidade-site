import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });

const whatsappLink = "https://wa.me/5531998458084";
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

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" fill="currentColor" aria-hidden="true">
      <path d="M16.04 3C8.88 3 3.06 8.8 3.06 15.92c0 2.28.6 4.5 1.74 6.45L3 29l6.82-1.78a13 13 0 0 0 6.22 1.58h.01C23.2 28.8 29 23 29 15.88 29 8.8 23.18 3 16.04 3Zm0 23.6h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-4.04 1.06 1.08-3.94-.26-.4a10.7 10.7 0 0 1-1.65-5.66c0-5.9 4.84-10.72 10.78-10.72 2.88 0 5.58 1.12 7.62 3.15a10.62 10.62 0 0 1 3.16 7.53c0 5.9-4.84 10.72-10.78 10.72Zm5.9-8.03c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.26-.2.22-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.85-1.6-1.9-1.8-2.22-.18-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.2.22-.32.32-.54.1-.22.05-.4-.03-.56-.08-.16-.74-1.78-1.02-2.44-.27-.64-.54-.56-.74-.57h-.64c-.22 0-.56.08-.86.4-.3.32-1.14 1.12-1.14 2.72 0 1.6 1.18 3.16 1.34 3.38.16.22 2.32 3.54 5.62 4.96.78.34 1.4.54 1.88.7.8.25 1.52.22 2.1.13.64-.1 1.9-.78 2.17-1.52.27-.75.27-1.38.19-1.52-.08-.14-.3-.22-.62-.38Z" />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${sora.variable}`}>
        <Header />
        {children}
        <footer className="
        border-t
        border-[#d6a85f]/10

        bg-gradient-to-b
        from-[#1d1d1d]
        via-[#181818]
        to-[#121212]

        text-[#f5f0e8]

        shadow-[0_-20px_80px_rgba(214,168,95,0.03)]
        ">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
            <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1.25fr_0.8fr_0.8fr]">
              <div>
                <Image src="/branding/logo-oficial-alves.jpg" alt="Alves Mobilidade Executiva" width={760} height={260} className="h-auto w-[220px]" />
                <p className="mt-6 max-w-md text-sm leading-7 text-zinc-300 md:text-base">Mobilidade executiva premium em Belo Horizonte e Região Metropolitana, com conforto, segurança e sofisticação.</p>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.25em] text-[#d6a85f]">Serviços</h4>
                <div className="mt-5 space-y-3 text-sm text-zinc-300"><p>Aeroportos</p><p>Empresas</p><p>Casamentos e eventos</p><p>Viagens agendadas</p></div>
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-[0.25em] text-[#d6a85f]">Contato</h4>
                <div className="mt-5 space-y-3 text-sm text-zinc-300"><p>(31) 99845-8084</p><p>contato@alvesmobilidade.com.br</p><p>Belo Horizonte • MG</p></div>
              </div>
            </div>
            <div className="flex flex-col gap-3 py-5 text-xs text-zinc-400 md:flex-row md:items-center md:justify-between"><p>© 2022 - {new Date().getFullYear()} Alves Mobilidade Executiva.</p><p>Experiência premium em cada trajeto.</p></div>
          </div>
        </footer>
        <Link href={whatsappLink} target="_blank" className="fixed bottom-5 right-5 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_0_45px_rgba(37,211,102,.45)] transition hover:scale-110" aria-label="Falar no WhatsApp"><WhatsAppIcon /></Link>
      </body>
      <GoogleAnalytics gaId="G-ZRK4D4XD7B" />
    </html>
  );
}
