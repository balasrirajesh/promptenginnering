// ==============================================================================
// EXPERIMENT 17: CIFAR-10 OBJECT CLASSIFICATION USING CNN
// Frontend Logic - app.js (Synchronized with index.js)
// Student: Vyshnavi | Regulation: ACETR23
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Prevent duplicate execution if both app.js and index.js are loaded
  if (window.__EXP17_INITIALIZED__) return;
  window.__EXP17_INITIALIZED__ = true;

  const CLASS_METADATA = {
    airplane: { emoji: "✈️", color: "#38bdf8", bg: "#0284c7", name: "Airplane" },
    automobile: { emoji: "🚗", color: "#ef4444", bg: "#991b1b", name: "Automobile" },
    bird: { emoji: "🐦", color: "#fbbf24", bg: "#d97706", name: "Bird" },
    cat: { emoji: "🐱", color: "#f472b6", bg: "#db2777", name: "Cat" },
    deer: { emoji: "🦌", color: "#a3e635", bg: "#65a30d", name: "Deer" },
    dog: { emoji: "🐶", color: "#fb923c", bg: "#c2410c", name: "Dog" },
    frog: { emoji: "🐸", color: "#4ade80", bg: "#16a34a", name: "Frog" },
    horse: { emoji: "🐴", color: "#e879f9", bg: "#c026d3", name: "Horse" },
    ship: { emoji: "🚢", color: "#06b6d4", bg: "#0891b2", name: "Ship" },
    truck: { emoji: "🚚", color: "#94a3b8", bg: "#475569", name: "Truck" }
  };

  let currentMode = 'upload'; // 'upload' or 'preset'
  let activePresetClass = 'automobile';
  let activeImageBase64 = null;
  let activeImageMimeType = 'image/jpeg';

  // UI Elements
  const tabUpload = document.getElementById('tabUpload');
  const tabPresets = document.getElementById('tabPresets');
  const uploadSection = document.getElementById('uploadSection');
  const presetSection = document.getElementById('presetSection');
  const inputBadge = document.getElementById('inputBadge');

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('imageFileInput');
  const sourceImagePreview = document.getElementById('sourceImagePreview');
  const noImagePrompt = document.getElementById('noImagePrompt');
  const cifarCanvas = document.getElementById('cifarCanvas');
  const ctx = cifarCanvas ? cifarCanvas.getContext('2d') : null;

  const btnClassify = document.getElementById('btnClassify');
  const topEmoji = document.getElementById('topEmoji');
  const topClassName = document.getElementById('topClassName');
  const topConfidence = document.getElementById('topConfidence');
  const probList = document.getElementById('probList');
  const modelStatus = document.getElementById('modelStatus');

  const classBtns = document.querySelectorAll('.class-btn');
  const sampleChipBtns = document.querySelectorAll('.sample-chip-btn');

  // Mode switching
  if (tabUpload && tabPresets) {
    tabUpload.addEventListener('click', () => {
      currentMode = 'upload';
      tabUpload.classList.add('active');
      tabPresets.classList.remove('active');
      if (uploadSection) uploadSection.style.display = 'block';
      if (presetSection) presetSection.style.display = 'none';
      if (inputBadge) inputBadge.textContent = 'Custom Image';
    });

    tabPresets.addEventListener('click', () => {
      currentMode = 'preset';
      tabPresets.classList.add('active');
      tabUpload.classList.remove('active');
      if (presetSection) presetSection.style.display = 'block';
      if (uploadSection) uploadSection.style.display = 'none';
      if (inputBadge) inputBadge.textContent = 'Preset Class';
      renderCifarTensor(activePresetClass);
      runInference();
    });
  }

  // Draw 32x32 tensor pattern onto canvas
  function renderCifarTensor(className) {
    if (!ctx || !cifarCanvas) return;
    const meta = CLASS_METADATA[className] || CLASS_METADATA.automobile;
    ctx.clearRect(0, 0, cifarCanvas.width, cifarCanvas.height);

    ctx.fillStyle = meta.bg;
    ctx.fillRect(0, 0, 32, 32);

    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.emoji, 16, 17);
  }

  // Draw uploaded image downscaled to 32x32 CIFAR canvas
  function renderImageToCifarTensor(imgElement) {
    if (!ctx) return;
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(imgElement, 0, 0, 32, 32);
  }

  // File upload handling
  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });
  }

  function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file (PNG, JPG, WebP).");
      return;
    }
    activeImageMimeType = file.type;
    const reader = new FileReader();
    reader.onload = (e) => {
      activeImageBase64 = e.target.result;
      if (sourceImagePreview) {
        sourceImagePreview.src = activeImageBase64;
        sourceImagePreview.style.display = 'block';
      }
      if (noImagePrompt) noImagePrompt.style.display = 'none';

      const img = new Image();
      img.onload = () => {
        renderImageToCifarTensor(img);
        runInference();
      };
      img.src = activeImageBase64;
    };
    reader.readAsDataURL(file);
  }

  // Procedural Sample Generator (Reliable, self-contained, offline-safe)
  function generateSampleDataUrl(type) {
    const c = document.createElement('canvas');
    c.width = 160;
    c.height = 160;
    const g = c.getContext('2d');

    if (type === 'car') {
      g.fillStyle = '#dc2626';
      g.fillRect(0, 0, 160, 160);
      g.fillStyle = '#ffffff';
      g.font = '72px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🚗', 80, 85);
    } else if (type === 'plane') {
      g.fillStyle = '#0284c7';
      g.fillRect(0, 0, 160, 160);
      g.fillStyle = '#ffffff';
      g.font = '72px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('✈️', 80, 85);
    } else if (type === 'dog') {
      g.fillStyle = '#d97706';
      g.fillRect(0, 0, 160, 160);
      g.fillStyle = '#ffffff';
      g.font = '72px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🐶', 80, 85);
    } else if (type === 'ship') {
      g.fillStyle = '#0891b2';
      g.fillRect(0, 0, 160, 160);
      g.fillStyle = '#ffffff';
      g.font = '72px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('🚢', 80, 85);
    }
    return c.toDataURL('image/jpeg');
  }

  const SAMPLE_TARGETS = {
    car: 'automobile',
    plane: 'airplane',
    dog: 'dog',
    ship: 'ship'
  };

  sampleChipBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const sampleKey = btn.getAttribute('data-sample');
      const targetClass = SAMPLE_TARGETS[sampleKey] || 'automobile';
      activeImageBase64 = generateSampleDataUrl(sampleKey);
      activeImageMimeType = 'image/jpeg';

      if (sourceImagePreview) {
        sourceImagePreview.src = activeImageBase64;
        sourceImagePreview.style.display = 'block';
      }
      if (noImagePrompt) noImagePrompt.style.display = 'none';

      const img = new Image();
      img.onload = () => {
        renderImageToCifarTensor(img);
        runInference(targetClass);
      };
      img.src = activeImageBase64;
    });
  });

  // Preset Class Grid buttons
  classBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      classBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activePresetClass = btn.getAttribute('data-class');
      renderCifarTensor(activePresetClass);
      runInference(activePresetClass);
    });
  });

  // Main Inference Runner
  async function runInference(explicitClass = null) {
    if (btnClassify) {
      btnClassify.disabled = true;
      btnClassify.innerHTML = `
        <span class="indicator-dot pulse" style="background:#fff;"></span>
        <span>CNN Forward Pass Running...</span>
      `;
    }
    if (modelStatus) {
      modelStatus.textContent = "Processing...";
      modelStatus.className = "status-badge";
    }

    try {
      let res, data;
      const targetToUse = explicitClass || (currentMode === 'preset' ? activePresetClass : 'automobile');

      if (currentMode === 'upload' && activeImageBase64) {
        res = await fetch('/api/classify-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: activeImageBase64,
            mimeType: activeImageMimeType
          })
        });
        data = await res.json();
      } else {
        res = await fetch('/api/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ className: targetToUse })
        });
        data = await res.json();
      }

      if (!data || !data.success) throw new Error(data?.error || "Inference failed");

      // Update UI with results
      if (topEmoji) topEmoji.textContent = data.emoji || CLASS_METADATA[data.topKey]?.emoji || "🎯";
      if (topClassName) topClassName.textContent = data.topClass.toUpperCase();
      if (topConfidence) topConfidence.textContent = `${data.confidence}%`;

      // Render distribution bars
      if (probList) {
        probList.innerHTML = '';
        data.distribution.forEach((item, index) => {
          const row = document.createElement('div');
          row.className = 'prob-item';
          const meta = CLASS_METADATA[item.key] || { emoji: "🔹" };
          row.innerHTML = `
            <span class="prob-name">${meta.emoji} ${item.name}</span>
            <div class="prob-track">
              <div class="prob-fill ${index === 0 ? 'top-fill' : ''}" style="width: ${item.percentage}%"></div>
            </div>
            <span class="prob-pct">${item.percentage}%</span>
          `;
          probList.appendChild(row);
        });
      }

      if (modelStatus) {
        modelStatus.textContent = "Inference Complete";
        modelStatus.className = "status-badge complete";
      }
    } catch (err) {
      console.warn("Fallback during classification:", err);
      if (modelStatus) modelStatus.textContent = "Error";
    } finally {
      if (btnClassify) {
        btnClassify.disabled = false;
        btnClassify.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Run CNN Forward Pass</span>
        `;
      }
    }
  }

  if (btnClassify) {
    btnClassify.addEventListener('click', () => runInference());
  }

  // Keyboard shortcut Ctrl+Enter
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      runInference();
    }
  });

  // Initial setup: select sample car by default so UI has rich state
  const initialDataUrl = generateSampleDataUrl('car');
  activeImageBase64 = initialDataUrl;
  if (sourceImagePreview) {
    sourceImagePreview.src = initialDataUrl;
    sourceImagePreview.style.display = 'block';
  }
  if (noImagePrompt) noImagePrompt.style.display = 'none';

  const initialImg = new Image();
  initialImg.onload = () => {
    renderImageToCifarTensor(initialImg);
    runInference('automobile');
  };
  initialImg.src = initialDataUrl;
});
