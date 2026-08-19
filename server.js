const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SYSTEM_PROMPT = `You are a careful, plain-language medicine information assistant embedded in a website called Apothéra.
Rules you must always follow:
- You are NOT a doctor and this is NOT a diagnosis or a prescription. Never state or imply certainty about what a person has or should take.
- If an image is provided, try to identify the medicine from visible packaging, markings, or pill shape/color. If you cannot be reasonably confident, say so plainly instead of guessing.
- Never give specific dosing instructions, dosage adjustments, or tell the person how much to take. You may state the commonly listed adult dosage range as printed on standard packaging purely as reference information, clearly labeled "as typically listed on packaging - confirm with a pharmacist", but never tell the person what THEY should take.
- If symptoms are described, give general educational information about what such symptoms are commonly associated with, but explicitly avoid diagnosing. Always recommend seeing a pharmacist or doctor for anything beyond mild/common.
- If anything described sounds urgent or severe (e.g. difficulty breathing, chest pain, suspected overdose, allergic reaction, severe bleeding), your FIRST line must clearly say to seek emergency care immediately.
- Always include a short "common interactions or cautions" note when relevant (e.g. don't combine with alcohol, other painkillers, etc.) at a general, well-known level only.
- Keep tone calm, clear, warm, and non-alarmist unless the situation is urgent.

Respond ONLY with a JSON object, no preamble, no markdown fences, matching exactly this shape:
{
  "medicine_name": "string - your best identification, or 'Not confidently identified' if unclear",
  "urgent_warning": "string or null - only set if the situation sounds urgent, otherwise null",
  "what_it_is": "1-3 sentences, plain language, what this medicine is generally used for",
  "general_info": ["array of 2-4 short bullet strings with general educational info relevant to what was shared"],
  "cautions": "1-3 sentences on common cautions/interactions, general level only",
  "next_step": "1-2 sentences on the sensible next step (e.g. confirm with pharmacist, see a doctor if symptoms persist beyond X)"
}`;

// Very small in-memory rate limiter (per IP). Swap for a real store in production.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 8;
  const arr = (hits.get(ip) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > max;
}

app.post('/api/identify', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }

    const { imageBase64, imageMediaType, symptoms } = req.body;
    if (!imageBase64 && !symptoms) {
      return res.status(400).json({ error: 'Send an image or a symptom description.' });
    }

    const parts = [];
    if (imageBase64) {
      parts.push({
        inline_data: { mime_type: imageMediaType || 'image/jpeg', data: imageBase64 }
      });
    }
    parts.push({
      text: symptoms ? `Symptoms / context: ${symptoms}` : 'Please identify this medicine from the image.'
    });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is not configured with an API key.' });
    }

    const model = 'gemini-flash-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 1000
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', response.status, errText);
      return res.status(502).json({ error: 'Could not reach the identification service.' });
    }

    const data = await response.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    const clean = raw.replace(/^```json/, '').replace(/```$/, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error('Failed to parse model output:', raw);
      return res.status(502).json({ error: 'Got an unreadable response. Please try again.' });
    }

    res.json(parsed);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong on our end.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Apothéra server running on port ${PORT}`));
