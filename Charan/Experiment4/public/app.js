/* ================================================================
   Experiment 4: Diagnosing Prompt Failures & Edge Cases
   app.js – Client-side Interactive Pipeline
================================================================ */

const promptInput      = document.getElementById('prompt-input');
const charCount        = document.getElementById('char-count');
const runBtn           = document.getElementById('run-btn');
const clearBtn         = document.getElementById('clear-btn');
const loadingCard      = document.getElementById('loading-card');
const loadingStageText = document.getElementById('loading-stage-text');
const loadingSubText   = document.getElementById('loading-sub-text');
const errorBanner      = document.getElementById('error-banner');
const errorMessage     = document.getElementById('error-message');
const errorRetryBtn    = document.getElementById('error-retry-btn');
const resultsContainer = document.getElementById('results-container');

// Presets data map
const PRESET_MAP = {
  contradiction:
    'Write an exhaustive, deeply technical, and fully comprehensive explanation of quantum computing algorithms, but make sure it is strictly under 15 words and suitable for a 4-year-old child.',
  ambiguity:
    'Fix it and make it much better so that they will like it when they see it tomorrow.',
  'missing-format':
    'Extract user data from this customer complaint email and give me the user info, transaction details, and order history.',
  'false-premise':
    'Explain why Python was created by Microsoft in 2018 to completely replace HTML for designing website styles.'
};

/* ===========================
   Event Listeners
=========================== */
promptInput.addEventListener('input', updateCharCount);

clearBtn.addEventListener('click', () => {
  promptInput.value = '';
  updateCharCount();
  promptInput.focus();
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    if (PRESET_MAP[key]) {
      promptInput.value = PRESET_MAP[key];
      updateCharCount();
      promptInput.focus();
    }
  });
});

runBtn.addEventListener('click', runPipeline);
errorRetryBtn.addEventListener('click', runPipeline);

function updateCharCount() {
  charCount.textContent = promptInput.value.length;
}

/* ================================================================
   Pipeline Execution
================================================================ */
let stageInterval = null;

async function runPipeline() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    promptInput.style.borderColor = '#e11d48';
    setTimeout(() => (promptInput.style.borderColor = ''), 1200);
    return;
  }

  // UI state
  errorBanner.hidden = true;
  resultsContainer.hidden = true;
  loadingCard.hidden = false;
  runBtn.disabled = true;

  // Reset pipeline steps
  resetPipelineUI();
  setPipelineStep(2); // In Progress: Analyze

  // Start animated stage indicator
  startLoadingStages();

  try {
    const res = await fetch('/diagnose-and-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error occurred');

    stopLoadingStages();
    completePipelineUI();

    renderResults(data);
    loadingCard.hidden = true;
    resultsContainer.hidden = false;
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('Pipeline error:', err);
    stopLoadingStages();
    loadingCard.hidden = true;
    errorMessage.textContent = err.message;
    errorBanner.hidden = false;
  } finally {
    runBtn.disabled = false;
  }
}

/* ================================================================
   Loading Stage Progression
================================================================ */
function startLoadingStages() {
  const stages = [
    { title: '1. Diagnosing root-cause failure modes...', sub: 'Detecting ambiguities, contradictions, and missing constraints with Gemini', step: 2, item: 'ls-1' },
    { title: '2. Computing prompt clarity & coherence scores...', sub: 'Evaluating baseline constraint precision and failure severity', step: 3, item: 'ls-2' },
    { title: '3. Generating baseline model response...', sub: 'Observing how Gemini behaves under flawed prompt constraints', step: 4, item: 'ls-3' },
    { title: '4. Synthesizing structured prompt refinement...', sub: 'Injecting role framing, explicit constraints, and disambiguations', step: 5, item: 'ls-4' },
    { title: '5. Generating improved response...', sub: 'Validating output against the refined prompt specification', step: 6, item: 'ls-5' }
  ];

  let current = 0;
  updateStage(stages[0]);

  stageInterval = setInterval(() => {
    current++;
    if (current < stages.length) {
      updateStage(stages[current]);
    }
  }, 2200);
}

function updateStage(stage) {
  loadingStageText.textContent = stage.title;
  loadingSubText.textContent = stage.sub;
  setPipelineStep(stage.step);

  document.querySelectorAll('.ls-item').forEach(el => el.classList.remove('active'));
  const activeItem = document.getElementById(stage.item);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

function stopLoadingStages() {
  if (stageInterval) clearInterval(stageInterval);
}

/* ================================================================
   Pipeline Step Highlighting
================================================================ */
function setPipelineStep(stepIndex) {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`pl-${i}`);
    const line = document.getElementById(`pl-line-${i - 1}`);

    if (i < stepIndex) {
      if (el) { el.classList.remove('active'); el.classList.add('done'); }
      if (line) line.classList.add('done');
    } else if (i === stepIndex) {
      if (el) { el.classList.add('active'); el.classList.remove('done'); }
    } else {
      if (el) { el.classList.remove('active', 'done'); }
      if (line) line.classList.remove('done');
    }
  }
}

function resetPipelineUI() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`pl-${i}`);
    const line = document.getElementById(`pl-line-${i}`);
    if (el) {
      el.classList.remove('done');
      if (i === 1) el.classList.add('active');
      else el.classList.remove('active');
    }
    if (line) line.classList.remove('done');
  }
  document.querySelectorAll('.ls-item').forEach(el => el.classList.remove('active', 'done'));
}

function completePipelineUI() {
  for (let i = 1; i <= 6; i++) {
    const el = document.getElementById(`pl-${i}`);
    const line = document.getElementById(`pl-line-${i}`);
    if (el) { el.classList.remove('active'); el.classList.add('done'); }
    if (line) line.classList.add('done');
  }
  document.querySelectorAll('.ls-item').forEach(el => el.classList.add('done'));
}

/* ================================================================
   Render Diagnostic Results
================================================================ */
function renderResults(data) {
  const { originalPrompt, baselineResponse, refinedPrompt, refinedResponse, analysis } = data;

  // 1. Diagnostic Banner
  document.getElementById('primary-failure-text').textContent =
    analysis.primaryFailureMode || 'Detected Multiple Prompt Flaws';
  document.getElementById('sbc-original').textContent =
    analysis.originalScores ? analysis.originalScores.overall : '30';

  // 2. Issues Grid
  const issuesGrid = document.getElementById('issues-grid');
  issuesGrid.innerHTML = '';

  if (analysis.issues && analysis.issues.length > 0) {
    analysis.issues.forEach(issue => {
      const card = document.createElement('div');
      const sevClass = (issue.severity || 'high').toLowerCase();
      card.className = `issue-card severity-${sevClass}`;

      card.innerHTML = `
        <div class="ic-header">
          <span class="ic-badge badge-${sevClass}">${escapeHtml(issue.severity || 'Issue')}</span>
          <span class="ic-type">${escapeHtml((issue.type || 'flaw').replace('_', ' '))}</span>
        </div>
        <div class="ic-title">${escapeHtml(issue.title || 'Diagnostic Issue')}</div>
        <div class="ic-desc">${escapeHtml(issue.description || '')}</div>
        ${
          issue.affectedSnippet
            ? `<div class="ic-snippet">Trigger: "${escapeHtml(issue.affectedSnippet)}"</div>`
            : ''
        }
      `;
      issuesGrid.appendChild(card);
    });
  }

  // 3. Prompt Comparison
  document.getElementById('original-prompt-display').textContent = originalPrompt;
  document.getElementById('refined-prompt-display').textContent = refinedPrompt;

  // Remediation List
  const remList = document.getElementById('remediation-list');
  remList.innerHTML = '';
  if (analysis.remediationSteps && analysis.remediationSteps.length > 0) {
    analysis.remediationSteps.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      remList.appendChild(li);
    });
  }

  // 4. Quality Metrics
  const orig = analysis.originalScores || { clarity: 30, specificity: 25, coherence: 35, overall: 30 };
  const ref  = analysis.refinedScores  || { clarity: 95, specificity: 94, coherence: 98, overall: 96 };

  renderMetric('clarity', orig.clarity, ref.clarity);
  renderMetric('specificity', orig.specificity, ref.specificity);
  renderMetric('coherence', orig.coherence, ref.coherence);
  renderMetric('overall', orig.overall, ref.overall);

  // 5. Model Outputs
  document.getElementById('baseline-response-text').textContent = baselineResponse;
  document.getElementById('refined-response-text').textContent = refinedResponse;
}

function renderMetric(key, origVal, refVal) {
  const origBar = document.getElementById(`bar-orig-${key}`);
  const refBar  = document.getElementById(`bar-ref-${key}`);
  const origNum = document.getElementById(`val-orig-${key}`);
  const refNum  = document.getElementById(`val-ref-${key}`);
  const deltaEl = document.getElementById(`delta-${key}`);

  if (origBar) origBar.style.width = `${Math.max(origVal, 8)}%`;
  if (refBar)  refBar.style.width  = `${Math.max(refVal, 8)}%`;
  if (origNum) origNum.textContent = origVal;
  if (refNum)  refNum.textContent  = refVal;

  if (deltaEl) {
    const diff = refVal - origVal;
    deltaEl.textContent = `+${diff}% Improvement`;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
