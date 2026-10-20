/* ================================================================
   Experiment 7: Constraint Specification & Iterative Refinement
   index.js – Interactive Client-Side Engine
   Theme: DarkGray (#A9A9A9) High-Contrast Lab Edition
================================================================ */

(function () {
  'use strict';

  if (window.__EXP7_INITIALIZED__) return;
  window.__EXP7_INITIALIZED__ = true;

  // Presets for Experiment 7
  const PRESETS = {
    ai: {
      title: "Artificial Intelligence & Deep Learning",
      text: `Artificial intelligence (AI) has emerged as one of the most transformative technologies of the twenty-first century. At its core, AI refers to computer systems designed to perform tasks that typically require human cognition, such as visual perception, natural language understanding, reasoning, and problem-solving. Within this broader discipline, machine learning represents a vital paradigm where algorithmic systems learn statistical representations directly from historical data rather than following hardcoded programmatic logic.

Furthermore, deep learning, powered by multi-layered artificial neural architectures, has enabled unprecedented breakthroughs across complex domains including natural language processing, computer vision, robotics, and autonomous systems. Today, practical applications of intelligent software span multiple industries, driving clinical diagnostic support in modern healthcare, automated algorithmic trading and risk modeling in financial services, adaptive personalized learning trajectories in higher education, and real-time navigation in self-driving vehicular systems.

Despite this immense technological progress, substantial challenges persist that require urgent interdisciplinary attention. Chief among these critical obstacles are algorithmic biases embedded within training datasets, lack of explainability in black-box deep neural networks, severe intellectual property and data privacy concerns, excessive computational energy consumption required to train frontier models, and the existential risk of automated socio-economic disruption.`
    },
    quantum: {
      title: "Quantum Computing Breakthroughs",
      text: `Quantum computing leverages the fundamental principles of quantum mechanics, specifically superposition and entanglement, to process complex information exponentially faster than classical supercomputers for specialized workloads. In classical computing, bits exist strictly as zeros or ones; however, quantum bits or qubits can inhabit multiple probabilistic linear combinations simultaneously.

Recent experimental breakthroughs have demonstrated verifiable quantum computational supremacy across random circuit sampling and molecular lattice simulations. Major technological applications include atomic-level drug discovery, cryptographic encryption vulnerability assessments, and molecular material science optimization. 

Nonetheless, daunting engineering challenges remain before scalable fault-tolerant quantum computers become commercially viable. These bottlenecks include extreme environmental decoherence caused by thermal noise, extraordinarily high error rates necessitating intricate surface code correction protocols, and the logistical hurdle of sustaining millikelvin cryogenic refrigeration infrastructure.`
    },
    energy: {
      title: "Renewable Energy Grid Transition",
      text: `The worldwide transition toward renewable energy is rapidly accelerating as nations deploy vast solar photovoltaic arrays, offshore wind turbines, and advanced hydroelectric generation to decarbonize electrical infrastructure. Renewable power sources now represent the lowest levelized cost of energy in most major industrial economies.

Modern applications of clean energy integrate smart grid sensors, utility-scale lithium-ion battery storage systems, and automated demand-response algorithms that coordinate distributed energy resources across urban communities.

However, grid operators confront persistent operational challenges. Primary among them are seasonal intermittency and sudden supply fluctuations, severe transmission congestion across aging long-distance transmission lines, raw material supply chain constraints for critical battery minerals like lithium and cobalt, and substantial geopolitical vulnerabilities surrounding clean technology hardware manufacturing.`
    }
  };

  let currentResults = [];

  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    const articleInput = document.getElementById('articleInput');
    const articleWordCount = document.getElementById('articleWordCount');
    const runBtn = document.getElementById('runBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const resultsSection = document.getElementById('resultsSection');
    const cardsGrid = document.getElementById('cardsGrid');
    const summaryTableBody = document.getElementById('summaryTableBody');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');

    function updateArticleCount() {
      if (!articleInput || !articleWordCount) return;
      const words = articleInput.value.trim().split(/\s+/).filter(Boolean);
      articleWordCount.textContent = `${words.length} words`;
    }

    if (articleInput && !articleInput.value.trim()) {
      articleInput.value = PRESETS.ai.text;
    }
    updateArticleCount();

    if (articleInput) {
      articleInput.addEventListener('input', updateArticleCount);
    }

    // Preset Selection
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = PRESETS[btn.dataset.preset];
        if (p && articleInput) {
          articleInput.value = p.text;
          updateArticleCount();
        }
      });
    });

    // Tab Filtering
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterCards(btn.dataset.tab);
      });
    });

    function filterCards(tabId) {
      const cards = document.querySelectorAll('.result-card');
      cards.forEach(card => {
        if (tabId === 'all' || card.dataset.id === tabId) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }

    if (runBtn) {
      runBtn.addEventListener('click', handleRunClick);
    }

    async function handleRunClick() {
      const article = articleInput ? articleInput.value.trim() : '';
      if (!article) {
        if (articleInput) articleInput.focus();
        return;
      }

      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="spinner-small"></span> <span>Running 3 Cycles...</span>';
      }
      if (statusIndicator) statusIndicator.classList.remove('hidden');

      try {
        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ article })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error occurred');

        currentResults = data.results;
        renderResults(data.results);
        renderTable(data.results);

        if (resultsSection) {
          resultsSection.classList.remove('hidden');
          resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err) {
        console.error('Experiment 7 error:', err);
        alert('Refinement execution error: ' + (err.message || 'Unknown error'));
      } finally {
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = '<span class="btn-icon">⚡</span> <span class="btn-text">Execute 3-Cycle Refinement</span>';
        }
        if (statusIndicator) statusIndicator.classList.add('hidden');
      }
    }

    function renderResults(results) {
      if (!cardsGrid) return;
      cardsGrid.innerHTML = '';

      results.forEach(item => {
        const card = document.createElement('div');
        card.className = `result-card card-cycle-${item.cycle}`;
        card.dataset.id = item.id;

        const a = item.analysis;
        const lengthBadge = a.lengthOk
          ? '<span class="pill-pass">✓ 80-100 Words</span>'
          : `<span class="pill-neutral">${a.wordCount} words</span>`;

        const bulletsBadge = a.bulletsOk
          ? '<span class="pill-pass">✓ Exactly 5 Bullets</span>'
          : a.bulletCount > 0
            ? `<span class="pill-warn">${a.bulletCount} Bullets</span>`
            : '<span class="pill-neutral">0 Bullets (Prose)</span>';

        const kwBadge = a.keywordsFound.length >= 5
          ? '<span class="pill-pass">✓ All 5 Keywords</span>'
          : `<span class="pill-neutral">${a.keywordsFound.length}/5 Keywords</span>`;

        card.innerHTML = `
          <div class="result-card-header">
            <div class="rch-left">
              <span class="cycle-badge badge-c${item.cycle}">${escapeHtml(item.badge)}</span>
              <h3 class="rch-title">${escapeHtml(item.title)}</h3>
            </div>
            <div class="rch-right">
              <span class="score-pill score-c${item.cycle}">${a.complianceScore}% Score</span>
            </div>
          </div>

          <!-- Prompt Box -->
          <div class="card-prompt-box">
            <div class="cpb-label">INJECTED PROMPT SPECIFICATION:</div>
            <div class="cpb-text">${escapeHtml(item.prompt)}</div>
          </div>

          <!-- Response Box -->
          <div class="card-response-box">
            <div class="crb-label">MODEL GENERATED OUTPUT:</div>
            <div class="crb-content">${formatMarkdown(item.response)}</div>
          </div>

          <!-- Metrics Strip -->
          <div class="card-metrics-strip">
            <div class="metric-pill">
              <span class="mp-label">Length:</span>
              ${lengthBadge}
            </div>
            <div class="metric-pill">
              <span class="mp-label">Structure:</span>
              ${bulletsBadge}
            </div>
            <div class="metric-pill">
              <span class="mp-label">Keywords:</span>
              ${kwBadge}
            </div>
          </div>
        `;

        cardsGrid.appendChild(card);
      });
    }

    function renderTable(results) {
      if (!summaryTableBody) return;
      summaryTableBody.innerHTML = '';

      results.forEach(item => {
        const tr = document.createElement('tr');
        const a = item.analysis;

        const lengthCell = a.lengthOk
          ? `<span class="tb-pass">${a.wordCount} words (Pass)</span>`
          : `<span class="tb-neutral">${a.wordCount} words</span>`;

        const bulletCell = a.bulletsOk
          ? `<span class="tb-pass">5 bullets (Pass)</span>`
          : a.bulletCount > 0
            ? `<span class="tb-warn">${a.bulletCount} bullets</span>`
            : `<span class="tb-neutral">None (Prose)</span>`;

        const kwCell = a.keywordsFound.length >= 5
          ? `<span class="tb-pass">5 / 5 (100%)</span>`
          : `<span class="tb-neutral">${a.keywordsFound.length} / 5</span>`;

        const assessmentText = item.cycle === 1
          ? '<span class="tb-neutral">Open prose, unstructured</span>'
          : item.cycle === 2
            ? '<span class="tb-warn">Length adhered, missing schema</span>'
            : '<span class="tb-pass">Full deterministic compliance</span>';

        tr.innerHTML = `
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td>${item.cycle === 1 ? 'Zero constraints' : item.cycle === 2 ? 'Length boundary + style' : '5 bullets + length + 5 keywords'}</td>
          <td>${lengthCell}</td>
          <td>${bulletCell}</td>
          <td>${kwCell}</td>
          <td><strong class="score-text score-c${item.cycle}">${a.complianceScore}%</strong></td>
          <td>${assessmentText}</td>
        `;
        summaryTableBody.appendChild(tr);
      });
    }

    function formatMarkdown(text) {
      let html = text
        .replace(/^### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^## (.*$)/gim, '<h3>$1</h3>')
        .replace(/^# (.*$)/gim, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>');

      const lines = html.split('\n');
      let output = '';
      let inList = false;

      for (let rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (/^(\d+\.|\-|\*|•)\s+/.test(line)) {
          if (!inList) {
            output += '<ul class="content-list">';
            inList = true;
          }
          const itemText = line.replace(/^(\d+\.|\-|\*|•)\s+/, '');
          output += `<li>${itemText}</li>`;
        } else {
          if (inList) {
            output += '</ul>';
            inList = false;
          }
          output += `<p>${line}</p>`;
        }
      }
      if (inList) output += '</ul>';
      return output;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }
})();
