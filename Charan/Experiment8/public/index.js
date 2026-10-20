/* ================================================================
   Experiment 8: Structured Format Prompting
   index.js – Interactive Client-Side Engine
   Theme: DarkGray (#A9A9A9) High-Contrast Lab Edition
================================================================ */

(function () {
  'use strict';

  if (window.__EXP8_INITIALIZED__) return;
  window.__EXP8_INITIALIZED__ = true;

  const PRESETS = {
    exercise: {
      title: "Daily Exercise",
      prompt: `List three benefits of daily exercise in a Markdown table with columns "Benefit" and "Description." Also include a bulleted list of 3 tips to get started.`
    },
    testing: {
      title: "Software Testing",
      prompt: `Compare Unit Testing, Integration Testing, and End-to-End Testing in a Markdown table with columns "Benefit" and "Description." Also include a bulleted list of 3 tips to get started.`
    },
    cloud: {
      title: "Cloud Databases",
      prompt: `Compare Relational Databases, Document Stores, and Key-Value Caches in a Markdown table with columns "Benefit" and "Description." Also include a bulleted list of 3 tips to get started.`
    }
  };

  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    const promptInput = document.getElementById('promptInput');
    const runValidationBtn = document.getElementById('runValidationBtn');
    const referencePromptText = document.getElementById('referencePromptText');
    const usePromptBtn = document.getElementById('usePromptBtn');
    const copyPromptBtn = document.getElementById('copyPromptBtn');
    const chatStream = document.getElementById('chatStream');
    const modeCards = document.querySelectorAll('.mode-card');
    const presetButtons = document.querySelectorAll('.preset-btn');

    // Default initialization
    if (promptInput && !promptInput.value.trim()) {
      promptInput.value = PRESETS.exercise.prompt;
    }

    // Preset Selection
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = PRESETS[btn.dataset.schema];
        if (p && promptInput) {
          promptInput.value = p.prompt;
          if (referencePromptText) referencePromptText.textContent = p.prompt;
        }
      });
    });

    // Reference Actions
    if (usePromptBtn) {
      usePromptBtn.addEventListener('click', () => {
        if (referencePromptText && promptInput) {
          promptInput.value = referencePromptText.textContent.trim();
          promptInput.focus();
        }
      });
    }

    if (copyPromptBtn) {
      copyPromptBtn.addEventListener('click', () => {
        if (referencePromptText) {
          navigator.clipboard.writeText(referencePromptText.textContent.trim()).then(() => {
            const originalText = copyPromptBtn.textContent;
            copyPromptBtn.textContent = '✓ Copied';
            setTimeout(() => {
              copyPromptBtn.textContent = originalText;
            }, 1500);
          });
        }
      });
    }

    // Mode Selector
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });

    if (runValidationBtn) {
      runValidationBtn.addEventListener('click', handleRunValidation);
    }

    if (promptInput) {
      promptInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleRunValidation();
        }
      });
    }

    async function handleRunValidation() {
      const prompt = promptInput ? promptInput.value.trim() : '';
      if (!prompt) {
        if (promptInput) promptInput.focus();
        return;
      }

      if (runValidationBtn) {
        runValidationBtn.disabled = true;
        runValidationBtn.innerHTML = '<span class="spinner-small"></span> <span>Validating Schema...</span>';
      }

      // Append User Prompt Bubble
      appendUserMessage(prompt);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, task_type: 'structured' })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error occurred');

        // Append AI Structured Response Card
        appendAIMessage(data);
      } catch (err) {
        appendErrorMessage(err.message || 'Validation error');
      } finally {
        if (runValidationBtn) {
          runValidationBtn.disabled = false;
          runValidationBtn.innerHTML = '<span class="btn-icon">⚡</span> <span class="btn-text">Run Validation Test</span>';
        }
      }
    }

    function appendUserMessage(text) {
      if (!chatStream) return;
      const userRow = document.createElement('div');
      userRow.className = 'user-msg-row';
      userRow.innerHTML = `
        <div class="user-bubble">
          <span class="ub-tag">PROMPT SPECIFICATION:</span>
          <p>${escapeHtml(text)}</p>
        </div>
      `;
      chatStream.appendChild(userRow);
      userRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function appendAIMessage(data) {
      if (!chatStream) return;
      const aiRow = document.createElement('div');
      aiRow.className = 'ai-msg-row';

      const a = data.analysis || {};
      const tableCheck = a.tableValid 
        ? `<span class="v-pill v-pass">✓ Table Verified (${a.rowCount} rows, ${a.tableColumns.length} cols)</span>`
        : `<span class="v-pill v-warn">⚠️ Incomplete Table</span>`;

      const bulletCheck = a.bulletsValid
        ? `<span class="v-pill v-pass">✓ List Verified (${a.bulletCount} bullets)</span>`
        : `<span class="v-pill v-warn">⚠️ ${a.bulletCount} bullets</span>`;

      const scoreClass = a.complianceScore >= 80 ? 'v-score-high' : 'v-score-mid';

      aiRow.innerHTML = `
        <div class="ai-card">
          <div class="ai-card-header">
            <div class="ach-title">
              <span class="ach-badge">STRUCTURED OUTPUT</span>
              <span>Gemini 1.5 Flash Verified</span>
            </div>
            <span class="v-score ${scoreClass}">${a.complianceScore || 100}% Compliance</span>
          </div>

          <div class="ai-content-body">
            ${data.html}
          </div>

          <div class="verification-strip">
            ${tableCheck}
            ${bulletCheck}
            <span class="v-pill v-neutral">Markdown GFM AST Parsed</span>
          </div>
        </div>
      `;

      chatStream.appendChild(aiRow);
      aiRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function appendErrorMessage(msg) {
      if (!chatStream) return;
      const errDiv = document.createElement('div');
      errDiv.className = 'ai-msg-row';
      errDiv.innerHTML = `
        <div class="ai-card error-card">
          <p><strong>Error:</strong> ${escapeHtml(msg)}</p>
        </div>
      `;
      chatStream.appendChild(errDiv);
    }

    function escapeHtml(text) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Auto-run first test on initial load so user sees validated output
    setTimeout(() => {
      handleRunValidation();
    }, 500);
  }
})();
