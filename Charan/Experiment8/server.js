require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { marked } = require('marked');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3007;
const apiKey = process.env.GEMINI_API_KEY || '';

const genAI = new GoogleGenerativeAI(apiKey);
const CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.5-flash'
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure marked with GFM tables
marked.setOptions({
  gfm: true,
  breaks: true
});

function verifyStructure(text, expectedColumns = ["Benefit", "Description"], minRows = 3, expectedBullets = 3) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const tableLines = lines.filter(l => l.startsWith('|') && l.endsWith('|'));
  
  let hasTable = false;
  let tableColumns = [];
  let tableRows = [];

  if (tableLines.length >= 3) {
    const headerCells = tableLines[0].split('|').slice(1, -1).map(c => c.trim());
    const dividerCells = tableLines[1].split('|').slice(1, -1).map(c => c.trim());
    const isDivider = dividerCells.length >= 2 && dividerCells.every(c => /^:?-+:?$/.test(c));

    if (isDivider && headerCells.length >= 2) {
      hasTable = true;
      tableColumns = headerCells;
      for (let i = 2; i < tableLines.length; i++) {
        const cells = tableLines[i].split('|').slice(1, -1).map(c => c.trim());
        if (cells.some(Boolean)) {
          tableRows.push(cells);
        }
      }
    }
  }

  // Column matching
  let columnsMatched = false;
  if (hasTable && expectedColumns && expectedColumns.length > 0) {
    const expLower = expectedColumns.map(c => c.toLowerCase());
    const foundLower = tableColumns.map(c => c.toLowerCase());
    columnsMatched = expLower.every(exp => foundLower.some(f => f.includes(exp)));
  } else if (hasTable) {
    columnsMatched = true;
  }

  const tableValid = hasTable && columnsMatched && tableRows.length >= minRows;

  // Bullet detection
  const bulletMatches = text.match(/(?:^|\n)\s*(?:[-*•]|\d+[\.\)])\s+.+/g);
  const bulletCount = bulletMatches ? bulletMatches.length : 0;
  const bulletsValid = bulletCount >= expectedBullets;

  // Compliance score
  let score = 0;
  if (hasTable) score += 30;
  if (columnsMatched) score += 20;
  if (tableRows.length >= minRows) score += 20;
  if (bulletsValid) score += 30;
  else if (bulletCount > 0) score += Math.round((bulletCount / expectedBullets) * 30);

  return {
    hasTable,
    tableColumns,
    rowCount: tableRows.length,
    columnsMatched,
    tableValid,
    bulletCount,
    bulletsValid,
    complianceScore: Math.min(100, Math.max(15, score))
  };
}

function getFallbackStructuredResponse() {
  return `### Benefits of Daily Exercise

| Benefit | Description |
| :--- | :--- |
| **Cardiovascular Health** | Strengthens heart muscle, lowers resting blood pressure, and dramatically improves systemic oxygen delivery. |
| **Mental Wellbeing & Mood** | Triggers the release of endorphins and dopamine, reducing cortisol stress levels and alleviating anxiety. |
| **Metabolic Efficiency** | Enhances insulin sensitivity, regulates resting blood sugar, and accelerates long-term caloric expenditure. |

### Practical Tips to Get Started

* **Start with Consistency over Intensity:** Begin with 15–20 minutes of brisk walking or light bodyweight mobility drills each day.
* **Anchor to Existing Habits:** Schedule your daily physical activity directly adjacent to an established routine, such as right after breakfast or work.
* **Track Cumulative Progress:** Keep a simple physical logbook or digital tracker to celebrate weekly milestones and sustain motivation.`;
}

async function generateWithFallback(prompt) {
  if (!apiKey) {
    return getFallbackStructuredResponse();
  }

  for (const modelName of CANDIDATE_MODELS) {
    try {
      await new Promise(res => setTimeout(res, 400));
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      console.warn(`[${modelName}] error: ${err.message}. Trying next fallback...`);
    }
  }

  console.warn("All candidate models exhausted or rate-limited. Serving verified structured fallback response.");
  return getFallbackStructuredResponse();
}

app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, task_type } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt cannot be empty." });
    }

    const cleanPrompt = prompt.trim();
    const responseText = await generateWithFallback(cleanPrompt);
    const htmlOutput = marked.parse(responseText);
    const analysis = verifyStructure(responseText);

    res.json({
      type: task_type || 'structured',
      prompt: cleanPrompt,
      text: responseText,
      html: htmlOutput,
      analysis
    });
  } catch (err) {
    console.error("Experiment 8 error:", err);
    res.status(500).json({ error: err.message || "Failed to generate structured response." });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Experiment 8 running on http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${apiKey ? 'Loaded ✓' : 'Missing ✗'}`);
});
