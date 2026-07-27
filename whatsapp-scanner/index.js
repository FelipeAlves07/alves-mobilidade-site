const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const axios = require("axios");

const AME_API = process.env.AME_API_URL || "http://localhost:3000";

async function start() {
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[AME Scanner] Baileys v${version.join(".")} (latest: ${isLatest})`);

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    syncFullHistory: true,
    browser: ["AME Scanner", "Chrome", "120.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log("\n[AME Scanner] Escaneie o QR Code acima com seu WhatsApp.\n");
    }

    if (connection === "open") {
      console.log("\n[AME Scanner] ✅ Conectado ao WhatsApp!");
      scanAndSync(sock);
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`[AME Scanner] Desconectado. Reconnectar: ${shouldReconnect}`);
      if (shouldReconnect) start();
      else console.log("[AME Scanner] ❌ Sessão expirada. Delete a pasta auth_info e rode novamente.");
    }
  });
}

async function scanAndSync(sock) {
  try {
    console.log("[AME Scanner] Buscando contatos e conversas...");
    await new Promise((r) => setTimeout(r, 2000));

    const chats = Object.values(await sock.store.chats.all());
    const contacts = sock.store.contacts || {};

    console.log(`[AME Scanner] ${chats.length} conversas encontradas.`);

    const processedPhones = new Set();
    const leads = [];

    for (const chat of chats) {
      const jid = chat.id;

      if (!jid.includes("@s.whatsapp.net") || jid.includes("g.us") || jid.includes("broadcast")) continue;

      const phone = jid.replace(/[^0-9]/g, "").replace(/@.*$/, "");
      if (!phone || phone.length < 10 || processedPhones.has(phone)) continue;
      processedPhones.add(phone);

      const contact = contacts[jid];
      const name = contact?.name || contact?.notify || contact?.verifiedName || chat.name || "";

      const displayName = name.trim() || phone;
      leads.push({
        name: displayName,
        phone,
        notes: `Importado do WhatsApp em ${new Date().toLocaleString("pt-BR")}`,
      });
    }

    if (leads.length === 0) {
      console.log("[AME Scanner] Nenhum contato novo encontrado.");
      return;
    }

    console.log(`[AME Scanner] Enviando ${leads.length} contatos para o AME Control...`);

    const { data } = await axios.post(`${AME_API}/api/whatsapp/leads`, { leads }, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000,
    });

    console.log(`[AME Scanner] ✅ Importados: ${data.imported} | Pulados (já existem): ${data.skipped} | Erros: ${data.errors?.length || 0}`);
    if (data.errors?.length) {
      console.log("[AME Scanner] Erros:", data.errors.slice(0, 5).join("\n  "));
    }
  } catch (err) {
    console.error("[AME Scanner] ❌ Erro ao sincronizar:", err.message);
    console.error("   Certifique-se de que o AME Control está rodando em", AME_API);
  }
}

start().catch((err) => {
  console.error("[AME Scanner] ❌ Erro fatal:", err);
  process.exit(1);
});
