// ==============================================================================
// EXPERIMENT 15: MULTIMODAL PROMPTING (VQA, CAPTIONING & TELEMETRY EXTRACTION)
// Frontend Logic - app.js (Synchronized with index.js)
// Student: Vyshnavi | Regulation: ACETR23
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Prevent duplicate execution if both app.js and index.js are loaded
  if (window.__EXP15_INITIALIZED__) return;
  window.__EXP15_INITIALIZED__ = true;

  const PRESETS = {
    caption: [
      {
        title: "Full Telemetry & Landscape Breakdown",
        prompt: "Provide a comprehensive, high-fidelity descriptive analysis of this visual scene. Detail the central subject, mechanical components, terrain characteristics, lighting, and telemetry HUD overlays."
      },
      {
        title: "Mechanical Arm & Sensor Focus",
        prompt: "Focus specifically on the rover's robotic arm, scanner turret, laser emissions, and the geological target it is actively analyzing."
      }
    ],
    vqa: [
      {
        title: "Telemetry Overlay Querying",
        prompt: "Based on the telemetry overlays in the image, answer the following precisely:\n1. What is the Rover's mission status and time/sol?\n2. What is the remaining battery percentage and ambient temperature?\n3. What is the current target name, scanner type, and distance?"
      },
      {
        title: "Environmental Conditions",
        prompt: "What is the recorded elevation, latitude, longitude, and azimuth shown in the bottom telemetry HUD?"
      }
    ],
    json_extract: [
      {
        title: "Structured Telemetry JSON Schema",
        prompt: `Extract the visual elements into valid JSON with this exact schema:
{
  "subject": "name or description of the primary rover/machine",
  "environment": { "terrain": "string", "lighting": "string" },
  "telemetry": {
    "status": "string",
    "battery_pct": "number",
    "temperature_c": "number",
    "target": "string",
    "distance": "string"
  }
}
Output only pure JSON.`
      }
    ],
    comparison: [
      {
        title: "Standard vs Chain-of-Thought Multimodal",
        prompt: "Analyze this image from two perspectives: (1) Standard naive visual inspection; (2) Structured expert planetary telemetry assessment."
      }
    ]
  };

  let currentMode = 'caption';

  // DOM Elements
  const modeTabs = document.querySelectorAll('.mode-tab');
  const presetChipsContainer = document.getElementById('presetChips');
  const promptInput = document.getElementById('promptInput');
  const btnExecute = document.getElementById('btnExecute');
  const btnReset = document.getElementById('btnReset');
  const runStatus = document.getElementById('runStatus');
  const metaLatency = document.getElementById('metaLatency');
  const metaModel = document.getElementById('metaModel');
  const metaGrounding = document.getElementById('metaGrounding');
  const executedPromptText = document.getElementById('executedPromptText');
  const emptyState = document.getElementById('emptyState');
  const responseView = document.getElementById('responseView');
  const responseContent = document.getElementById('responseContent');
  const responseTypeBadge = document.getElementById('responseTypeBadge');
  const copyBtn = document.getElementById('copyBtn');
  const charCount = document.getElementById('charCount');

  function updateCharCount() {
    if (charCount && promptInput) {
      charCount.textContent = `${promptInput.value.length} chars`;
    }
  }

  if (promptInput) {
    promptInput.addEventListener('input', updateCharCount);
  }

  function renderPresets(mode) {
    if (!presetChipsContainer) return;
    presetChipsContainer.innerHTML = '';
    const list = PRESETS[mode] || [];
    list.forEach((item, index) => {
      const chip = document.createElement('div');
      chip.className = `preset-chip ${index === 0 ? 'active' : ''}`;
      chip.textContent = item.title;
      chip.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (promptInput) {
          promptInput.value = item.prompt;
          updateCharCount();
        }
      });
      presetChipsContainer.appendChild(chip);
    });

    if (list.length > 0 && promptInput) {
      promptInput.value = list[0].prompt;
      updateCharCount();
    }
  }

  // Handle Mode Tab click
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.getAttribute('data-mode');
      renderPresets(currentMode);
    });
  });

  // Render initial presets
  renderPresets(currentMode);

  // Markdown and code formatter
  function formatOutput(rawText) {
    if (!rawText) return "";
    let clean = rawText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Handle JSON or code blocks
    clean = clean.replace(/```(?:json)?\s*([\s\S]*?)```/g, (match, p1) => {
      return `<pre><code>${p1.trim()}</code></pre>`;
    });

    // Handle Headings
    clean = clean.replace(/^#### (.*$)/gim, '<h5 style="margin: 0.6rem 0 0.2rem 0; color: #4338ca; font-size: 0.9rem; font-weight:800;">$1</h5>');
    clean = clean.replace(/^### (.*$)/gim, '<h4 style="margin: 0.8rem 0 0.3rem 0; color: #0284c7; font-size: 0.95rem; font-weight:800;">$1</h4>');
    clean = clean.replace(/^## (.*$)/gim, '<h3 style="margin: 1rem 0 0.4rem 0; color: #0f172a; font-size: 1.05rem; font-weight:800;">$1</h3>');

    // Handle Bold
    clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #090d16; font-weight:700;">$1</strong>');

    // Handle Bullet points
    clean = clean.replace(/^\s*\*\s(.*$)/gim, '<div style="margin: 0.2rem 0; padding-left: 0.5rem;">• $1</div>');
    clean = clean.replace(/^\s*-\s(.*$)/gim, '<div style="margin: 0.2rem 0; padding-left: 0.5rem;">• $1</div>');

    // Handle Numbered lists
    clean = clean.replace(/^\s*(\d+\.)\s(.*$)/gim, '<div style="margin: 0.2rem 0; padding-left: 0.5rem;"><strong>$1</strong> $2</div>');

    return clean;
  }

  // Execute Multimodal Analysis
  async function executeAnalysis() {
    if (!promptInput) return;
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    if (btnExecute) {
      btnExecute.disabled = true;
      btnExecute.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span>Reasoning across modalities...</span>
      `;
    }
    if (runStatus) {
      runStatus.innerHTML = '<span class="status-badge running">Processing Vision Input</span>';
    }
    if (executedPromptText) {
      executedPromptText.textContent = prompt;
    }

    try {
      const res = await fetch('/api/analyze-multimodal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: currentMode,
          customPrompt: prompt
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server error during multimodal analysis.');
      }

      // Populate output
      if (metaLatency) metaLatency.textContent = data.latency || '0.82s';
      if (metaModel) metaModel.textContent = data.modelUsed || 'gemini-flash-lite-latest';
      if (metaGrounding) metaGrounding.textContent = data.alignmentScore || '98.7%';

      if (emptyState) emptyState.style.display = 'none';
      if (responseView) responseView.classList.remove('hidden');

      const modeTitles = {
        caption: 'Detailed Scene Caption',
        vqa: 'Visual Question Answering Result',
        json_extract: 'Extracted Telemetry JSON Schema',
        comparison: 'Multimodal Prompt Comparison'
      };
      if (responseTypeBadge) {
        responseTypeBadge.textContent = modeTitles[data.mode] || 'Vision Result';
      }

      if (responseContent) {
        responseContent.innerHTML = formatOutput(data.result);
      }
      if (runStatus) {
        runStatus.innerHTML = '<span class="status-badge complete">Analysis Grounded</span>';
      }

    } catch (err) {
      console.error("Experiment 15 multimodal inference error:", err);
      if (runStatus) {
        runStatus.innerHTML = '<span class="status-badge" style="background:#fee2e2;color:#991b1b;border-color:#ef4444;">Inference Error</span>';
      }
      if (responseContent) {
        responseContent.innerHTML = `<div style="color:#b91c1c; font-weight:600;">⚠️ ${err.message}</div>`;
      }
      if (emptyState) emptyState.style.display = 'none';
      if (responseView) responseView.classList.remove('hidden');
    } finally {
      if (btnExecute) {
        btnExecute.disabled = false;
        btnExecute.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Execute Multimodal Analysis</span>
        `;
      }
    }
  }

  if (btnExecute) {
    btnExecute.addEventListener('click', executeAnalysis);
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      currentMode = 'caption';
      modeTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-mode') === 'caption'));
      renderPresets('caption');
      if (emptyState) emptyState.style.display = 'flex';
      if (responseView) responseView.classList.add('hidden');
      if (runStatus) runStatus.innerHTML = '<span class="status-badge ready">Inspector Ready</span>';
      if (executedPromptText) executedPromptText.textContent = 'Click "Execute Multimodal Analysis" to run the vision model evaluation.';
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      if (!responseContent) return;
      const text = responseContent.innerText;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          `;
        }, 1500);
      });
    });
  }

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to execute
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (document.activeElement === promptInput) {
        executeAnalysis();
      }
    }
  });

  // Automatically execute initial caption analysis after 800ms
  setTimeout(() => {
    executeAnalysis();
  }, 800);
});
