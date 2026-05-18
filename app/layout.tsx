import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Image from "next/image";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const whatsappLink = "https://wa.me/5531998458084";
const siteUrl = "https://alves-mobilidade-site.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),

  title: {
    default: "Alves Mobilidade Executiva",
    template: "%s | Alves Mobilidade Executiva",
  },

  description:
    "Transporte executivo premium em Belo Horizonte para empresas e clientes particulares. Transfer aeroportuário, mobilidade corporativa, eventos e atendimento executivo com conforto, segurança e pontualidade.",

  keywords: [
    "transporte executivo belo horizonte",
    "mobilidade executiva bh",
    "transfer confins",
    "transfer aeroporto belo horizonte",
    "motorista executivo belo horizonte",
    "carro executivo bh",
    "mobilidade corporativa belo horizonte",
    "transporte premium belo horizonte",
    "transfer executivo bh",
    "transporte empresarial belo horizonte",
  ],

  authors: [{ name: "Alves Mobilidade Executiva" }],
  creator: "Alves Mobilidade Executiva",
  publisher: "Alves Mobilidade Executiva",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  verification: {
    google: "az6wA9QSXZNyF-uYtEYZl3zQ7Gm9-FMAWzo3_SNHCag",
  },

  icons: {
    icon: "/favicon.ico",
  },

  openGraph: {
    title: "Alves Mobilidade Executiva",
    description:
      "Mobilidade executiva premium para empresas e clientes particulares em Belo Horizonte.",
    url: siteUrl,
    siteName: "Alves Mobilidade Executiva",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/images/hero-byd.jpg",
        width: 1200,
        height: 630,
        alt: "Alves Mobilidade Executiva",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Alves Mobilidade Executiva",
    description:
      "Mobilidade executiva premium em Belo Horizonte para empresas e particulares.",
    images: ["/images/hero-byd.jpg"],
  },
};

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      className="h-6 w-6"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.04 3C8.88 3 3.06 8.8 3.06 15.92c0 2.28.6 4.5 1.74 6.45L3 29l6.82-1.78a13 13 0 0 0 6.22 1.58h.01C23.2 28.8 29 23 29 15.88 29 8.8 23.18 3 16.04 3Zm0 23.6h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.24-4.04 1.06 1.08-3.94-.26-.4a10.7 10.7 0 0 1-1.65-5.66c0-5.9 4.84-10.72 10.78-10.72 2.88 0 5.58 1.12 7.62 3.15a10.62 10.62 0 0 1 3.16 7.53c0 5.9-4.84 10.72-10.78 10.72Zm5.9-8.03c-.32-.16-1.9-.94-2.2-1.05-.3-.1-.52-.16-.74.16-.22.32-.85 1.05-1.04 1.26-.2.22-.38.24-.7.08-.32-.16-1.36-.5-2.6-1.6-.96-.85-1.6-1.9-1.8-2.22-.18-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.2.22-.32.32-.54.1-.22.05-.4-.03-.56-.08-.16-.74-1.78-1.02-2.44-.27-.64-.54-.56-.74-.57h-.64c-.22 0-.56.08-.86.4-.3.32-1.14 1.12-1.14 2.72 0 1.6 1.18 3.16 1.34 3.38.16.22 2.32 3.54 5.62 4.96.78.34 1.4.54 1.88.7.8.25 1.52.22 2.1.13.64-.1 1.9-.78 2.17-1.52.27-.75.27-1.38.19-1.52-.08-.14-.3-.22-.62-.38Z" />
    </svg>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${sora.variable}`}>
        <Header />

        {children}

        <footer className="bg-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
            <div className="flex flex-col items-center text-center">
              <Image
                src="/branding/logo-dark.png"
                alt="Alves Mobilidade Executiva"
                width={220}
                height={80}
                className="h-auto w-[190px] md:w-[220px]"
              />

              <p className="mt-6 max-w-md text-sm leading-7 text-slate-300 md:text-base">
                Mobilidade executiva premium para empresas e clientes particulares
                em Belo Horizonte e região metropolitana.
              </p>

              <div className="mt-10 grid w-full max-w-3xl gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em]">
                    Serviços
                  </h4>

                  <div className="space-y-2 text-sm text-slate-300">
                    <p>Mobilidade Corporativa</p>
                    <p>Transfer Aeroportuário</p>
                    <p>Eventos</p>
                    <p>Atendimento Particular</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em]">
                    Contato
                  </h4>

                  <div className="space-y-2 text-sm text-slate-300">
                    <p>(31) 99845-8084</p>
                    <p>contato@alvesmobilidade.com.br</p>
                    <p>Belo Horizonte • Região Metropolitana</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
            © 2022 - {new Date().getFullYear()} Alves Mobilidade Executiva
          </div>
        </footer>

        <a
          href={whatsappLink}
          target="_blank"
          className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition hover:scale-110"
        >
          <WhatsAppIcon />
        </a>
      </body>

      <GoogleAnalytics gaId="G-ZRK4D4XD7B" />
    </html>
  );
}