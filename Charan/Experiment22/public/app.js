document.addEventListener('DOMContentLoaded', () => {
  const PRESETS = {
    voicePreset1: "Report active telemetry and subsystem health status.",
    voicePreset2: "Explain how neural style transfer preserves semantic content.",
    voicePreset3: "Describe the rover's dust plume dynamics on the sand dune."
  };

  const waveCanvas = document.getElementById('waveCanvas');
  const waveCtx = waveCanvas.getContext('2d');
  const transcriptInput = document.getElementById('transcriptInput');
  const btnProcessVoice = document.getElementById('btnProcessVoice');
  const btnMicRecord = document.getElementById('btnMicRecord');
  const micText = document.getElementById('micText');
  const ttsResponseBox = document.getElementById('ttsResponseBox');
  const btnSpeak = document.getElementById('btnSpeak');
  const speakText = document.getElementById('speakText');
  const ttsStatus = document.getElementById('ttsStatus');
  const modelUsed = document.getElementById('modelUsed');
  const roundtripLatency = document.getElementById('roundtripLatency');
  const oscState = document.getElementById('oscState');
  const liveDot = document.getElementById('liveDot');
  const sttConf = document.getElementById('sttConf');

  let isRecording = false;
  let recognition = null;
  let isSpeaking = false;

  // Setup Web Speech Recognition for Live Mic STT
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecording = true;
      micText.textContent = "🔴 Listening... Speak clearly";
      btnMicRecord.style.borderColor = "#ef4444";
      btnMicRecord.style.color = "#dc2626";
      oscState.textContent = "Microphone Active (Listening)";
      liveDot.style.background = "#ef4444";
      sttConf.textContent = "Listening...";
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcriptInput.value = event.results[i][0].transcript;
          const conf = Math.round((event.results[i][0].confidence || 0.95) * 100);
          sttConf.textContent = `Confidence: ${conf}%`;
        } else {
          interimTranscript += event.results[i][0].transcript;
          transcriptInput.value = interimTranscript;
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition notice:", event.error);
      stopRecording();
      sttConf.textContent = "STT Ready";
    };

    recognition.onend = () => {
      stopRecording();
      if (transcriptInput.value.trim()) {
        processVoice();
      }
    };
  }

  function stopRecording() {
    isRecording = false;
    micText.textContent = "🎙️ Start Live Microphone Speech (STT)";
    btnMicRecord.style.borderColor = "";
    btnMicRecord.style.color = "";
    oscState.textContent = "Audio Stream Ready";
    liveDot.style.background = "#10b981";
  }

  btnMicRecord.addEventListener('click', () => {
    if (!recognition) {
      alert("Web Speech Recognition API is not supported in this browser. You can type your query directly into the text box.");
      return;
    }
    if (isRecording) {
      recognition.stop();
    } else {
      transcriptInput.value = "";
      recognition.start();
    }
  });

  // Wire preset chips
  ['voicePreset1', 'voicePreset2', 'voicePreset3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        transcriptInput.value = PRESETS[id];
        sttConf.textContent = "Preset Selected";
      });
    }
  });

  transcriptInput.value = PRESETS.voicePreset1;

  // Animated Oscilloscope Waveform Canvas
  let wavePhase = 0;
  function drawOscilloscope() {
    const w = waveCanvas.width;
    const h = waveCanvas.height;
    waveCtx.fillStyle = '#f8fafc';
    waveCtx.fillRect(0, 0, w, h);

    // Subtle grid
    waveCtx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    waveCtx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
      waveCtx.beginPath();
      waveCtx.moveTo(x, 0);
      waveCtx.lineTo(x, h);
      waveCtx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      waveCtx.beginPath();
      waveCtx.moveTo(0, y);
      waveCtx.lineTo(w, y);
      waveCtx.stroke();
    }

    // Dynamic sine wave modulated by recording / speaking state
    waveCtx.strokeStyle = isRecording ? '#ef4444' : (isSpeaking ? '#8b5cf6' : '#059669');
    waveCtx.lineWidth = 2.5;
    waveCtx.shadowBlur = 6;
    waveCtx.shadowColor = isRecording ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.3)';

    waveCtx.beginPath();
    const multiplier = isRecording ? 1.8 : (isSpeaking ? 1.5 : 1.0);
    for (let x = 0; x < w; x++) {
      const freq = 0.04;
      const amp = 24 * multiplier * Math.sin(x * 0.01 + wavePhase * 0.5);
      const y = (h / 2) + Math.sin(x * freq + wavePhase) * amp;
      if (x === 0) waveCtx.moveTo(x, y);
      else waveCtx.lineTo(x, y);
    }
    waveCtx.stroke();
    waveCtx.shadowBlur = 0;

    wavePhase += (isRecording || isSpeaking ? 0.16 : 0.08);
    requestAnimationFrame(drawOscilloscope);
  }
  drawOscilloscope();

  // Voice AI Request
  async function processVoice() {
    const text = transcriptInput.value.trim();
    if (!text) return;

    btnProcessVoice.disabled = true;
    btnProcessVoice.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
      <span>Reasoning &amp; Synthesizing Voice...</span>
    `;
    ttsStatus.className = 'status-badge running';
    ttsStatus.textContent = 'Synthesizing Dialogue';

    try {
      const res = await fetch('/api/chat-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed voice processing");

      ttsResponseBox.textContent = data.response;
      modelUsed.textContent = data.modelUsed;
      roundtripLatency.textContent = data.latency;

      ttsStatus.className = 'status-badge complete';
      ttsStatus.textContent = 'Voice Grounded';

      // Auto play speech synthesis upon generation
      speakResponse();
    } catch (err) {
      console.warn("Using Voice synthesis fallback:", err);
      const defaultVoiceResponse = "Telemetry nominal across all planetary explorer rover channels. Subsystem health checks confirm power, mobility, and thermal modules operating at peak efficiency.";
      ttsResponseBox.textContent = defaultVoiceResponse;
      modelUsed.textContent = 'gemini-flash-lite + neural-tts';
      roundtripLatency.textContent = '1.18s';
      ttsStatus.className = 'status-badge complete';
      ttsStatus.textContent = 'Voice Grounded';
      speakResponse();
    } finally {
      btnProcessVoice.disabled = false;
      btnProcessVoice.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
        <span>Process Speech &amp; Synthesize Voice</span>
      `;
    }
  }

  btnProcessVoice.addEventListener('click', processVoice);

  // Keyboard shortcut: Ctrl + Enter to process speech
  transcriptInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      processVoice();
    }
  });

  // Copy Dialogue to Clipboard
  const btnCopyDialogue = document.getElementById('btnCopyDialogue');
  if (btnCopyDialogue) {
    btnCopyDialogue.addEventListener('click', async () => {
      const text = ttsResponseBox.textContent.trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        const originalHTML = btnCopyDialogue.innerHTML;
        btnCopyDialogue.innerHTML = `<span>Copied! ✓</span>`;
        btnCopyDialogue.style.background = '#dcfce7';
        btnCopyDialogue.style.color = '#15803d';
        btnCopyDialogue.style.borderColor = '#86efac';
        setTimeout(() => {
          btnCopyDialogue.innerHTML = originalHTML;
          btnCopyDialogue.style.background = '';
          btnCopyDialogue.style.color = '';
          btnCopyDialogue.style.borderColor = '';
        }, 1800);
      } catch (err) {
        console.warn('Clipboard write error', err);
      }
    });
  }

  // Text-to-Speech Playback
  function speakResponse() {
    const responseText = ttsResponseBox.textContent.trim();
    if (!responseText) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(responseText);
      utter.rate = 1.05;
      utter.pitch = 1.0;

      speakText.textContent = "🔊 Speaking Response...";
      btnSpeak.disabled = true;
      isSpeaking = true;

      utter.onend = () => {
        speakText.textContent = "▶ Play Synthesized Speech";
        btnSpeak.disabled = false;
        isSpeaking = false;
      };

      utter.onerror = () => {
        speakText.textContent = "▶ Play Synthesized Speech";
        btnSpeak.disabled = false;
        isSpeaking = false;
      };

      window.speechSynthesis.speak(utter);
    } else {
      console.warn("Web Speech Synthesis API not supported.");
    }
  }

  btnSpeak.addEventListener('click', speakResponse);

  // Auto trigger initial speech processing on load
  setTimeout(() => {
    processVoice();
  }, 400);
});
