/* ================================================================
   Experiment 2 – Baseline vs Enhanced Prompts
   app.js – Client-side logic
================================================================ */

const topicInput    = document.getElementById('topic-input');
const runBtn        = document.getElementById('run-btn');
const loadingState  = document.getElementById('loading-state');
const results       = document.getElementById('results');
const errorState    = document.getElementById('error-state');
const errorMessage  = document.getElementById('error-message');
const retryBtn      = document.getElementById('retry-btn');

/* ── Quick topic buttons ── */
document.querySelectorAll('.qt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    topicInput.value = btn.dataset.topic;
    topicInput.focus();
  });
});

/* ── Enter key ── */
topicInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') runComparison();
});

runBtn.addEventListener('click', runComparison);
retryBtn.addEventListener('click', () => {
  errorState.hidden = true;
  runComparison();
});

/* ================================================================
   Main comparison flow
================================================================ */
async function runComparison() {
  const topic = topicInput.value.trim();
  if (!topic) {
    topicInput.focus();
    topicInput.style.borderColor = '#ef4444';
    setTimeout(() => (topicInput.style.borderColor = ''), 1200);
    return;
  }

  // UI states
  results.hidden   = true;
  errorState.hidden = true;
  loadingState.hidden = false;
  runBtn.disabled  = true;

  animateLoadingSteps();

  try {
    const res = await fetch('/compare', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ topic }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');
    renderResults(data);
  } catch (err) {
    loadingState.hidden = true;
    errorMessage.textContent = err.message;
    errorState.hidden = false;
  } finally {
    runBtn.disabled = false;
  }
}

/* ================================================================
   Loading animation
================================================================ */
let stepTimer = null;
function animateLoadingSteps() {
  const dots = document.querySelectorAll('.step-dot');
  dots.forEach(d => { d.classList.remove('active','done'); });
  dots[0].classList.add('active');

  let step = 0;
  clearInterval(stepTimer);
  stepTimer = setInterval(() => {
    if (step < dots.length - 1) {
      dots[step].classList.remove('active');
      dots[step].classList.add('done');
      step++;
      dots[step].classList.add('active');
    }
  }, 2500);
}

/* ================================================================
   Markdown formatting helper for high-contrast legible display
================================================================ */
function formatMarkdown(md) {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inTable = false;
  let tableRows = [];
  let inList = false;

  function flushTable() {
    if (tableRows.length === 0) return;
    html += '<div class="table-responsive"><table class="md-table">';
    tableRows.forEach((row, idx) => {
      const cells = row.split('|').filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1).map(c => c.trim());
      if (idx === 0) {
        html += '<thead><tr>' + cells.map(c => `<th>${formatInline(c)}</th>`).join('') + '</tr></thead><tbody>';
      } else if (idx === 1 && cells.every(c => c.replace(/-/g, '').trim() === '')) {
        // separator row, skip
      } else {
        html += '<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>';
      }
    });
    html += '</tbody></table></div>';
    tableRows = [];
    inTable = false;
  }

  function flushList() {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  }

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      inTable = true;
      tableRows.push(trimmed);
      return;
    } else if (inTable) {
      flushTable();
    }

    if (trimmed.startsWith('###')) {
      flushList();
      html += `<h4 class="md-heading">${formatInline(trimmed.replace(/^###\s*/, ''))}</h4>`;
    } else if (trimmed.startsWith('##')) {
      flushList();
      html += `<h3 class="md-heading-2">${formatInline(trimmed.replace(/^##\s*/, ''))}</h3>`;
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        html += '<ul class="md-list">';
        inList = true;
      }
      html += `<li>${formatInline(trimmed.replace(/^[-*]\s*/, ''))}</li>`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      flushList();
      html += `<div class="md-ordered-item"><span class="md-num">${trimmed.match(/^\d+\./)[0]}</span> ${formatInline(trimmed.replace(/^\d+\.\s*/, ''))}</div>`;
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      html += `<p class="md-p">${formatInline(trimmed)}</p>`;
    }
  });

  flushTable();
  flushList();
  return html;
}

function formatInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

/* ================================================================
   Render results
================================================================ */
function renderResults(data) {
  clearInterval(stepTimer);
  loadingState.hidden = true;

  const { baselinePrompt, baselineResponse, enhancedPrompt, enhancedResponse, evaluation } = data;

  /* Prompts */
  document.getElementById('baseline-prompt-text').textContent = baselinePrompt;
  document.getElementById('enhanced-prompt-text').textContent  = enhancedPrompt;

  /* Responses (rendered with high-contrast formatting) */
  document.getElementById('baseline-response-text').innerHTML = formatMarkdown(baselineResponse);
  document.getElementById('enhanced-response-text').innerHTML  = formatMarkdown(enhancedResponse);

  /* Winner banner */
  document.getElementById('winner-name').textContent    = evaluation.winner;
  document.getElementById('winner-summary').textContent = evaluation.summary;

  /* Score bars */
  const metrics = ['relevance','completeness','specificity','style','instruction_following'];
  metrics.forEach(metric => {
    setScore('base', metric, evaluation.baseline[metric]);
    setScore('enh',  metric, evaluation.enhanced[metric]);
  });

  /* Overall */
  document.getElementById('overall-base').textContent = evaluation.baseline.overall;
  document.getElementById('overall-enh').textContent  = evaluation.enhanced.overall;

  results.hidden = false;
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* Animate bars after a small delay so CSS transition fires */
  setTimeout(() => animateBars(metrics, evaluation), 120);
}

function setScore(side, metric, value) {
  const bar = document.getElementById(`bar-${side}-${metric}`);
  const num = document.getElementById(`num-${side}-${metric}`);
  if (bar) bar.style.width = '0%';
  if (num) num.textContent = value;
}

function animateBars(metrics, evaluation) {
  metrics.forEach(metric => {
    const bBar = document.getElementById(`bar-base-${metric}`);
    const eBar = document.getElementById(`bar-enh-${metric}`);
    if (bBar) bBar.style.width = `${evaluation.baseline[metric] * 10}%`;
    if (eBar) eBar.style.width = `${evaluation.enhanced[metric] * 10}%`;
  });
}

/* ── Focus input & render sample output on load ── */
window.addEventListener('DOMContentLoaded', () => {
  topicInput.value = 'Machine Learning';
  const defaultData = {
    baselinePrompt: 'Tell me about Machine Learning.',
    baselineResponse: 'Machine learning is a field of artificial intelligence that uses statistical algorithms to enable computers to learn from data without being explicitly programmed. It is used in applications like recommendation engines, image recognition, and natural language processing.',
    enhancedPrompt: 'You are an experienced computer science professor writing for undergraduate beginners. Provide a comprehensive explanation of Machine Learning covering: 1) High-level conceptual definition, 2) The three primary paradigms (Supervised, Unsupervised, Reinforcement) with one real-world example each, 3) Key differences between traditional programming and ML. Format using clean Markdown headings, bullet points, and a comparison table. Restrict explanation to under 250 words.',
    enhancedResponse: `### 1. Conceptual Definition
Machine Learning (ML) is the computational science of building statistical models that iteratively infer predictive relationships directly from empirical training data rather than relying on deterministic, hand-crafted rulebases.

### 2. The Three Core Paradigms
- **Supervised Learning:** Learns input-to-output mappings from ground-truth labeled examples.
  * Example: Diagnostic imaging classifiers detecting malignant tumors from labeled MRI scans.
- **Unsupervised Learning:** Discovers intrinsic geometric manifolds and clusters within unlabeled data.
  * Example: Customer transaction grouping for anomaly and fraud prevention in fintech.
- **Reinforcement Learning:** Autonomous agents optimize sequential policies via environmental rewards.
  * Example: Training robotic quadrupeds to adapt gait across unpredictable terrains.

### 3. Traditional Programming vs. Machine Learning
| Attribute | Traditional Programming | Machine Learning |
| :--- | :--- | :--- |
| **Logic Formulation** | Hand-engineered by humans | Derived automatically from data |
| **Input Artifacts** | Data + Static Code Rules | Data + Observed Target Answers |
| **Adaptability** | Rigid, brittle to edge cases | Self-improving with ongoing data |`,
    evaluation: {
      winner: 'Enhanced Prompt',
      summary: 'The enhanced prompt significantly outperformed the baseline by providing targeted academic role framing, specifying a structured three-part breakdown with concrete examples, and producing a comparative table. The baseline yielded a brief, unanchored summary lacking actionable taxonomy.',
      baseline: { relevance: 7, completeness: 4, specificity: 4, style: 6, instruction_following: 5, overall: '5.2 / 10' },
      enhanced: { relevance: 10, completeness: 10, specificity: 9, style: 10, instruction_following: 10, overall: '9.8 / 10' }
    }
  };
  renderResults(defaultData);
});

