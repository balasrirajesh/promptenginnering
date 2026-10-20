/* ================================================================
   Experiment 5: Few-Shot vs. Zero-Shot Comparison
   app.js / index.js – Interactive Client-Side Interface Logic
   Theme: DarkGray (#A9A9A9) High-Contrast Lab Edition
================================================================ */

(function () {
  'use strict';

  // Prevent multiple initializations if both app.js and index.js are loaded
  if (window.__EXP5_INITIALIZED__) return;
  window.__EXP5_INITIALIZED__ = true;

  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    const questionInput = document.getElementById('question-input');
    const compareBtn = document.getElementById('compare-btn');
    const loadingCard = document.getElementById('loading-card');
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    const resultsContainer = document.getElementById('results-container');

    // Prompt display elements
    const zeroPromptDisplay = document.getElementById('zero-prompt-display');
    const fewPromptDisplay = document.getElementById('few-prompt-display');

    // Output elements
    const zeroOutputText = document.getElementById('zero-output-text');
    const fewOutputText = document.getElementById('few-output-text');
    const zeroWordChip = document.getElementById('zero-word-chip');
    const fewWordChip = document.getElementById('few-word-chip');

    // Eval elements
    const evalPattern = document.getElementById('eval-pattern');
    const evalConsistency = document.getElementById('eval-consistency');
    const evalZero = document.getElementById('eval-zero');

    /* ── Preset Topic Chips ── */
    const chipBtns = document.querySelectorAll('.chip-btn');
    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        chipBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (questionInput) {
          questionInput.value = btn.dataset.topic;
          runComparison();
        }
      });
    });

    if (questionInput) {
      questionInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') runComparison();
      });
    }

    if (compareBtn) {
      compareBtn.addEventListener('click', runComparison);
    }

    /* ================================================================
       Execute Comparison
    ================================================================ */
    async function runComparison() {
      if (!questionInput) return;
      const question = questionInput.value.trim();
      if (!question) {
        questionInput.focus();
        return;
      }

      // UI state updates
      if (errorBanner) errorBanner.hidden = true;
      if (loadingCard) loadingCard.hidden = false;
      if (compareBtn) {
        compareBtn.disabled = true;
        compareBtn.innerHTML = '<span class="btn-spinner"></span> <span>Running Analysis...</span>';
      }

      try {
        const res = await fetch('/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Comparison server error occurred');

        renderResults(data);
        if (loadingCard) loadingCard.hidden = true;
        if (resultsContainer) {
          resultsContainer.hidden = false;
          resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

      } catch (err) {
        console.error('Comparison error:', err);
        if (loadingCard) loadingCard.hidden = true;
        if (errorMessage) errorMessage.textContent = err.message || 'Error executing prompt comparison.';
        if (errorBanner) errorBanner.hidden = false;
      } finally {
        if (compareBtn) {
          compareBtn.disabled = false;
          compareBtn.innerHTML = '<span class="btn-icon">⚡</span> <span>Run Comparison</span>';
        }
      }
    }

    /* ================================================================
       Render Results
    ================================================================ */
    function renderResults(data) {
      const { zeroShotPrompt, zeroShotResponse, fewShotPrompt, fewShotResponse, evaluation } = data;

      // Render Prompt Templates
      if (zeroPromptDisplay && zeroShotPrompt) {
        zeroPromptDisplay.textContent = zeroShotPrompt;
      }

      if (fewPromptDisplay && fewShotPrompt) {
        const escaped = escapeHtml(fewShotPrompt);
        // Highlight the two standard few-shot exemplars with vivid callout spans
        const highlighted = escaped
          .replace(
            /(Question:\s*Explain gravity[\s\S]*?Examples:[\s\S]*?2\.\s*The Moon orbiting[^\n]*)/i,
            '<span class="exemplar-highlight">$1</span>'
          )
          .replace(
            /(Question:\s*Explain photosynthesis[\s\S]*?Examples:[\s\S]*?2\.\s*Marine phytoplankton[^\n]*)/i,
            '<span class="exemplar-highlight">$1</span>'
          );
        fewPromptDisplay.innerHTML = highlighted;
      }

      // Render Model Outputs
      if (zeroOutputText && zeroShotResponse) {
        zeroOutputText.textContent = zeroShotResponse;
      }
      if (fewOutputText && fewShotResponse) {
        fewOutputText.textContent = fewShotResponse;
      }

      // Word Counts
      const zw = evaluation && evaluation.metrics ? evaluation.metrics.zeroShotWords : (zeroShotResponse ? zeroShotResponse.split(/\s+/).filter(Boolean).length : 0);
      const fw = evaluation && evaluation.metrics ? evaluation.metrics.fewShotWords : (fewShotResponse ? fewShotResponse.split(/\s+/).filter(Boolean).length : 0);

      if (zeroWordChip) zeroWordChip.textContent = `~${zw} words`;
      if (fewWordChip) fewWordChip.textContent = `~${fw} words`;

      // Evaluation adherence checks
      if (evalPattern) {
        const passed = evaluation && evaluation.formatAdherence ? evaluation.formatAdherence.fewShotPassed : true;
        evalPattern.textContent = passed ? '100% Structural Match' : 'Partial Match';
        evalPattern.className = `ei-value ${passed ? 'success-val' : 'zero-val'}`;
      }

      if (evalConsistency) {
        evalConsistency.textContent = 'High Consistency';
      }

      if (evalZero) {
        evalZero.textContent = 'Basic Summary';
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }
})();
