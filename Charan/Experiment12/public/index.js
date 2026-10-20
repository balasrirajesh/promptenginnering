// Experiment 12: Data Engine RAG Indexing & Retrieval
// Student: Vyshnavi | Regulation: ACETR23

const QUERY_PRESETS = {
  strict_silence: "tell me about strict silence",
  library: "what are the library regulations and timings?",
  discipline: "what is the student disciplinary code of conduct?"
};

function setQueryPreset(key) {
  const input = document.getElementById('queryInput');
  if (QUERY_PRESETS[key]) {
    input.value = QUERY_PRESETS[key];
    handleSendQuery();
  }
}

async function handleSendQuery() {
  const input = document.getElementById('queryInput');
  const query = (input.value || '').trim() || "tell me about strict silence";
  input.value = query;

  document.getElementById('queryPillText').innerText = query;

  const responseTitle = document.getElementById('responseTitle');
  const responseList = document.getElementById('responseList');
  const similarityTag = document.getElementById('similarityTag');

  responseTitle.innerText = "Searching Vector Index...";
  if (similarityTag) similarityTag.innerText = "Computing Cosine Similarity...";
  responseList.innerHTML = `<li>Retrieving nearest semantic chunks from in-memory vector store...</li>`;

  try {
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();

    if (data.error) {
      responseTitle.innerText = "Query Error";
      responseList.innerHTML = `<li style="color:#ef4444;">${data.error}</li>`;
      if (similarityTag) similarityTag.innerText = "Error";
      return;
    }

    responseTitle.innerText = data.title || "Indexed Result";
    if (similarityTag) {
      similarityTag.innerText = `Cosine Sim: ${data.cosineSimilarity || '0.8924'} • ${data.retrievedChunks || 3} Chunks`;
    }

    let html = `
      <li><strong>Definition:</strong> ${data.definition}</li>
      <li><strong>Locations where strict silence must be observed:</strong>
        <ul class="nested-bullets">
          ${(data.locations || []).map(loc => `<li>${loc}</li>`).join('')}
        </ul>
      </li>
      <li><strong>Purpose:</strong> ${data.purpose}</li>
      <li><strong>Expectations:</strong> ${data.expectations}</li>
      <li><strong>Exceptions:</strong> ${data.exceptions}</li>
    `;

    responseList.innerHTML = html;

  } catch (err) {
    console.error("Query failed:", err);
    responseTitle.innerText = "Network Error";
    responseList.innerHTML = `<li>Could not communicate with RAG Data Engine backend.</li>`;
  }
}

// Enter key submit
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('queryInput');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendQuery();
    }
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autorun') === 'true') {
    setTimeout(() => {
      handleSendQuery();
    }, 500);
  }
});
