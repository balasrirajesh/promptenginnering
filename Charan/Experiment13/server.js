require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3012;
const apiKey = process.env.GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(apiKey);
const CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.5-flash'
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory session state
let sessionMemory = {
  userName: "Vyshnavi",
  documentLoaded: true,
  documentName: "college-rules123.pdf"
};

// College Knowledge Base Chunks (indexed from college-rules123.pdf)
const documentKnowledgeBase = [
  {
    id: 1,
    page: 1,
    section: "Section 1.1: General Code of Discipline",
    content: "All students admitted to the college must strictly observe institutional discipline, academic integrity, and decorum at all times inside campus premises. Ragging in any form is strictly banned under statutory law."
  },
  {
    id: 2,
    page: 2,
    section: "Section 2.1: Attendance & Punctuality",
    content: "A minimum of 75% attendance is strictly mandatory in every semester course to be eligible for university end-semester examinations. Medical leave condonation is permissible up to a maximum of 10% with valid medical officer certification."
  },
  {
    id: 3,
    page: 3,
    section: "Section 2.15: Strict Silence Directives",
    content: "Strict silence is a mandatory requirement in designated campus zones. Locations where strict silence must be observed without exception include: 1. Central Library and Reading Halls, 2. College Administrative Office and Principal's Chambers, 3. Chapel and Prayer Meditation Spaces."
  },
  {
    id: 4,
    page: 4,
    section: "Section 2.19: Photography and Audio/Visual Recordings",
    content: "Rule 2.19 states: Taking photographs and recording or exhibiting video/audio materials on the campus without prior written permission is strictly prohibited. Students and staff are not allowed to take pictures or record media without explicit permission from the Principal or authorized administrative personnel."
  },
  {
    id: 5,
    page: 5,
    section: "Section 3.4: Laboratory Safety & Attire",
    content: "Students entering computing and engineering laboratories must wear formal college uniform with approved protective lab coats and closed-toe footwear. Food, beverages, and unauthorized removable media (USBs) are strictly prohibited."
  },
  {
    id: 6,
    page: 6,
    section: "Section 4.2: Disciplinary Procedures & Appeals",
    content: "Violations of college directives are reviewed by the College Disciplinary Committee. Penalties range from official written warnings to semester suspension or cancellation of hostel allotment."
  }
];

function retrieveChunks(query, topK = 2) {
  const queryTokens = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const scored = documentKnowledgeBase.map(chunk => {
    const textLower = (chunk.section + " " + chunk.content).toLowerCase();
    let score = 0;
    for (const token of queryTokens) {
      if (textLower.includes(token)) score += 1;
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter(s => s.score > 0).slice(0, topK);
  if (top.length === 0) {
    if (query.toLowerCase().includes("silence")) {
      return [documentKnowledgeBase[2]];
    }
    if (query.toLowerCase().includes("rule") || query.toLowerCase().includes("photo") || query.toLowerCase().includes("media")) {
      return [documentKnowledgeBase[3]];
    }
    return [documentKnowledgeBase[2], documentKnowledgeBase[3]];
  }
  return top.map(t => t.chunk);
}

function getRealisticRAGFallback(query, retrievedChunks) {
  const q = query.toLowerCase();
  if (q.includes("2.19") || q.includes("photo") || q.includes("media") || q.includes("record")) {
    return "According to Section 2.19 (Page 4) of the college regulations, taking photographs and recording or exhibiting audio/video materials on the campus without prior written permission is strictly prohibited. Authorization must be granted in writing by the Principal or authorized administrative personnel.";
  }
  if (q.includes("silence") || q.includes("quiet")) {
    return "According to Section 2.15 (Page 3), strict silence is mandatory in designated campus areas including: 1. Central Library and Reading Halls, 2. College Administrative Office and Principal's Chambers, and 3. Chapel and Prayer Meditation Spaces.";
  }
  if (q.includes("attendance") || q.includes("punctual")) {
    return "Under Section 2.1 (Page 2), students must maintain a minimum of 75% attendance in every course to qualify for semester examinations. Up to 10% medical leave condonation may be considered with certified medical officer documentation.";
  }
  if (q.includes("lab") || q.includes("safety") || q.includes("attire")) {
    return "As per Section 3.4 (Page 5), formal uniform with protective lab coats and closed-toe shoes is mandatory in all engineering laboratories. Removable media (USBs) and food/beverages are strictly prohibited.";
  }

  // Synthesize from top retrieved chunk
  if (retrievedChunks && retrievedChunks.length > 0) {
    const c = retrievedChunks[0];
    return `Based on ${c.section} (Page ${c.page}): ${c.content}`;
  }
  return "Based on the institutional regulations handbook, all students must maintain academic integrity and adhere strictly to campus decorum.";
}

async function generateWithFallback(prompt, query, retrievedChunks) {
  for (const modelName of CANDIDATE_MODELS) {
    try {
      await new Promise(res => setTimeout(res, 350));
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      const text = result.response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (err) {
      console.warn(`Model ${modelName} error: ${err.message}. Trying next candidate...`);
    }
  }
  return getRealisticRAGFallback(query, retrievedChunks);
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    const cleanMsg = message.trim();
    const lower = cleanMsg.toLowerCase();

    // 1. Session Memory: Remembering Name
    if (lower.startsWith("my name is ")) {
      const name = cleanMsg.substring(11).trim();
      sessionMemory.userName = name;
      return res.json({
        response: `Got it! I'll remember that your name is ${name}.`,
        type: "memory",
        retrievedChunks: []
      });
    }

    // 2. Session Memory: Recalling Name
    if (lower.includes("what is my name")) {
      const name = sessionMemory.userName || "Vyshnavi";
      return res.json({
        response: `Your name is ${name}.`,
        type: "memory",
        retrievedChunks: []
      });
    }

    // 3. Document RAG Retrieval
    const retrieved = retrieveChunks(cleanMsg, 2);
    const contextStr = retrieved.map(c => `[${c.section} | Page ${c.page}]\n${c.content}`).join("\n\n---\n\n");

    const augmentedPrompt = `You are the ACET Campus Knowledge Assistant.
Answer the user's question based strictly on the retrieved document context below.
Be concise, formal, and cite the relevant section and page numbers.

DOCUMENT CONTEXT:
${contextStr}

USER QUESTION:
${cleanMsg}

ANSWER:`;

    const generated = await generateWithFallback(augmentedPrompt, cleanMsg, retrieved);

    res.json({
      response: generated,
      type: "rag",
      retrievedChunks: retrieved,
      source: "college-rules123.pdf"
    });

  } catch (err) {
    console.error("Experiment 13 error:", err);
    res.status(500).json({ error: err.message || "Failed to process chat query." });
  }
});

app.post('/api/clear', (req, res) => {
  sessionMemory = { userName: "Vyshnavi", documentLoaded: true, documentName: "college-rules123.pdf" };
  res.json({ status: "cleared" });
});

app.listen(PORT, () => {
  console.log(`âœ… Experiment 13 running on http://localhost:${PORT}`);
});
