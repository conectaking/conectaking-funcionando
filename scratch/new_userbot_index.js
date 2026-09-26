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

    if (message.out) {
      if (fromBot.has(message.id)) {
        fromBot.delete(message.id);
        return;
      }
      if (text.indexOf("/") !== 0) {
        st.paused[chat] = true;
        st.last = chat;
        save(st);
        console.log("King assumiu", chat);
      }
      return;
    }

    if (st.paused[chat]) {
      console.log("pausado", chat);
      return;
    }

    // Suporte a mensagens de áudio / voz
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
        console.log("Baixando áudio do chat", chat, "...");
        const buffer = await client.downloadMedia(message, {});
        if (buffer && buffer.length > 0) {
          console.log(`Áudio recebido (${buffer.length} bytes). Enviando para Whisper...`);
          const transcription = await transcribeAudio(buffer);
          if (transcription) {
            text = transcription;
            hadVoice = true;
            console.log("Transcrição:", text);
          } else {
            console.log("Transcrição retornou vazio.");
          }
        }
      } catch (err) {
        console.error("Falha ao processar mídia de áudio:", err.message);
      }
    }

    // Suporte a fotos / imagens enviadas sem legenda
    if (!text && (message.photo || (message.media && message.media.className === "MessageMediaPhoto"))) {
      text = "[foto enviada pelo cliente]";
    }

    if (!text) return;

    console.log("cliente", chat, hadVoice ? `[áudio] ${text.slice(0, 40)}` : text.slice(0, 40));
    try {
      const response = await axios.post(webhook, { senderId: chat, text }, { timeout: 90000 });
      let data = response.data;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch (e) { data = {}; }
      }
      console.log("raw", JSON.stringify(data).slice(0, 250));
      const reply = (data && (data.reply || data.outMessage || data.text)) || "";
      console.log("reply", reply ? String(reply).slice(0, 80) : "VAZIO");
      if (!reply) return;

      const replyText = String(reply).slice(0, 4000);
      let sent = null;

      // 1. Tentar message.respond (GramJS usa o inputChat com accessHash do update recebido)
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
        console.log("Mensagem enviada com sucesso para", chat, "msgId:", sent.id);
      } else {
        console.error("Não foi possível enviar a mensagem para", chat);
      }
    } catch (e) {
      console.error("erro:", e.response && e.response.status, e.message);
    }
  }, new NewMessage({}));
}
main();
