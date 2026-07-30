import { APP_CONFIG } from "../config.js";
import { screens } from "../screens/screens.js";
import { getSchedule } from "./schedule.js";
import { escapeHtml } from "./dom.js";

export class VisionPlayer {
  constructor({ viewport, progress, navigation, status }) {
    this.viewport = viewport;
    this.progress = progress;
    this.navigation = navigation;
    this.status = status;
    this.screenMap = new Map(screens.map(screen => [screen.id, screen]));
    this.mode = "long";
    this.schedule = getSchedule(this.mode).filter(id => this.screenMap.has(id));
    this.position = 0;
    this.timeout = null;
    this.carouselTimer = null;
    this.carouselIndex = 0;
    this.durationOverrides = {};
    this.restDuration = 600;
    this.visitCounts = new Map();
    this.renderVersion = 0;
    this.routeSettings = { origin: "", destination: "" };
    this.session = { status: "idle", trip: null, started_at: null };
    this.sessionTimer = null;
    this.renderNavigation();
    this.listenForSettings();
    this.startScaleToFit();
  }

  async start() {
    window.parent?.postMessage({ type: "AME_VISION_READY" }, "*");
    await this.applySession();
  }

  getDuration(screen) {
    if (screen.id === "rest") return Math.max(60, Number(this.restDuration) || 600) * 1000;
    const seconds = Number(this.durationOverrides[screen.id]);
    return Number.isFinite(seconds) && seconds >= 5 ? seconds * 1000 : (screen.duration || APP_CONFIG.defaultScreenDuration);
  }

  async show(position, options = {}) {
    this.clearTimers();
    const renderVersion = ++this.renderVersion;
    this.position = (position + this.schedule.length) % this.schedule.length;
    const id = this.schedule[this.position];
    const screen = this.screenMap.get(id);
    this.carouselIndex = 0;
    const visitIndex = this.visitCounts.get(id) || 0;
    this.visitCounts.set(id, visitIndex + 1);
    const duration = options.manual && screen.id === "live-map" ? 600000 : this.getDuration(screen);

    await this.renderScreen(screen, true, visitIndex, renderVersion);
    if (renderVersion !== this.renderVersion) return;
    this.highlightNavigation(id);
    this.animateProgress(duration);

    if (screen.carousel?.items?.length) {
      const itemDuration = Math.max(2600, Math.floor(duration / screen.carousel.items.length));
      this.carouselTimer = window.setInterval(async () => {
        this.carouselIndex = (this.carouselIndex + 1) % screen.carousel.items.length;
        await this.renderScreen(screen, false, visitIndex, renderVersion);
      }, itemDuration);
    }

    if (APP_CONFIG.autoplay) this.timeout = window.setTimeout(() => this.next(), duration);
  }

  async renderScreen(screen, animate = true, visitIndex = 0, renderVersion = this.renderVersion) {
    const html = await screen.render({ carouselIndex: this.carouselIndex, visitIndex, duration: this.getDuration(screen) });
    if (renderVersion !== this.renderVersion) return;
    if (animate) {
      this.viewport.classList.remove("is-visible");
      await new Promise(resolve => setTimeout(resolve, 140));
      if (renderVersion !== this.renderVersion) return;
    }
    this.viewport.innerHTML = html;
    if (screen.id === "rest") this.startRestClock();
    if (screen.id === "live-map") this.startLiveMap();
    requestAnimationFrame(() => this.viewport.classList.add("is-visible"));
    this.status.textContent = screen.label;
  }

  async startLiveMap() {
    try {
      const { startLiveMap } = await import("./gps.js");
      const container = this.viewport.querySelector("[data-live-map]");
      if (container) this.stopMap = await startLiveMap(container, this.routeSettings);
    } catch (error) {
      console.warn("[AME Vision] GPS indisponível", error);
    }
  }

  startRestClock() {
    const update = () => {
      const now = new Date();
      const clock = this.viewport.querySelector("[data-rest-clock]");
      const date = this.viewport.querySelector("[data-rest-date]");
      if (clock) clock.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      if (date) date.textContent = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    };
    update();
    this.restClockTimer = window.setInterval(update, 1000);
  }

  renderSessionScreen(kind) {
    this.clearTimers();
    const trip = this.session.trip || {};
    const name = String(trip.client || "").trim().split(/\s+/)[0] || "passageiro";
    const universal = name === "Passageiro(a)";
    const origin = String(trip.origin || "");
    const destination = String(trip.destination || "");
    const content = kind === "completed"
      ? `<section class="screen session-screen"><div><span class="eyebrow">Viagem concluída</span><h1>${universal ? "Até a <em>próxima!</em>" : `Obrigado, <em>${name}.</em>`}</h1><p>${universal ? "Foi um prazer. Esperamos receber você novamente." : "Foi um prazer acompanhar sua viagem. Esperamos receber você novamente."}</p></div></section>`
      : kind === "idle"
      ? `<section class="screen session-screen"><div><span class="eyebrow">AME Vision</span><h1>Aguardando a <em>próxima viagem.</em></h1><p>O sistema será preparado automaticamente pela agenda do AME Control.</p></div></section>`
      : `<section class="screen session-screen"><div><span class="eyebrow">Bem-vindo a bordo</span><h1>${universal ? "Olá, <em>seja bem-vindo a bordo!</em>" : `Olá, <em>${name}.</em>`}</h1><p>Sua viagem está preparada.</p>${!universal ? `<div class="session-route"><span>${origin || "Origem cadastrada"}</span><b>→</b><span>${destination || "Destino cadastrado"}</span></div>` : ""}${trip.driver || trip.vehicle ? `<div class="session-info">${trip.driver ? `<span><small>Motorista</small>${escapeHtml(trip.driver)}</span>` : ""}${trip.vehicle ? `<span><small>Veículo</small>${escapeHtml(trip.vehicle)}</span>` : ""}</div>` : ""}<small>${kind === "running" ? "A programação começará em instantes." : "Aguardando o início da viagem."}</small></div></section>`;
    this.viewport.classList.remove("is-visible");
    this.viewport.innerHTML = content;
    this.status.textContent = kind === "completed" ? "Obrigado" : kind === "idle" ? "Aguardando" : "Boas-vindas";
    this.progress.style.animation = "none";
    requestAnimationFrame(() => this.viewport.classList.add("is-visible"));
  }

  async applySession() {
    const status = this.session?.status || "idle";
    const trip = this.session?.trip;
    if (trip) {
      this.routeSettings = { origin: String(trip.origin || ""), destination: String(trip.destination || "") };
      window.AME_VISION_TRIP = trip;
    }
    if (status === "prepared") { this.renderSessionScreen("prepared"); return; }
    if (status === "completed") {
      this.renderSessionScreen("completed");
      this.sessionTimer = window.setTimeout(() => { this.session = { status: "idle", trip: null }; this.applySession(); }, 45000);
      return;
    }
    if (status === "running") {
      const started = this.session.started_at ? new Date(this.session.started_at).getTime() : Date.now();
      const remaining = Math.max(0, 3000 - (Date.now() - started));
      if (remaining > 0) {
        this.renderSessionScreen("running");
        this.sessionTimer = window.setTimeout(() => { this.position = 0; this.show(0); }, remaining);
      } else {
        this.position = 0;
        await this.show(0);
      }
      return;
    }
    this.renderSessionScreen("idle");
  }

  next() { return this.show(this.position + 1); }

  clearTimers() {
    window.clearTimeout(this.timeout);
    window.clearInterval(this.carouselTimer);
    window.clearInterval(this.restClockTimer);
    window.clearTimeout(this.sessionTimer);
    if (this.stopMap) { this.stopMap(); this.stopMap = null; }
  }

  animateProgress(duration) {
    this.progress.style.animation = "none";
    this.progress.offsetHeight;
    this.progress.style.animation = `vision-progress ${duration}ms linear forwards`;
  }

  renderNavigation() {
    if (!APP_CONFIG.showNavigation) { this.navigation.hidden = true; return; }
    const uniqueIds = [...new Set(this.schedule)].filter(id => id !== "rest");
    this.navigation.innerHTML = uniqueIds.map(id => {
      const screen = this.screenMap.get(id);
      return `<button type="button" data-screen="${id}">${screen.label}</button>`;
    }).join("");
    this.navigation.addEventListener("click", event => {
      const button = event.target.closest("[data-screen]");
      if (!button) return;
      const index = this.schedule.indexOf(button.dataset.screen);
      if (index >= 0) this.show(index, { manual: true });
    });
  }

  refreshNavigation() {
    this.navigation.innerHTML = "";
    this.renderNavigation();
  }

  highlightNavigation(id) {
    this.navigation.querySelectorAll("button").forEach(button => {
      button.classList.toggle("active", button.dataset.screen === id);
    });
    this.navigation.querySelector("button.active")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  startScaleToFit() {
  }

  listenForSettings() {
    window.addEventListener("message", event => {
      if (event.data?.type === "AME_VISION_SESSION") {
        const next = event.data.session || {};
        const changed = JSON.stringify(next) !== JSON.stringify(this.session);
        this.session = next;
        if (changed) this.applySession();
        return;
      }
      if (event.data?.type === "AME_VISION_OPEN_SCREEN") {
        const target = this.schedule.indexOf(String(event.data.screenId || ""));
        if (target >= 0) this.show(target, { manual: true });
        return;
      }
      if (event.data?.type !== "AME_VISION_SETTINGS") return;
      this.durationOverrides = event.data.durations || {};
      this.restDuration = event.data.restDuration || 600;
      const nextMode = event.data.mode === "short" ? "short" : "long";
      this.routeSettings = {
        origin: String(event.data.route?.origin || "").trim(),
        destination: String(event.data.route?.destination || "").trim()
      };
      if (nextMode !== this.mode) {
        this.mode = nextMode;
        this.schedule = getSchedule(this.mode).filter(id => this.screenMap.has(id));
        this.position = 0;
        this.refreshNavigation();
      }
      this.show(this.position);
    });
  }
}
