// CampusRAG Studio - Experiment 13 Frontend Logic
// Student: Vyshnavi | Regulation: ACETR23

function scrollToBottom() {
  const container = document.getElementById('chatMessages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function setPipelineStep(stepNum) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`pipeStep${i}`);
    if (el) {
      if (i <= stepNum) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  }
}

function resetPipeline() {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`pipeStep${i}`);
    if (el) el.classList.remove('active');
  }
}

function quickAsk(text) {
  const input = document.getElementById('userInput');
  input.value = text;
  handleSendMessage();
}

async function handleSendMessage() {
  const input = document.getElementById('userInput');
  const message = (input.value || '').trim();
  if (!message) return;

  input.value = '';
  const chatContainer = document.getElementById('chatMessages');
  const statusText = document.getElementById('statusText');
  const sendBtn = document.getElementById('sendBtn');

  // 1. Render User Message
  const userRow = document.createElement('div');
  userRow.className = 'msg-row user-row';
  userRow.innerHTML = `
    <div class="msg-avatar user-avatar">U</div>
    <div class="msg-content">
      <div class="msg-header">
        <span class="sender-name">You</span>
      </div>
      <div class="msg-bubble user-bubble">${escapeHtml(message)}</div>
    </div>
  `;
  chatContainer.appendChild(userRow);
  scrollToBottom();

  // Animate Pipeline Steps
  sendBtn.disabled = true;
  statusText.innerText = "Ingesting query...";
  setPipelineStep(1);

  setTimeout(() => {
    statusText.innerText = "Retrieving chunks...";
    setPipelineStep(2);
  }, 250);

  setTimeout(() => {
    statusText.innerText = "Augmenting context...";
    setPipelineStep(3);
  }, 500);

  setTimeout(() => {
    statusText.innerText = "Synthesizing answer...";
    setPipelineStep(4);
  }, 750);

  // Loading skeleton in chat
  const loadingRow = document.createElement('div');
  loadingRow.className = 'msg-row assistant-row';
  loadingRow.id = 'loadingMessage';
  loadingRow.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-content">
      <div class="msg-header">
        <span class="sender-name">CampusRAG Assistant</span>
        <span class="tag-pill tag-system">Synthesizing...</span>
      </div>
      <div class="msg-bubble assistant-bubble" style="color: #475569; font-weight: 600;">
        Consulting <code>college-rules123.pdf</code> and generating answer...
      </div>
    </div>
  `;
  chatContainer.appendChild(loadingRow);
  scrollToBottom();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const data = await res.json();
    loadingRow.remove();

    // 2. Render Assistant Response
    const asstRow = document.createElement('div');
    asstRow.className = 'msg-row assistant-row';

    const isRag = data.type === 'rag' && data.retrievedChunks && data.retrievedChunks.length > 0;
    const isMemory = data.type === 'memory';
    
    let tagHtml = `<span class="tag-pill tag-system">Direct LLM</span>`;
    if (isRag) {
      tagHtml = `<span class="tag-pill tag-rag">✓ RAG Grounded</span>`;
    } else if (isMemory) {
      tagHtml = `<span class="tag-pill tag-memory">⚡ Conversational Memory</span>`;
    }

    let chunksHtml = '';
    if (isRag) {
      const chunksList = data.retrievedChunks.map(c => `
        <div class="chunk-snippet">
          <span class="chunk-badge">📄 Page ${c.page} • ${escapeHtml(c.section)}</span>
          ${escapeHtml(c.content)}
        </div>
      `).join('');

      chunksHtml = `
        <div class="retrieved-box">
          <div class="retrieved-toggle" onclick="toggleChunks(this)">
            <span>📚 Retrieved Document Chunks (${data.retrievedChunks.length} sources)</span>
            <span class="toggle-icon">▼</span>
          </div>
          <div class="retrieved-content" style="display: none;">
            ${chunksList}
          </div>
        </div>
      `;
    }

    const formattedAnswer = escapeHtml(data.response || '')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');

    asstRow.innerHTML = `
      <div class="msg-avatar">🤖</div>
      <div class="msg-content">
        <div class="msg-header">
          <span class="sender-name">CampusRAG Assistant</span>
          ${tagHtml}
        </div>
        <div class="msg-bubble assistant-bubble">
          ${formattedAnswer}
          ${chunksHtml}
        </div>
      </div>
    `;

    chatContainer.appendChild(asstRow);
    scrollToBottom();
    statusText.innerText = "Ready";

  } catch (err) {
    console.error("Chat error:", err);
    if (loadingRow) loadingRow.remove();
    statusText.innerText = "Error";
    resetPipeline();
  } finally {
    sendBtn.disabled = false;
  }
}

function toggleChunks(toggleEl) {
  const content = toggleEl.nextElementSibling;
  const icon = toggleEl.querySelector('.toggle-icon');
  if (content.style.display === 'none') {
    content.style.display = 'flex';
    icon.innerText = '▲';
  } else {
    content.style.display = 'none';
    icon.innerText = '▼';
  }
}

async function handleClearChat() {
  try {
    await fetch('/api/clear', { method: 'POST' });
  } catch (e) {}

  const chatContainer = document.getElementById('chatMessages');
  chatContainer.innerHTML = `
    <div class="msg-row assistant-row">
      <div class="msg-avatar">🤖</div>
      <div class="msg-content">
        <div class="msg-header">
          <span class="sender-name">CampusRAG Assistant</span>
          <span class="tag-pill tag-system">Session Reset</span>
        </div>
        <div class="msg-bubble assistant-bubble">
          Session cleared! You can now ask questions about <code>college-rules123.pdf</code> or introduce yourself again.
        </div>
      </div>
    </div>
  `;
  resetPipeline();
  document.getElementById('statusText').innerText = "Ready";
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autorun') === 'true') {
    setTimeout(() => {
      quickAsk('Tell me about rule 2.19');
    }, 600);
  }
});
