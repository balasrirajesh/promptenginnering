document.addEventListener('DOMContentLoaded', () => {
  let currentMode = 'timeline';
  let activePayload = { base64: null, mimeType: null, isVideo: false };

  const modeTabs = document.querySelectorAll('.mode-tab');
  const btnAnalyze = document.getElementById('btnAnalyze');
  const videoStatus = document.getElementById('videoStatus');
  const modelUsed = document.getElementById('modelUsed');
  const infLatency = document.getElementById('infLatency');
  const taskHeader = document.getElementById('taskHeader');
  const reasoningBox = document.getElementById('reasoningBox');

  const videoFrame = document.getElementById('videoFrame');
  const videoPlayer = document.getElementById('videoPlayer');
  const hudTime = document.getElementById('hudTime');
  const hudTarget = document.getElementById('hudTarget');
  const viewportDrop = document.getElementById('viewportDrop');
  const btnUploadVideo = document.getElementById('btnUploadVideo');
  const btnResetVideo = document.getElementById('btnResetVideo');
  const btnCopyReasoning = document.getElementById('btnCopyReasoning');
  const videoFileInput = document.getElementById('videoFileInput');
  const queryGroup = document.getElementById('queryGroup');
  const customQueryInput = document.getElementById('customQueryInput');
  const kfThumbs = document.querySelectorAll('.kf-thumb img');
  const kfTimes = document.querySelectorAll('.kf-time');

  const TASK_DESCRIPTIONS = {
    timeline: "Chronological temporal event extraction across the video sequence.",
    vqa: "Spatiotemporal Visual Question Answering focusing on vehicle dynamics and scene physics.",
    dynamics: "Kinematic velocity estimation, surface interaction tracking, and environmental modeling."
  };

  // Upload Handlers
  if (btnUploadVideo) {
    btnUploadVideo.addEventListener('click', () => videoFileInput.click());
  }

  if (viewportDrop) {
    viewportDrop.addEventListener('click', (e) => {
      // If clicking on video controls, don't trigger file chooser
      if (e.target.tagName.toLowerCase() === 'video') return;
      videoFileInput.click();
    });

    viewportDrop.addEventListener('dragover', (e) => {
      e.preventDefault();
      viewportDrop.style.outline = '2px dashed #e11d48';
      viewportDrop.style.boxShadow = '0 0 16px rgba(225, 29, 72, 0.25)';
    });

    viewportDrop.addEventListener('dragleave', () => {
      viewportDrop.style.outline = '';
      viewportDrop.style.boxShadow = '';
    });

    viewportDrop.addEventListener('drop', (e) => {
      e.preventDefault();
      viewportDrop.style.outline = '';
      viewportDrop.style.boxShadow = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleUploadedFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (videoFileInput) {
    videoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleUploadedFile(e.target.files[0]);
      }
    });
  }

  // Reset Video Handler
  if (btnResetVideo) {
    btnResetVideo.addEventListener('click', () => {
      activePayload = { base64: null, mimeType: null, isVideo: false };
      if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
        videoPlayer.style.display = 'none';
      }
      if (videoFrame) {
        videoFrame.style.display = 'block';
        videoFrame.src = 'video_frame.jpg';
      }
      if (hudTime) hudTime.textContent = 'REC [●] 00:14:28 / 00:25:00';
      if (hudTarget) hudTarget.textContent = 'TRACKING: ARES-I (CLICK/DROP VIDEO)';
      kfThumbs.forEach(img => img.src = 'video_frame.jpg');
      const defaultTimes = ['00:04', '00:09', '00:14', '00:20'];
      kfTimes.forEach((t, i) => {
        if (defaultTimes[i]) t.textContent = defaultTimes[i];
      });
      document.querySelectorAll('.keyframe-card').forEach(c => c.classList.remove('active-live'));
      const defaultLiveCard = document.querySelector('.keyframe-card[data-time="14"]');
      if (defaultLiveCard) defaultLiveCard.classList.add('active-live');
      runVideoAnalysis();
    });
  }

  // Copy Reasoning Handler
  if (btnCopyReasoning && reasoningBox) {
    btnCopyReasoning.addEventListener('click', () => {
      const text = reasoningBox.innerText || reasoningBox.textContent;
      navigator.clipboard.writeText(text).then(() => {
        const origHtml = btnCopyReasoning.innerHTML;
        btnCopyReasoning.innerHTML = `<span>Copied! ✓</span>`;
        btnCopyReasoning.style.borderColor = '#059669';
        btnCopyReasoning.style.color = '#065f46';
        setTimeout(() => {
          btnCopyReasoning.innerHTML = origHtml;
          btnCopyReasoning.style.borderColor = '';
          btnCopyReasoning.style.color = '';
        }, 1800);
      }).catch(err => console.warn("Clipboard copy failed:", err));
    });
  }

  // Interactive Keyframe Card Clicks
  document.querySelectorAll('.keyframe-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.keyframe-card').forEach(c => c.classList.remove('active-live'));
      card.classList.add('active-live');
      const timeSec = parseFloat(card.getAttribute('data-time') || '0');
      if (activePayload.isVideo && videoPlayer) {
        videoPlayer.currentTime = timeSec;
      }
      if (hudTime) {
        hudTime.textContent = `REC [●] ${formatTimeSeconds(timeSec)} / 00:25:00`;
      }
    });
  });

  function formatTimeSeconds(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleUploadedFile(file) {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      alert("Please upload a video file (.mp4, .webm, .mov) or image frame.");
      return;
    }

    if (isVideo) {
      // Setup HTML5 Video Player
      const videoBlobUrl = URL.createObjectURL(file);
      videoPlayer.src = videoBlobUrl;
      videoPlayer.style.display = 'block';
      videoFrame.style.display = 'none';
      videoPlayer.play().catch(() => {});

      hudTarget.textContent = `VIDEO: ${file.name.toUpperCase().slice(0, 22)}`;

      // Sample keyframes from video duration
      videoPlayer.onloadedmetadata = () => {
        const dur = videoPlayer.duration || 10;
        hudTime.textContent = `REC [●] 00:00 / ${formatTimeSeconds(dur)}`;

        const samplePoints = [dur * 0.1, dur * 0.35, dur * 0.65, dur * 0.9];
        samplePoints.forEach((t, i) => {
          if (kfTimes[i]) kfTimes[i].textContent = formatTimeSeconds(t);
        });

        // Capture primary keyframe from 30% mark for analysis
        captureKeyframeAt(videoPlayer, dur * 0.3, (capturedB64) => {
          activePayload = {
            base64: capturedB64,
            mimeType: 'image/jpeg',
            isVideo: true,
            fileName: file.name
          };
          kfThumbs.forEach(img => img.src = capturedB64);
          runVideoAnalysis();
        });
      };

      // Also read file into base64 if small enough for full video transmission
      if (file.size < 20 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = (e) => {
          activePayload.fullVideoBase64 = e.target.result;
          activePayload.mimeType = file.type || 'video/mp4';
        };
        reader.readAsDataURL(file);
      }
    } else {
      // Process static keyframe image
      videoPlayer.pause();
      videoPlayer.style.display = 'none';
      videoFrame.style.display = 'block';

      const reader = new FileReader();
      reader.onload = (e) => {
        const b64 = e.target.result;
        videoFrame.src = b64;
        hudTarget.textContent = `FRAME: ${file.name.toUpperCase().slice(0, 22)}`;
        kfThumbs.forEach(img => img.src = b64);
        activePayload = {
          base64: b64,
          mimeType: file.type || 'image/jpeg',
          isVideo: false,
          fileName: file.name
        };
        runVideoAnalysis();
      };
      reader.readAsDataURL(file);
    }
  }

  function captureKeyframeAt(videoElem, targetSec, callback) {
    const offscreenVideo = document.createElement('video');
    offscreenVideo.src = videoElem.src;
    offscreenVideo.muted = true;
    offscreenVideo.currentTime = targetSec;
    offscreenVideo.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = offscreenVideo.videoWidth || 640;
      canvas.height = offscreenVideo.videoHeight || 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(offscreenVideo, 0, 0, canvas.width, canvas.height);
      const b64 = canvas.toDataURL('image/jpeg', 0.85);
      callback(b64);
    };
  }

  // Mode Tabs
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentMode = tab.getAttribute('data-mode');
      taskHeader.textContent = TASK_DESCRIPTIONS[currentMode] || "";

      if (currentMode === 'vqa') {
        queryGroup.style.display = 'block';
      } else {
        queryGroup.style.display = 'none';
      }

      runVideoAnalysis();
    });
  });

  function formatOutput(text) {
    if (!text) return "";
    let clean = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code / json blocks
    clean = clean.replace(/```(?:json)?\s*([\s\S]*?)```/g, (m, p1) => `<pre style="background:#f1f5f9;padding:0.75rem;border-radius:6px;font-family:var(--font-mono);color:#be123c;border:1px solid #e2e8f0;overflow-x:auto;margin:0.5rem 0;"><code>${p1.trim()}</code></pre>`);
    clean = clean.replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;border:1px solid #e2e8f0;padding:0.15rem 0.4rem;border-radius:4px;font-family:var(--font-mono);font-size:0.82rem;color:#be123c;">$1</code>');
    
    // Timestamp badges e.g. [00:00 - 00:08] or • [00:08]
    clean = clean.replace(/\[(\d{2}:\d{2}(?:\s*-\s*\d{2}:\d{2})?)\]/g, '<span style="display:inline-block;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;padding:0.1rem 0.45rem;border-radius:4px;font-family:var(--font-mono);font-size:0.78rem;font-weight:700;margin-right:0.25rem;">⏱️ $1</span>');

    // Bold text
    clean = clean.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>');
    
    // Headers
    clean = clean.replace(/^#### (.*$)/gim, '<h4 style="margin: 0.6rem 0 0.3rem 0; color: #be123c; font-weight: 700; font-size: 0.95rem;">$1</h4>');
    clean = clean.replace(/^### (.*$)/gim, '<h3 style="margin: 0.75rem 0 0.35rem 0; color: #0f172a; font-weight: 800; font-size: 1.05rem; border-bottom: 1.5px solid #fecdd3; padding-bottom: 0.35rem;">$1</h3>');
    clean = clean.replace(/^## (.*$)/gim, '<h2 style="margin: 0.85rem 0 0.45rem 0; color: #be123c; font-weight: 800; font-size: 1.15rem;">$1</h2>');
    clean = clean.replace(/^# (.*$)/gim, '<h2 style="margin: 0.95rem 0 0.5rem 0; color: #be123c; font-weight: 800; font-size: 1.25rem;">$1</h2>');
    
    // Bullet points
    clean = clean.replace(/^\s*[\*\-]\s(.*$)/gim, '<div style="margin: 0.35rem 0 0.35rem 0.5rem; color: #334155; display: flex; align-items: flex-start; gap: 0.5rem;"><span style="color: #e11d48; font-weight: 800; font-size: 1.05rem; line-height: 1.2;">•</span><span>$1</span></div>');
    
    // Paragraph breaks
    clean = clean.replace(/\n\n/g, '<div style="height: 0.65rem;"></div>');
    clean = clean.replace(/\n/g, '<br>');

    return clean;
  }

  async function runVideoAnalysis() {
    if (btnAnalyze) {
      btnAnalyze.disabled = true;
      btnAnalyze.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <span>Computing Space-Time Attention...</span>
      `;
    }
    if (videoStatus) {
      videoStatus.className = 'status-badge running';
      videoStatus.textContent = 'Computing Attention';
    }

    // Show progress indicator
    if (reasoningBox) {
      reasoningBox.innerHTML = `
        <div style="padding: 2.5rem 0; display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: #be123c; font-weight: 700;">
          <span class="indicator-dot pulse" style="background:#e11d48; width: 10px; height: 10px; box-shadow: 0 0 10px #e11d48;"></span>
          <span>Spatiotemporal transformer is computing divided space-time attention across video tokens...</span>
        </div>
      `;
    }

    try {
      const payload = { mode: currentMode };
      if (currentMode === 'vqa' && customQueryInput && customQueryInput.value.trim()) {
        payload.customQuery = customQueryInput.value.trim();
      }

      // If full video base64 is available and supported, send it; otherwise send sampled frame base64
      if (activePayload.fullVideoBase64) {
        payload.customImageBase64 = activePayload.fullVideoBase64;
      } else if (activePayload.base64) {
        payload.customImageBase64 = activePayload.base64;
      }

      const res = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Video analysis failed");

      if (modelUsed) modelUsed.textContent = data.modelUsed;
      if (infLatency) infLatency.textContent = data.latency;
      if (reasoningBox) reasoningBox.innerHTML = formatOutput(data.analysis);

      if (videoStatus) {
        videoStatus.className = 'status-badge complete';
        videoStatus.textContent = 'Transformer Grounded';
      }
    } catch (err) {
      console.error("Video transformer analysis error:", err);
      if (videoStatus) {
        videoStatus.className = 'status-badge';
        videoStatus.textContent = 'Notice';
      }
      if (reasoningBox) {
        reasoningBox.innerHTML = `
          <div style="color: #b91c1c; background: #fef2f2; border: 1.5px solid #fecaca; border-radius: 8px; padding: 1.25rem;">
            <strong style="color: #991b1b; display: block; margin-bottom: 0.35rem; font-size: 0.95rem;">Video Transformer Notice:</strong>
            <span>${err.message || "Failed to analyze video."}</span>
          </div>
        `;
      }
    } finally {
      if (btnAnalyze) {
        btnAnalyze.disabled = false;
        btnAnalyze.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Run Spatiotemporal Analysis</span>
        `;
      }
    }
  }

  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', runVideoAnalysis);
  }

  if (customQueryInput) {
    customQueryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        runVideoAnalysis();
      }
    });
  }

  // Initial trigger
  runVideoAnalysis();
});
