import { fleet, destinations } from "../data/content.js";
import { ameApi } from "../core/api.js";
import { escapeHtml } from "../core/dom.js";

const image = (src, alt = "") => `<img src="${src}" alt="${escapeHtml(alt)}" loading="eager" onerror="this.onerror=null;this.src='assets/images/destinos/pc-liberdade2.jpg'">`;

let newsCache = null;
let newsPromise = null;
async function getCachedNews() {
  if (newsCache?.length) return newsCache;
  if (!newsPromise) {
    newsPromise = ameApi.getNews().then(items => {
      newsCache = Array.isArray(items) && items.length ? items : [];
      return newsCache;
    }).catch(() => []);
  }
  return newsPromise;
}

function cleanNewsText(value = "") {
  let text = String(value || "");
  // RSS feeds sometimes encode complete HTML fragments as text. Decode and strip
  // repeatedly so strings such as &lt;p&gt;&lt;strong&gt; never reach the screen.
  for (let pass = 0; pass < 4; pass += 1) {
    const parser = new DOMParser();
    const documentValue = parser.parseFromString(text, "text/html");
    const decoded = documentValue.body?.textContent || "";
    if (decoded === text) break;
    text = decoded;
  }
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/Logo\s+(?:da\s+)?Ag[eê]ncia\s+Brasil/gi, "")
    .replace(/(?:clique|acesse)\s+aqui/gi, "")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNewsSummary(item) {
  const cleaned = cleanNewsText(item?.summary || "");
  const title = cleanNewsText(item?.title || "");
  if (cleaned.length >= 55 && cleaned.toLowerCase() !== title.toLowerCase()) return cleaned;
  const category = cleanNewsText(item?.category || "Atualidades");
  return `Confira este destaque de ${category.toLowerCase()}, selecionado para acompanhar sua viagem.`;
}

export const screens = [
  {
    id: "welcome",
    label: "Início",
    duration: 18000,
    render: async () => {
      const trip = window.AME_VISION_TRIP || {};
      const firstName = String(trip.client || "").trim().split(/\s+/)[0];
      return `
      <section class="screen screen--hero">
        <div class="hero-copy">
          <span class="eyebrow">Bem-vindo a bordo</span>
          <h1>${firstName ? `Olá, <em>${escapeHtml(firstName)}.</em>` : `Sua experiência <em>começa aqui.</em>`}</h1>
          <p>Aproveite sua viagem com conforto, segurança e tranquilidade.</p>
          <div class="service-chips">
            <span>Transfer aeroporto</span><span>Viagens executivas</span><span>Eventos</span>
          </div>
        </div>
        <div class="hero-media">
          ${image("assets/images/carros/corolla.jpg", "Veículo executivo")}
          <div class="media-label">AME · Mobilidade com excelência</div>
        </div>
      </section>`;
    }
  },
  {
    id: "trip",
    label: "Viagem",
    duration: 26000,
    render: async () => {
      const activeTrip = window.AME_VISION_TRIP || null;
      const trip = activeTrip ? {
        origin: activeTrip.origin || "Origem cadastrada",
        destination: activeTrip.destination || "Destino cadastrado",
        eta: "Em atualização",
        distance: "Em atualização",
        driverMessage: activeTrip.message || `Viagem preparada para ${activeTrip.client || "o passageiro"}.`,
        driver: activeTrip.driver || null,
        vehicle: activeTrip.vehicle || null
      } : await ameApi.getTrip();
      return `
        <section class="screen">
          <div class="section-heading">
            <span class="eyebrow">Informações da viagem</span>
            <h2>Seu trajeto, de forma <em>clara.</em></h2>
          </div>
          <div class="metric-grid">
            <article class="metric-card metric-card--wide">
              <small>Origem</small><strong>${escapeHtml(trip.origin)}</strong>
              <div class="route-line"><span></span></div>
              <small>Destino</small><strong>${escapeHtml(trip.destination)}</strong>
            </article>
            <article class="metric-card"><small>Previsão</small><strong>${escapeHtml(trip.eta)}</strong><p>Tempo estimado de viagem</p></article>
            <article class="metric-card"><small>Distância</small><strong>${escapeHtml(trip.distance)}</strong><p>Estimativa do percurso</p></article>
          </div>
          ${trip.driver || trip.vehicle ? `<div class="trip-crew"><span>${trip.driver ? `<small>Motorista</small>${escapeHtml(trip.driver)}` : ""}</span>${trip.driver && trip.vehicle ? `<span class="trip-crew-divider"></span>` : ""}${trip.vehicle ? `<span><small>Veículo</small>${escapeHtml(trip.vehicle)}</span>` : ""}</div>` : ""}
          <div class="trip-message">${escapeHtml(trip.driverMessage)}</div>
        </section>`;
    }
  },
  {
    id: "live-map",
    label: "Mapa ao vivo",
    duration: 60000,
    render: async () => `
      <section class="screen live-map-screen">
        <div class="live-map-main">
          <div class="live-map-canvas" data-live-map></div>
          <aside class="live-map-sidebar">
            <div class="live-map-heading">
              <span class="eyebrow">GPS ao vivo</span>
              <h2>Acompanhe o veículo <em>em movimento.</em></h2>
            </div>
            <div class="gps-metrics">
              <article><small>Velocidade</small><strong data-gps-speed>—</strong></article>
              <article><small>Restante</small><strong data-route-distance>—</strong></article>
              <article><small>Chegada estimada</small><strong data-route-eta>—</strong></article>
            </div>
            <div class="route-address" data-route-label>Informe origem e destino no AME Control para iniciar uma rota.</div>
            <div class="gps-status" data-gps-status>Solicitando a localização deste tablet…</div>
            <div class="map-rest-note">Mapa ao vivo · uma pausa informativa durante o trajeto</div>
          </aside>
        </div>
      </section>`
  },
  {
    id: "weather",
    label: "Clima",
    duration: 24000,
    render: async () => {
      const weather = await ameApi.getWeather();
      return `
        <section class="screen">
          <div class="section-heading"><span class="eyebrow">Clima agora</span><h2>${escapeHtml(weather.city)}</h2></div>
          <div class="weather-layout">
            <article class="weather-primary">
              <div><span class="weather-temp">${weather.temperature}°</span><p>${escapeHtml(weather.condition)}</p><small>Sensação de ${weather.feelsLike}°</small></div>
              <div class="weather-icon">${weather.icon}</div>
            </article>
            <article class="weather-detail"><small>Umidade</small><strong>${weather.humidity}%</strong></article>
            <article class="weather-detail"><small>Vento</small><strong>${escapeHtml(weather.wind)}</strong></article>
          </div>
          <div class="forecast-row">${weather.forecast.map(item => `<div><small>${escapeHtml(item.label)}</small><strong>${escapeHtml(item.value)}</strong></div>`).join("")}</div>
          <p class="data-note">No AME Control, o clima poderá ser atualizado automaticamente conforme a origem e o destino.</p>
        </section>`;
    }
  },
  {
    id: "news",
    label: "Notícias",
    duration: 120000,
    carousel: { items: Array.from({ length: 10 }) },
    render: async ({ carouselIndex = 0, visitIndex = 0 } = {}) => {
      const allNews = await getCachedNews();
      const safeNews = Array.isArray(allNews) && allNews.length ? allNews : [{ category: "AME Vision", title: "Conteúdo sendo atualizado", summary: "A programação continuará automaticamente." }];
      const absoluteIndex = (visitIndex * 10 + carouselIndex) % safeNews.length;
      const item = safeNews[absoluteIndex];
      const fallbackImages = {
        "Minas Gerais": "assets/images/destinos/pc-liberdade1.jpg",
        "Turismo": "assets/images/destinos/ouro-preto1.jpg",
        "Cultura": "assets/images/destinos/pampulha-igrejinha.jpg",
        "Esportes": "assets/images/destinos/serra-do-cipo1.jpg",
        "Tecnologia": "assets/images/destinos/pc-liberdade2.jpg",
        "Economia": "assets/images/destinos/savassi2.jpg",
        "Brasil": "assets/images/destinos/pc-liberdade1.jpg"
      };
      const visual = item.image || fallbackImages[item.category] || "assets/images/destinos/pc-liberdade2.jpg";
      return `
        <section class="screen screen--news-single">
          <div class="news-single-media">${image(visual, item.title)}</div>
          <article class="news-single-copy">
            <div class="news-single-topline"><span class="eyebrow">${escapeHtml(item.category || "Atualidades")}</span><span>${absoluteIndex + 1} de ${safeNews.length}</span></div>
            <h2>${escapeHtml(cleanNewsText(item.title))}</h2>
            <p>${escapeHtml(getNewsSummary(item))}</p>
            <footer><span>Atualidades selecionadas para sua viagem</span><span>Notícia ${carouselIndex + 1} de 10 desta sequência</span></footer>
          </article>
        </section>`;
    }
  },
  {
    id: "comfort",
    label: "A bordo",
    duration: 24000,
    render: async () => `
      <section class="screen">
        <div class="section-heading"><span class="eyebrow">Durante a viagem</span><h2>Conforto pensado <em>para você.</em></h2></div>
        <div class="feature-grid">
          <article><span class="feature-icon">❄</span><h3>Temperatura</h3><p>Precisa ajustar o ar-condicionado? Fale com o motorista.</p></article>
          <article><span class="feature-icon">♫</span><h3>Áudio</h3><p>Você pode solicitar um ambiente mais silencioso ou escolher sua preferência.</p></article>
          <article><span class="feature-icon">▣</span><h3>Bagagens</h3><p>Ao desembarcar, confira seus pertences antes de sair do veículo.</p></article>
          <article><span class="feature-icon">●</span><h3>Atendimento</h3><p>A equipe AME está disponível para reservas, alterações e informações.</p></article>
        </div>
      </section>`
  },
  {
    id: "pause-one",
    label: "Pausa",
    duration: 20000,
    render: async () => `
      <section class="screen screen--pause">
        <div class="pause-image">${image("assets/images/destinos/serra-do-cipo1.jpg", "Serra do Cipó")}</div>
        <div class="pause-copy"><span class="eyebrow">Um momento de tranquilidade</span><h2>Relaxe e aproveite <em>o caminho.</em></h2><p>Informação quando importa. Um ambiente mais leve durante o restante da viagem.</p></div>
      </section>`
  },
  {
    id: "fleet",
    label: "Frota",
    duration: 45000,
    carousel: { items: fleet },
    render: async ({ carouselIndex = 0 } = {}) => {
      const car = fleet[carouselIndex % fleet.length];
      return `
        <section class="screen screen--gallery">
          <div class="gallery-copy">
            <span class="eyebrow">Nossa frota</span>
            <h2>Veículos para <em>cada momento.</em></h2>
            <p>Conforto, apresentação e segurança para traslados, eventos e compromissos executivos.</p>
            <div class="gallery-dots">${fleet.map((_, i) => `<i class="${i === carouselIndex % fleet.length ? "active" : ""}"></i>`).join("")}</div>
          </div>
          <div class="gallery-media">
            ${image(car.image, car.name)}
            <div class="gallery-caption"><strong>${escapeHtml(car.name)}</strong><span>${escapeHtml(car.tag)}</span></div>
          </div>
        </section>`;
    }
  },
  {
    id: "destinations",
    label: "Destinos",
    duration: 60000,
    carousel: { items: destinations },
    render: async ({ carouselIndex = 0 } = {}) => {
      const destination = destinations[carouselIndex % destinations.length];
      return `
        <section class="screen screen--gallery">
          <div class="gallery-copy">
            <span class="eyebrow">Destinos</span>
            <h2>Minas Gerais <em>espera por você.</em></h2>
            <p>Traslados, passeios, eventos e viagens planejadas de acordo com a sua necessidade.</p>
            <div class="gallery-dots">${destinations.map((_, i) => `<i class="${i === carouselIndex % destinations.length ? "active" : ""}"></i>`).join("")}</div>
          </div>
          <div class="gallery-media">
            ${image(destination.image, destination.name)}
            <div class="gallery-caption"><strong>${escapeHtml(destination.name)}</strong><span>Turismo e mobilidade executiva</span></div>
          </div>
        </section>`;
    }
  },
  {
    id: "referral",
    label: "Indicação",
    duration: 32000,
    render: async () => `
      <section class="screen">
        <div class="section-heading"><span class="eyebrow">Programa de indicação</span><h2>Indicou, fechou, <em>ganhou transfer.</em></h2><p>Indique um novo passageiro. Quando ele concluir uma viagem elegível, você recebe um transfer executivo de ida de Belo Horizonte para Confins.</p></div>
        <div class="step-grid">
          <article><span>1</span><h3>Indique</h3><p>Compartilhe o contato da AME com um amigo, familiar ou colega.</p></article>
          <article><span>2</span><h3>O indicado viaja</h3><p>O novo cliente agenda e realiza uma viagem elegível para Confins ou cidade próxima.</p></article>
          <article><span>3</span><h3>Você ganha</h3><p>Receba seu transfer executivo de ida para o Aeroporto de Confins.</p></article>
        </div>
        <div class="rules-strip"><span>Novo cliente indicado</span><span>Benefício após a viagem</span><span>Indicações acumulam</span><span>Resgate mediante disponibilidade</span></div>
      </section>`
  },
  {
    id: "reviews",
    label: "Avaliações",
    duration: 28000,
    render: async () => {
      const reviews = await ameApi.getReviews();
      const selected = reviews[Math.floor(Date.now() / 28000) % reviews.length];
      return `
        <section class="screen review-screen">
          <div><span class="eyebrow">Experiência AME</span><h2>Cuidado em <em>cada detalhe.</em></h2><p>Conforto, pontualidade e atendimento para tornar cada trajeto mais tranquilo.</p></div>
          <blockquote><div class="stars">★★★★★</div><p>“${escapeHtml(selected.text)}”</p><footer><strong>${escapeHtml(selected.name)}</strong><span>${escapeHtml(selected.role)}</span></footer></blockquote>
        </section>`;
    }
  },
  {
    id: "contact",
    label: "Contato",
    duration: 32000,
    render: async () => `
      <section class="screen contact-screen">
        <div class="contact-copy"><span class="eyebrow">Entre em contato</span><h2>Continue sua experiência com a <em>AME.</em></h2><p>Solicite orçamento, faça uma indicação ou agende sua próxima viagem.</p><div class="contact-lines"><span>WhatsApp · (31) 99845-8084</span><span>Instagram · @alvesmobilidadeexecutiva</span><span>alvesmobilidade.com.br</span></div></div>
        <div class="qr-cards"><article><h3>WhatsApp</h3>${image("assets/images/qr/whatsapp.png", "QR Code WhatsApp")}<p>Aponte a câmera do celular</p></article><article><h3>Site oficial</h3>${image("assets/images/qr/site.png", "QR Code site")}<p>Conheça os serviços da AME</p></article></div>
      </section>`
  },
  {
    id: "rest",
    label: "Descanso",
    duration: 600000,
    render: async () => `
      <section class="screen screen--rest">
        <div class="rest-background">${image("assets/images/destinos/serra-do-cipo2.jpg", "Paisagem tranquila de Minas Gerais")}</div>
        <div class="rest-overlay"></div>
        <div class="rest-content">
          <span class="eyebrow">Momento de descanso</span>
          <div class="rest-clock" data-rest-clock>00:00:00</div>
          <div class="rest-date" data-rest-date></div>
          <p>Relaxe e aproveite a viagem. O AME Vision retornará automaticamente.</p>
        </div>
        <div class="rest-brand">AME VISION · ALVES MOBILIDADE EXECUTIVA</div>
      </section>`
  },
  {
    id: "pause-two",
    label: "AME Vision",
    duration: 22000,
    render: async () => `
      <section class="screen screen--pause screen--pause-reverse">
        <div class="pause-image">${image("assets/images/destinos/ouro-preto1.jpg", "Ouro Preto")}</div>
        <div class="pause-copy"><span class="eyebrow">AME Vision</span><h2>Informação quando importa. <em>Silêncio quando convém.</em></h2><p>Uma experiência digital que acompanha o contexto da viagem sem transformar o trajeto em propaganda contínua.</p></div>
      </section>`
  }
];
