require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3021;
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const CANDIDATE_MODELS = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];

async function generateVoiceResponse(transcript) {
  const prompt = `You are an intelligent mission control voice assistant.
Answer the following spoken user query concisely in 2 sentences with natural conversational phrasing suitable for text-to-speech audio synthesis:
"${transcript}"`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      await new Promise(res => setTimeout(res, 350));
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim()) {
        return { text: text.trim(), model: modelName };
      }
    } catch (err) {
      console.warn(`Model ${modelName} error: ${err.message}. Trying fallback...`);
    }
  }
  throw new Error("All voice language models exhausted.");
}

app.post('/api/chat-voice', async (req, res) => {
  const startTime = Date.now();
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required." });
    }

    const { text, model } = await generateVoiceResponse(transcript);
    const latency = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({
      success: true,
      transcript,
      response: text,
      modelUsed: model,
      latency: `${latency}s`,
      wordCount: text.split(/\s+/).length
    });
  } catch (err) {
    console.error("Voice chat error:", err);
    res.status(500).json({ error: err.message || "Failed to process voice request." });
  }
});

app.listen(PORT, () => {
  console.log(`âœ… Experiment 22 running on http://localhost:${PORT}`);
});
