const PREP_JS = String.raw`const raw = $input.first().json;
const msg = raw.message || {};
const adminId = String($env.ADMIN_TELEGRAM_ID || '0');
const senderId = String(msg.from?.id || '');
const chatId = String(msg.chat?.id || '');
const firstName = msg.from?.first_name || 'cliente';
let text = String(msg.text || msg.caption || '').trim();
let hadVoice = false;
let voiceError = '';

const fileId = msg.voice?.file_id || msg.audio?.file_id || msg.video_note?.file_id || null;
const tgToken = String($env.TELEGRAM_BOT_TOKEN || '').trim();
const openaiKey = String($env.OPENAI_API_KEY || '').trim();

async function transcribe(buf) {
  const boundary = '----ckVoice' + Date.now().toString(36);
  const head =
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="model"\r\n\r\n' +
    'whisper-1\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="language"\r\n\r\n' +
    'pt\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Disposition: form-data; name="file"; filename="voice.ogg"\r\n' +
    'Content-Type: audio/ogg\r\n\r\n';
  const tail = '\r\n--' + boundary + '--\r\n';
  const body = Buffer.concat([Buffer.from(head, 'utf8'), buf, Buffer.from(tail, 'utf8')]);
  const tr = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.openai.com/v1/audio/transcriptions',
    headers: {
      Authorization: 'Bearer ' + openaiKey,
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
    },
    body,
    json: true,
  });
  return String(tr?.text || '').trim();
}

if (!text && fileId && tgToken && openaiKey) {
  try {
    hadVoice = true;
    const meta = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.telegram.org/bot' + tgToken + '/getFile',
      qs: { file_id: fileId },
      json: true,
    });
    const filePath = meta?.result?.file_path;
    if (!filePath) throw new Error('file_path vazio');
    const audio = await this.helpers.httpRequest({
      method: 'GET',
      url: 'https://api.telegram.org/file/bot' + tgToken + '/' + filePath,
      encoding: 'arraybuffer',
      returnFullResponse: true,
    });
    const rawBody = audio.body !== undefined ? audio.body : audio;
    const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
    if (!buf.length) throw new Error('áudio vazio');
    text = await transcribe.call(this, buf);
    if (!text) throw new Error('Whisper retornou texto vazio');
  } catch (e) {
    voiceError = String(e.message || e).slice(0, 220);
    text = '[áudio recebido, mas não consegui transcrever: ' + voiceError + ']';
  }
}

if (!text && hadVoice) text = '[áudio recebido, mas não consegui transcrever]';
if (!text) text = '[mensagem sem texto]';

return [{ json: { adminId, senderId, chatId, firstName, text, hadVoice, voiceError, message: msg } }];
`;

module.exports = { PREP_JS };
