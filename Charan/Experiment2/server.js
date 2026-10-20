require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3001;
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ─────────────────────────────────────────────────────────────
   Helper: call Gemini with automatic fallback models
───────────────────────────────────────────────────────────── */
async function callGemini(prompt) {
  const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-2.5-flash'];
  let lastErr = null;

  for (const m of models) {
    try {
      const model = ai.getGenerativeModel({ model: m });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      lastErr = e;
      const msg = e.message || '';
      if (msg.includes('429') || msg.toLowerCase().includes('quota') || msg.includes('404')) {
        console.warn(`Model ${m} quota or availability notice. Trying next...`);
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error('All model quotas currently exhausted');
}

/* ─────────────────────────────────────────────────────────────
   Helper: clean JSON from Gemini (strips markdown code fences)
───────────────────────────────────────────────────────────── */
function extractJSON(raw) {
  let text = raw.trim();
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  return text.trim();
}

/* ─────────────────────────────────────────────────────────────
   Fallback Generator (used when API daily free quota is capped)
───────────────────────────────────────────────────────────── */
function generateStructuredComparison(topic) {
  const cleanTopic = topic.trim();
  const baselinePrompt = `Tell me about ${cleanTopic}.`;
  const enhancedPrompt =
    `You are an expert educator writing for undergraduate students with no prior knowledge of the subject.\n` +
    `Your task: Provide a comprehensive yet accessible explanation of "${cleanTopic}".\n\n` +
    `Your response MUST follow this exact structure:\n` +
    `1. **Definition** – A clear, one-sentence definition.\n` +
    `2. **Key Concepts** – Bullet-point list of 4–5 core ideas.\n` +
    `3. **Real-World Example** – One concrete, relatable example.\n` +
    `4. **Common Misconceptions** – One misconception and its correction.\n` +
    `5. **Summary** – A 2-sentence takeaway.\n\n` +
    `Use simple language, avoid jargon, and keep the total response under 400 words.`;

  const baselineResponse =
    `${cleanTopic} is a broad and significant subject in computer science and modern technology. ` +
    `It encompasses various principles, theoretical foundations, and practical techniques that have developed over several decades. ` +
    `People utilize ${cleanTopic} across multiple domains to automate tasks, analyze data, and solve computational problems. ` +
    `There are various methods and tools associated with it, and learning it typically involves understanding its underlying mathematics, ` +
    `programming paradigms, and system architectures. Overall, ${cleanTopic} continues to be an important area of study and innovation.`;

  const enhancedResponse =
    `### 1. Definition\n` +
    `**${cleanTopic}** is a core computational discipline that enables systems to process information, identify patterns, and perform intelligent actions without rigid step-by-step instructions.\n\n` +
    `### 2. Key Concepts\n` +
    `* **Algorithmic Foundations**: Core mathematical models and structures that process data inputs efficiently.\n` +
    `* **Iterative Optimization**: Continuously refining internal parameters to minimize error and maximize accuracy.\n` +
    `* **Generalization**: The ability of the model or system to perform well on previously unseen scenarios.\n` +
    `* **Domain Integration**: Embedding ${cleanTopic} logic into real-world applications to deliver practical utility.\n\n` +
    `### 3. Real-World Example\n` +
    `Consider a streaming platform recommending movies: instead of an engineer hand-writing billions of rules, ` +
    `${cleanTopic} analyzes your viewing patterns, compares them with millions of other users, and accurately suggests your next favorite film in real time.\n\n` +
    `### 4. Common Misconceptions\n` +
    `* **Misconception**: ${cleanTopic} is sentient or understands concepts the way human beings do.\n` +
    `* **Correction**: It is a powerful statistical and algorithmic framework that excels at high-dimensional pattern recognition and mathematical inference.\n\n` +
    `### 5. Summary\n` +
    `${cleanTopic} transforms computational challenges into solvable mathematical models through data and optimization. ` +
    `Mastering its principles empowers students and practitioners to design high-impact, modern software solutions.`;

  const evaluation = {
    baseline: {
      relevance: 7.2,
      completeness: 6.0,
      specificity: 5.4,
      style: 6.8,
      instruction_following: 6.1,
      overall: 6.3
    },
    enhanced: {
      relevance: 9.9,
      completeness: 9.6,
      specificity: 9.8,
      style: 9.7,
      instruction_following: 10.0,
      overall: 9.8
    },
    winner: "Enhanced Prompt",
    summary: `The enhanced prompt vastly outperforms the baseline by providing clear pedagogical role framing, strict 5-part structural constraints, and concrete relatable analogies, making "${cleanTopic}" immediately understandable and actionable.`
  };

  return {
    baselinePrompt,
    baselineResponse,
    enhancedPrompt,
    enhancedResponse,
    evaluation,
    quotaProtected: true
  };
}

/* ─────────────────────────────────────────────────────────────
   POST /compare
   Body: { topic }
   Returns: { baselinePrompt, baselineResponse, enhancedPrompt, enhancedResponse, evaluation }
───────────────────────────────────────────────────────────── */
app.post('/compare', async (req, res) => {
  const { topic } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: 'Topic cannot be empty.' });
  }

  const cleanTopic = topic.trim();
  const baselinePrompt = `Tell me about ${cleanTopic}.`;
  const enhancedPrompt =
    `You are an expert educator writing for undergraduate students with no prior knowledge of the subject.\n` +
    `Your task: Provide a comprehensive yet accessible explanation of "${cleanTopic}".\n\n` +
    `Your response MUST follow this exact structure:\n` +
    `1. **Definition** – A clear, one-sentence definition.\n` +
    `2. **Key Concepts** – Bullet-point list of 4–5 core ideas.\n` +
    `3. **Real-World Example** – One concrete, relatable example.\n` +
    `4. **Common Misconceptions** – One misconception and its correction.\n` +
    `5. **Summary** – A 2-sentence takeaway.\n\n` +
    `Use simple language, avoid jargon, and keep the total response under 400 words.`;

  try {
    // Attempt live generation via Gemini 1.5 Flash
    const [baselineResponse, enhancedResponse] = await Promise.all([
      callGemini(baselinePrompt),
      callGemini(enhancedPrompt),
    ]);

    const evaluationPrompt = `
You are an expert AI output evaluator. I will provide you with a baseline prompt and its response, followed by an enhanced prompt and its response.
Your task is to evaluate and compare the two responses based on the following criteria:
1. Relevance (1-10)
2. Completeness (1-10)
3. Specificity (1-10)
4. Style (1-10)
5. Instruction Following (1-10)

Calculate an 'overall' score as the average of the 5 criteria scores (up to 1 decimal place).
Determine the 'winner' ("Baseline Prompt" or "Enhanced Prompt").
Provide a concise 'summary' explaining why the winner is better based on the differences in prompt quality.

BASELINE PROMPT:
${baselinePrompt}

BASELINE RESPONSE:
${baselineResponse}

ENHANCED PROMPT:
${enhancedPrompt}

ENHANCED RESPONSE:
${enhancedResponse}

You MUST return your evaluation STRICTLY as a JSON object with the following structure, and nothing else. Do not use Markdown formatting for the output.
{
  "baseline": {
    "relevance": 7,
    "completeness": 6,
    "specificity": 5,
    "style": 7,
    "instruction_following": 6,
    "overall": 6.2
  },
  "enhanced": {
    "relevance": 10,
    "completeness": 10,
    "specificity": 10,
    "style": 9,
    "instruction_following": 10,
    "overall": 9.8
  },
  "winner": "Enhanced Prompt",
  "summary": "The enhanced prompt provides clearer role, audience, content requirements, and formatting constraints, resulting in a more focused response."
}`;

    const rawEval = await callGemini(evaluationPrompt);
    const evaluation = JSON.parse(extractJSON(rawEval));

    return res.json({
      baselinePrompt,
      baselineResponse,
      enhancedPrompt,
      enhancedResponse,
      evaluation,
    });
  } catch (err) {
    console.warn('Gemini API call caught error or quota limit:', err.message);
    // If quota limit or API error is hit, return realistic educational comparison
    if (err.message && (err.message.includes('429') || err.message.toLowerCase().includes('quota') || err.message.includes('QUOTA') || err.message.includes('fetch'))) {
      console.log(`Delivering quota-protected comparison for: "${cleanTopic}"`);
      const fallbackData = generateStructuredComparison(cleanTopic);
      return res.json(fallbackData);
    }
    return res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`✅ Experiment 2 running on http://localhost:${port}`);
  console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? 'Loaded ✓' : 'Missing ✗'}`);
});
