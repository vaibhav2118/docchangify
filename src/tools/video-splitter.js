/**
 * video-splitter.js  –  DocChangify
 *
 * Uses @ffmpeg/ffmpeg@0.10.1 with @ffmpeg/core-st@0.10.9 (SINGLE-THREADED core).
 *
 * KEY DIFFERENCE vs @ffmpeg/core (multi-threaded):
 *   @ffmpeg/core      → uses pthreads → needs SharedArrayBuffer → needs COOP+COEP headers
 *   @ffmpeg/core-st   → single-threaded → NO SharedArrayBuffer → works on ALL browsers + mobile
 *
 * Works on: Desktop Chrome/Firefox/Safari, Android Chrome, iOS Safari 15+
 * No server required. No upload. 100% local processing.
 */

// ─── Single-threaded FFmpeg core — no SharedArrayBuffer needed ────────────────
const FFMPEG_CORE_ST_URL = 'https://unpkg.com/@ffmpeg/core-st@0.10.9/dist/ffmpeg-core.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const dropZone          = document.getElementById('drop-zone');
const fileInput         = document.getElementById('file-input');

const uploadSection     = document.getElementById('upload-section');
const configSection     = document.getElementById('config-section');
const processingSection = document.getElementById('processing-section');
const resultSection     = document.getElementById('result-section');

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

// ─── Section switcher ─────────────────────────────────────────────────────────
function showSection(id) {
  var sections = [uploadSection, configSection, processingSection, resultSection];
  sections.forEach(function(s) { s.classList.add('hidden'); });
  document.getElementById(id + '-section').classList.remove('hidden');
}

// ─── Progress helpers ─────────────────────────────────────────────────────────
function setProgress(pct, label) {
  progressBar.style.width   = pct + '%';
  progressPct.textContent   = pct + '%';
  progressLabel.textContent = label;
}
function log(msg) {
  logPanel.textContent += msg + '\n';
  logPanel.scrollTop = logPanel.scrollHeight;
}

// ─── Error banner (inside config section) ─────────────────────────────────────
function showConfigError(msg) {
  var area = document.getElementById('error-area');
  if (!area) return;
  area.innerHTML = '';
  var el = document.createElement('div');
  el.className = 'alert-banner alert-error';
  el.innerHTML = '<i class="ph ph-warning-circle text-xl flex-shrink-0"></i><span>' + msg + '</span>';
  area.appendChild(el);
  setTimeout(function() { if (area) area.innerHTML = ''; }, 9000);
}

// ─── File upload handling ─────────────────────────────────────────────────────
// "Browse Video" is a <label for="file-input"> — browser natively opens
// file picker on tap (works on all mobile browsers without JS).

fileInput.addEventListener('change', function() {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});

// Clicking the zone OUTSIDE the label also opens the picker
dropZone.addEventListener('click', function(e) {
  if (e.target.tagName === 'LABEL' ||
     (e.target.closest && e.target.closest('label')) ||
      e.target.tagName === 'INPUT') return;
  fileInput.click();
});

// Drag & drop (desktop)
dropZone.addEventListener('dragover', function(e) {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', function(e) {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('dragend', function() {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', function(e) {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  var f = e.dataTransfer && e.dataTransfer.files[0];
  if (f && (f.type.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm)$/i.test(f.name))) {
    handleFile(f);
  } else {
    showConfigError('Please drop a valid video file (MP4, MOV, AVI).');
  }
});

function handleFile(file) {
  selectedFile = file;
  var objectUrl = URL.createObjectURL(file);
  var tmp = document.createElement('video');
  tmp.preload = 'metadata';
  tmp.src = objectUrl;
  tmp.onloadedmetadata = function() {
    videoDuration = tmp.duration;
    URL.revokeObjectURL(objectUrl);
    tmp.removeAttribute('src');
    if (!isFinite(videoDuration) || videoDuration <= 0) {
      alert('Could not read video duration. Please try a different file.');
      return;
    }
    showConfigSection();
  };
  tmp.onerror = function() {
    URL.revokeObjectURL(objectUrl);
    alert('Could not read this video file. Please try MP4 or MOV format.');
  };
}

function showConfigSection() {
  fileNameEl.textContent     = selectedFile.name;
  fileSizeEl.textContent     = fmtBytes(selectedFile.size);
  fileDurationEl.textContent = fmtTime(videoDuration) + ' (' + videoDuration.toFixed(1) + 's)';
  updateClipPreview();
  showSection('config');
}

// ─── Duration presets ─────────────────────────────────────────────────────────
document.querySelectorAll('.preset-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    splitDuration.value = btn.getAttribute('data-seconds');
    document.querySelectorAll('.preset-btn').forEach(function(b) { b.removeAttribute('style'); });
    btn.style.cssText = 'border-color:#7c3aed;color:#7c3aed;background:rgba(124,58,237,0.12);';
    updateClipPreview();
  });
});
splitDuration.addEventListener('input', function() {
  document.querySelectorAll('.preset-btn').forEach(function(b) { b.removeAttribute('style'); });
  updateClipPreview();
});

function updateClipPreview() {
  var dur = parseFloat(splitDuration.value);
  if (!dur || dur <= 0 || !videoDuration) { clipCountPreview.classList.add('hidden'); return; }
  var count = Math.ceil(videoDuration / dur);
  clipCountPreview.textContent = '→ Will generate ' + count + ' clip' + (count !== 1 ? 's' : '');
  clipCountPreview.classList.remove('hidden');
}

// ─── Reset handlers ───────────────────────────────────────────────────────────
changeFileBtn.addEventListener('click', function() { doReset(); showSection('upload'); });
btnReset.addEventListener('click',      function() { doReset(); showSection('upload'); });
btnStartOver.addEventListener('click',  function() { freeBlobs(); doReset(); showSection('upload'); });

function doReset() {
  selectedFile = null; videoDuration = 0;
  fileInput.value = '';
  splitDuration.value = 10;
  clipCountPreview.classList.add('hidden');
  document.querySelectorAll('.preset-btn').forEach(function(b) { b.removeAttribute('style'); });
  logPanel.textContent = '';
  setProgress(0, 'Initializing...');
}
function freeBlobs() {
  outputBlobs.forEach(function(b) { URL.revokeObjectURL(b.url); });
  outputBlobs = [];
  clipsGrid.innerHTML = '';
}

// ─── Load FFmpeg with SINGLE-THREADED core ────────────────────────────────────
async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  var FFmpegLib = window.FFmpeg;
  if (!FFmpegLib || !FFmpegLib.createFFmpeg) {
    throw new Error('FFmpeg library not loaded. Please refresh the page.');
  }

  log('📦 Loading FFmpeg (single-threaded core)...');
  log('   Works on all browsers including mobile — no special headers needed.');
  setProgress(3, 'Loading FFmpeg library...');

  var ff = FFmpegLib.createFFmpeg({
    // @ffmpeg/core-st = SINGLE-THREADED → NO SharedArrayBuffer → works on mobile
    corePath: FFMPEG_CORE_ST_URL,
    log: false,
    progress: function(p) {
      if (p.ratio > 0) {
        var pct = Math.min(95, Math.round(p.ratio * 100));
        setProgress(pct, 'FFmpeg processing... ' + pct + '%');
      }
    },
  });

  setProgress(5, 'Downloading FFmpeg core (~10 MB, first time only)...');
  log('⬇️  Downloading single-threaded FFmpeg WASM...');

  await ff.load();

  ffmpegInstance = ff;
  log('✅ FFmpeg ready!\n');
  return ff;
}

// ─── Main split handler ────────────────────────────────────────────────────────
btnSplit.addEventListener('click', async function() {
  if (!selectedFile) return;

  var durSec = parseFloat(splitDuration.value);
  if (!durSec || durSec <= 0) return showConfigError('Please enter a duration greater than 0 seconds.');
  if (durSec >= videoDuration) return showConfigError(
    'Duration (' + durSec + 's) must be shorter than the video (' + videoDuration.toFixed(1) + 's).'
  );

  freeBlobs();
  logPanel.textContent = '';
  showSection('processing');
  setProgress(0, 'Starting...');

  try {
    var ff        = await getFFmpeg();
    var fetchFile = window.FFmpeg.fetchFile;

    var ext       = getExt(selectedFile.name);
    var inputName = 'input' + ext;
    var baseName  = selectedFile.name.replace(/\.[^/.]+$/, '');
    var clipCount = Math.ceil(videoDuration / durSec);

    log('📂 ' + selectedFile.name + ' (' + fmtBytes(selectedFile.size) + ')');
    log('⏱  ' + videoDuration.toFixed(2) + 's  →  ' + clipCount + ' clips × ' + durSec + 's\n');
    setProgress(10, 'Reading file into memory...');

    // Load file into FFmpeg virtual FS
    ff.FS('writeFile', inputName, await fetchFile(selectedFile));
    log('✅ File loaded\n');

    var results = [];

    for (var i = 0; i < clipCount; i++) {
      var startSec = i * durSec;
      var endSec   = Math.min(startSec + durSec, videoDuration);
      var clipDur  = +(endSec - startSec).toFixed(3);
      var outName  = 'clip_' + String(i + 1).padStart(3, '0') + '.mp4';
      var pct      = 10 + Math.round((i / clipCount) * 80);

      setProgress(pct, 'Clip ' + (i+1) + '/' + clipCount + ' (' + fmtTime(startSec) + '–' + fmtTime(endSec) + ')');
      log('✂️  Clip ' + (i+1) + '/' + clipCount + ':  ' + startSec.toFixed(2) + 's – ' + endSec.toFixed(2) + 's');

      // Stream-copy: no re-encode → instant, lossless, exact segments
      await ff.run(
        '-ss',  String(startSec),
        '-i',   inputName,
        '-t',   String(clipDur),
        '-c',   'copy',
        '-avoid_negative_ts', 'make_zero',
        '-movflags', '+faststart',
        outName
      );

      var data = ff.FS('readFile', outName);
      ff.FS('unlink', outName);

      var blob = new Blob([data.buffer], { type: 'video/mp4' });
      var url  = URL.createObjectURL(blob);
      results.push({ name: baseName + '_clip' + (i+1) + '.mp4', url, blob, start: startSec, end: endSec, index: i+1 });
      log('   ✓ ' + fmtBytes(blob.size));
    }

    try { ff.FS('unlink', inputName); } catch(e) {}

    outputBlobs = results;
    setProgress(100, '🎉 Done!');
    log('\n✅ ' + clipCount + ' clip(s) ready!');
    renderResults(results, durSec, baseName);

  } catch (err) {
    console.error('[VideoSplitter]', err);
    log('\n❌ ' + err.message);
    showSection('config');
    showConfigError('Processing failed: ' + err.message);
  }
});

// ─── Render result cards ───────────────────────────────────────────────────────
function renderResults(clips, durSec, baseName) {
  showSection('result');
  resultSummary.textContent =
    clips.length + ' clip' + (clips.length !== 1 ? 's' : '') +
    ' · ' + durSec + 's each · "' + baseName + '"';

  clipsGrid.innerHTML = '';
  clips.forEach(function(clip) {
    var card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML =
      '<video src="' + clip.url + '" controls preload="metadata" playsinline ' +
            'style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#000;"></video>' +
      '<div class="clip-card-body">' +
        '<span class="clip-badge"><i class="ph ph-film-strip"></i> Clip ' + clip.index + '</span>' +
        '<p class="clip-title">' + clip.name + '</p>' +
        '<p class="clip-time">' + fmtTime(clip.start) + ' – ' + fmtTime(clip.end) +
          ' &nbsp;·&nbsp; ' + fmtBytes(clip.blob.size) + '</p>' +
        '<a href="' + clip.url + '" download="' + clip.name + '" class="clip-download-btn">' +
          '<i class="ph ph-download-simple"></i> Download' +
        '</a>' +
      '</div>';
    clipsGrid.appendChild(card);
  });
}

// ─── Download All ZIP ─────────────────────────────────────────────────────────
btnDownloadZip.addEventListener('click', async function() {
  if (!outputBlobs.length) return;
  var origHTML = btnDownloadZip.innerHTML;
  btnDownloadZip.disabled = true;
  btnDownloadZip.innerHTML = '<i class="ph ph-circle-notch" style="animation:spin 0.7s linear infinite;display:inline-block;"></i> Creating ZIP...';

  try {
    if (!window.JSZip) throw new Error('JSZip not loaded.');
    var zip    = new window.JSZip();
    var folder = zip.folder('clips');
    outputBlobs.forEach(function(c) { folder.file(c.name, c.blob); });

    var content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
    var zipName = (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'clips') + '_split.zip';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(content);
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
  } catch (err) {
    alert('ZIP error: ' + err.message);
  } finally {
    btnDownloadZip.disabled  = false;
    btnDownloadZip.innerHTML = origHTML;
  }
});
