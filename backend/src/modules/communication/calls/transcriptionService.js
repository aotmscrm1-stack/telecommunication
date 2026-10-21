// services/transcriptionService.js
const fs = require('fs');
const path = require('path');
const { OpenAI, toFile } = require('openai');

/**
 * Filter out repetition hallucination loops common in Whisper on silent/noisy audio
 */
function cleanRepeatedHallucinations(text) {
  if (!text) return '';

  // 1. Strip common OpenAI Whisper subtitle hallucination artifacts
  let cleaned = text
    .replace(/(Subtitles by|Amara\.org|Thank you for watching|Subscribe to my channel|Like and subscribe)[^\n.]*/gi, '')
    .trim();

  // 2. Remove consecutive repeated words in Telugu, English, or any language (e.g. "ప్రమైన్స్టేట్మెంట్ ప్రమైన్స్టేట్మెంట్")
  // Matches any word (including Telugu range \u0C00-\u0C7F) repeated 2+ times consecutively
  cleaned = cleaned.replace(/([\w\u0C00-\u0C7F]{2,})(?:\s+\1){2,}/gi, '$1');

  // 3. Deduplicate consecutive repeated phrases/sentences
  const sentences = cleaned.split(/(?<=[.?!])\s+/);
  const uniqueSentences = [];

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    // Skip if identical to previous sentence
    if (
      uniqueSentences.length > 0 &&
      uniqueSentences[uniqueSentences.length - 1].toLowerCase() === trimmed.toLowerCase()
    ) {
      continue;
    }
    uniqueSentences.push(trimmed);
  }

  return uniqueSentences.join(' ');
}

/**
 * Transliterate / convert native script (Telugu, Hindi, etc.) into casual English Chatting Language
 * (Romanized script / Telugish like WhatsApp chatting, e.g. "Hi em chestunnavu , ala unnavu").
 */
async function transliterateToEnglishChat(text, openai) {
  if (!text || typeof text !== 'string') return text;

  // Check if text contains Indic / non-Latin characters (Telugu \u0C00-\u0C7F, Devanagari \u0900-\u097F, etc.)
  const hasIndic = /[\u0C00-\u0C7F\u0900-\u097F\u0B80-\u0BFF\u0D00-\u0D7F\u0C80-\u0CFF]/.test(text);
  if (!hasIndic) {
    return text;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert audio transcription transliterator for Indian languages (Telugu, Hindi, Tamil, etc.). ' +
            'Convert native script dialogue into phonetic English chatting language / Romanized script (such as WhatsApp/SMS chatting format, e.g. "Hi em chestunnavu, ala unnavu?"). ' +
            'Rules:\n' +
            '1. Transliterate phonetically using English alphabet characters (e.g., "Pedave palikina maatallone teeyani maate amma...").\n' +
            '2. Do NOT translate into English dictionary words unless they were spoken in English.\n' +
            '3. Output strictly in English chatting alphabet (Romanized script) with NO Telugu/Indic script.\n' +
            '4. Keep caller and customer dialogue turns natural.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.2
    });

    const converted = response.choices?.[0]?.message?.content?.trim();
    return converted || text;
  } catch (err) {
    console.warn('[STT] Transliteration to English chat language failed, falling back to original:', err.message);
    return text;
  }
}

/**
 * Download audio file from remote Render server to local temporary file if not present on disk
 */
async function ensureLocalAudioFile(filePath) {
  if (fs.existsSync(filePath)) return filePath;

  const filename = path.basename(filePath);
  const possiblePaths = [
    filePath,
    path.join(__dirname, '..', '..', 'management', 'uploads', 'recordings', filename),
    path.join(__dirname, '..', '..', 'management', 'uploads', filename),
    path.join(__dirname, '..', 'uploads', 'recordings', filename),
    path.join(__dirname, '..', 'uploads', filename),
    path.join('/var/data/recordings', filename),
    path.join('/tmp', 'recordings', filename),
    path.join('/tmp/recordings', filename),
  ];
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {}
  }

  // Not on disk: download from remote Render deployment to local temp file
  const remoteUrl = `https://telecommunication-l3oz.onrender.com/api/recordings/stream/${filename}`;
  console.log(`[STT] Audio file not found locally on disk. Downloading from ${remoteUrl}...`);

  const tempDir = path.join(__dirname, '..', '..', '..', 'temp_recordings');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const downloadedPath = path.join(tempDir, filename);

  const https = require('https');
  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(downloadedPath);
    https.get(remoteUrl, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download audio from remote server: HTTP ${res.statusCode}`));
      }
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(downloadedPath, () => {});
      reject(err);
    });
  });

  if (fs.existsSync(downloadedPath)) {
    return downloadedPath;
  }

  throw new Error(`Audio file not found at path: ${filePath}`);
}

/**
 * Maps audio extensions to OpenAI Whisper supported extension & MIME type
 * OpenAI supported formats: ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
 */
function getOpenAISafeFileDescriptor(targetPath) {
  const originalExt = path.extname(targetPath).toLowerCase();
  
  // Format mapping table
  const mapping = {
    '.aac': { ext: '.m4a', mime: 'audio/mp4' },
    '.m4a': { ext: '.m4a', mime: 'audio/mp4' },
    '.mp4': { ext: '.mp4', mime: 'audio/mp4' },
    '.mp3': { ext: '.mp3', mime: 'audio/mpeg' },
    '.mpeg': { ext: '.mpeg', mime: 'audio/mpeg' },
    '.mpga': { ext: '.mpga', mime: 'audio/mpeg' },
    '.wav': { ext: '.wav', mime: 'audio/wav' },
    '.ogg': { ext: '.ogg', mime: 'audio/ogg' },
    '.oga': { ext: '.oga', mime: 'audio/ogg' },
    '.webm': { ext: '.webm', mime: 'audio/webm' },
    '.flac': { ext: '.flac', mime: 'audio/flac' },
    '.3gp': { ext: '.mp4', mime: 'audio/mp4' },
    '.3gpp': { ext: '.mp4', mime: 'audio/mp4' },
    '.amr': { ext: '.mp3', mime: 'audio/mpeg' },
    '.awb': { ext: '.mp3', mime: 'audio/mpeg' },
  };

  const safe = mapping[originalExt] || { ext: '.m4a', mime: 'audio/mp4' };
  const virtualFilename = `audio_${Date.now()}${safe.ext}`;
  return { virtualFilename, mimeType: safe.mime };
}

/**
 * Transcribe an audio file using OpenAI Audio API (gpt-4o-mini-transcribe / whisper-1)
 * and convert to English Chatting Language (e.g. "Hi em chestunnavu , ala unnavu").
 * 
 * @param {string} filePath - Absolute path to the audio file on disk or stored filename
 * @param {string} [overrideApiKey] - Optional custom OpenAI API key (falls back to process.env.OPENAI_API_KEY)
 * @returns {Promise<string>} Transcribed text in English chatting format
 */
async function transcribeAudioFile(filePath, overrideApiKey = '') {
  const apiKey = overrideApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server. Please set it in process.env or provide a custom key.');
  }

  const targetPath = await ensureLocalAudioFile(filePath);

  const openai = new OpenAI({ apiKey });

  const { virtualFilename, mimeType } = getOpenAISafeFileDescriptor(targetPath);

  let response;
  // Prompt instructions for English chatting script / Telugish
  const promptText = 'Customer support call recording in Telugu, English chatting language (Telugish). Example: "Hi em chestunnavu, ela unnavu?". Transcribe accurately in Romanized English chatting script.';

  try {
    const audioFile = await toFile(fs.createReadStream(targetPath), virtualFilename, { type: mimeType });
    response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
      prompt: promptText,
      temperature: 0,
      response_format: 'json',
    });
  } catch (modelErr) {
    console.warn('[STT] gpt-4o-mini-transcribe fallback to whisper-1:', modelErr?.message || modelErr);
    const retryAudioFile = await toFile(fs.createReadStream(targetPath), virtualFilename, { type: mimeType });
    response = await openai.audio.transcriptions.create({
      file: retryAudioFile,
      model: 'whisper-1',
      prompt: promptText,
      temperature: 0,
      response_format: 'json',
    });
  }

  if (!response || typeof response.text !== 'string') {
    throw new Error('Invalid or empty response received from OpenAI Transcription API');
  }

  const rawText = response.text.trim();
  const cleanedText = cleanRepeatedHallucinations(rawText) || rawText;

  // Convert any native Telugu/Hindi script into casual English Chatting Language
  // Like: "Hi Em Chestunnavu , Ala Unnavu"
  const englishChatTranscript = await transliterateToEnglishChat(cleanedText, openai);

  return englishChatTranscript;
}

module.exports = {
  transcribeAudioFile,
  transliterateToEnglishChat,
};

