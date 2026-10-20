// ==============================================================================
// EXPERIMENT 19: VISUAL QUESTION ANSWERING WITH OLLAMA LLAVA
// Frontend Logic - app.js (Synchronized with index.js)
// Student: Vyshnavi | Regulation: ACETR23
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Prevent duplicate execution if both app.js and index.js are loaded
  if (window.__EXP19_INITIALIZED__) return;
  window.__EXP19_INITIALIZED__ = true;

  const PRESET_QUERIES = {
    chip1: "What is the primary robotic entity in the image, and what action is it currently performing with its mechanical arm?",
    chip2: "What is the mission status, battery percentage, ambient temperature, and active target specified in the HUD overlay?",
    chip3: "Describe the terrain geology, the mountain range in the background, and the atmospheric lighting of the scene.",
    chip4: "Provide a comprehensive visual analysis including robotic subsystems, geology, atmospheric conditions, and heads-up telemetry."
  };

  const questionInput = document.getElementById('questionInput');
  const btnAskLlava = document.getElementById('btnAskLlava');
  const llavaStatus = document.getElementById('llavaStatus');
  const metaEngine = document.getElementById('metaEngine');
  const metaLatency = document.getElementById('metaLatency');
  const metaTokens = document.getElementById('metaTokens');
  const executedQuestion = document.getElementById('executedQuestion');
  const answerBox = document.getElementById('answerBox');
  const btnCopyAnswer = document.getElementById('btnCopyAnswer');

  const vqaImage = document.getElementById('vqaImage');
  const imageBadge = document.getElementById('imageBadge');
  const imageTagText = document.getElementById('imageTagText');
  const btnUploadImage = document.getElementById('btnUploadImage');
  const btnResetImage = document.getElementById('btnResetImage');
  const imageUploadInput = document.getElementById('imageUploadInput');
  const imageCardDrop = document.getElementById('imageCardDrop');

  let customImageBase64 = null;

  // Handle custom image uploads
  if (btnUploadImage && imageUploadInput) {
    btnUploadImage.addEventListener('click', (e) => {
      e.stopPropagation();
      imageUploadInput.click();
    });
  }

  if (imageCardDrop && imageUploadInput) {
    imageCardDrop.addEventListener('click', () => imageUploadInput.click());

    imageCardDrop.addEventListener('dragover', (e) => {
      e.preventDefault();
      imageCardDrop.style.borderColor = '#0f172a';
      imageCardDrop.style.boxShadow = '0 0 0 3px rgba(15, 23, 42, 0.2)';
    });

    imageCardDrop.addEventListener('dragleave', () => {
      imageCardDrop.style.borderColor = '';
      imageCardDrop.style.boxShadow = '';
    });

    imageCardDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      imageCardDrop.style.borderColor = '';
      imageCardDrop.style.boxShadow = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    imageUploadInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });
  }

  // Reset to default sample image
  if (btnResetImage) {
    btnResetImage.addEventListener('click', () => {
      customImageBase64 = null;
      if (vqaImage) vqaImage.src = 'sample_image.jpg';
      if (imageBadge) imageBadge.textContent = 'sample_image.jpg';
      if (imageTagText) imageTagText.textContent = 'AURA-7 Rover Telemetry Sol 512 (Click/Drop to Change)';
      setActiveChip('chip1');
      if (questionInput) questionInput.value = PRESET_QUERIES.chip1;
      askLlava();
    });
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      customImageBase64 = e.target.result;
      if (vqaImage) vqaImage.src = customImageBase64;
      if (imageBadge) imageBadge.textContent = file.name.slice(0, 16);
      if (imageTagText) imageTagText.textContent = `User Input: ${file.name}`;
      
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      if (questionInput) {
        questionInput.value = "Describe everything visible in this image in detail.";
      }
      askLlava();
    };
    reader.readAsDataURL(file);
  }

  function setActiveChip(chipId) {
    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
    const target = document.getElementById(chipId);
    if (target) target.classList.add('active');
  }

  // Handle preset chips
  ['chip1', 'chip2', 'chip3', 'chip4'].forEach(id => {
    const chip = document.getElementById(id);
    if (chip) {
      chip.addEventListener('click', () => {
        setActiveChip(id);
        if (questionInput) {
          questionInput.value = PRESET_QUERIES[id];
          askLlava();
        }
      });
    }
  });

  if (questionInput) {
    questionInput.value = PRESET_QUERIES.chip1;
  }

  // Copy Answer
  if (btnCopyAnswer && answerBox) {
    btnCopyAnswer.addEventListener('click', () => {
      const text = answerBox.innerText || answerBox.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const origHtml = btnCopyAnswer.innerHTML;
        btnCopyAnswer.innerHTML = `<span>Copied! ✓</span>`;
        btnCopyAnswer.style.borderColor = '#059669';
        btnCopyAnswer.style.color = '#065f46';
        setTimeout(() => {
          btnCopyAnswer.innerHTML = origHtml;
          btnCopyAnswer.style.borderColor = '';
          btnCopyAnswer.style.color = '';
        }, 1800);
      }).catch(err => {
        console.warn("Clipboard copy failed:", err);
      });
    });
  }

  function formatAnswer(text) {
    if (!text) return "";
    let clean = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Markdown formatting for high-contrast readability
    clean = clean.replace(/```([\s\S]*?)```/g, '<pre style="background:#f1f5f9;border:1px solid #cbd5e1;padding:0.75rem;border-radius:6px;font-family:var(--font-mono);font-size:0.8rem;overflow-x:auto;margin:0.5rem 0;"><code>$1</code></pre>');
    clean = clean.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;border:1px solid #e2e8f0;padding:0.15rem 0.4rem;border-radius:4px;font-family:var(--font-mono);font-size:0.82rem;color:#c2410c;">$1</code>');
    clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>');
    clean = clean.replace(/^#### (.*$)/gim, '<h4 style="margin: 0.5rem 0 0.3rem 0; color: #ea580c; font-weight: 700; font-size: 0.95rem;">$1</h4>');
    clean = clean.replace(/^### (.*$)/gim, '<h3 style="margin: 0.6rem 0 0.35rem 0; color: #0f172a; font-weight: 800; font-size: 1.05rem; border-bottom: 1.5px solid #fed7aa; padding-bottom: 0.35rem;">$1</h3>');
    clean = clean.replace(/^## (.*$)/gim, '<h2 style="margin: 0.75rem 0 0.45rem 0; color: #c2410c; font-weight: 800; font-size: 1.15rem;">$1</h2>');
    clean = clean.replace(/^# (.*$)/gim, '<h2 style="margin: 0.85rem 0 0.5rem 0; color: #c2410c; font-weight: 800; font-size: 1.25rem;">$1</h2>');
    clean = clean.replace(/^\s*[\*\-]\s(.*$)/gim, '<div style="margin: 0.35rem 0 0.35rem 0.5rem; color: #334155; display: flex; align-items: flex-start; gap: 0.5rem;"><span style="color: #ea580c; font-weight: 800; font-size: 1.05rem; line-height: 1.2;">•</span><span>$1</span></div>');
    clean = clean.replace(/\n\n/g, '<div style="height: 0.65rem;"></div>');
    clean = clean.replace(/\n/g, '<br>');

    return clean;
  }

  async function askLlava() {
    if (!questionInput) return;
    const q = questionInput.value.trim();
    if (!q) return;

    if (btnAskLlava) {
      btnAskLlava.disabled = true;
      btnAskLlava.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span>Analyzing Visual Features...</span>
      `;
    }
    if (llavaStatus) {
      llavaStatus.className = 'status-badge running';
      llavaStatus.textContent = 'Processing Query';
    }
    if (executedQuestion) {
      executedQuestion.textContent = q;
    }

    if (answerBox) {
      answerBox.innerHTML = `
        <div style="padding: 2.5rem 0; display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #c2410c; font-weight: 700;">
          <span class="indicator-dot pulse" style="background:#ea580c; width: 10px; height: 10px; box-shadow: 0 0 10px #ea580c;"></span>
          <span>LLaVA is cross-modally inspecting image pixels and projecting visual tokens...</span>
        </div>
      `;
    }

    try {
      const payload = { question: q };
      if (customImageBase64) {
        payload.imageBase64 = customImageBase64;
      }

      const res = await fetch('/api/ask-llava', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "LLaVA query failed");
      }

      if (metaEngine) metaEngine.textContent = data.modelUsed;
      if (metaLatency) metaLatency.textContent = data.latency;
      if (metaTokens) metaTokens.textContent = data.tokens;

      if (answerBox) {
        answerBox.innerHTML = formatAnswer(data.answer);
      }
      if (llavaStatus) {
        llavaStatus.className = 'status-badge complete';
        llavaStatus.textContent = 'VQA Complete';
      }
    } catch (err) {
      console.error("VQA Query Error:", err);
      if (llavaStatus) {
        llavaStatus.className = 'status-badge error';
        llavaStatus.textContent = 'Notice';
      }
      if (answerBox) {
        answerBox.innerHTML = `
          <div style="color: #991b1b; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 8px; padding: 1.25rem;">
            <strong style="display: block; margin-bottom: 0.35rem; font-size: 0.95rem;">Visual Reasoning Engine Response:</strong>
            <span>${err.message || "Failed to process visual query. Please try again."}</span>
          </div>
        `;
      }
    } finally {
      if (btnAskLlava) {
        btnAskLlava.disabled = false;
        btnAskLlava.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Query LLaVA Vision Model</span>
        `;
      }
    }
  }

  if (btnAskLlava) {
    btnAskLlava.addEventListener('click', askLlava);
  }

  if (questionInput) {
    questionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        askLlava();
      }
    });
  }

  // Initial benchmark VQA execution
  askLlava();
});
