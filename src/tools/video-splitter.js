/**
 * video-splitter.js – DocChangify
 * 
 * VERSION: 1.3 (Local Processing + Robust Fetch)
 * 
 * FIX: Switched to local FFmpeg core files to solve "Failed to fetch" on mobile.
 * Added manual FileReader fallback for fetchFile to ensure local file reading 
 * doesn't trigger CORS/Security errors in strict mobile environments.
 */




// ─── DOM refs ─────────────────────────────────────────────────────────────────
const dropZone          = document.getElementById('drop-zone');
const fileInput         = document.getElementById('file-input');
const uploadSection     = document.getElementById('upload-section');
const configSection     = document.getElementById('config-section');
const processingSection = document.getElementById('processing-section');
const resultSection     = document.getElementById('result-section');
const uploadIdle        = document.getElementById('upload-idle');
const uploadLoading     = document.getElementById('upload-loading');
const initStatus        = document.getElementById('init-status');

const fileNameEl        = document.getElementById('file-name');
const fileSizeEl        = document.getElementById('file-size');
const fileDurationEl    = document.getElementById('file-duration');
const splitDuration     = document.getElementById('split-duration');
const clipCountPreview  = document.getElementById('clip-count-preview');
const changeFileBtn     = document.getElementById('change-file-btn');
const btnSplit          = document.getElementById('btn-split');
const btnReset          = document.getElementById('btn-reset');
const btnStartOver      = document.getElementById('btn-start-over');
const btnDownloadZip    = document.getElementById('btn-download-zip');
const progressBar       = document.getElementById('progress-bar');
const progressLabel     = document.getElementById('progress-label');
const progressPct       = document.getElementById('progress-pct');
const logPanel          = document.getElementById('log-panel');
const resultSummary     = document.getElementById('result-summary');
const clipsGrid         = document.getElementById('clips-grid');

// ─── State ────────────────────────────────────────────────────────────────────
let selectedFile   = null;
let videoDuration  = 0;
let ffmpegInstance = null;
let outputBlobs    = [];

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtTime(sec) {
  if (isNaN(sec)) return '0:00';
  sec = Math.round(sec);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function fmtBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function showSection(id) {
  const sections = [uploadSection, configSection, processingSection, resultSection];
  sections.forEach(s => s.classList.add('hidden'));
  document.getElementById(id + '-section').classList.remove('hidden');
  if (id === 'upload') {
    uploadIdle.classList.remove('hidden');
    uploadLoading.classList.add('hidden');
    if (initStatus) initStatus.textContent = '';
  }
}

function setProgress(pct, label) {
  if (progressBar)   progressBar.style.width   = pct + '%';
  if (progressPct)   progressPct.textContent   = pct + '%';
  if (progressLabel) progressLabel.textContent = label;
}

function log(msg) {
  if (!logPanel) return;
  logPanel.textContent += msg + '\n';
  logPanel.scrollTop = logPanel.scrollHeight;
}

function showConfigError(msg) {
  var area = document.getElementById('error-area');
  if (!area) return;
  area.innerHTML = '<div class="alert-banner alert-error"><i class="ph ph-warning-circle text-xl flex-shrink-0"></i><span>' + msg + '</span></div>';
  setTimeout(() => { if (area) area.innerHTML = ''; }, 7000);
}

// ─── Reliable File Loader (bypasses fetch issues) ──────────────────────────
async function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read local file bytes.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── FFmpeg Loader – Robust Version for Mobile ───────────────────────────────
async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  
  const FFmpegLib = window.FFmpeg;
  if (!FFmpegLib) {
    throw new Error('Video toolkit (FFmpeg) not found. Please refresh the page.');
  }

  // Use absolute URL with cache-busting to force a fresh load
  const timestamp = Date.now();
  const corePath = `${window.location.origin}/ffmpeg/ffmpeg-core.js?v=${timestamp}`;
  
  if (initStatus) initStatus.textContent = '⚡ Starting local engine...';
  console.log('[VideoSplitter] Initializing FFmpeg core:', corePath);

  const ff = FFmpegLib.createFFmpeg({
    corePath: corePath,
    log: true, // Internal logs help debug mobile failures
    progress: (p) => {
      if (p.ratio > 0) {
        const pct = Math.min(95, Math.round(p.ratio * 100));
        setProgress(pct, 'Loading processor... ' + pct + '%');
      }
    }
  });

  if (initStatus) initStatus.textContent = '📦 Loading data (25MB)...';
  console.log('[VideoSplitter] Calling ff.load()...');

  try {
    await ff.load();
    console.log('[VideoSplitter] FFmpeg load successful');
  } catch (e) {
    console.error('[VideoSplitter] FFmpeg load error:', e);
    
    let errorMsg = 'Could not start video processor.\n\n';
    if (e.message && e.message.includes('fetch')) {
      errorMsg += 'Network error: Toolkit could not be downloaded.';
    } else {
      errorMsg += 'This is likely a memory limit on your mobile. Try closing other tabs or using a smaller video.';
    }
    
    throw new Error(errorMsg);
  }

  ffmpegInstance = ff;
  if (initStatus) initStatus.textContent = '✅ Ready';
  return ff;
}

// ─── Interaction Handlers ─────────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});

dropZone.addEventListener('click', (e) => {
  if (e.target.tagName === 'LABEL' || e.target.closest('label') || e.target.tagName === 'INPUT') return;
  fileInput.click();
});

// ─── Main File Handler ────────────────────────────────────────────────────────
async function handleFile(file) {
  selectedFile = file;
  uploadIdle.classList.add('hidden');
  uploadLoading.classList.remove('hidden');
  if (initStatus) initStatus.textContent = '🔒 Setting up secure environment...';

  try {
    const ff = await getFFmpeg();

    if (initStatus) initStatus.textContent = '📂 Reading file structure...';
    
    // Manual read (more robust than fetchFile on mobile)
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const inputName = 'input.vid'; // Generic name for probing
    ff.FS('writeFile', inputName, new Uint8Array(arrayBuffer));

    if (initStatus) initStatus.textContent = '🔎 Analyzing video content...';

    // Probe duration using log capture
    let durationString = '';
    ff.setLogger(({ message }) => {
      if (message.includes('Duration: ')) durationString = message;
    });

    try {
      await ff.run('-i', inputName);
    } catch(e) { /* expected -i error */ }
    
    // Parse: "Duration: 00:00:23.45,"
    const match = durationString.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      const h = parseFloat(match[1]);
      const m = parseFloat(match[2]);
      const s = parseFloat(match[3]);
      videoDuration = h * 3600 + m * 60 + s;
    } else {
      // Last-ditch duration fallback
      videoDuration = await getDurationFallBack(file);
    }

    if (!videoDuration || videoDuration <= 0) {
      throw new Error('Video format not recognized. Try an MP4 file.');
    }

    ff.FS('unlink', inputName); 
    
    // UI Update
    fileNameEl.textContent     = file.name;
    fileSizeEl.textContent     = fmtBytes(file.size);
    fileDurationEl.textContent = fmtTime(videoDuration) + ' (' + videoDuration.toFixed(1) + 's)';
    updateClipPreview();
    showSection('config');

  } catch (err) {
    console.error('[VideoSplitter] Selection Error:', err);
    alert('Video Error: ' + err.message);
    showSection('upload');
  }
}

function getDurationFallBack(file) {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(0); };
    setTimeout(() => resolve(0), 4000);
  });
}

// ─── UI Actions ───────────────────────────────────────────────────────────────
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    splitDuration.value = btn.getAttribute('data-seconds');
    document.querySelectorAll('.preset-btn').forEach(b => b.removeAttribute('style'));
    btn.style.cssText = 'border-color:#7c3aed;color:#7c3aed;background:rgba(124,58,237,0.12);';
    updateClipPreview();
  });
});

splitDuration.addEventListener('input', () => {
  document.querySelectorAll('.preset-btn').forEach(b => b.removeAttribute('style'));
  updateClipPreview();
});

function updateClipPreview() {
  const dur = parseFloat(splitDuration.value);
  if (!dur || dur <= 0 || !videoDuration) { clipCountPreview.classList.add('hidden'); return; }
  const count = Math.ceil(videoDuration / dur);
  clipCountPreview.textContent = '→ ' + count + ' clip' + (count !== 1 ? 's' : '') + ' total';
  clipCountPreview.classList.remove('hidden');
}

changeFileBtn.addEventListener('click', () => { doReset(); showSection('upload'); });
btnReset.addEventListener('click',      () => { doReset(); showSection('upload'); });
btnStartOver.addEventListener('click',  () => { freeBlobs(); doReset(); showSection('upload'); });

function doReset() {
  selectedFile = null; videoDuration = 0; fileInput.value = ''; splitDuration.value = 10;
  if (logPanel) logPanel.textContent = ''; setProgress(0, 'Ready');
}
function freeBlobs() { outputBlobs.forEach(b => URL.revokeObjectURL(b.url)); outputBlobs = []; if(clipsGrid) clipsGrid.innerHTML = ''; }

// ─── Split Execution ──────────────────────────────────────────────────────────
btnSplit.addEventListener('click', async () => {
  if (!selectedFile) return;
  const durSec = parseFloat(splitDuration.value);
  if (!durSec || durSec <= 0) return showConfigError('Invalid duration.');

  freeBlobs();
  if (logPanel) logPanel.textContent = '';
  showSection('processing');
  setProgress(0, 'Initializing...');

  try {
    const ff = await getFFmpeg();
    const ext = selectedFile.name.split('.').pop();
    const inputName = 'input.' + ext;
    const baseName  = selectedFile.name.replace(/\.[^/.]+$/, '');
    const clipCount = Math.ceil(videoDuration / durSec);

    log('📂 Processing: ' + selectedFile.name);
    setProgress(5, 'Mounting file...');

    const arrayBuffer = await readFileAsArrayBuffer(selectedFile);
    ff.FS('writeFile', inputName, new Uint8Array(arrayBuffer));
    
    for (let i = 0; i < clipCount; i++) {
      const startSec = i * durSec;
      const endSec   = Math.min(startSec + durSec, videoDuration);
      const clipDur  = +(endSec - startSec).toFixed(3);
      const outName  = 'clip_' + String(i + 1).padStart(3, '0') + '.mp4';
      
      const pt = 10 + Math.round((i / clipCount) * 85);
      setProgress(pt, 'Generating segment ' + (i+1) + '/' + clipCount);
      log('▶ Clip ' + (i+1) + ': ' + fmtTime(startSec) + ' → ' + fmtTime(endSec));

      // Fast seeking with codec copy (lossless)
      await ff.run(
        '-ss', String(startSec), 
        '-i', inputName, 
        '-t', String(clipDur), 
        '-c', 'copy', 
        '-avoid_negative_ts', 'make_zero', 
        '-movflags', '+faststart', 
        outName
      );

      const data = ff.FS('readFile', outName);
      ff.FS('unlink', outName);

      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url  = URL.createObjectURL(blob);
      outputBlobs.push({ name: baseName + '_clip' + (i+1) + '.mp4', url, blob, start: startSec, end: endSec, index: i+1 });
    }

    try { ff.FS('unlink', inputName); } catch(e) {}
    setProgress(100, '🎉 Finished!');
    renderResults(outputBlobs, durSec, baseName);

  } catch (err) {
    console.error(err);
    alert('Split Error: ' + err.message);
    showSection('config');
  }
});

function renderResults(clips, durSec, baseName) {
  showSection('result');
  if (resultSummary) resultSummary.textContent = clips.length + ' clips from "' + baseName + '"';
  if (!clipsGrid) return;
  clipsGrid.innerHTML = '';
  clips.forEach(clip => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML = `
      <video src="${clip.url}" controls playsinline style="width:100%"></video>
      <div class="clip-card-body">
        <span class="clip-badge">Segment ${clip.index}</span>
        <p class="clip-title">${clip.name}</p>
        <p class="clip-time">${fmtTime(clip.start)} – ${fmtTime(clip.end)} · ${fmtBytes(clip.blob.size)}</p>
        <a href="${clip.url}" download="${clip.name}" class="clip-download-btn"><i class="ph ph-download"></i> Download</a>
      </div>`;
    clipsGrid.appendChild(card);
  });
}

// ─── ZIP Handler ──────────────────────────────────────────────────────────────
btnDownloadZip.addEventListener('click', async () => {
  if (!outputBlobs.length || !window.JSZip) return;
  const original = btnDownloadZip.innerHTML;
  btnDownloadZip.disabled = true;
  btnDownloadZip.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Zipping...';
  try {
    const zip = new JSZip();
    outputBlobs.forEach(c => zip.file(c.name, c.blob));
    const content = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = (selectedFile ? selectedFile.name.split('.')[0] : 'clips') + '_split.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } finally {
    btnDownloadZip.disabled = false;
    btnDownloadZip.innerHTML = original;
  }
});
