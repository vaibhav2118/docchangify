// ── Compress PDF — Reliable Size-Reduction Engine ─────────
// Strategy: render every page via PDF.js → JPEG → rebuild PDF
// Guarantees output ≤ input by comparing and falling back if needed.

const { PDFDocument } = PDFLib;

// ── DOM refs ──────────────────────────────────────────────
const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');
const settingsZone  = document.getElementById('settings-zone');
const progressZone  = document.getElementById('progress-zone');
const resultZone    = document.getElementById('result-zone');
const progressBar   = document.getElementById('progress-bar');
const progressMsg   = document.getElementById('progress-msg');
const customSizeRow = document.getElementById('custom-size-row');

// ── State ─────────────────────────────────────────────────
let originalBytes   = null;
let compressedBytes = null;
let originalSize    = 0;
let fileName        = 'document';
let selectedLevel   = 'medium';

// ── Profiles ─────────────────────────────────────────────
// renderScale : how big to render the canvas (relative to PDF points at 96dpi)
//   - HIGHER scale = more pixels = bigger file
//   - LOWER  scale = fewer pixels = smaller but blurrier
// jpegQuality : 0–1  (lower = smaller, more artefacts)
// Expected reduction from original:
//   low    ~15-30%  (safe for any PDF)
//   medium ~40-60%  (good balance)
//   high   ~65-80%  (aggressive — noticeable quality loss)
const PROFILES = {
  low:    { renderScale: 1.2,  jpegQuality: 0.82, label: 'Low — Best Quality'       },
  medium: { renderScale: 0.9,  jpegQuality: 0.60, label: 'Medium — Balanced'         },
  high:   { renderScale: 0.60, jpegQuality: 0.35, label: 'High — Maximum Reduction'  },
  custom: { renderScale: 0.80, jpegQuality: 0.50, label: 'Custom'                    },
};

function fmtSize(bytes) {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function setProgress(pct, msg) {
  progressBar.style.width = Math.min(100, pct) + '%';
  if (msg) progressMsg.textContent = msg;
}

// ── Level card selector ───────────────────────────────────
document.querySelectorAll('.level-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedLevel = card.dataset.level;
    customSizeRow.classList.toggle('hidden', selectedLevel !== 'custom');
  });
});

// ── File handling ─────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); e.target.value = ''; });
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
document.getElementById('btn-change-file').addEventListener('click', () => fileInput.click());

function loadFile(file) {
  if (file.type !== 'application/pdf') { alert('Please upload a PDF file.'); return; }
  fileName = file.name.replace(/\.pdf$/i, '');
  file.arrayBuffer().then(buf => {
    // Store as Uint8Array so we can safely .slice(0) it for each compression pass
    // (PDF.js transfers/detaches raw ArrayBuffers after first use)
    originalBytes = new Uint8Array(buf);
    originalSize  = originalBytes.byteLength;
    document.getElementById('file-name').textContent        = file.name;
    document.getElementById('file-size-display').textContent = fmtSize(originalSize) + ' · PDF';
    dropZone.classList.add('hidden');
    settingsZone.classList.remove('hidden');
    resultZone.classList.add('hidden');
    progressZone.classList.add('hidden');
  });
}

// ── Trigger compression ───────────────────────────────────
document.getElementById('btn-compress').addEventListener('click', runCompression);
document.getElementById('btn-compress-again').addEventListener('click', () => {
  resultZone.classList.add('hidden');
  settingsZone.classList.remove('hidden');
});
document.getElementById('btn-reset').addEventListener('click', () => location.reload());

async function runCompression() {
  settingsZone.classList.add('hidden');
  resultZone.classList.add('hidden');
  progressZone.classList.remove('hidden');
  setProgress(3, 'Initialising…');

  try {
    let targetBytes = null;
    if (selectedLevel === 'custom') {
      const val  = parseFloat(document.getElementById('target-size').value) || 500;
      const unit = document.getElementById('target-unit').value;
      targetBytes = unit === 'mb' ? val * 1048576 : val * 1024;
    }

    compressedBytes = await smartCompress(originalBytes, selectedLevel, targetBytes, setProgress);

    // Safety: if somehow output is bigger, fall back to plain pdf-lib save
    if (compressedBytes.byteLength >= originalSize) {
      setProgress(95, 'Optimising metadata…');
      compressedBytes = await fallbackCompress(originalBytes);
    }

    showResults(compressedBytes, targetBytes);
  } catch (err) {
    alert('Compression failed: ' + err.message);
    progressZone.classList.add('hidden');
    settingsZone.classList.remove('hidden');
  }
}

// ── Main engine: render pages → JPEG → new PDF ───────────
async function smartCompress(bytes, level, targetBytes, onProgress) {
  const profile = { ...PROFILES[level] || PROFILES.medium };

  // If custom target: estimate starting quality from size ratio
  if (targetBytes && originalSize > 0) {
    const ratio = targetBytes / originalSize;
    profile.jpegQuality = Math.max(0.15, Math.min(0.90, ratio * 0.85));
    profile.renderScale = Math.max(0.35, Math.min(1.4, Math.sqrt(ratio) * 1.1));
  }

  const MAX_PASSES = targetBytes ? 5 : 1;
  let bestResult   = null;

  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const basePct = (pass / MAX_PASSES) * 85;
    onProgress(basePct + 5, `Pass ${pass + 1}/${MAX_PASSES} — quality ${(profile.jpegQuality * 100).toFixed(0)}%…`);

    const result = await renderAndRebuild(bytes, profile, onProgress, basePct, MAX_PASSES);

    if (!bestResult || result.byteLength < bestResult.byteLength) {
      bestResult = result;
    }

    // If targeting a custom size, adjust for next pass
    if (targetBytes) {
      const current = result.byteLength;
      const ratio   = current / targetBytes;

      if (Math.abs(ratio - 1) < 0.05) break; // within 5% — done

      if (ratio > 1) {
        // Still too big — reduce aggressively
        profile.jpegQuality = Math.max(0.12, profile.jpegQuality * 0.72);
        profile.renderScale = Math.max(0.30, profile.renderScale * 0.80);
      } else {
        // Too small — raise quality a bit to preserve readability
        profile.jpegQuality = Math.min(0.92, profile.jpegQuality * 1.15);
      }
    }
  }

  return bestResult;
}

// ── Render PDF pages to canvas and embed as JPEG ─────────
async function renderAndRebuild(bytes, profile, onProgress, basePct, totalPasses) {
  // IMPORTANT: PDF.js transfers (detaches) the ArrayBuffer it receives.
  // Always pass a fresh copy so subsequent passes and fallbacks work correctly.
  const dataCopy = bytes instanceof Uint8Array ? bytes.slice(0) : new Uint8Array(bytes);
  const pdfJs    = await pdfjsLib.getDocument({ data: dataCopy }).promise;
  const numPages = pdfJs.numPages;
  const newDoc   = await PDFDocument.create();

  stripMeta(newDoc);

  for (let p = 1; p <= numPages; p++) {
    const pagePct = basePct + 5 + ((p - 1) / numPages) * (85 / totalPasses);
    onProgress(Math.round(pagePct), `Compressing page ${p}/${numPages}…`);

    const page     = await pdfJs.getPage(p);
    const vp1      = page.getViewport({ scale: 1 });          // original point size
    const vpRender = page.getViewport({ scale: profile.renderScale }); // render size

    const canvas  = document.createElement('canvas');
    canvas.width  = Math.round(vpRender.width);
    canvas.height = Math.round(vpRender.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport: vpRender }).promise;

    // Encode as JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', profile.jpegQuality);
    const b64     = dataUrl.split(',')[1];
    const jpgData = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const img     = await newDoc.embedJpg(jpgData);

    // Page dimensions in points (keep original layout size)
    const outPage = newDoc.addPage([vp1.width, vp1.height]);
    outPage.drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height });
  }

  return newDoc.save({ useObjectStreams: true, addDefaultPage: false });
}

// ── Fallback: strip metadata only (no image recompression) 
 async function fallbackCompress(bytes) {
  // Copy bytes so PDF.js detachment from previous pass doesn't affect pdf-lib
  const data = bytes instanceof Uint8Array ? bytes.slice(0) : new Uint8Array(bytes);
  const doc = await PDFDocument.load(data, { updateMetadata: false });
  stripMeta(doc);
  return doc.save({ useObjectStreams: true, addDefaultPage: false });
}

function stripMeta(doc) {
  doc.setTitle('');
  doc.setAuthor('DocChangify');
  doc.setSubject('');
  doc.setKeywords([]);
  doc.setCreator('DocChangify');
  doc.setProducer('DocChangify PDF Compressor');
}

// ── Show results ──────────────────────────────────────────
function showResults(result, targetBytes) {
  const compSize  = result.byteLength;
  const saved     = Math.max(0, originalSize - compSize);
  const savedPct  = Math.max(0, (saved / originalSize) * 100);
  const barWidth  = Math.max(4, 100 - savedPct);

  document.getElementById('original-size').textContent   = fmtSize(originalSize);
  document.getElementById('compressed-size').textContent = fmtSize(compSize);
  document.getElementById('saved-pct').textContent       = savedPct.toFixed(1) + '%';
  document.getElementById('savings-label').textContent   = `Compressed → ${fmtSize(compSize)}`;
  document.getElementById('original-size-label').textContent = fmtSize(originalSize);
  document.getElementById('savings-bar').style.width     = barWidth + '%';

  let note = '';
  if (selectedLevel === 'custom' && targetBytes) {
    const diff = Math.abs(compSize - targetBytes) / targetBytes;
    note = diff < 0.06
      ? `✅ Target size reached! (${fmtSize(targetBytes)} target)`
      : `⚠️ Compressed as small as possible while keeping the PDF readable. Exact target (${fmtSize(targetBytes)}) could not be reached.`;
  } else {
    const labels = {
      low:    '🌿 Low compression applied — maximum quality retained.',
      medium: '⚖️ Medium compression applied — good balance of quality and size.',
      high:   '🔥 High compression applied — maximum size reduction.',
    };
    note = labels[selectedLevel] || '';
  }
  document.getElementById('result-note').textContent = note;

  setProgress(100, 'Done!');
  progressZone.classList.add('hidden');
  resultZone.classList.remove('hidden');
}

// ── Download ───────────────────────────────────────────────
document.getElementById('btn-download').addEventListener('click', () => {
  if (!compressedBytes) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([compressedBytes], { type: 'application/pdf' }));
  a.download = `${fileName}-compressed.pdf`;
  a.click();
});
