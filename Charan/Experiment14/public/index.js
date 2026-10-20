// ==============================================================================
// EXPERIMENT 14: BUILDING A SIMPLE LLM AGENT (TOOL USE & REACT)
// Frontend Logic - index.js
// Student: Vyshnavi | Regulation: ACETR23
// ==============================================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text || '';
  return div.innerHTML;
}

function setQuery(text) {
  const input = document.getElementById('queryInput');
  if (input) {
    input.value = text;
  }
  document.querySelectorAll('.preset-btn').forEach(btn => {
    if (btn.innerText.includes(text.substring(0, 15)) || (text.includes('45') && btn.innerText.includes('Math'))) {
      btn.classList.add('active-preset');
    } else {
      btn.classList.remove('active-preset');
    }
  });
  handleRunAgent();
}

function initWelcomeCard() {
  const stream = document.getElementById('agentStream');
  if (!stream || stream.children.length > 0) return;

  const welcomeCard = document.createElement('div');
  welcomeCard.className = 'react-trace-card';
  welcomeCard.style.borderLeft = '5px solid #4338ca';
  welcomeCard.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
      <div>
        <div style="font-size: 0.75rem; font-weight: 800; color: #4338ca; letter-spacing: 0.05em; text-transform: uppercase;">
          Autonomous ReAct Agent Initialized
        </div>
        <h3 style="margin-top: 0.25rem; font-size: 1.15rem; font-weight: 800; color: #090d16;">
          Tool Use & Reasoning Loop Inspector
        </h3>
      </div>
      <div style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.65rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; border: 1px solid #c7d2fe;">
        Student: Vyshnavi • ACETR23
      </div>
    </div>
    <p style="color: #475569; font-size: 0.875rem; margin-top: 0.5rem; line-height: 1.5;">
      This agent inspects user queries, reasons whether external tools are needed, invokes either 
      <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700; color:#0f172a;">calculator</code> or 
      <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-weight:700; color:#0f172a;">unit_converter</code>, 
      or relies on direct parametric knowledge.
    </p>
    <div style="display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;">
      <span style="font-size: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #334155;">
        🧠 Thought: Multi-step inference
      </span>
      <span style="font-size: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #334155;">
        ⚡ Action: Tool dispatch
      </span>
      <span style="font-size: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #334155;">
        📊 Observation: Structured feedback
      </span>
      <span style="font-size: 0.75rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-weight: 600; color: #334155;">
        🏆 Final Answer: Verified synthesis
      </span>
    </div>
  `;
  stream.appendChild(welcomeCard);
}

async function handleRunAgent() {
  const input = document.getElementById('queryInput');
  const query = (input ? input.value : '').trim() || "What is (45 * 18) / 3 + 250?";
  if (input) input.value = query;

  const stream = document.getElementById('agentStream');
  if (!stream) return;

  // 1. User Message Row
  const userRow = document.createElement('div');
  userRow.className = 'user-msg-row';
  userRow.innerHTML = `
    <div class="user-bubble">
      <span style="opacity: 0.8; font-size: 0.75rem; font-weight: 700; display: block; margin-bottom: 2px;">USER QUERY</span>
      <strong>${escapeHtml(query)}</strong>
    </div>
  `;
  stream.appendChild(userRow);

  // 2. Loading State Card
  const loadingId = 'loader-' + Date.now();
  const loadingCard = document.createElement('div');
  loadingCard.id = loadingId;
  loadingCard.className = 'react-trace-card';
  loadingCard.style.borderLeft = '5px solid #d97706';
  loadingCard.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.75rem; color:#090d16; font-size:0.9rem; font-weight:700;">
      <span style="font-size:1.3rem; animation: spin 1.5s linear infinite; display: inline-block;">⚙️</span>
      <span>Agent reasoning: evaluating query, consulting tool registry, and formulating action...</span>
    </div>
  `;
  stream.appendChild(loadingCard);
  loadingCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const btn = document.getElementById('runAgentBtn');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.7';
  }

  try {
    const res = await fetch('/api/run-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await res.json();
    const loader = document.getElementById(loadingId);
    if (loader) loader.remove();

    if (data.error) {
      const errCard = document.createElement('div');
      errCard.className = 'react-trace-card';
      errCard.style.borderLeft = '5px solid #ef4444';
      errCard.innerHTML = `
        <div style="color:#ef4444; font-weight:800; font-size:0.85rem; text-transform:uppercase;">Execution Error</div>
        <p style="color:#b91c1c; font-weight:600; margin-top:0.35rem;">${escapeHtml(data.error)}</p>
      `;
      stream.appendChild(errCard);
      errCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    // 3. Render Complete ReAct Trace
    const traceRow = document.createElement('div');
    traceRow.className = 'react-trace-card';

    let actionHtml = '';
    if (data.toolUsed) {
      actionHtml = `
        <div class="step-card action">
          <div class="step-title">⚡ Action Invocation</div>
          <div class="step-content">
            Agent invoked tool: <span class="code-pill">${escapeHtml(data.action)}</span><br/>
            Input parameter: <span class="code-pill">${escapeHtml(data.actionInput)}</span>
          </div>
        </div>

        <div class="step-card observation">
          <div class="step-title">📊 Tool Observation</div>
          <div class="step-content">
            Result returned by tool execution: <span class="code-pill">${escapeHtml(data.observation)}</span>
          </div>
        </div>
      `;
    }

    const decisionBadgeColor = data.toolUsed ? '#d97706' : '#0284c7';

    traceRow.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem; border-bottom:1px solid #e2e8f0; padding-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
        <div style="font-size:0.8rem; font-weight:800; color:#475569; letter-spacing:0.04em;">
          AGENT DECISION: <span style="color:${decisionBadgeColor}; background:#f8fafc; padding:3px 8px; border-radius:6px; border:1px solid #cbd5e1;">${escapeHtml(data.decision)}</span>
        </div>
        <div style="font-size:0.75rem; font-weight:700; color:#64748b;">
          Tool Invoked: <strong>${data.toolUsed ? escapeHtml(data.action) : 'None (Direct Answer)'}</strong>
        </div>
      </div>

      <div class="step-card thought">
        <div class="step-title">🧠 Agent Reasoning (Thought)</div>
        <div class="step-content">${escapeHtml(data.thought)}</div>
      </div>

      ${actionHtml}

      <div class="step-card final">
        <div class="step-title">🏆 Final Verified Answer</div>
        <div class="step-content" style="font-size:0.95rem;"><strong>${escapeHtml(data.finalAnswer)}</strong></div>
      </div>
    `;

    stream.appendChild(traceRow);
    traceRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  } catch (err) {
    console.error("Experiment 14 agent loop failure:", err);
    const loader = document.getElementById(loadingId);
    if (loader) loader.remove();

    const errCard = document.createElement('div');
    errCard.className = 'react-trace-card';
    errCard.style.borderLeft = '5px solid #ef4444';
    errCard.innerHTML = `
      <div style="color:#ef4444; font-weight:800; font-size:0.85rem; text-transform:uppercase;">Network Error</div>
      <p style="color:#b91c1c; font-weight:600; margin-top:0.35rem;">Could not connect to agent backend on port 3013. Ensure server is active.</p>
    `;
    stream.appendChild(errCard);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

// Keyboard shortcut (Ctrl+Enter or Cmd+Enter to execute)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    const input = document.getElementById('queryInput');
    if (document.activeElement === input) {
      handleRunAgent();
    }
  }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initWelcomeCard();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autorun') === 'true') {
    setTimeout(() => {
      handleRunAgent();
    }, 600);
  }
});

// Export to window scope
window.setQuery = setQuery;
window.handleRunAgent = handleRunAgent;
