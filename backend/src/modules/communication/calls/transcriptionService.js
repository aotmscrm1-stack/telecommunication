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
 * Transcribe an audio file using OpenAI Audio API (gpt-4o-mini-transcribe / whisper-1).
 * 
 * @param {string} filePath - Absolute path to the audio file on disk
 * @param {string} [overrideApiKey] - Optional custom OpenAI API key (falls back to process.env.OPENAI_API_KEY)
 * @returns {Promise<string>} Transcribed text result
 */
async function transcribeAudioFile(filePath, overrideApiKey = '') {
  const apiKey = overrideApiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server. Please set it in process.env or provide a custom key.');
  }

  let targetPath = filePath;

  if (!fs.existsSync(targetPath)) {
    const filename = path.basename(filePath);
    const possiblePaths = [
      path.join(__dirname, '..', 'uploads', 'recordings', filename),
      path.join(__dirname, '..', 'uploads', filename),
      path.join('/var/data/recordings', filename),
      path.join('/tmp', 'recordings', filename),
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        targetPath = p;
        break;
      }
    }
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Audio file not found at path: ${filePath}`);
  }

  const openai = new OpenAI({ apiKey });

  // OpenAI Whisper supported extensions:
  // ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']
  const originalExt = path.extname(targetPath).toLowerCase();
  const allowedExtensions = ['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm'];
  const safeExt = allowedExtensions.includes(originalExt) ? originalExt : '.m4a';
  const virtualFilename = `recording_${Date.now()}${safeExt}`;

  // Use toFile helper to pass valid audio stream & extension to OpenAI Audio API
  let response;
  const promptText = 'Customer support call recording in Telugu and English (Telugish). Transcribe actual conversation accurately without repeating words.';

  try {
    // 1. Try OpenAI's recommended new model "gpt-4o-mini-transcribe" or "gpt-transcribe"
    const audioFile = await toFile(fs.createReadStream(targetPath), virtualFilename);
    response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'gpt-4o-mini-transcribe',
      prompt: promptText,
      temperature: 0,
      response_format: 'json',
    });
  } catch (modelErr) {
    // 2. Fallback to whisper-1 if gpt-4o-mini-transcribe is not enabled on the API key tier
    console.warn('[STT] gpt-4o-mini-transcribe fallback to whisper-1:', modelErr?.message || modelErr);
    const retryAudioFile = await toFile(fs.createReadStream(targetPath), virtualFilename);
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
  const cleanedText = cleanRepeatedHallucinations(rawText);

  return cleanedText || rawText;
}

module.exports = {
  transcribeAudioFile,
};
