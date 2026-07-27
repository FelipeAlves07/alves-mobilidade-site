export const APP_CONFIG = {
  appName: "AME Vision",
  companyName: "Alves Mobilidade Executiva",
  locale: "pt-BR",
  city: "Belo Horizonte",
  autoplay: true,
  showNavigation: true,
  defaultScreenDuration: 24000,

  contact: {
    whatsappDisplay: "(31) 99845-8084",
    whatsappUrl: "https://wa.me/5531998458084",
    website: "https://alvesmobilidade.com.br",
    instagram: "@alvesmobilidadeexecutiva"
  },

  integration: {
    enabled: true,
    baseUrl: "/api/ame-vision",
    endpoints: {
      trip: "/trip",
      weather: "/weather",
      news: "/news",
      reviews: "/reviews"
    }
  }
};
