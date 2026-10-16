const mongoose = require('mongoose');
require('dotenv').config();
const { transliterateToEnglishChat } = require('../src/modules/communication/calls/transcriptionService');
const { OpenAI } = require('openai');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const originalTelugu = 'పెదవే పలికిన మాటల్లోనే తీయని మాటే అమ్మ కదిలే దేవత అమ్మ కంటికి వెలుగమ్మ తనలో మమతే కలిపి పెడుతుంది ముద్దగా తనలాలి పాటలోని సరిగమ పంచుతుంది ప్రేమ మధురిమ';
  const out = await transliterateToEnglishChat(originalTelugu, openai);
  console.log('Resulting Chat Script:\n', out);

  const CallRecording = mongoose.model('CallRecording', new mongoose.Schema({}, { strict: false }));
  await CallRecording.updateOne(
    { _id: new mongoose.Types.ObjectId('6acf5349b894e304e83b0432') },
    { $set: { transcript: out } }
  );
  console.log('DB Updated successfully with English Chatting Language!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
