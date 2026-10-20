/* ================================================================
   Experiment 6: Role-Based & Negative Prompting
   app.js / index.js – Client-Side Interactive Engine
   Theme: DarkGray (#A9A9A9) High-Contrast Lab Edition
================================================================ */

(function () {
  'use strict';

  if (window.__EXP6_INITIALIZED__) return;
  window.__EXP6_INITIALIZED__ = true;

  // Presets for Experiment 6
  const PRESETS = {
    investing: {
      topic: "how to start investing with a modest monthly salary",
      persona: "You are a licensed senior financial advisor with 15 years in personal wealth management. Adopt an encouraging, professional, and authoritative advisory tone.",
      negative: "- Do NOT mention any brand names, banking apps, or brokerage platforms.\n- Do NOT include promotional slogans, affiliate links, or advertisements.\n- Focus purely on universal, objective financial principles."
    },
    retirement: {
      topic: "planning for early retirement in your 20s or 30s",
      persona: "You are a certified financial planner specializing in FIRE (Financial Independence, Retire Early). Speak with realistic, pragmatic, and highly structured guidance.",
      negative: "- Do NOT mention specific commercial funds (e.g. Vanguard, Schwab, BlackRock).\n- Do NOT promote any paid financial newsletters or subscription courses.\n- Avoid speculative crypto assets."
    },
    debt: {
      topic: "strategies to eliminate high-interest student loans quickly",
      persona: "You are an empathetic debt-counselor and financial education specialist. Use clear, motivating, and actionable advice.",
      negative: "- Do NOT promote loan refinancing lenders or private credit companies.\n- Do NOT recommend bankruptcy or risky credit repair schemes."
    },
    emergency: {
      topic: "building a 6-month emergency reserve from zero",
      persona: "You are a veteran family financial coach. Maintain a reassuring, supportive, and methodical tone.",
      negative: "- Do NOT name specific high-yield savings account banks.\n- Do NOT mention credit cards as emergency solutions.\n- Avoid any affiliate financial services."
    }
  };

  let currentResults = [];

  document.addEventListener('DOMContentLoaded', initApp);

  function initApp() {
    const topicInput = document.getElementById('topicInput');
    const personaInput = document.getElementById('personaInput');
    const negativeInput = document.getElementById('negativeInput');
    const runBtn = document.getElementById('runBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const resultsSection = document.getElementById('resultsSection');
    const cardsGrid = document.getElementById('cardsGrid');
    const summaryTableBody = document.getElementById('summaryTableBody');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const tabButtons = document.querySelectorAll('.tab-btn');

    // Preset Selection
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        presetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const p = PRESETS[btn.dataset.preset];
        if (p) {
          if (topicInput) topicInput.value = p.topic;
          if (personaInput) personaInput.value = p.persona;
          if (negativeInput) negativeInput.value = p.negative;
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
      const topic = topicInput ? topicInput.value.trim() : '';
      const persona = personaInput ? personaInput.value.trim() : '';
      const negativeRules = negativeInput ? negativeInput.value.trim() : '';

      if (!topic) {
        if (topicInput) topicInput.focus();
        return;
      }

      if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span class="spinner-small"></span> <span>Running Evaluation...</span>';
      }
      if (statusIndicator) statusIndicator.classList.remove('hidden');

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, persona, negativeRules })
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
        console.error('Experiment 6 error:', err);
        alert('Generation error: ' + (err.message || 'Unknown error'));
      } finally {
        if (runBtn) {
          runBtn.disabled = false;
          runBtn.innerHTML = '<span class="btn-icon">⚡</span> <span class="btn-text">Run 4-Way Comparison</span>';
        }
        if (statusIndicator) statusIndicator.classList.add('hidden');
      }
    }

    function renderResults(results) {
      if (!cardsGrid) return;
      cardsGrid.innerHTML = '';

      results.forEach(item => {
        const card = document.createElement('div');
        card.className = `result-card card-${item.id}`;
        card.dataset.id = item.id;

        const isNegativeMode = item.isNegative;
        const compliant = item.analysis.negativeCompliant;
        const violations = item.analysis.violations || [];

        const complianceHtml = isNegativeMode
          ? compliant
            ? '<span class="status-pill status-pass">🛡️ 100% Brand-Free</span>'
            : `<span class="status-pill status-fail">⚠️ Violations: ${violations.join(', ')}</span>`
          : '<span class="status-pill status-neutral">ℹ️ Unrestricted</span>';

        card.innerHTML = `
          <div class="result-card-header">
            <div class="rch-left">
              <span class="mode-badge badge-${item.id}">${escapeHtml(item.badge)}</span>
              <h3 class="rch-title">${escapeHtml(item.title)}</h3>
            </div>
            <div class="rch-meta">
              <span class="model-pill">gemini-1.5-flash</span>
            </div>
          </div>

          <!-- Prompt Box -->
          <div class="card-prompt-box">
            <div class="cpb-label">DISPATCHED PROMPT:</div>
            <div class="cpb-text">${escapeHtml(item.prompt)}</div>
          </div>

          <!-- Response Box -->
          <div class="card-response-box">
            <div class="crb-label">MODEL GENERATED RESPONSE:</div>
            <div class="crb-content">${formatMarkdown(item.response)}</div>
          </div>

          <!-- Metrics Strip -->
          <div class="card-metrics-strip">
            <div class="metric-pill">
              <span class="mp-label">Words:</span>
              <span class="mp-val">${item.analysis.wordCount}</span>
            </div>
            <div class="metric-pill">
              <span class="mp-label">Tips:</span>
              <span class="mp-val">${item.analysis.tipCount}</span>
            </div>
            <div class="metric-pill">
              <span class="mp-label">Advisory Score:</span>
              <span class="mp-val mp-score">${item.analysis.personaScore}%</span>
            </div>
            <div class="metric-pill">
              <span class="mp-label">Suppression:</span>
              ${complianceHtml}
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
        const isNegativeMode = item.isNegative;
        const compliant = item.analysis.negativeCompliant;

        let compBadge = '<span class="tb-neutral">N/A</span>';
        if (isNegativeMode) {
          compBadge = compliant 
            ? '<span class="tb-pass">PASS (Zero Brands)</span>'
            : '<span class="tb-fail">FAIL (Violations)</span>';
        }

        const roleText = item.id === 'role_based' || item.id === 'combined'
          ? '<span class="tb-active">Active (Advisor)</span>'
          : '<span class="tb-inactive">None (Standard)</span>';

        const negText = isNegativeMode
          ? '<span class="tb-active">Enforced</span>'
          : '<span class="tb-inactive">Disabled</span>';

        tr.innerHTML = `
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td>${roleText}</td>
          <td>${negText}</td>
          <td>${item.analysis.wordCount} words</td>
          <td>${item.analysis.tipCount} tips</td>
          <td><strong>${item.analysis.personaScore}%</strong></td>
          <td>${compBadge}</td>
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

        if (/^(\d+\.|\-|\*)\s+/.test(line)) {
          if (!inList) {
            output += '<ul class="content-list">';
            inList = true;
          }
          const itemText = line.replace(/^(\d+\.|\-|\*)\s+/, '');
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
