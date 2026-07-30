const { makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const AME_API = process.env.AME_API_URL || "http://127.0.0.1:3000";
const CONTACTS_FILE = path.join(__dirname, "contacts_cache.json");

const CLIENT_PATTERNS = [
  /motorista/i,
  /responsável pelo seu atendimento/i,
  /estarei te atendendo/i,
  /serei o responsável pelo/i,
];

function isClientText(text) {
  return CLIENT_PATTERNS.some((p) => p.test(text));
}

function getMsgText(msg) {
  if (!msg.message) return "";
  const m = msg.message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.audioMessage?.caption ||
    ""
  );
}

function loadCached() {
  try {
    if (fs.existsSync(CONTACTS_FILE)) {
      const d = JSON.parse(fs.readFileSync(CONTACTS_FILE, "utf-8"));
      if (d?.leads?.length) {
        console.log(`[AME Scanner] ${d.leads.length} leads carregados do cache.`);
        return d.leads;
      }
    }
  } catch {}
  return null;
}

function saveCache(leads) {
  try {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify({ leads, updatedAt: new Date().toISOString() }, null, 2));
    console.log(`[AME Scanner] Cache salvo com ${leads.length} leads.`);
  } catch (err) {
    console.error("[AME Scanner] Erro ao salvar cache:", err.message);
  }
}

async function showQR(qrString) {
  try {
    const dataUrl = await qrcode.toDataURL(qrString, { margin: 1 });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AME Scanner - QR Code</title><style>
      body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#1a1a2e;font-family:sans-serif;margin:0;flex-direction:column;gap:20px;color:#fff}
      img{max-width:400px;border-radius:12px;box-shadow:0 4px 30px rgba(0,0,0,0.4);background:#fff;padding:16px}
      p{color:#ccc;font-size:18px;text-align:center;max-width:500px}
      small{color:#888}</style></head><body>
      <img src="${dataUrl}" alt="QR Code"/>
      <p>Escaneie com seu WhatsApp<br/><small>WhatsApp → Menu → Aparelhos Linkados → Linkar um Dispositivo</small></p>
      <p style="font-size:14px;color:#666">O scanner identificará automaticamente conversas de clientes.</p>
    </body></html>`;
    const fp = path.join(__dirname, "qr_code.html");
    fs.writeFileSync(fp, html);
    console.log(`[AME Scanner] QR Code: ${fp}`);
    require("child_process").exec(`start "" "${fp}"`);
  } catch {
    console.log("[AME Scanner] QR:", qrString);
  }
}

async function sendLeads(leads) {
  if (!leads.length) {
    console.log("[AME Scanner] Nenhum lead para enviar.");
    return;
  }
  console.log(`[AME Scanner] Enviando ${leads.length} leads...`);
  try {
    const { data } = await axios.post(`${AME_API}/api/whatsapp/leads`, { leads }, {
      headers: { "Content-Type": "application/json" },
      timeout: 180000,
    });
    console.log(`[AME Scanner] ✅ Importados: ${data.imported} | Pulados: ${data.skipped} | Erros: ${data.errors?.length || 0}`);
    data.errors?.slice(0, 5).forEach((e) => console.log("  ", e));
  } catch (err) {
    console.error("[AME Scanner] ❌", err.message);
  }
}

async function start() {
  const cached = loadCached();
  if (cached) {
    await sendLeads(cached);
    return;
  }

  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`[AME Scanner] Baileys v${version.join(".")}`);

  const { state, saveCreds } = await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    version,
    auth: state,
    browser: ["AME Scanner", "Chrome", "120.0.0"],
    syncFullHistory: true,
  });

  sock.ev.on("creds.update", saveCreds);

  let myJid = null;
  const allMsgs = [];
  const contacts = {};
  let syncDone = false;
  let debounceTimer = null;

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr, u }) => {
    if (qr) showQR(qr);
    if (u?.id) myJid = u.id;
    if (connection === "close") {
      const reconn = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (reconn) setTimeout(start, 1000);
      else console.log("[AME Scanner] Sessão expirada.");
    }
  });

  sock.ev.on("contacts.upsert", (ups) => {
    for (const c of ups) contacts[c.id] = c;
  });

  const scheduleProcess = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!syncDone && allMsgs.length > 0) {
        syncDone = true;
        console.log(`[AME Scanner] Processando ${allMsgs.length} mensagens...`);
        processClientLeads(allMsgs, contacts, myJid);
      }
    }, 15000);
  };

  sock.ev.on("messaging-history.set", ({ messages, contacts: hc, syncType, progress }) => {
    if (messages) allMsgs.push(...messages);
    if (hc) for (const c of hc) contacts[c.id] = c;
    console.log(`[AME Scanner] Chunk ${syncType} ${progress ?? ""} — ${allMsgs.length} msgs`);
    scheduleProcess();
  });

  setTimeout(() => {
    if (!syncDone) {
      syncDone = true;
      console.log(`[AME Scanner] Timeout — processando ${allMsgs.length} mensagens...`);
      processClientLeads(allMsgs, contacts, myJid);
    }
  }, 300000);
}

async function processClientLeads(allMsgs, contacts, myJid) {
  console.log(`[AME Scanner] Analisando ${allMsgs.length} mensagens...`);

  const clientJids = new Set();
  const clientNames = {};

  for (const msg of allMsgs) {
    if (!msg.key?.fromMe || !msg.key?.remoteJid) continue;
    const text = getMsgText(msg);
    if (!text) continue;
    if (!isClientText(text)) continue;

    const jid = msg.key.remoteJid;
    if (jid.includes("g.us") || jid.includes("broadcast")) continue;
    if (!jid.includes("@s.whatsapp.net")) continue;
    clientJids.add(jid);
  }

  for (const msg of allMsgs) {
    if (!msg.key?.remoteJid) continue;
    const jid = msg.key.remoteJid;
    if (!clientJids.has(jid)) continue;
    if (msg.key.fromMe) continue;
    if (msg.pushName && !clientNames[jid]) {
      clientNames[jid] = msg.pushName;
    }
  }

  console.log(`[AME Scanner] ${clientJids.size} conversas de cliente identificadas.`);

  if (clientJids.size === 0) {
    console.log("[AME Scanner] Nenhum padrão de cliente encontrado nas mensagens.");
    return;
  }

  const leads = [];
  for (const jid of clientJids) {
    const phone = jid.split("@")[0].replace(/\D/g, "");
    if (!phone || phone.length < 10) continue;

    const contact = contacts[jid];
    const name = clientNames[jid] || contact?.name || contact?.notify || contact?.verifiedName || "";

    leads.push({
      name: name.trim() || phone,
      phone,
      notes: `Cliente identificado via WhatsApp em ${new Date().toLocaleString("pt-BR")}`,
    });
  }

  if (leads.length) {
    saveCache(leads);
    await sendLeads(leads);
  } else {
    console.log("[AME Scanner] Nenhum lead válido extraído.");
  }
}

start().catch((err) => {
  console.error("[AME Scanner] Erro fatal:", err);
  process.exit(1);
});