// Experiment 10: PromptCraft Studio - Chain-of-Thought & Task Decomposition
// Student: Vyshnavi | Regulation: ACETR23

const REFERENCE_PROMPTS = {
  farmer: 'A farmer has 10 sheep, and all but 7 die. How many are left? Also, if he buys 5 more and gives half of his total flock to his neighbor, how many does he have?',
  batball: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Explain step by step.',
  strawberry: "How many times does the letter 'r' appear in the word 'strawberry'? Break down the word letter by letter to verify."
};

function selectMode(mode) {
  if (mode === 'structured') {
    window.location.href = 'http://localhost:3007/';
    return;
  }
  if (mode === 'json') {
    window.location.href = 'http://localhost:3008/';
    return;
  }
  if (mode === 'cot') {
    window.location.href = 'http://localhost:3009/';
    return;
  }
}

function useReferencePrompt() {
  const input = document.getElementById('promptInput');
  const currentRef = document.getElementById('referencePromptText').innerText;
  input.value = currentRef;
  input.focus();
}

function copyReferencePrompt() {
  const text = document.getElementById('referencePromptText').innerText;
  navigator.clipboard.writeText(text).then(() => {
    const copyBtn = document.getElementById('copyPromptBtn');
    const original = copyBtn.innerHTML;
    copyBtn.innerHTML = `✓ Copied!`;
    setTimeout(() => { copyBtn.innerHTML = original; }, 1800);
  });
}

function setPromptPreset(type) {
  const input = document.getElementById('promptInput');
  if (REFERENCE_PROMPTS[type]) {
    input.value = REFERENCE_PROMPTS[type];
    document.getElementById('referencePromptText').innerText = REFERENCE_PROMPTS[type];
    input.focus();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text || '';
  return div.innerHTML;
}

async function handleRunValidation() {
  const input = document.getElementById('promptInput');
  const prompt = (input.value || '').trim() || REFERENCE_PROMPTS.farmer;
  input.value = prompt;

  const chatStream = document.getElementById('chatStream');

  // 1. Append User Message Bubble
  const userRow = document.createElement('div');
  userRow.className = 'user-msg-row';
  userRow.innerHTML = `<div class="user-bubble"><strong>Question:</strong> ${escapeHtml(prompt)}</div>`;
  chatStream.appendChild(userRow);

  // 2. Append Spinner
  const loadingId = 'loading-' + Date.now();
  const loadingRow = document.createElement('div');
  loadingRow.id = loadingId;
  loadingRow.className = 'spinner-card';
  loadingRow.innerHTML = `
    <div class="spinner"></div>
    <span>Executing Direct Baseline and Zero-Shot Chain-of-Thought reasoning with Gemini...</span>
  `;
  chatStream.appendChild(loadingRow);
  loadingRow.scrollIntoView({ behavior: 'smooth' });

  // Disable run button during inference
  const runBtn = document.getElementById('runValidationBtn');
  runBtn.disabled = true;
  runBtn.style.opacity = '0.6';

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, task_type: 'cot' })
    });

    const data = await res.json();
    const loader = document.getElementById(loadingId);
    if (loader) loader.remove();

    if (data.error) {
      const errRow = document.createElement('div');
      errRow.className = 'assistant-msg-row';
      errRow.innerHTML = `
        <div class="validation-badge-banner" style="background:#fef2f2; border-color:#ef4444; color:#b91c1c;">
          <span class="validation-icon">⚠️</span>
          <span>${escapeHtml(data.error)}</span>
        </div>
      `;
      chatStream.appendChild(errRow);
      return;
    }

    // 3. Render Assistant Response Card with Side-by-Side Comparison
    const asstRow = document.createElement('div');
    asstRow.className = 'assistant-msg-row';

    asstRow.innerHTML = `
      <p class="cot-intro-text">Chain-of-Thought Evaluation: Direct Baseline vs Step-by-Step Reasoning</p>
      <div class="cot-comparison-box">
        <div class="cot-columns-grid">
          <div class="cot-col direct-card">
            <div class="col-header">
              <span>Direct Answer</span>
              <span class="col-tag baseline">Baseline</span>
            </div>
            <div class="col-body">${data.direct.html}</div>
          </div>
          <div class="cot-col reasoning-card">
            <div class="col-header">
              <span>Chain-of-Thought</span>
              <span class="col-tag reasoning">Step-by-Step</span>
            </div>
            <div class="col-body">${data.cot.html}</div>
          </div>
        </div>
        <div class="validation-badge-banner">
          <span class="validation-icon">✔</span>
          <span>${escapeHtml(data.status || 'Chain-of-Thought comparison generated successfully.')}</span>
        </div>
      </div>
    `;

    chatStream.appendChild(asstRow);
    asstRow.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    const loader = document.getElementById(loadingId);
    if (loader) loader.remove();
    console.error(err);
  } finally {
    runBtn.disabled = false;
    runBtn.style.opacity = '1';
  }
}

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  const textarea = document.getElementById('promptInput');
  textarea.value = REFERENCE_PROMPTS.farmer;

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRunValidation();
    }
  });

  // Auto-run if requested in URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autorun') === 'true') {
    setTimeout(() => {
      handleRunValidation();
    }, 600);
  }
});
