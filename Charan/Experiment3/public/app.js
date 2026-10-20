/* ================================================================
   Experiment 3 – Iterative Prompt Refinement
   app.js – Client-side logic with interactive prompt typing
================================================================ */

const runAllBtn      = document.getElementById('run-all-btn');
const summarySection = document.getElementById('summary-section');
const topicInput     = document.getElementById('custom-topic-input');
const applyTopicBtn  = document.getElementById('apply-topic-btn');

const DEFAULT_PROMPTS = {
  1: "Summarize the plot of Romeo and Juliet.",
  2: "Summarize the plot of Shakespeare's Romeo and Juliet in exactly two sentences using clear, concise language suitable for a general audience.",
  3: "Summarize the plot of Shakespeare's Romeo and Juliet in exactly two sentences using clear, concise language suitable for a general audience. Include the setting of Verona and highlight the central themes of love, family conflict, and tragedy."
};

let completedRounds = new Set();

/* ── Individual round buttons ── */
document.querySelectorAll('.btn-round').forEach(btn => {
  btn.addEventListener('click', () => runRound(Number(btn.dataset.round)));
});

runAllBtn.addEventListener('click', runAll);

/* ── Reset prompt buttons ── */
document.querySelectorAll('.btn-reset-prompt').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const round = Number(btn.dataset.round);
    const textarea = document.getElementById(`prompt-input-${round}`);
    if (textarea && DEFAULT_PROMPTS[round]) {
      textarea.value = DEFAULT_PROMPTS[round];
    }
  });
});

/* ── Topic Generator & Presets ── */
function applyTopic(topic) {
  if (!topic || !topic.trim()) return;
  const t = topic.trim();

  const p1 = document.getElementById('prompt-input-1');
  const p2 = document.getElementById('prompt-input-2');
  const p3 = document.getElementById('prompt-input-3');

  if (t === "Shakespeare's Romeo and Juliet" || t === "Romeo and Juliet") {
    if (p1) p1.value = DEFAULT_PROMPTS[1];
    if (p2) p2.value = DEFAULT_PROMPTS[2];
    if (p3) p3.value = DEFAULT_PROMPTS[3];
  } else {
    if (p1) p1.value = `Summarize the core plot, background, or essence of ${t}.`;
    if (p2) p2.value = `Summarize ${t} in exactly two sentences using clear, concise language suitable for a general audience.`;
    if (p3) p3.value = `Summarize ${t} in exactly two sentences using clear, concise language suitable for a general audience. Include key foundational principles and highlight central themes, significance, and real-world impact.`;
  }

  // Update header subject banner
  const subTitle = document.querySelector('.subject-title');
  if (subTitle) subTitle.textContent = t;
  const subDesc = document.querySelector('.subject-sub');
  if (subDesc) subDesc.textContent = `Custom Topic Exploration · Prompt Engineering Lab`;
}

if (applyTopicBtn) {
  applyTopicBtn.addEventListener('click', () => applyTopic(topicInput?.value));
}

if (topicInput) {
  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyTopic(topicInput.value);
    }
  });
}

document.querySelectorAll('.preset-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const topic = chip.dataset.topic;
    if (topicInput) topicInput.value = topic;
    applyTopic(topic);
  });
});

/* ================================================================
   Run a single round
================================================================ */
async function runRound(round) {
  const btn     = document.getElementById(`btn-r${round}`);
  const loading = document.getElementById(`loading-${round}`);
  const section = document.getElementById(`response-section-${round}`);
  const promptInput = document.getElementById(`prompt-input-${round}`);
  const promptVal = promptInput ? promptInput.value.trim() : '';

  clearError(round);
  if (btn)     btn.disabled = true;
  if (loading) loading.hidden = false;
  if (section) section.hidden = true;

  try {
    const res = await fetch('/run-round', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ round, prompt: promptVal }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    renderRound(round, data.response, data.validation);
    completedRounds.add(round);
    activateTimelineStep(round);
    checkRevealSummary();
  } catch (err) {
    console.error(`Round ${round} error:`, err);
    renderError(round, err.message);
  } finally {
    if (loading) loading.hidden = true;
    if (btn)     btn.disabled = false;
  }
}

/* ================================================================
   Run all 3 rounds sequentially
================================================================ */
async function runAll() {
  runAllBtn.disabled = true;
  document.querySelectorAll('.btn-round').forEach(b => (b.disabled = true));
  completedRounds.clear();
  summarySection.hidden = true;

  // Reset timeline
  resetTimeline();

  for (const round of [1, 2, 3]) {
    const loading = document.getElementById(`loading-${round}`);
    const section = document.getElementById(`response-section-${round}`);
    const promptInput = document.getElementById(`prompt-input-${round}`);
    const promptVal = promptInput ? promptInput.value.trim() : '';

    clearError(round);

    if (loading) loading.hidden = false;
    if (section) section.hidden = true;

    try {
      const res = await fetch('/run-round', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ round, prompt: promptVal }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      renderRound(round, data.response, data.validation);
      completedRounds.add(round);
      activateTimelineStep(round);
    } catch (err) {
      console.error(`Round ${round} error:`, err);
      renderError(round, err.message);
    } finally {
      const loading = document.getElementById(`loading-${round}`);
      if (loading) loading.hidden = true;
    }

    // Delay between rounds to avoid free-tier rate limits
    if (round < 3) {
      await delay(900);
    }
  }

  checkRevealSummary();
  runAllBtn.disabled = false;
  document.querySelectorAll('.btn-round').forEach(b => (b.disabled = false));
}

/* ================================================================
   Render a round's response + validation
================================================================ */
function renderRound(round, responseText, validation) {
  const section = document.getElementById(`response-section-${round}`);
  const textEl  = document.getElementById(`response-text-${round}`);
  const valArea = document.getElementById(`validation-${round}`);

  clearError(round);

  if (textEl) textEl.textContent = responseText;

  if (valArea) {
    valArea.innerHTML = '';
    if (validation && validation.length > 0) {
      validation.forEach(v => {
        const item = document.createElement('div');
        item.className = `val-item ${v.pass ? 'val-pass' : 'val-fail'}`;
        item.innerHTML = `<div class="val-dot"></div><strong>${v.label}</strong> — <span>${v.detail}</span>`;
        valArea.appendChild(item);
      });
    }
  }

  if (section) section.hidden = false;
}

/* ================================================================
   Inline Error Display inside Card
================================================================ */
function renderError(round, message) {
  clearError(round);
  const card = document.getElementById(`card-${round}`);
  if (!card) return;

  const errDiv = document.createElement('div');
  errDiv.className = 'round-error';
  errDiv.id = `error-box-${round}`;
  errDiv.innerHTML = `
    <div><strong>Generation failed:</strong> ${escapeHtml(message)}</div>
    <button class="round-error-btn" onclick="runRound(${round})">↻ Retry Round ${round}</button>
  `;

  card.appendChild(errDiv);
}

function clearError(round) {
  const existing = document.getElementById(`error-box-${round}`);
  if (existing) existing.remove();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ================================================================
   Timeline step activation & reset
================================================================ */
function activateTimelineStep(round) {
  const step = document.getElementById(`tl-${round}`);
  if (step) {
    step.classList.remove('active');
    step.classList.add('done');
  }

  // Activate next step
  const next = document.getElementById(`tl-${round + 1}`);
  if (next) next.classList.add('active');

  // Complete line before this step
  const line = document.getElementById(`tl-line-${round}`);
  if (line) line.classList.add('done');
}

function resetTimeline() {
  for (let r = 1; r <= 3; r++) {
    const step = document.getElementById(`tl-${r}`);
    if (step) {
      step.classList.remove('done');
      if (r === 1) step.classList.add('active');
      else step.classList.remove('active');
    }
    const line = document.getElementById(`tl-line-${r}`);
    if (line) line.classList.remove('done');
  }
}

/* ================================================================
   Reveal summary section after all 3 done
================================================================ */
function checkRevealSummary() {
  if (completedRounds.size === 3) {
    summarySection.hidden = false;
    summarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ── Utility ── */
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
