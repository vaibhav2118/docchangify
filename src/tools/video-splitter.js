/**
 * video-splitter.js
 * DocChangify – Video Splitter Tool
 * 
 * Optimized for mobile & desktop. 
 * Process happens 100% locally in the browser using FFmpeg.wasm v0.10.1.
 */

(function() {
  // ─── Constants ────────────────────────────────────────────────────────────────
  var FFMPEG_CORE_URL = 'https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js';

  // ─── DOM Elements ─────────────────────────────────────────────────────────────
  var dropZone          = document.getElementById('drop-zone');
  var fileInput         = document.getElementById('file-input');
  var browseBtn         = document.getElementById('browse-btn');

  var uploadSection     = document.getElementById('upload-section');
  var configSection     = document.getElementById('config-section');
  var processingSection = document.getElementById('processing-section');
  var resultSection     = document.getElementById('result-section');

  var fileNameEl        = document.getElementById('file-name');
  var fileSizeEl        = document.getElementById('file-size');
  var fileDurationEl    = document.getElementById('file-duration');
  var splitDurationInput = document.getElementById('split-duration');
  var clipCountPreview  = document.getElementById('clip-count-preview');
  var changeFileBtn     = document.getElementById('change-file-btn');

  var btnSplit          = document.getElementById('btn-split');
  var btnReset          = document.getElementById('btn-reset'); // in config
  var btnStartOver      = document.getElementById('btn-start-over'); // in result
  var btnDownloadZip    = document.getElementById('btn-download-zip');

  var progressBar       = document.getElementById('progress-bar');
  var progressLabel     = document.getElementById('progress-label');
  var progressPct       = document.getElementById('progress-pct');
  var logPanel          = document.getElementById('log-panel');

  var resultSummary     = document.getElementById('result-summary');
  var clipsGrid         = document.getElementById('clips-grid');

  // ─── State ────────────────────────────────────────────────────────────────────
  var selectedFile   = null;
  var videoDuration  = 0;
  var ffmpegInstance = null;
  var outputBlobs    = [];

  // ─── Utilities ────────────────────────────────────────────────────────────────
  function fmtTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    var s = Math.round(sec);
    var mins = Math.floor(s / 60);
    var secs = s % 60;
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function fmtBytes(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function getExt(name) {
    var parts = name.split('.');
    return parts.length > 1 ? '.' + parts.pop().toLowerCase() : '.mp4';
  }

  function showSection(id) {
    [uploadSection, configSection, processingSection, resultSection].forEach(function(s) {
      if (s) s.classList.add('hidden');
    });
    var target = document.getElementById(id + '-section');
    if (target) target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setProgress(pct, label) {
    if (progressBar)   progressBar.style.width = pct + '%';
    if (progressPct)     progressPct.textContent = pct + '%';
    if (progressLabel) progressLabel.textContent = label;
  }

  function log(msg) {
    if (logPanel) {
      logPanel.textContent += msg + '\n';
      logPanel.scrollTop = logPanel.scrollHeight;
    }
    console.log('[VideoSplitter]', msg);
  }

  function showConfigError(msg) {
    var area = document.getElementById('error-area');
    if (!area) {
      alert(msg);
      return;
    }
    area.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'alert-banner alert-error';
    el.innerHTML = '<i class="ph ph-warning-circle text-xl flex-shrink-0"></i><span>' + msg + '</span>';
    area.appendChild(el);
    setTimeout(function() { if (area) area.innerHTML = ''; }, 6000);
  }

  // ─── Core Logic ───────────────────────────────────────────────────────────────
  
  // Handle file selection
  function handleFile(file) {
    if (!file) return;
    
    // Simple validation
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|avi|mkv|webm)$/i.test(file.name)) {
      showConfigError('Please select a valid video file (MP4, MOV, AVI).');
      return;
    }

    selectedFile = file;
    log('Processing file selection: ' + file.name);

    // Get duration via hidden video element
    var video = document.createElement('video');
    video.preload = 'metadata';
    var url = URL.createObjectURL(file);
    video.src = url;

    // Timeout if metadata fails to load (esp. on mobile)
    var timeout = setTimeout(function() {
      if (videoDuration === 0) {
        log('Metadata load timed out. Trying to proceed anyway...');
        if (video.duration) {
          videoDuration = video.duration;
          finishMetadata();
        } else {
          showConfigError('Could not read video duration. The file might be corrupted or unsupported.');
          URL.revokeObjectURL(url);
        }
      }
    }, 5000);

    function finishMetadata() {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      if (isNaN(videoDuration) || videoDuration <= 0) {
        showConfigError('Invalid video duration detected.');
        return;
      }
      showConfigSection();
    }

    video.onloadedmetadata = function() {
      videoDuration = video.duration;
      finishMetadata();
    };

    video.onerror = function() {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      showConfigError('Error reading video file. Please try a different video.');
    };
  }

  function showConfigSection() {
    if (!selectedFile) return;
    fileNameEl.textContent     = selectedFile.name;
    fileSizeEl.textContent     = fmtBytes(selectedFile.size);
    fileDurationEl.textContent = fmtTime(videoDuration) + ' (' + videoDuration.toFixed(1) + 's)';
    
    updateClipCount();
    showSection('config');
  }

  function updateClipCount() {
    var dur = parseFloat(splitDurationInput.value);
    if (!dur || dur <= 0 || !videoDuration) {
      clipCountPreview.classList.add('hidden');
      return;
    }
    var count = Math.ceil(videoDuration / dur);
    clipCountPreview.textContent = 'Will be split into ' + count + ' clip(s)';
    clipCountPreview.classList.remove('hidden');
  }

  // ─── Event Listeners ────────────────────────────────────────────────────────
  
  // File picker binding
  fileInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  // Drop zone fallback click
  dropZone.addEventListener('click', function(e) {
    if (e.target.closest('#browse-btn') || e.target.closest('input')) return;
    fileInput.click();
  });

  // Drag handlers
  dropZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', function(e) {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
  });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    var file = e.dataTransfer && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // Presets
  document.querySelectorAll('.preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      splitDurationInput.value = btn.getAttribute('data-seconds');
      updateClipCount();
    });
  });

  splitDurationInput.addEventListener('input', updateClipCount);

  changeFileBtn.addEventListener('click', function() {
    showSection('upload');
  });

  btnReset.addEventListener('click', function() {
    splitDurationInput.value = 10;
    updateClipCount();
  });

  btnStartOver.addEventListener('click', function() {
    selectedFile = null;
    videoDuration = 0;
    fileInput.value = '';
    showSection('upload');
  });

  // ─── FFmpeg Processing ──────────────────────────────────────────────────────
  
  async function loadFFmpeg() {
    if (ffmpegInstance) return ffmpegInstance;
    
    var FF = window.FFmpeg;
    if (!FF) throw new Error('FFmpeg library failed to load from CDN.');

    setProgress(5, 'Initializing engine...');
    var ffmpeg = FF.createFFmpeg({
      corePath: FFMPEG_CORE_URL,
      log: false, // keep it quiet, we add our own logs
      progress: function(p) {
        if (p.ratio >= 0) {
          var pct = Math.floor(p.ratio * 100);
          setProgress(Math.min(98, 10 + pct), 'Processing... ' + pct + '%');
        }
      }
    });

    log('Loading FFmpeg core (~25MB)...');
    await ffmpeg.load();
    ffmpegInstance = ffmpeg;
    log('Engine loaded successfully.');
    return ffmpeg;
  }

  btnSplit.addEventListener('click', async function() {
    if (!selectedFile || videoDuration <= 0) return;

    var dur = parseFloat(splitDurationInput.value);
    if (!dur || dur <= 0) {
      showConfigError('Please enter a split duration greater than 0.');
      return;
    }

    // Reset log and state
    logPanel.textContent = '';
    outputBlobs = [];
    showSection('processing');
    setProgress(0, 'Warming up...');

    try {
      var ff = await loadFFmpeg();
      var inputExt = getExt(selectedFile.name);
      var inputName = 'input' + inputExt;
      var baseName  = selectedFile.name.replace(/\.[^/.]+$/, '');

      log('Writing file to virtual memory...');
      ff.FS('writeFile', inputName, await window.FFmpeg.fetchFile(selectedFile));
      
      var clipCount = Math.ceil(videoDuration / dur);
      log('Starting split: ' + clipCount + ' clips of ' + dur + 's each.');

      for (var i = 0; i < clipCount; i++) {
        var start = i * dur;
        var end   = Math.min(start + dur, videoDuration);
        var clipDur = (end - start).toFixed(3);
        var outName = 'clip_' + i + '.mp4';

        log('▶ Clip ' + (i + 1) + '/' + clipCount + ': ' + fmtTime(start) + ' to ' + fmtTime(end));
        
        // Accurate seek with stream capture (-ss before -i is faster but may miss frames, 
        // -ss after -i is precise but slower. We use -ss before -i for performance 
        // with -avoid_negative_ts to fix playback sync).
        await ff.run(
          '-ss', start.toFixed(3),
          '-i', inputName,
          '-t', clipDur,
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero',
          '-movflags', '+faststart',
          outName
        );

        var data = ff.FS('readFile', outName);
        ff.FS('unlink', outName);

        var blob = new Blob([data.buffer], { type: 'video/mp4' });
        var url  = URL.createObjectURL(blob);

        outputBlobs.push({
          index: i + 1,
          name: baseName + '_part' + (i + 1) + '.mp4',
          blob: blob,
          url: url,
          start: start,
          end: end
        });

        setProgress(10 + Math.floor((i + 1) / clipCount * 85), 'Completed ' + (i+1) + ' of ' + clipCount);
      }

      // Cleanup
      ff.FS('unlink', inputName);
      log('All clips generated successfully.');
      setProgress(100, 'Done!');
      renderResults(baseName, dur);

    } catch (err) {
      console.error(err);
      log('❌ ERROR: ' + err.message);
      showConfigError('Splitting failed: ' + err.message);
      showSection('config');
    }
  });

  function renderResults(baseName, dur) {
    showSection('result');
    resultSummary.textContent = outputBlobs.length + ' clips created (' + dur + 's segments) from ' + baseName;
    
    clipsGrid.innerHTML = '';
    outputBlobs.forEach(function(clip) {
      var card = document.createElement('div');
      card.className = 'clip-card';
      card.innerHTML = 
        '<video src="' + clip.url + '" controls playsinline preload="metadata"></video>' +
        '<div class="clip-card-body">' +
          '<span class="clip-badge">Part ' + clip.index + '</span>' +
          '<div class="clip-title">' + clip.name + '</div>' +
          '<div class="clip-time">' + fmtTime(clip.start) + ' - ' + fmtTime(clip.end) + ' · ' + fmtBytes(clip.blob.size) + '</div>' +
          '<a href="' + clip.url + '" download="' + clip.name + '" class="clip-download-btn"><i class="ph ph-download-simple"></i> Download</a>' +
        '</div>';
      clipsGrid.appendChild(card);
    });
  }

  // ─── ZIP Handler ────────────────────────────────────────────────────────────
  btnDownloadZip.addEventListener('click', async function() {
    if (!outputBlobs.length || !window.JSZip) return;

    var originalText = btnDownloadZip.innerHTML;
    btnDownloadZip.disabled = true;
    btnDownloadZip.innerHTML = '<i class="ph ph-circle-notch animate-spin"></i> Zipping...';

    try {
      var zip = new window.JSZip();
      outputBlobs.forEach(function(c) {
        zip.file(c.name, c.blob);
      });

      var content = await zip.generateAsync({ type: 'blob' });
      var url = URL.createObjectURL(content);
      var a = document.createElement('a');
      a.href = url;
      a.download = (selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'video_clips') + '.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 2000);
    } catch (err) {
      alert('ZIP failed: ' + err.message);
    } finally {
      btnDownloadZip.disabled = false;
      btnDownloadZip.innerHTML = originalText;
    }
  });

})();
