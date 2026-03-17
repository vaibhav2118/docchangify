/**
 * video-splitter.js – DocChangify
 * 
 * VERSION: 1.2 (Ultra-compatible mobile fix)
 * 
 * FIX: Replaced flakey HTML5 <video> metadata probe with robust FFmpeg probe.
 * Some mobile browsers hang on <video>.onloadedmetadata for high-bitrate files.
 * FFmpeg reads headers directly from the file bytes, avoiding all browser codec issues.
 */

const FFMPEG_CORE_ST_URL = 'https://unpkg.com/@ffmpeg/core-st@0.10.9/dist/ffmpeg-core.js';

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
  sec = Math.round(sec);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function fmtBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
function getExt(name) {
  var m = name.match(/\.([^.]+)$/);
  return m ? '.' + m[1].toLowerCase() : '.mp4';
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

// ─── FFmpeg Loader ────────────────────────────────────────────────────────────
async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  const FFmpegLib = window.FFmpeg;
  if (!FFmpegLib) throw new Error('FFmpeg failed to load from CDN.');

  if (initStatus) initStatus.textContent = '⚡ Starting engine...';
  
  const ff = FFmpegLib.createFFmpeg({
    corePath: FFMPEG_CORE_ST_URL,
    log: false,
    progress: (p) => {
      if (p.ratio > 0) {
        const pct = Math.min(95, Math.round(p.ratio * 100));
        setProgress(pct, 'Processing... ' + pct + '%');
      }
    }
  });

  if (initStatus) initStatus.textContent = '📥 Fetching toolkit (one-time)...';
  await ff.load();
  ffmpegInstance = ff;
  return ff;
}

// ─── File Picker & Drag ───────────────────────────────────────────────────────
fileInput.addEventListener('change', () => {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});

dropZone.addEventListener('click', (e) => {
  if (e.target.tagName === 'LABEL' || e.target.closest('label') || e.target.tagName === 'INPUT') return;
  fileInput.click();
});

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', (e) => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer && e.dataTransfer.files[0];
  if (f && (f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name))) {
    handleFile(f);
  } else {
    showConfigError('Please drop a valid video file.');
  }
});

// ─── Core Logic: The Mobile-Proof Way ─────────────────────────────────────────
async function handleFile(file) {
  selectedFile = file;
  uploadIdle.classList.add('hidden');
  uploadLoading.classList.remove('hidden');

  try {
    const ff = await getFFmpeg();
    const { fetchFile } = window.FFmpeg;

    if (initStatus) initStatus.textContent = '📂 Reading video structure...';
    
    // Write to virtual FS
    const ext = getExt(file.name);
    const inputName = 'probe' + ext;
    ff.FS('writeFile', inputName, await fetchFile(file));

    // RUN DUMMY COMMAND to get metadata in logs
    // FFmpeg v0.10.x captures its own console output internally.
    // We override console.log briefly to capture duration.
    let durationString = '';
    const originalLog = console.log;
    console.log = (msg) => {
      if (typeof msg === 'string' && msg.includes('Duration: ')) {
        durationString = msg;
      }
      originalLog(msg);
    };

    try {
      // ffmpeg -i input.mp4 (this command exits with status 1 but prints metadata)
      await ff.run('-i', inputName);
    } catch(e) { /* expected failure */ }
    
    console.log = originalLog; // Restore

    // Parse duration: "Duration: 00:00:23.45,"
    const match = durationString.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      const h = parseFloat(match[1]);
      const m = parseFloat(match[2]);
      const s = parseFloat(match[3]);
      videoDuration = h * 3600 + m * 60 + s;
    } else {
      // Fallback: use HTML5 video tag ONLY if FFmpeg fails to find duration
      videoDuration = await getDurationFallBack(file);
    }

    if (!videoDuration || videoDuration <= 0) throw new Error('Could not detect video duration.');

    ff.FS('unlink', inputName); // clean probe file
    
    fileNameEl.textContent     = file.name;
    fileSizeEl.textContent     = fmtBytes(file.size);
    fileDurationEl.textContent = fmtTime(videoDuration) + ' (' + videoDuration.toFixed(1) + 's)';
    updateClipPreview();
    showSection('config');

  } catch (err) {
    console.error('[VideoSplitter]', err);
    alert('Problem reading video: ' + err.message + '\nTry an MP4 or MOV file.');
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

// ─── UI Listeners ─────────────────────────────────────────────────────────────
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
  logPanel.textContent = ''; setProgress(0, 'Initializing...');
}
function freeBlobs() { outputBlobs.forEach(b => URL.revokeObjectURL(b.url)); outputBlobs = []; clipsGrid.innerHTML = ''; }

// ─── The Split Execution ──────────────────────────────────────────────────────
btnSplit.addEventListener('click', async () => {
  if (!selectedFile) return;
  const durSec = parseFloat(splitDuration.value);
  if (!durSec || durSec <= 0) return showConfigError('Invalid duration.');

  freeBlobs();
  logPanel.textContent = '';
  showSection('processing');
  setProgress(0, 'Preparing...');

  try {
    const ff = await getFFmpeg();
    const { fetchFile } = window.FFmpeg;
    const ext = getExt(selectedFile.name);
    const inputName = 'input' + ext;
    const baseName  = selectedFile.name.replace(/\.[^/.]+$/, '');
    const clipCount = Math.ceil(videoDuration / durSec);

    log('📂 ' + selectedFile.name);
    log('✂️ Splitting into ' + clipCount + ' clips × ' + durSec + 's\n');
    setProgress(5, 'Buffering video...');

    ff.FS('writeFile', inputName, await fetchFile(selectedFile));
    
    for (let i = 0; i < clipCount; i++) {
      const startSec = i * durSec;
      const endSec   = Math.min(startSec + durSec, videoDuration);
      const clipDur  = +(endSec - startSec).toFixed(3);
      const outName  = 'clip_' + String(i + 1).padStart(3, '0') + '.mp4';
      
      const pt = 10 + Math.round((i / clipCount) * 85);
      setProgress(pt, 'Generating clip ' + (i+1) + '/' + clipCount);
      log('▶ ' + (i+1) + ': ' + startSec.toFixed(1) + 's – ' + endSec.toFixed(1) + 's');

      await ff.run('-ss', String(startSec), '-i', inputName, '-t', String(clipDur), '-c', 'copy', '-avoid_negative_ts', 'make_zero', '-movflags', '+faststart', outName);

      const data = ff.FS('readFile', outName);
      ff.FS('unlink', outName);

      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url  = URL.createObjectURL(blob);
      outputBlobs.push({ name: baseName + '_clip' + (i+1) + '.mp4', url, blob, start: startSec, end: endSec, index: i+1 });
    }

    ff.FS('unlink', inputName);
    setProgress(100, 'All segments ready!');
    renderResults(outputBlobs, durSec, baseName);

  } catch (err) {
    console.error(err);
    alert('Splitting failed: ' + err.message);
    showSection('config');
  }
});

function renderResults(clips, durSec, baseName) {
  showSection('result');
  resultSummary.textContent = clips.length + ' segments from "' + baseName + '"';
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

btnDownloadZip.addEventListener('click', async () => {
  if (!outputBlobs.length || !window.JSZip) return;
  const original = btnDownloadZip.innerHTML;
  btnDownloadZip.disabled = true;
  btnDownloadZip.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Creating ZIP...';
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
