/**
 * video-splitter.js
 * DocChangify – Video Splitter Tool
 *
 * Uses FFmpeg.wasm v0.10.1 (loaded via <script> tag in HTML).
 * v0.10 runs entirely in the main thread – NO web workers, NO cross-origin issues.
 * This is the standard approach for browser-based FFmpeg tools going live.
 *
 * API used:
 *   const { createFFmpeg, fetchFile } = FFmpeg;   ← global set by the script tag
 *   const ff = createFFmpeg({ corePath, log, progress });
 *   await ff.load();
 *   ff.FS('writeFile', name, data);
 *   await ff.run(...args);
 *   const data = ff.FS('readFile', name);
 *   ff.FS('unlink', name);
 */

// ─── FFmpeg core URL (single-threaded, no SharedArrayBuffer needed) ────────────
const FFMPEG_CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js';

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const dropZone          = document.getElementById('drop-zone');
const fileInput         = document.getElementById('file-input');
const browseBtn         = document.getElementById('browse-btn');

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
let ffmpegInstance = null;  // cached; loaded only once
let outputBlobs    = [];    // [{name, url, blob, start, end, index}]

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
  const m = name.match(/\.([^.]+)$/);
  return m ? '.' + m[1].toLowerCase() : '.mp4';
}

// ─── Section control ──────────────────────────────────────────────────────────
function showSection(id) {
  [uploadSection, configSection, processingSection, resultSection]
    .forEach(s => s.classList.add('hidden'));
  document.getElementById(id + '-section').classList.remove('hidden');
}

// ─── Progress / log ───────────────────────────────────────────────────────────
function setProgress(pct, label) {
  progressBar.style.width  = pct + '%';
  progressPct.textContent  = pct + '%';
  progressLabel.textContent = label;
}

function log(msg) {
  logPanel.textContent += msg + '\n';
  logPanel.scrollTop = logPanel.scrollHeight;
}

// ─── Error banner ─────────────────────────────────────────────────────────────
function showConfigError(msg) {
  var area = document.getElementById('error-area');
  if (!area) return;
  area.innerHTML = '';
  var el = document.createElement('div');
  el.className = 'alert-banner alert-error';
  el.innerHTML = '<i class="ph ph-warning-circle text-xl flex-shrink-0"></i><span>' + msg + '</span>';
  area.appendChild(el);
  setTimeout(function() { if (area) area.innerHTML = ''; }, 7000);
}

// ─── File upload handling ─────────────────────────────────────────────────────
// NOTE: "Browse Video" is a <label for="file-input"> — the browser natively
// opens the file picker on tap. No JS required for that interaction.
// This is the correct fix for mobile Chrome where programmatic .click()
// on a display:none input is silently blocked.

fileInput.addEventListener('change', function() {
  if (fileInput.files && fileInput.files[0]) handleFile(fileInput.files[0]);
});

// Clicking the zone OUTSIDE the label also opens the picker (fallback).
// Input is NOT display:none so .click() works on Android Chrome.
dropZone.addEventListener('click', function(e) {
  if (e.target.tagName === 'LABEL' || (e.target.closest && e.target.closest('label')) ||
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
  var url = URL.createObjectURL(file);
  var tmp = document.createElement('video');
  tmp.preload = 'metadata';
  tmp.src = url;
  tmp.onloadedmetadata = function() {
    videoDuration = tmp.duration;
    URL.revokeObjectURL(url);
    if (!isFinite(videoDuration) || videoDuration <= 0) {
      alert('Could not read video duration. Please try a different file.');
      return;
    }
    showConfigSection();
  };
  tmp.onerror = function() {
    URL.revokeObjectURL(url);
    alert('Could not read video metadata. Please try a different file.');
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
    btn.style.cssText = 'border-color:#7c3aed;color:#7c3aed;background:rgba(124,58,237,0.10);';
    updateClipPreview();
  });
});

splitDuration.addEventListener('input', function() {
  document.querySelectorAll('.preset-btn').forEach(function(b) { b.removeAttribute('style'); });
  updateClipPreview();
});

function updateClipPreview() {
  var dur = parseFloat(splitDuration.value);
  if (!dur || dur <= 0 || !videoDuration) {
    clipCountPreview.classList.add('hidden');
    return;
  }
  var count = Math.ceil(videoDuration / dur);
  clipCountPreview.textContent = '→ Will generate ' + count + ' clip' + (count !== 1 ? 's' : '');
  clipCountPreview.classList.remove('hidden');
}

// ─── Reset handlers ───────────────────────────────────────────────────────────
changeFileBtn.addEventListener('click', function() { fullReset(); showSection('upload'); });
btnReset.addEventListener('click',      function() { fullReset(); showSection('upload'); });
btnStartOver.addEventListener('click',  function() { freeBlobs(); fullReset(); showSection('upload'); });

function fullReset() {
  selectedFile  = null;
  videoDuration = 0;
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

// ─── Load FFmpeg (v0.10 API) ──────────────────────────────────────────────────
async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;

  // Access the global set by the <script> tag in HTML
  var FFmpegLib = window.FFmpeg;
  if (!FFmpegLib || !FFmpegLib.createFFmpeg) {
    throw new Error('FFmpeg library not loaded. Please refresh the page.');
  }

  log('📦 Loading FFmpeg.wasm (first time may take ~20s)...');
  setProgress(3, 'Loading FFmpeg library...');

  var ff = FFmpegLib.createFFmpeg({
    corePath: FFMPEG_CORE_URL,
    log: false,  // suppress verbose internal logs (we add our own)
    progress: function(p) {
      // ratio goes 0→1 during the ffmpeg.run() call
      if (p.ratio > 0) {
        var pct = Math.min(95, Math.round(p.ratio * 100));
        setProgress(pct, 'FFmpeg processing... ' + pct + '%');
      }
    },
  });

  setProgress(5, 'Downloading FFmpeg core (~20 MB)...');
  log('⬇️  Fetching FFmpeg WASM from CDN...');

  await ff.load();

  ffmpegInstance = ff;
  log('✅ FFmpeg ready!\n');
  return ff;
}

// ─── Main split handler ────────────────────────────────────────────────────────
btnSplit.addEventListener('click', async function() {
  if (!selectedFile) return;

  var durSec = parseFloat(splitDuration.value);

  if (!durSec || durSec <= 0) {
    return showConfigError('Please enter a split duration greater than 0 seconds.');
  }
  if (durSec > videoDuration) {
    return showConfigError(
      'Split duration (' + durSec + 's) is longer than the video (' + videoDuration.toFixed(1) + 's).'
    );
  }

  freeBlobs();
  logPanel.textContent = '';
  showSection('processing');
  setProgress(0, 'Starting...');

  try {
    var ff = await getFFmpeg();
    var fetchFile = window.FFmpeg.fetchFile;

    var ext       = getExt(selectedFile.name);
    var inputName = 'input' + ext;
    var baseName  = selectedFile.name.replace(/\.[^/.]+$/, '');
    var clipCount = Math.ceil(videoDuration / durSec);

    // Write input file to virtual FS
    log('📂 File: ' + selectedFile.name + ' (' + fmtBytes(selectedFile.size) + ')');
    log('⏱  Duration: ' + videoDuration.toFixed(2) + 's');
    log('✂️  Splitting into ' + clipCount + ' clip(s) × ' + durSec + 's\n');
    setProgress(10, 'Reading file...');

    ff.FS('writeFile', inputName, await fetchFile(selectedFile));
    log('✅ File loaded into FFmpeg');

    var results = [];

    for (var i = 0; i < clipCount; i++) {
      var startSec = i * durSec;
      var endSec   = Math.min(startSec + durSec, videoDuration);
      var clipDur  = +(endSec - startSec).toFixed(3);
      var outName  = 'clip_' + String(i + 1).padStart(3, '0') + '.mp4';

      var basePct  = 10 + Math.round((i / clipCount) * 80);
      setProgress(basePct, 'Clip ' + (i + 1) + '/' + clipCount + ': ' + fmtTime(startSec) + ' → ' + fmtTime(endSec));
      log('▶ Clip ' + (i + 1) + '/' + clipCount + ':  ' + startSec.toFixed(2) + 's – ' + endSec.toFixed(2) + 's');

      await ff.run(
        '-ss', String(startSec),
        '-i',  inputName,
        '-t',  String(clipDur),
        '-c',  'copy',
        '-avoid_negative_ts', 'make_zero',
        '-movflags', '+faststart',
        outName
      );

      var data = ff.FS('readFile', outName);
      ff.FS('unlink', outName);

      var blob = new Blob([data.buffer], { type: 'video/mp4' });
      var url  = URL.createObjectURL(blob);

      results.push({
        name:  baseName + '_clip' + (i + 1) + '.mp4',
        url:   url,
        blob:  blob,
        start: startSec,
        end:   endSec,
        index: i + 1,
      });
      log('   ✓ Clip ' + (i + 1) + ' done — ' + fmtBytes(blob.size));
    }

    ff.FS('unlink', inputName);

    outputBlobs = results;
    setProgress(100, '🎉 Done!');
    log('\n✅ All ' + clipCount + ' clip(s) ready!');
    renderResults(results, durSec, baseName);

  } catch (err) {
    console.error('[VideoSplitter]', err);
    log('\n❌ ERROR: ' + err.message);
    showSection('config');
    showConfigError('Processing failed: ' + err.message + '. Please try a different video or refresh the page.');
  }
});



// ─── Render clip result cards ─────────────────────────────────────────────────
function renderResults(clips, durSec, baseName) {
  showSection('result');
  resultSummary.textContent =
    clips.length + ' clip' + (clips.length !== 1 ? 's' : '') +
    ' · ' + durSec + 's segments · "' + baseName + '"';

  clipsGrid.innerHTML = '';

  clips.forEach(function(clip) {
    var card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML =
      '<video src="' + clip.url + '" controls preload="metadata" playsinline title="' + clip.name + '"></video>' +
      '<div class="clip-card-body">' +
        '<span class="clip-badge"><i class="ph ph-film-strip"></i> Clip ' + clip.index + '</span>' +
        '<p class="clip-title">' + clip.name + '</p>' +
        '<p class="clip-time">' + fmtTime(clip.start) + ' – ' + fmtTime(clip.end) + ' &nbsp;·&nbsp; ' + fmtBytes(clip.blob.size) + '</p>' +
        '<a id="dl-clip-' + clip.index + '" href="' + clip.url + '" download="' + clip.name + '" class="clip-download-btn">' +
          '<i class="ph ph-download-simple"></i> Download' +
        '</a>' +
      '</div>';
    clipsGrid.appendChild(card);
  });
}

// ─── Download All as ZIP ───────────────────────────────────────────────────────
btnDownloadZip.addEventListener('click', async function() {
  if (!outputBlobs.length) return;

  var originalHTML = btnDownloadZip.innerHTML;
  btnDownloadZip.disabled = true;
  btnDownloadZip.innerHTML = '<i class="ph ph-circle-notch" style="animation:spin 0.7s linear infinite;display:inline-block;"></i> Creating ZIP...';

  try {
    if (!window.JSZip) {
      throw new Error('JSZip not loaded. Please refresh the page.');
    }

    var zip    = new window.JSZip();
    var folder = zip.folder('clips');
    outputBlobs.forEach(function(clip) { folder.file(clip.name, clip.blob); });

    var content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 1 },  // fast — video already compressed
    });

    var zipName = (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'clips') + '_split.zip';
    var a       = document.createElement('a');
    a.href      = URL.createObjectURL(content);
    a.download  = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);

  } catch (err) {
    console.error('[ZIP]', err);
    alert('ZIP creation failed: ' + err.message);
  } finally {
    btnDownloadZip.disabled  = false;
    btnDownloadZip.innerHTML = originalHTML;
  }
});
