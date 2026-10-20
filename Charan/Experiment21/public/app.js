document.addEventListener('DOMContentLoaded', () => {
  let activeGenre = 'synthwave';
  let activeTempo = 120;
  let musicData = null;
  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let isPlaying = false;
  let playbackTimer = null;
  let currentStep = 0;

  // Track Mixer State
  const trackVols = { piano: 85, guitar: 90, drums: 90 };
  const trackMutes = { piano: false, guitar: false, drums: false };
  const trackSolos = { piano: false, guitar: false, drums: false };

  // DOM Elements
  const canvas = document.getElementById('pianoRollCanvas');
  const ctx = canvas.getContext('2d');
  const btnPlay = document.getElementById('btnPlay');
  const playText = document.getElementById('playText');
  const playIcon = document.getElementById('playIcon');
  const btnGenerate = document.getElementById('btnGenerate');
  const sliderTempo = document.getElementById('sliderTempo');
  const valTempo = document.getElementById('valTempo');
  const genLoss = document.getElementById('genLoss');
  const discLoss = document.getElementById('discLoss');
  const polyIndex = document.getElementById('polyIndex');
  const inputSeed = document.getElementById('inputSeed');
  const btnRandomSeed = document.getElementById('btnRandomSeed');
  const metaSeed = document.getElementById('metaSeed');
  const ganStatus = document.getElementById('ganStatus');

  // Mixer Controls
  const volPiano = document.getElementById('volPiano');
  const volGuitar = document.getElementById('volGuitar');
  const volDrums = document.getElementById('volDrums');

  const mutePiano = document.getElementById('mutePiano');
  const muteGuitar = document.getElementById('muteGuitar');
  const muteDrums = document.getElementById('muteDrums');

  const soloPiano = document.getElementById('soloPiano');
  const soloGuitar = document.getElementById('soloGuitar');
  const soloDrums = document.getElementById('soloDrums');

  // Hook Volume Sliders
  volPiano.addEventListener('input', (e) => { trackVols.piano = parseInt(e.target.value, 10); });
  volGuitar.addEventListener('input', (e) => { trackVols.guitar = parseInt(e.target.value, 10); });
  volDrums.addEventListener('input', (e) => { trackVols.drums = parseInt(e.target.value, 10); });

  // Hook Mute Buttons
  function toggleMute(track, btn) {
    trackMutes[track] = !trackMutes[track];
    btn.classList.toggle('active-mute', trackMutes[track]);
  }
  mutePiano.addEventListener('click', () => toggleMute('piano', mutePiano));
  muteGuitar.addEventListener('click', () => toggleMute('guitar', muteGuitar));
  muteDrums.addEventListener('click', () => toggleMute('drums', muteDrums));

  // Hook Solo Buttons
  function toggleSolo(track, btn) {
    trackSolos[track] = !trackSolos[track];
    btn.classList.toggle('active-solo', trackSolos[track]);
  }
  soloPiano.addEventListener('click', () => toggleSolo('piano', soloPiano));
  soloGuitar.addEventListener('click', () => toggleSolo('guitar', soloGuitar));
  soloDrums.addEventListener('click', () => toggleSolo('drums', soloDrums));

  // Determine if a track is active in the mix
  function isTrackAudible(track) {
    const anySolo = trackSolos.piano || trackSolos.guitar || trackSolos.drums;
    if (anySolo) {
      return trackSolos[track] && !trackMutes[track];
    }
    return !trackMutes[track];
  }

  // Genre selection
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeGenre = chip.getAttribute('data-genre');
      generateMusic();
    });
  });

  sliderTempo.addEventListener('input', () => {
    activeTempo = parseInt(sliderTempo.value, 10);
    valTempo.textContent = `${activeTempo} BPM`;
  });

  btnRandomSeed.addEventListener('click', () => {
    inputSeed.value = Math.floor(Math.random() * 900000 + 10000);
    generateMusic();
  });

  inputSeed.addEventListener('change', () => {
    generateMusic();
  });

  // Render Multi-Track Piano Roll Grid
  function drawPianoRoll(tracks, stepHighlight = -1) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Grid background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    const steps = 16;
    const minPitch = 32;
    const maxPitch = 80;
    const pitchRange = maxPitch - minPitch;
    const stepW = w / steps;
    const pitchH = h / pitchRange;

    // Draw step grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.lineWidth = 1;
    for (let s = 0; s <= steps; s++) {
      ctx.beginPath();
      ctx.moveTo(s * stepW, 0);
      ctx.lineTo(s * stepW, h);
      ctx.stroke();
    }

    // Step highlight bar
    if (stepHighlight >= 0) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.18)';
      ctx.fillRect(stepHighlight * stepW, 0, stepW, h);
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(stepHighlight * stepW, 0, 3, h);
    }

    if (!tracks) return;

    // Draw notes per track
    tracks.forEach(track => {
      ctx.fillStyle = track.color;
      track.notes.forEach(note => {
        const x = note.step * stepW + 2;
        const normalizedPitch = Math.max(0, Math.min(pitchRange - 1, note.pitch - minPitch));
        const y = h - ((normalizedPitch + 1) * pitchH);
        const rectW = stepW - 4;
        const rectH = Math.max(5, pitchH * 1.5);

        ctx.fillRect(x, y, rectW, rectH);
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, rectW, rectH);
      });
    });
  }

  // Audio Synthesis via Web Audio API
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      // Master bus compressor to prevent clipping when Piano + Guitar + Drums mix together
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, audioCtx.currentTime);
      compressor.knee.setValueAtTime(20, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(8, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.2, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);

      compressor.connect(masterGain);
      masterGain.connect(audioCtx.destination);
    }
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // 1. Acoustic Piano Synthesizer (Harmonic partials + warm lowpass decay)
  function playPiano(midiPitch, duration = 0.45, velocity = 0.8) {
    if (!audioCtx || !isTrackAudible('piano')) return;
    const freq = midiToFreq(midiPitch);
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + duration);

    const targetVol = (trackVols.piano / 100) * velocity * 0.12;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(targetVol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(compressor);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  }

  // 2. Plucked Guitar Synthesizer (Resonant string pluck + exponential decay)
  function playGuitar(midiPitch, duration = 0.45, velocity = 0.8) {
    if (!audioCtx || !isTrackAudible('guitar')) return;
    const freq = midiToFreq(midiPitch);
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.Q.value = 3.5;
    filter.frequency.setValueAtTime(4500, now);
    filter.frequency.exponentialRampToValueAtTime(350, now + duration * 0.75);

    const targetVol = (trackVols.guitar / 100) * velocity * 0.09;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(targetVol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(compressor);

    osc.start(now);
    osc.stop(now + duration);
  }

  // 3. Dynamic Drum Beat Synthesizer (Kick, Snare, Hi-Hat)
  function playDrums(midiPitch, duration = 0.25, velocity = 0.9) {
    if (!audioCtx || !isTrackAudible('drums')) return;
    const now = audioCtx.currentTime;
    const trackVol = (trackVols.drums / 100) * velocity;

    if (midiPitch <= 37) {
      // KICK DRUM: Rapid pitch-drop sine sweep
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.12);

      gain.gain.setValueAtTime(trackVol * 0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(compressor);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (midiPitch <= 41) {
      // SNARE DRUM: Mid snap tone + filtered noise burst
      const osc = audioCtx.createOscillator();
      const oscGain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
      oscGain.gain.setValueAtTime(trackVol * 0.14, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(oscGain);
      oscGain.connect(compressor);
      osc.start(now);
      osc.stop(now + 0.15);

      playNoise(1200, 0.14, trackVol * 0.14);
    } else {
      // HI-HAT / CYMBAL: Highpass metallic white noise
      playNoise(8000, 0.06, trackVol * 0.09);
    }
  }

  function playNoise(freq, duration, volume) {
    if (!audioCtx) return;
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(freq, audioCtx.currentTime);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(compressor);

    noise.start(audioCtx.currentTime);
  }

  // Toggle Mix Together Playback
  function togglePlayback() {
    initAudio();
    if (isPlaying) {
      clearInterval(playbackTimer);
      isPlaying = false;
      playText.textContent = "▶ Play Mix Together (Piano + Guitar + Drums)";
      playIcon.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
      drawPianoRoll(musicData ? musicData.tracks : null, -1);
    } else {
      isPlaying = true;
      playText.textContent = "⏹ Stop Mix";
      playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
      currentStep = 0;

      const stepInterval = (60 / activeTempo / 4) * 1000;
      playbackTimer = setInterval(() => {
        if (!musicData || !musicData.tracks) return;
        drawPianoRoll(musicData.tracks, currentStep);

        // Mix together: trigger notes across all 3 tracks in lockstep!
        musicData.tracks.forEach(track => {
          const trackLower = track.name.toLowerCase();
          track.notes.forEach(note => {
            if (note.step === currentStep) {
              const vel = note.velocity || 0.8;
              if (trackLower.includes('piano')) {
                playPiano(note.pitch, 0.4, vel);
              } else if (trackLower.includes('guitar')) {
                playGuitar(note.pitch, 0.42, vel);
              } else if (trackLower.includes('drum')) {
                playDrums(note.pitch, 0.25, vel);
              }
            }
          });
        });

        currentStep = (currentStep + 1) % 16;
      }, stepInterval);
    }
  }

  btnPlay.addEventListener('click', togglePlayback);

  // Dynamic PyTorch GAN Generation
  async function generateMusic() {
    if (isPlaying) togglePlayback();

    const seedVal = inputSeed.value ? parseInt(inputSeed.value, 10) : null;
    ganStatus.textContent = "Synthesizing...";
    ganStatus.className = "status-badge";

    try {
      const res = await fetch('/api/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: activeGenre, tempo: activeTempo, seed: seedVal })
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Generation failed");

      musicData = data;
      genLoss.textContent = data.ganMetrics.generatorLoss;
      discLoss.textContent = data.ganMetrics.discriminatorLoss;
      polyIndex.textContent = data.ganMetrics.polyphonyIndex;
      if (metaSeed && data.ganMetrics.latentSeed) {
        metaSeed.textContent = data.ganMetrics.latentSeed;
        inputSeed.value = data.ganMetrics.latentSeed;
      }

      ganStatus.textContent = data.mode && data.mode.includes("PyTorch") ? "PyTorch Dynamic GAN" : "Dynamic Synthesizer";
      ganStatus.className = "status-badge complete";

      drawPianoRoll(data.tracks, -1);
    } catch (err) {
      console.warn("Using fallback music synthesis:", err);
      ganStatus.textContent = "Offline Fallback";
      ganStatus.className = "status-badge";
    }
  }

  btnGenerate.addEventListener('click', () => {
    inputSeed.value = Math.floor(Math.random() * 900000 + 10000);
    generateMusic();
  });

  // Initial generation
  generateMusic();
});
