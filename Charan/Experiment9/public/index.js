/* ================================================================
   Experiment 9: JSON/YAML Generation & Auto-Refinement
   index.js – Interactive Client-Side Engine
   Theme: DarkGray (#A9A9A9) High-Contrast Lab Edition
================================================================ */

(function () {
  'use strict';

  if (window.__EXP9_INITIALIZED__) return;
  window.__EXP9_INITIALIZED__ = true;

  const PRESETS = {
    languages: {
      title: "Languages (JSON)",
      prompt: `Generate information about three programming languages and return the result as valid JSON format with fields for name, creator, and year.`
    },
    books: {
      title: "Books (YAML)",
      prompt: `Provide a collection of three classic books with title, author, and publication year formatted strictly as valid YAML.`
    },
    cloud: {
      title: "Microservices (JSON)",
      prompt: `Generate an architecture specification for three cloud microservices (Auth, Payment, Notification) as valid JSON with fields for service_name, port, and protocol.`
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
    const presetButtons = document.querySelectorAll('.preset-btn');

    // Default initialization
    if (promptInput && !promptInput.value.trim()) {
      promptInput.value = PRESETS.languages.prompt;
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
        const isYaml = /yaml/i.test(prompt) && !/json/i.test(prompt);
        const taskType = isYaml ? 'yaml' : 'json';

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, task_type: taskType })
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
          runValidationBtn.innerHTML = '<span class="btn-icon">⚡</span> <span class="btn-text">Run Syntax Validation</span>';
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

      const lang = data.format || 'json';
      const highlightedCode = lang === 'json' ? syntaxHighlightJSON(data.code) : escapeHtml(data.code);

      const isPass = data.success;
      const statusClass = isPass ? 'v-pass' : 'v-warn';
      const bannerIcon = isPass ? '✔' : '⚠️';
      const statusText = data.status || `${lang.toUpperCase()} Syntax Validated Successfully!`;

      const refinedTag = data.was_refined 
        ? '<span class="pill-refined">Refined in Loop 2</span>'
        : '<span class="pill-direct">Single-Shot Pass</span>';

      aiRow.innerHTML = `
        <div class="ai-card">
          <div class="ai-card-header">
            <div class="ach-title">
              <span class="ach-badge">${lang.toUpperCase()} OUTPUT</span>
              <span>Gemini 1.5 Flash AST Verified</span>
            </div>
            <div class="ach-actions">
              ${refinedTag}
              <button class="btn-copy-code" onclick="copyCodeBlock(this)">Copy ${lang.toUpperCase()}</button>
            </div>
          </div>

          <div class="code-container">
            <pre class="code-content"><code>${highlightedCode}</code></pre>
          </div>

          <div class="verification-strip">
            <span class="v-pill ${statusClass}">${bannerIcon} ${escapeHtml(statusText)}</span>
            <span class="v-pill v-neutral">Parser: ${lang === 'json' ? 'JSON.parse AST' : 'js-yaml 4.1'}</span>
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

    function syntaxHighlightJSON(jsonStr) {
      try {
        const obj = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        const formatted = JSON.stringify(obj, null, 2);
        return formatted
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
              if (/:$/.test(match)) {
                cls = 'json-key';
              } else {
                cls = 'json-string';
              }
            } else if (/true|false/.test(match)) {
              cls = 'json-boolean';
            } else if (/null/.test(match)) {
              cls = 'json-null';
            }
            return `<span class="${cls}">${match}</span>`;
          });
      } catch (e) {
        return escapeHtml(jsonStr);
      }
    }

    function escapeHtml(text) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // Auto-run first test on initial load
    setTimeout(() => {
      handleRunValidation();
    }, 500);
  }

  window.copyCodeBlock = function (btn) {
    const card = btn.closest('.ai-card');
    if (!card) return;
    const codeEl = card.querySelector('code');
    if (!codeEl) return;
    navigator.clipboard.writeText(codeEl.innerText).then(() => {
      const originalText = btn.textContent;
      btn.textContent = '✓ Copied!';
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    });
  };
})();
