import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type NewsItem = {
  category: string;
  title: string;
  summary: string;
  link?: string;
  publishedAt?: string;
  source?: string;
  image?: string;
};

const feeds = [
  { category: "Minas Gerais", source: "Google Notícias", url: "https://news.google.com/rss/search?q=Minas+Gerais+cultura+turismo+gastronomia+eventos&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { category: "Brasil", source: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml" },
  { category: "Tecnologia", source: "Google Notícias", url: "https://news.google.com/rss/search?q=tecnologia+inovacao+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { category: "Cultura", source: "Google Notícias", url: "https://news.google.com/rss/search?q=cultura+cinema+musica+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { category: "Economia", source: "Google Notícias", url: "https://news.google.com/rss/search?q=economia+negocios+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { category: "Esportes", source: "Google Notícias", url: "https://news.google.com/rss/search?q=esportes+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
  { category: "Turismo", source: "Google Notícias", url: "https://news.google.com/rss/search?q=turismo+viagens+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419" },
];

const localFallbackImages: Record<string, string[]> = {
  "Minas Gerais": [
    "/ame-vision/assets/images/destinos/pc-liberdade1.jpg",
    "/ame-vision/assets/images/destinos/ouro-preto1.jpg",
    "/ame-vision/assets/images/destinos/mercado1.jpg",
  ],
  Turismo: [
    "/ame-vision/assets/images/destinos/ouro-preto1.jpg",
    "/ame-vision/assets/images/destinos/serra-do-cipo1.jpg",
    "/ame-vision/assets/images/destinos/tiradente1.jpg",
  ],
  Cultura: [
    "/ame-vision/assets/images/destinos/pampulha-igrejinha.jpg",
    "/ame-vision/assets/images/destinos/pc-liberdade2.jpg",
    "/ame-vision/assets/images/destinos/mercado1.jpg",
  ],
  Esportes: [
    "/ame-vision/assets/images/destinos/serra-do-cipo1.jpg",
    "/ame-vision/assets/images/destinos/savassi2.jpg",
    "/ame-vision/assets/images/destinos/pampulha1.jpg",
  ],
  Tecnologia: [
    "/ame-vision/assets/images/destinos/pc-liberdade2.jpg",
    "/ame-vision/assets/images/destinos/savassi2.jpg",
    "/ame-vision/assets/images/destinos/pampulha1.jpg",
  ],
  Economia: [
    "/ame-vision/assets/images/destinos/savassi2.jpg",
    "/ame-vision/assets/images/destinos/pc-liberdade1.jpg",
    "/ame-vision/assets/images/destinos/mercado1.jpg",
  ],
  Brasil: [
    "/ame-vision/assets/images/destinos/pc-liberdade1.jpg",
    "/ame-vision/assets/images/destinos/pampulha1.jpg",
    "/ame-vision/assets/images/destinos/ouro-preto1.jpg",
  ],
};

function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function decodeXml(value: string) {
  let text = String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let pass = 0; pass < 4; pass += 1) {
    const decoded = decodeEntities(text);
    const stripped = decoded
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ");
    if (stripped === text) break;
    text = stripped;
  }
  return decodeEntities(text)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/Logo\s+(?:da\s+)?Ag[eê]ncia\s+Brasil/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function usableSummary(value: string) {
  const text = decodeXml(value);
  if (text.length < 55) return "";
  if (/^(logo|imagem|foto|publicidade)/i.test(text)) return "";
  return text.slice(0, 420);
}

function tag(block: string, name: string) {
  return block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "";
}

function normalizeRemoteUrl(raw: string | undefined, base?: string) {
  if (!raw) return "";
  const decoded = decodeEntities(raw.trim()).replace(/&amp;/g, "&");
  try {
    const url = base ? new URL(decoded, base) : new URL(decoded);
    if (!/^https?:$/.test(url.protocol)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function extractImage(block: string) {
  const searchable = `${block}\n${decodeEntities(block)}`;
  const candidates = [
    searchable.match(/<imagem-destaque[^>]*>([^<]+)/i)?.[1],
    searchable.match(/<(?:media:content|media:thumbnail)[^>]+url=["']([^"']+)/i)?.[1],
    searchable.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\//i)?.[1],
    searchable.match(/<enclosure[^>]+type=["']image\/[^"']+["'][^>]+url=["']([^"']+)/i)?.[1],
    searchable.match(/<img[^>]+(?:data-src|data-original|src)=["']([^"']+)/i)?.[1],
  ];
  return candidates.map(candidate => normalizeRemoteUrl(candidate)).find(Boolean) || "";
}

function parseFeed(xml: string, feed: { category: string; source: string }): NewsItem[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 14).map(block => {
    const rawTitle = decodeXml(tag(block, "title"));
    const title = rawTitle.replace(/\s+-\s+[^-]{2,70}$/, "").trim();
    const rawDescription = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const summary = usableSummary(rawDescription);
    const href = block.match(/<link[^>]+href=["']([^"']+)/i)?.[1];
    const rawLink = tag(block, "link");
    const link = normalizeRemoteUrl(rawLink || href);
    return {
      category: feed.category,
      source: feed.source,
      title,
      summary,
      link,
      publishedAt: decodeXml(tag(block, "pubDate") || tag(block, "updated")),
      image: extractImage(block),
    };
  }).filter(item => item.title.length > 12 && item.title.length < 240);
}

async function loadFeed(feed: typeof feeds[number]) {
  const response = await fetch(feed.url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; AMEVision/7.1; +https://alvesmobilidade.com.br)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Feed ${response.status}`);
  return parseFeed(await response.text(), feed);
}

function extractMeta(html: string, names: string[]) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const first = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)`, "i"))?.[1];
    const reversed = html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"))?.[1];
    if (first || reversed) return first || reversed || "";
  }
  return "";
}

function isLikelyEditorialImage(url: string) {
  const lower = url.toLowerCase();
  if (!url || !/^https?:\/\//.test(url)) return false;
  return !/(logo|favicon|avatar|sprite|icon|pixel|tracking|analytics|badge|ads?[\/_-]|banner)/i.test(lower)
    && !/(\.svg(?:\?|$)|\.gif(?:\?|$))/i.test(lower);
}

async function findPageImage(item: NewsItem): Promise<NewsItem> {
  if (item.image || !item.link) return item;
  try {
    const response = await fetch(item.link, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
      },
      cache: "no-store",
    });
    if (!response.ok) return item;
    const finalUrl = response.url || item.link;
    const html = (await response.text()).slice(0, 800_000);
    const rawImage = extractMeta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
    const image = normalizeRemoteUrl(rawImage, finalUrl);
    const rawDescription = extractMeta(html, ["og:description", "twitter:description", "description"]);
    const pageSummary = usableSummary(rawDescription);
    return {
      ...item,
      ...(image && isLikelyEditorialImage(image) ? { image } : {}),
      ...(!item.summary && pageSummary ? { summary: pageSummary } : {}),
    };
  } catch {
    return item;
  }
}

function titleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
}

function localFallback(item: NewsItem) {
  const images = localFallbackImages[item.category] || localFallbackImages.Brasil;
  return images[titleHash(item.title) % images.length];
}

function proxyImage(url: string) {
  return `/api/ame-vision/news/image?url=${encodeURIComponent(url)}`;
}

function ensureWorkingImage(item: NewsItem): NewsItem {
  const remote = normalizeRemoteUrl(item.image);
  return {
    ...item,
    image: remote && isLikelyEditorialImage(remote) ? proxyImage(remote) : localFallback(item),
  };
}

const fallback: NewsItem[] = [
  { category: "Turismo", source: "AME Vision", title: "Minas Gerais reúne história, natureza, cultura e gastronomia em experiências únicas.", summary: "Conteúdo de reserva enquanto as fontes de notícias são atualizadas." },
  { category: "Tecnologia", source: "AME Vision", title: "Inovação e mobilidade transformam a experiência das viagens executivas.", summary: "A programação continuará automaticamente." },
  { category: "Cultura", source: "AME Vision", title: "Cinema, música e arte ajudam a deixar o trajeto mais leve.", summary: "Novas manchetes serão carregadas assim que a conexão estiver disponível." },
  { category: "Turismo", source: "AME Vision", title: "Planejamento e informação tornam deslocamentos longos mais tranquilos.", summary: "Conteúdo informativo de bordo." },
  { category: "Minas Gerais", source: "AME Vision", title: "Cidades históricas e paisagens naturais fazem de Minas um destino diverso.", summary: "Conheça novos destinos com conforto." },
  { category: "Cultura", source: "AME Vision", title: "Curiosidades e atualidades acompanham você durante o caminho.", summary: "A apresentação segue normalmente mesmo sem internet." },
  { category: "Economia", source: "AME Vision", title: "Informação econômica ajuda passageiros a acompanhar os assuntos do dia.", summary: "Conteúdo de reserva do sistema de bordo." },
  { category: "Esportes", source: "AME Vision", title: "Os principais destaques esportivos também fazem parte da programação.", summary: "Atualização automática assim que a conexão estiver disponível." },
  { category: "Brasil", source: "AME Vision", title: "Notícias nacionais selecionadas para uma viagem mais informada.", summary: "O sistema evita repetir a mesma sequência durante o trajeto." },
  { category: "Cultura", source: "AME Vision", title: "Agenda cultural e boas histórias ajudam a tornar a viagem mais agradável.", summary: "Conteúdo de entretenimento e informação." },
];

export async function GET() {
  const settled = await Promise.allSettled(feeds.map(loadFeed));
  const items = settled.flatMap(result => result.status === "fulfilled" ? result.value : []);
  const deduped = [...new Map(items.map(item => [item.title.toLowerCase().replace(/[^a-záéíóúãõç0-9]/gi, ""), item])).values()].slice(0, 50);

  if (!deduped.length) {
    return NextResponse.json(fallback.map(ensureWorkingImage), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const batchSize = 10;
  const enriched: NewsItem[] = [];
  for (let i = 0; i < deduped.length; i += batchSize) {
    const batch = deduped.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(findPageImage));
    enriched.push(...results);
  }
  const result = enriched.map(ensureWorkingImage);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, max-age=0, s-maxage=600, stale-while-revalidate=1800" },
  });
}
