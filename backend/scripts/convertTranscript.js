const mongoose = require('mongoose');
require('dotenv').config();
const { OpenAI } = require('openai');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const rec = await mongoose.connection.collection('callrecordings').findOne({ _id: new mongoose.Types.ObjectId('6acf5349b894e304e83b0432') });
  console.log('Original Telugu Transcript:', rec.transcript);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = 'You are an expert audio transcription transliterator for Indian languages (Telugu, Hindi, etc.). ' +
    'Convert this Telugu transcript into casual English chatting language / Romanized script (such as WhatsApp/SMS chatting format, e.g. "Hi em chestunnavu, ala unnavu?"). ' +
    'Maintain the dialogue flow and words naturally. Do NOT output Telugu script; output ONLY the English chatting script.';

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: rec.transcript }
    ],
    temperature: 0.2
  });

  const converted = res.choices[0].message.content.trim();
  console.log('Transliterated English Chatting Transcript:\n', converted);

  const updateObj = {};
  updateObj['$set'] = { transcript: converted };
  await mongoose.connection.collection('callrecordings').updateOne(
    { _id: new mongoose.Types.ObjectId('6acf5349b894e304e83b0432') },
    updateObj
  );
  console.log('Successfully updated recording in MongoDB with English Chatting Language!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
