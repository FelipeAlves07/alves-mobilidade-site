import { VisionPlayer } from "./core/player.js";
import { APP_CONFIG } from "./config.js";

function updateClock() {
  const now = new Date();
  document.querySelector("#clock").textContent = now.toLocaleTimeString(APP_CONFIG.locale, {
    hour: "2-digit",
    minute: "2-digit"
  });
  document.querySelector("#date").textContent = now.toLocaleDateString(APP_CONFIG.locale, {
    weekday: "long",
    day: "2-digit",
    month: "long"
  });
}

window.addEventListener("error", event => {
  console.error("[AME Vision]", event.error || event.message);
  const warning = document.querySelector("#system-warning");
  warning.hidden = false;
  warning.textContent = "Ocorreu uma falha em um componente. A apresentação tentará continuar.";
});

async function bootstrap() {
  updateClock();
  window.setInterval(updateClock, 1000);

  const player = new VisionPlayer({
    viewport: document.querySelector("#viewport"),
    progress: document.querySelector("#progress-fill"),
    navigation: document.querySelector("#navigation"),
    status: document.querySelector("#screen-status")
  });

  window.AMEVision = player;
  await player.start();
}

bootstrap().catch(error => {
  console.error("[AME Vision] Falha ao iniciar.", error);
  document.querySelector("#viewport").innerHTML = `
    <section class="fatal-error">
      <h1>AME Vision</h1>
      <p>Não foi possível iniciar a apresentação.</p>
      <small>Abra o projeto pelo Live Server do VS Code. Não abra o arquivo diretamente com file://.</small>
    </section>`;
});
