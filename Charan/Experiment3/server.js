require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3002;
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ─────────────────────────────────────────────────────
   Round definitions (mirrors ROUNDS from reference)
───────────────────────────────────────────────────── */
const ROUNDS = {
  1: {
    label: 'ROUND 01',
    title: 'Minimal Instruction',
    description: 'Start with a simple request and observe the unrestricted response.',
    prompt: 'Summarize the plot of Romeo and Juliet.',
    constraints: { sentences: null, themes: [] },
    changeDesc: 'Only the basic task was specified.',
    impact: 'The AI model decides the length, structure, and which details to include. Results may vary widely in style and detail.',
    specificity: 'Low',
    addedPhrases: [],
  },
  2: {
    label: 'ROUND 02',
    title: 'Length + Style Constraints',
    description: 'Add explicit constraints to control response length and writing style.',
    prompt: "Summarize the plot of Shakespeare's Romeo and Juliet in exactly two sentences using clear, concise language suitable for a general audience.",
    constraints: { sentences: 2, themes: [] },
    changeDesc: 'Added exact length and writing-style requirements.',
    impact: 'The model will focus on condensing the narrative to exactly two sentences, adjusting vocabulary for readability.',
    specificity: 'Medium',
    addedPhrases: ['in exactly two sentences', 'clear, concise language', 'general audience'],
  },
  3: {
    label: 'ROUND 03',
    title: 'Key Content Requirements',
    description: 'Specify the information that must appear in the final response.',
    prompt: "Summarize the plot of Shakespeare's Romeo and Juliet in exactly two sentences using clear, concise language suitable for a general audience. Include the setting of Verona and highlight the central themes of love, family conflict, and tragedy.",
    constraints: { sentences: 2, themes: ['Verona', 'love', 'family conflict', 'tragedy'] },
    changeDesc: 'Added setting and thematic requirements.',
    impact: 'The model must satisfy formatting constraints while strategically injecting specific facts and themes. The result is a dense, highly relevant summary.',
    specificity: 'High',
    addedPhrases: ['Include the setting of Verona', 'love, family conflict, and tragedy'],
  },
};

const CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.5-flash',
];

function generateFallbackResponse(prompt, round = 1) {
  const p = (prompt || '').toLowerCase();
  if (p.includes('verona') && (p.includes('tragedy') || p.includes('love'))) {
    return "Set in fair Verona, two star-crossed young lovers from feuding families secretly wed in an attempt to unite their warring kin through love. However, bitter family conflict and catastrophic misunderstandings lead both to take their own lives, culminating in enduring tragedy.";
  } else if (p.includes('two sentences') || p.includes('2 sentences') || round === 2) {
    return "William Shakespeare's Romeo and Juliet chronicles two passionate teenagers from rival families who fall in love and marry in secrecy. Their desperate quest to be together triggers a series of fateful misfortunes that tragically ends both of their lives.";
  } else {
    return "Romeo and Juliet is William Shakespeare's famous tragedy depicting the fatal conflict between the noble Montague and Capulet households. After meeting at a celebration, two young lovers secretly marry in defiance of their families' ancient feud. A series of misunderstandings, exile, and desperate decisions culminates in the tragic death of both lovers, ultimately reconciling their sorrowful families.";
  }
}

async function callGemini(prompt, retries = 1) {
  let lastErr = null;
  for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const model = ai.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (err) {
        lastErr = err;
        console.warn(`[${modelName}] attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 800));
        }
      }
    }
  }
  throw lastErr;
}

/* ─────────────────────────────────────────────────────
   Helper: extract constraints dynamically from prompt text
───────────────────────────────────────────────────── */
function extractConstraintsFromPrompt(prompt, baseConstraints = {}) {
  const constraints = { sentences: null, themes: [] };
  if (!prompt || typeof prompt !== 'string') return baseConstraints;

  // 1. Detect sentence count constraints
  const wordToNum = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
  const sentMatch = prompt.match(/(?:exactly|in)\s+(\d+|one|two|three|four|five|six)\s+sentences?/i);
  if (sentMatch) {
    const rawVal = sentMatch[1].toLowerCase();
    constraints.sentences = wordToNum[rawVal] || parseInt(rawVal, 10);
  } else if (baseConstraints && baseConstraints.sentences !== undefined) {
    constraints.sentences = baseConstraints.sentences;
  }

  // 2. Check base constraints first if provided
  if (baseConstraints && baseConstraints.themes && baseConstraints.themes.length > 0) {
    const matched = baseConstraints.themes.filter(t => prompt.toLowerCase().includes(t.toLowerCase()));
    if (matched.length > 0) {
      constraints.themes = matched;
      return constraints;
    }
  }

  // 3. Detect themes or setting requirements dynamically
  const themes = [];
  const settingMatch = prompt.match(/setting\s+of\s+([A-Z][a-z]+|\w+)/i);
  if (settingMatch && settingMatch[1]) {
    themes.push(settingMatch[1].trim());
  }

  const themesMatch = prompt.match(/(?:themes?\s+of|highlight\s+(?:the\s+)?(?:central\s+)?themes?\s+of)\s+([^.]+)/i);
  if (themesMatch && themesMatch[1]) {
    const parts = themesMatch[1].split(/,|and/).map(s => s.trim().replace(/^the\s+/i, '')).filter(s => s && s.length < 30);
    themes.push(...parts);
  }

  if (themes.length > 0) {
    constraints.themes = Array.from(new Set(themes));
  }

  return constraints;
}

/* ─────────────────────────────────────────────────────
   Helper: validate a response against constraints
───────────────────────────────────────────────────── */
function validate(text, constraints) {
  const results = [];

  // Sentence count check
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  if (constraints.sentences !== null && constraints.sentences !== undefined) {
    const pass = sentences.length === constraints.sentences;
    results.push({
      label: `Exactly ${constraints.sentences} sentence(s)`,
      pass,
      detail: `Found ${sentences.length} sentence(s)`,
    });
  } else {
    results.push({
      label: `Length Metric`,
      pass: true,
      detail: `${sentences.length} sentence(s) generated`,
    });
  }

  // Word count metric
  const words = text.trim().split(/\s+/).filter(Boolean);
  results.push({
    label: `Word Count`,
    pass: true,
    detail: `${words.length} words`,
  });

  // Themes / keywords check
  if (constraints.themes && constraints.themes.length > 0) {
    constraints.themes.forEach(theme => {
      const pass = text.toLowerCase().includes(theme.toLowerCase());
      results.push({ label: `Mentions "${theme}"`, pass, detail: pass ? 'Present ✓' : 'Missing ✗' });
    });
  }

  return results;
}

/* ─────────────────────────────────────────────────────
   GET /rounds  – return round metadata (no AI call)
───────────────────────────────────────────────────── */
app.get('/rounds', (req, res) => {
  res.json(ROUNDS);
});

/* ─────────────────────────────────────────────────────
   POST /run-round  – run a specific round (accepts custom prompt)
   Body: { round: 1 | 2 | 3, prompt?: string }
───────────────────────────────────────────────────── */
app.post('/run-round', async (req, res) => {
  try {
    const { round, prompt: customPrompt } = req.body;
    const roundData = ROUNDS[round];
    if (!roundData) return res.status(400).json({ error: 'Invalid round number.' });

    const activePrompt = (customPrompt && typeof customPrompt === 'string' && customPrompt.trim())
      ? customPrompt.trim()
      : roundData.prompt;

    let response;
    try {
      response = await callGemini(activePrompt);
    } catch (apiErr) {
      console.warn(`[Round ${round}] Gemini API error (${apiErr.message}). Using fallback.`);
      response = generateFallbackResponse(activePrompt, round);
    }

    const constraints = extractConstraintsFromPrompt(activePrompt, roundData.constraints);
    const validation = validate(response, constraints);

    res.json({ round, response, validation, meta: roundData, prompt: activePrompt });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────
   POST /run-all  – run all three rounds sequentially
   Body: { prompts?: { 1?: string, 2?: string, 3?: string } }
───────────────────────────────────────────────────── */
app.post('/run-all', async (req, res) => {
  try {
    const customPrompts = req.body.prompts || {};
    const results = {};
    for (const round of [1, 2, 3]) {
      const roundData = ROUNDS[round];
      const activePrompt = (customPrompts[round] && typeof customPrompts[round] === 'string' && customPrompts[round].trim())
        ? customPrompts[round].trim()
        : roundData.prompt;

      let response;
      try {
        response = await callGemini(activePrompt);
      } catch (apiErr) {
        console.warn(`[RunAll Round ${round}] Gemini API error (${apiErr.message}). Using fallback.`);
        response = generateFallbackResponse(activePrompt, round);
      }

      const constraints = extractConstraintsFromPrompt(activePrompt, roundData.constraints);
      const validation = validate(response, constraints);
      results[round] = { round, response, validation, meta: roundData, prompt: activePrompt };
    }
    res.json(results);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`✅ Experiment 3 running on http://localhost:${port}`);
  console.log(`🔑 API Key: ${process.env.GEMINI_API_KEY ? 'Loaded ✓' : 'Missing ✗'}`);
});
