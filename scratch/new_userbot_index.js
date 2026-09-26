require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { TelegramClient } = require("telegram");
const { StoreSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const input = require("input");
const axios = require("axios");

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = String(process.env.TELEGRAM_API_HASH || "").trim();
const webhook = String(process.env.N8N_WEBHOOK_URL || "").trim();
const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();

const session = new StoreSession("user_session");
const STATE = path.join(__dirname, "pause.json");
const fromBot = new Set();
const recentSentTexts = new Map(); // snippet -> timestamp

// IDs conhecidos de bots e serviços do sistema para NUNCA responder
const AGENTE_KING_BOT_ID = "8871691156"; // @conectaking_bot (Agente King pessoal)
const TELEGRAM_SERVICE_ID = "777000";   // Notificações oficiais do Telegram

function load() {
  try { return JSON.parse(fs.readFileSync(STATE, "utf8")); }
  catch { return { paused: {}, last: null }; }
}
function save(s) { fs.writeFileSync(STATE, JSON.stringify(s)); }
function chatOf(message) {
  return String(message.chatId || (message.peerId && message.peerId.userId) || "");
}

async function transcribeAudio(buffer) {
  if (!openaiKey) {
    console.error("OPENAI_API_KEY ausente para transcrever áudio");
    return null;
  }
  try {
    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append("file", new Blob([buffer], { type: "audio/ogg" }), "voice.ogg");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Whisper erro:", response.status, errText);
      return null;
    }
    const data = await response.json();
    return String(data.text || "").trim();
  } catch (err) {
    console.error("Erro na transcrição Whisper:", err.message);
    return null;
  }
}

async function main() {
  if (!apiId || !apiHash || !webhook) process.exit(1);
  const client = new TelegramClient(session, apiId, apiHash, { connectionRetries: 5 });
  await client.start({
    phoneNumber: async () => await input.text("Telefone com +55: "),
    password: async () => await input.text("Senha 2FA (se tiver): "),
    phoneCode: async () => await input.text("Codigo do Telegram: "),
    onError: (err) => console.log(err),
  });
  console.log("PV conectado.");
  const me = await client.getMe();
  const myId = String(me.id);
  console.log("myId", myId);

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message || !message.isPrivate) return;
    const chat = chatOf(message);
    if (!chat) return;

    // 1. REGRA ABSOLUTA: O Agente Cliente (Userbot) NUNCA deve responder ao Agente King nem a serviços do sistema
    if (chat === AGENTE_KING_BOT_ID || chat === TELEGRAM_SERVICE_ID) {
      return;
    }

    // 2. NUNCA responder a bots (apenas clientes reais / contatos humanos)
    try {
      const sender = await message.getSender();
      if (sender && (sender.bot || sender.isBot || (sender.username && sender.username.toLowerCase().endsWith("bot")))) {
        return;
      }
    } catch (_) {}

    let text = String(message.text || message.message || "").trim();
    const st = load();
    const isMe = chat === myId;
    const isLiberar = new RegExp("^/(liberar|ativar|ia)\\b", "i").test(text);

    if (isLiberar) {
      if (isMe) {
        st.paused = {};
        st.last = null;
        save(st);
        console.log("IA liberada (todos os chats)");
      } else {
        delete st.paused[chat];
        save(st);
        console.log("IA liberada neste chat:", chat);
      }
      return;
    }
    if (isMe) return;

    // Tratamento de mensagens que saem da conta do King
    if (message.out) {
      if (fromBot.has(message.id)) {
        fromBot.delete(message.id);
        return;
      }
      // Verificar se o texto é de uma resposta recente enviada pela própria IA
      const snippet = text.slice(0, 50);
      if (recentSentTexts.has(snippet)) {
        const sentAt = recentSentTexts.get(snippet);
        if (Date.now() - sentAt < 30000) {
          recentSentTexts.delete(snippet);
          return; // Foi enviado pelo bot, NÃO pausar!
        }
      }

      // Se o King manualmente digitou para o cliente (e não é comando /), pausar temporariamente
      if (text.indexOf("/") !== 0) {
        st.paused[chat] = Date.now();
        st.last = chat;
        save(st);
        console.log("King assumiu manualmente chat:", chat);
      }
      return;
    }

    // Se o chat foi pausado manualmente pelo King:
    if (st.paused[chat]) {
      const pausedAt = typeof st.paused[chat] === "number" ? st.paused[chat] : 0;
      const ONE_HOUR = 60 * 60 * 1000;
      // Se passou mais de 1 hora sem mensagem do King, reativa automaticamente para novos chamados
      if (pausedAt && (Date.now() - pausedAt > ONE_HOUR)) {
        delete st.paused[chat];
        save(st);
        console.log("Pausa expirou após 1h, IA reativada para cliente:", chat);
      } else {
        console.log("Chat pausado manualmente:", chat);
        return;
      }
    }

    // Suporte a mensagens de áudio / voz de clientes
    const isVoiceOrAudio = Boolean(
      message.voice ||
      message.audio ||
      (message.media && (
        message.media.className === "MessageMediaDocument" ||
        message.media.document
      ))
    );

    let hadVoice = false;
    if (!text && isVoiceOrAudio) {
      try {
        console.log("Baixando áudio do cliente", chat, "...");
        const buffer = await client.downloadMedia(message, {});
        if (buffer && buffer.length > 0) {
          console.log(`Áudio recebido (${buffer.length} bytes). Enviando para Whisper...`);
          const transcription = await transcribeAudio(buffer);
          if (transcription) {
            text = transcription;
            hadVoice = true;
            console.log("Transcrição do áudio do cliente:", text);
          } else {
            console.log("Transcrição retornou vazio.");
          }
        }
      } catch (err) {
        console.error("Falha ao processar mídia de áudio do cliente:", err.message);
      }
    }

    // Suporte a fotos / imagens enviadas pelo cliente sem legenda
    if (!text && (message.photo || (message.media && message.media.className === "MessageMediaPhoto"))) {
      text = "[foto enviada pelo cliente]";
    }

    if (!text) return;

    console.log("Cliente:", chat, hadVoice ? `[áudio] ${text.slice(0, 40)}` : text.slice(0, 40));
    try {
      const response = await axios.post(webhook, { senderId: chat, text }, { timeout: 90000 });
      let data = response.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (e) { data = {}; }
      }
      const reply = (data && (data.reply || data.outMessage || data.text)) || "";
      console.log("Resposta IA cliente:", reply ? String(reply).slice(0, 80) : "VAZIO");
      if (!reply) return;

      const replyText = String(reply).slice(0, 4000);
      let sent = null;

      // Registrar o snippet nos textos recentes antes de enviar para evitar auto-pausa
      recentSentTexts.set(replyText.slice(0, 50), Date.now());

      // 1. Tentar message.respond
      try {
        if (typeof message.respond === "function") {
          sent = await message.respond({ message: replyText });
        }
      } catch (errRespond) {
        console.warn("message.respond falhou, tentando fallback com inputPeer:", errRespond.message);
      }

      // 2. Fallback: resolver inputPeer explicitamente com accessHash
      if (!sent) {
        try {
          const inputPeer = (typeof message.getInputChat === "function")
            ? (await message.getInputChat())
            : (await client.getInputEntity(message.sender || message.peerId || chat));
          sent = await client.sendMessage(inputPeer, { message: replyText });
        } catch (errInput) {
          console.warn("sendMessage com inputPeer falhou, tentando reply:", errInput.message);
          // 3. Fallback: reply na mensagem original
          if (typeof message.reply === "function") {
            sent = await message.reply({ message: replyText });
          }
        }
      }

      if (sent && sent.id) {
        fromBot.add(sent.id);
        console.log("Mensagem enviada com sucesso para cliente", chat, "msgId:", sent.id);
      } else {
        console.error("Não foi possível enviar a mensagem para cliente", chat);
      }
    } catch (e) {
      console.error("erro ao chamar webhook do agente cliente:", e.response && e.response.status, e.message);
    }
  }, new NewMessage({}));
}
main();
