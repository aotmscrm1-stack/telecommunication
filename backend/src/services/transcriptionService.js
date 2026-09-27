// services/transcriptionService.js
const fs = require('fs');
const path = require('path');
const { OpenAI, toFile } = require('openai');

/**
 * Transcribe an audio file using OpenAI Whisper API (whisper-1).
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

  // Use toFile helper to pass valid audio stream & extension to OpenAI Whisper API
  const audioFile = await toFile(fs.createReadStream(targetPath), virtualFilename);

  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'json',
    });

    if (!response || typeof response.text !== 'string') {
      throw new Error('Invalid or empty response received from OpenAI Whisper API');
    }

    return response.text.trim();
  } catch (err) {
    console.error('[Whisper STT Error]', err?.response?.data || err.message || err);
    throw new Error(err?.response?.data?.error?.message || err.message || 'OpenAI Whisper transcription failed');
  }
}

module.exports = {
  transcribeAudioFile,
};
