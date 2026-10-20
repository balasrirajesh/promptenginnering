// Experiment 11: Simple LCEL Chain Application Logic
// Student: Vyshnavi | Regulation: ACETR23

const PRESETS = {
  ai: "Artificial intelligence is transforming software development by helping developers write code, analyze data, automate repetitive tasks, and build intelligent applications. Modern AI systems can understand natural language and assist developers across many stages of the software development lifecycle.",
  cloud: "Cloud-native architectures leverage containerization, microservices, and dynamic orchestration to enable resilient, scalable, and independently deployable systems. Continuous integration and automated deployment pipelines significantly accelerate time-to-market while improving system fault tolerance.",
  quantum: "Quantum computing leverages the fundamental principles of quantum mechanics, including superposition and entanglement, to solve complex mathematical simulations and cryptographic problems that are intractable for conventional classical supercomputers."
};

function updateCounter() {
  const text = (document.getElementById('inputText').value || '').trim();
  const chars = text.length;
  const words = text ? text.split(/\s+/).length : 0;
  document.getElementById('wordCounter').innerText = `${words} words | ${chars} chars`;
  
  const snippetPreview = text.length > 50 ? text.substring(0, 50) + "..." : text;
  document.getElementById('inspectorCode').innerText = `Summarize this text in 2 concise sentences:\n\n"${snippetPreview}"`;
}

function loadPreset(key) {
  document.querySelectorAll('.btn-preset').forEach(btn => btn.classList.remove('active'));
  if (event && event.target) {
    event.target.classList.add('active');
  }
  document.getElementById('inputText').value = PRESETS[key] || '';
  updateCounter();
}

function resetInput() {
  document.getElementById('inputText').value = '';
  updateCounter();
}

function setPipelineStep(stepIndex) {
  const steps = ['stepInput', 'stepPrompt', 'stepModel', 'stepParser'];
  steps.forEach((s, idx) => {
    const el = document.getElementById(s);
    if (!el) return;
    el.classList.remove('active-step', 'complete-step');
    if (idx < stepIndex) {
      el.classList.add('complete-step');
    } else if (idx === stepIndex) {
      el.classList.add('active-step');
    }
  });
}

function resetPipeline() {
  const steps = ['stepInput', 'stepPrompt', 'stepModel', 'stepParser'];
  steps.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.remove('active-step', 'complete-step');
  });
}

async function handleRunChain() {
  const inputEl = document.getElementById('inputText');
  const text = (inputEl.value || '').trim();
  if (!text) {
    alert("Please enter input text to summarize.");
    inputEl.focus();
    return;
  }

  const runBtn = document.getElementById('runLcelBtn');
  const placeholder = document.getElementById('placeholderState');
  const outputContent = document.getElementById('outputContent');
  const summaryEl = document.getElementById('summaryText');
  const statusBanner = document.getElementById('statusBanner');
  const statusText = document.getElementById('pipelineStatusText');
  const metricStatus = document.getElementById('metricStatus');
  const metricLatency = document.getElementById('metricLatency');
  const metricCompression = document.getElementById('metricCompression');

  // Set running state
  runBtn.disabled = true;
  runBtn.style.opacity = '0.6';
  statusText.innerText = "Invoking LCEL Pipeline...";
  statusBanner.style.display = 'none';

  placeholder.style.display = 'flex';
  outputContent.style.display = 'none';
  placeholder.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.85rem;">
      <div style="width: 28px; height: 28px; border: 3px solid #cbd5e1; border-top-color: #0f172a; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
      <p style="color: #090d16; font-weight: 700; font-size: 0.85rem;">Executing PromptTemplate | ChatModel | StrOutputParser...</p>
    </div>
  `;

  // Animate pipeline stages
  setPipelineStep(0); // Input
  setTimeout(() => setPipelineStep(1), 250); // Prompt
  setTimeout(() => setPipelineStep(2), 500); // Model

  const t0 = performance.now();

  try {
    const res = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const data = await res.json();
    const elapsed = ((performance.now() - t0) / 1000).toFixed(2);

    if (data.error) {
      placeholder.style.display = 'block';
      placeholder.innerHTML = `<p style="color: #ef4444; font-weight: 700;">Error executing chain: ${data.error}</p>`;
      statusText.innerText = "Execution Failed";
      metricStatus.innerText = "FAILED";
      metricStatus.className = "metric-val";
      metricStatus.style.color = "#ef4444";
      resetPipeline();
      return;
    }

    setPipelineStep(3); // Parser
    setTimeout(() => {
      const steps = ['stepInput', 'stepPrompt', 'stepModel', 'stepParser'];
      steps.forEach(s => {
        const el = document.getElementById(s);
        if (el) {
          el.classList.remove('active-step');
          el.classList.add('complete-step');
        }
      });
      statusText.innerText = "Completed (PASS)";
    }, 200);

    // Calculate metrics
    const inputWords = text.split(/\s+/).length;
    const summaryWords = data.summary.trim().split(/\s+/).length;
    const reduction = Math.max(0, Math.round((1 - (summaryWords / inputWords)) * 100));

    // Render results
    placeholder.style.display = 'none';
    outputContent.style.display = 'block';
    summaryEl.innerText = data.summary;

    metricStatus.innerText = "SUCCESS";
    metricStatus.className = "metric-val text-success";
    metricLatency.innerText = `${elapsed}s`;
    metricLatency.className = "metric-val";
    metricCompression.innerText = `${reduction}%`;
    metricCompression.className = "metric-val";

    statusBanner.style.display = 'flex';

  } catch (err) {
    console.error("LCEL execution failed:", err);
    placeholder.style.display = 'block';
    placeholder.innerHTML = `<p style="color: #ef4444; font-weight: 700;">Failed to communicate with LCEL server.</p>`;
    statusText.innerText = "Network Error";
    resetPipeline();
  } finally {
    runBtn.disabled = false;
    runBtn.style.opacity = '1';
  }
}

async function copySummary() {
  const summaryEl = document.getElementById('summaryText');
  const copyBtnText = document.getElementById('copyBtnText');
  if (!summaryEl || !summaryEl.innerText.trim()) return;

  try {
    await navigator.clipboard.writeText(summaryEl.innerText.trim());
    copyBtnText.innerText = "Copied!";
    setTimeout(() => {
      copyBtnText.innerText = "Copy";
    }, 2000);
  } catch (e) {
    console.error("Clipboard copy failed:", e);
  }
}

// Inject spin keyframes if not defined
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', () => {
  updateCounter();

  // Autorun if requested via URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autorun') === 'true') {
    setTimeout(() => {
      handleRunChain();
    }, 600);
  }
});
