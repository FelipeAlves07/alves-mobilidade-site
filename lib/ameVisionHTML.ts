export const visionDocument = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#050505">
  <base href="/ame-vision/">
  <title>AME Vision</title>
  <link rel="stylesheet" href="assets/css/ame-vision.css">
  <style>html,body{background:#000}</style>
</head>
<body>
  <div id="system-warning" class="system-warning" hidden></div>
  <div class="vision-shell">
    <header class="vision-header">
      <div class="brand">
        <img src="assets/images/logo/ame-logo-header.png" alt="Alves Mobilidade Executiva">
        <div class="brand-copy">
          <strong>ALVES MOBILIDADE EXECUTIVA</strong>
          <span>CONFORTO · SEGURANÇA · PONTUALIDADE</span>
        </div>
      </div>
      <div class="clock">
        <strong id="clock">00:00</strong>
        <span id="date"></span>
      </div>
      <nav id="navigation" class="top-navigation" aria-label="Áreas do AME Vision"></nav>
    </header>
    <main id="viewport" class="viewport" aria-live="polite"></main>
    <footer class="vision-footer">
      <div class="footer-brand">AME VISION</div>
      <div class="progress-track"><div id="progress-fill" class="progress-fill"></div></div>
      <div class="footer-right"><span id="screen-status" class="screen-status">Iniciando</span></div>
    </footer>
  </div>
  <script type="module" src="assets/js/main.js"></script>
</body>
</html>`;
