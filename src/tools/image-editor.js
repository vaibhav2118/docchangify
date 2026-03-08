// ============================================================
// Unified Image Editor — all modes in one canvas engine
// ============================================================

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadScreen = document.getElementById('upload-screen');
const editorScreen = document.getElementById('editor-screen');
const mainCanvas = document.getElementById('main-canvas');
const drawCanvas = document.getElementById('draw-canvas');
const ctx = mainCanvas.getContext('2d');
const dctx = drawCanvas.getContext('2d');
const selRect = document.getElementById('sel-rect');

let originalImg = new Image();
let workingCanvas = document.createElement('canvas'); // after ops like crop/transform/text/wm applied
let wctx = workingCanvas.getContext('2d');
let fileName = 'edited';
let activeMode = 'filters';
let rotation = 0, flipH = false, flipV = false;
let history = [], historyIdx = -1;

let appliedOverlays = []; // array of { id, type, text, x, y, size, color, ... }
let activeAppliedOverlay = null; // currently dragged applied overlay
let activeOverlayOffset = {x:0, y:0};

// Filter state
const filters = { b: 100, c: 100, s: 100, bl: 0, h: 0, o: 100 };
let fineRotation = 0;

// Crop state
let isCropping = false, cropStart = {x:0,y:0}, cropEnd = {x:0,y:0}, hasCrop = false;

// Draw state
let isDrawing = false, drawMode = 'pen';
let displayScale = 1;

// Overlay (Text/Watermark) Drag state
let overlayX = null, overlayY = null;
let isDraggingOverlay = false;
let dragStartCoords = {x:0, y:0}, overlayStartCoords = {x:0, y:0};

// ─── Upload ────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });

function loadFile(file) {
  if (!file.type.startsWith('image/')) { alert('Please upload an image file.'); return; }
  fileName = file.name.replace(/\.[^.]+$/, '');
  const reader = new FileReader();
  reader.onload = e => {
    originalImg.onload = () => {
      workingCanvas.width = originalImg.width;
      workingCanvas.height = originalImg.height;
      wctx.drawImage(originalImg, 0, 0);
      saveHistory();
      setupDisplay();
      uploadScreen.classList.add('hidden');
      editorScreen.classList.remove('hidden');
    };
    originalImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setupDisplay() {
  const maxW = Math.min(workingCanvas.width, 900);
  displayScale = maxW / workingCanvas.width;
  mainCanvas.width = Math.round(workingCanvas.width * displayScale);
  mainCanvas.height = Math.round(workingCanvas.height * displayScale);
  drawCanvas.width = mainCanvas.width;
  drawCanvas.height = mainCanvas.height;
  drawCanvas.style.width = mainCanvas.width + 'px';
  drawCanvas.style.height = mainCanvas.height + 'px';
  document.getElementById('img-size-label').textContent = `${workingCanvas.width}×${workingCanvas.height}`;
  render();
}

function getFilterString() {
  return `brightness(${filters.b}%) contrast(${filters.c}%) saturate(${filters.s}%) blur(${filters.bl}px) hue-rotate(${filters.h}deg) opacity(${filters.o}%)`;
}

function render() {
  ctx.save();
  ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
  if (fineRotation !== 0) {
    ctx.translate(mainCanvas.width/2, mainCanvas.height/2);
    ctx.rotate(fineRotation * Math.PI / 180);
    ctx.translate(-mainCanvas.width/2, -mainCanvas.height/2);
  }
  ctx.filter = getFilterString();
  ctx.drawImage(workingCanvas, 0, 0, mainCanvas.width, mainCanvas.height);
  ctx.filter = 'none';
  ctx.restore();

  // Draw applied overlays
  appliedOverlays.forEach(renderAppliedOverlayObj);

  // Draw floating overlays if active
  if (activeMode === 'text') renderTextOverlay();
  if (activeMode === 'watermark') renderWatermarkOverlay();
}

function renderAppliedOverlayObj(o) {
  ctx.save();
  const scaledX = o.x * displayScale;
  const scaledY = o.y * displayScale;
  
  if (o.type === 'text') {
    const fontSize = o.size * displayScale;
    ctx.font = `${o.style} ${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    const lines = o.text.split('\n');
    const lineH = fontSize * 1.4;
    const totalH = lines.length * lineH;
    const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
    
    if (o.bgOp > 0) {
      ctx.globalAlpha = o.bgOp;
      ctx.fillStyle = '#000000';
      ctx.fillRect(scaledX - maxW/2 - 8, scaledY - totalH/2 - 8, maxW + 16, totalH + 16);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = o.color;
    lines.forEach((line, i) => {
      ctx.fillText(line, scaledX - maxW/2, scaledY - totalH/2 + i * lineH + lineH/2);
    });
    
    if (activeAppliedOverlay && activeAppliedOverlay.id === o.id) {
      ctx.strokeStyle = '#f97316';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(scaledX - maxW/2 - 8, scaledY - totalH/2 - 8, maxW + 16, totalH + 16);
    }
  } else if (o.type === 'watermark') {
    const size = o.size * displayScale;
    ctx.globalAlpha = o.opacity;
    ctx.fillStyle = o.color;
    ctx.font = `bold ${size}px Inter, sans-serif`;
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(o.text).width;
    
    if (o.pos === 'tile') {
      const sx = tw + size * 2, sy = size * 3;
      for (let y = 0; y < mainCanvas.height + sy; y += sy) {
        for (let x = 0; x < mainCanvas.width + sx; x += sx) {
          ctx.fillText(o.text, x - tw/2, y);
        }
      }
    } else {
      ctx.fillText(o.text, scaledX - tw/2, scaledY);
      if (activeAppliedOverlay && activeAppliedOverlay.id === o.id) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#f97316';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(scaledX - tw/2 - 4, scaledY - size/2 - 4, tw + 8, size + 8);
      }
    }
  }
  ctx.restore();
}

function renderTextOverlay() {
  const text = document.getElementById('txt-content').value.trim();
  if (!text) return;
  const fontSize = parseInt(document.getElementById('sl-fs').value) * displayScale;
  const color = document.getElementById('txt-color').value;
  const style = document.getElementById('txt-style').value;
  const bgOp = parseInt(document.getElementById('sl-tbo').value) / 100;
  
  if (overlayX === null) { overlayX = mainCanvas.width / 2; overlayY = mainCanvas.height / 2; }
  
  ctx.save();
  ctx.font = `${style} ${fontSize}px Inter, sans-serif`;
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const lineH = fontSize * 1.4;
  const totalH = lines.length * lineH;
  const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
  
  if (bgOp > 0) {
    ctx.globalAlpha = bgOp;
    ctx.fillStyle = '#000000';
    ctx.fillRect(overlayX - maxW/2 - 8, overlayY - totalH/2 - 8, maxW + 16, totalH + 16);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    ctx.fillText(line, overlayX - maxW/2, overlayY - totalH/2 + i * lineH + lineH/2);
  });
  
  // Draw grab hint box when not dragging
  if (!isDraggingOverlay) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.strokeRect(overlayX - maxW/2 - 8, overlayY - totalH/2 - 8, maxW + 16, totalH + 16);
  }
  ctx.restore();
}

function renderWatermarkOverlay() {
  const text = document.getElementById('wm-text').value || '© DocChangify';
  const size = parseInt(document.getElementById('sl-wms').value) * displayScale;
  const opacity = parseInt(document.getElementById('sl-wmo').value) / 100;
  const color = document.getElementById('wm-color').value;
  const pos = document.getElementById('wm-pos').value;
  
  if (overlayX === null) { overlayX = mainCanvas.width / 2; overlayY = mainCanvas.height / 2; }
  
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px Inter, sans-serif`;
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(text).width;
  
  if (pos === 'tile') {
    const sx = tw + size * 2, sy = size * 3;
    for (let y = 0; y < mainCanvas.height + sy; y += sy) {
      for (let x = 0; x < mainCanvas.width + sx; x += sx) {
        ctx.fillText(text, x - tw/2, y);
      }
    }
  } else {
    // If a static position is selected from dropdown, we override overlayX/Y just to show it, or we rely on dragging.
    // To allow dragging, we should ignore dropdown if dragging occurred, but for simplicity let's stick to the dragged coords if pos='center' or we can let 'center' mean free-move.
    // The user requested free movement. We will use the overlayX and overlayY for any non-tile position.
    ctx.fillText(text, overlayX - tw/2, overlayY);
    
    if (!isDraggingOverlay) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(overlayX - tw/2 - 4, overlayY - size/2 - 4, tw + 8, size + 8);
    }
  }
  ctx.restore();
}

// ─── Mode Tabs ─────────────────────────────────────────────
document.querySelectorAll('.tool-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeMode = tab.dataset.mode;
    document.querySelectorAll('[id^="panel-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById('panel-' + activeMode).classList.remove('hidden');
    // Show/hide draw canvas
    drawCanvas.classList.toggle('hidden', activeMode !== 'draw');
    // Reset crop and overlay
    if (activeMode !== 'crop') { selRect.style.display = 'none'; hasCrop = false; }
    if (activeMode === 'text' || activeMode === 'watermark') {
      overlayX = mainCanvas.width / 2;
      overlayY = mainCanvas.height / 2;
      mainCanvas.style.cursor = 'grab';
    } else {
      mainCanvas.style.cursor = activeMode === 'crop' ? 'crosshair' : activeMode === 'draw' ? 'crosshair' : 'default';
    }
    render();
  });
});

// ─── Filter Sliders ────────────────────────────────────────
const sliderMap = {
  'sl-b': ['b', 'vb', v => v+'%'],
  'sl-c': ['c', 'vc', v => v+'%'],
  'sl-s': ['s', 'vs', v => v+'%'],
  'sl-bl': ['bl', 'vbl', v => v+'px'],
  'sl-h': ['h', 'vh', v => v+'°'],
  'sl-o': ['o', 'vo', v => v+'%'],
};
Object.entries(sliderMap).forEach(([id, [key, valId, fmt]]) => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => {
    filters[key] = parseFloat(el.value);
    document.getElementById(valId).textContent = fmt(el.value);
    render();
  });
});

// Fine rotation
document.getElementById('sl-r').addEventListener('input', function() {
  fineRotation = parseFloat(this.value);
  document.getElementById('vr').textContent = this.value + '°';
  render();
});

// Presets
const presets = {
  original:  { b:100, c:100, s:100, bl:0, h:0, o:100 },
  grayscale: { b:100, c:110, s:0,   bl:0, h:0, o:100 },
  sepia:     { b:105, c:110, s:30,  bl:0, h:20, o:100 },
  vivid:     { b:110, c:135, s:180, bl:0, h:0, o:100 },
  cool:      { b:100, c:105, s:90,  bl:0, h:200, o:100 },
  warm:      { b:105, c:100, s:120, bl:0, h:30, o:100 },
  vintage:   { b:90,  c:90,  s:50,  bl:0, h:15, o:100 },
  dramatic:  { b:90,  c:160, s:120, bl:0, h:0, o:100 },
};
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = presets[btn.dataset.p];
    if (!p) return;
    Object.assign(filters, p);
    document.getElementById('sl-b').value = p.b; document.getElementById('vb').textContent = p.b+'%';
    document.getElementById('sl-c').value = p.c; document.getElementById('vc').textContent = p.c+'%';
    document.getElementById('sl-s').value = p.s; document.getElementById('vs').textContent = p.s+'%';
    document.getElementById('sl-bl').value = p.bl; document.getElementById('vbl').textContent = p.bl+'px';
    document.getElementById('sl-h').value = p.h; document.getElementById('vh').textContent = p.h+'°';
    document.getElementById('sl-o').value = p.o; document.getElementById('vo').textContent = p.o+'%';
    render();
  });
});

// ─── Object Hit Testing ────────────────────────────────────
function getOverlayBounds(o) {
  const tc = document.createElement('canvas').getContext('2d');
  if (o.type === 'text') {
    tc.font = `${o.style} ${o.size}px Inter, sans-serif`;
    const lines = o.text.split('\n');
    const lineH = o.size * 1.4;
    const totalH = lines.length * lineH;
    const maxW = Math.max(...lines.map(l => tc.measureText(l).width));
    return { x: o.x - maxW/2 - 8, y: o.y - totalH/2 - 8, w: maxW + 16, h: totalH + 16 };
  } else {
    if (o.pos === 'tile') return null; // can't drag tile
    tc.font = `bold ${o.size}px Inter, sans-serif`;
    const tw = tc.measureText(o.text).width;
    return { x: o.x - tw/2 - 4, y: o.y - o.size/2 - 4, w: tw + 8, h: o.size + 8 };
  }
}

// ─── Crop & Mouse interactions ─────────────────────────────
mainCanvas.addEventListener('mousedown', e => {
  const r = mainCanvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  
  if (activeMode === 'crop') {
    isCropping = true; hasCrop = false;
    cropStart = { x: mx, y: my };
    cropEnd = { ...cropStart };
    selRect.style.display = 'block';
    document.getElementById('btn-apply-crop').disabled = true;
    document.getElementById('btn-apply-crop').classList.add('opacity-50');
    return;
  }
  
  // Hit test applied overlays first
  const unscaledX = mx / displayScale;
  const unscaledY = my / displayScale;
  let hit = null;
  for (let i = appliedOverlays.length - 1; i >= 0; i--) {
      const b = getOverlayBounds(appliedOverlays[i]);
      if (b && unscaledX >= b.x && unscaledX <= b.x + b.w && unscaledY >= b.y && unscaledY <= b.y + b.h) {
          hit = appliedOverlays[i]; break;
      }
  }
  
  if (hit) {
      activeAppliedOverlay = hit;
      activeOverlayOffset = { x: unscaledX - hit.x, y: unscaledY - hit.y };
      mainCanvas.style.cursor = 'grabbing';
      render();
  } else if (activeMode === 'text' || activeMode === 'watermark') {
      isDraggingOverlay = true;
      dragStartCoords = { x: mx, y: my };
      if (overlayX === null) { overlayX = mainCanvas.width / 2; overlayY = mainCanvas.height / 2; }
      overlayStartCoords = { x: overlayX, y: overlayY };
      mainCanvas.style.cursor = 'grabbing';
  }
});
window.addEventListener('mousemove', e => {
  const r = mainCanvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;
  
  if (isCropping && activeMode === 'crop') {
    cropEnd = { x: Math.min(Math.max(mx, 0), mainCanvas.width), y: Math.min(Math.max(my, 0), mainCanvas.height) };
    const x = Math.min(cropStart.x, cropEnd.x), y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x), h = Math.abs(cropEnd.y - cropStart.y);
    selRect.style.left = x+'px'; selRect.style.top = y+'px'; selRect.style.width = w+'px'; selRect.style.height = h+'px';
    const origW = Math.round(w / displayScale), origH = Math.round(h / displayScale);
    document.getElementById('crop-coords').textContent = `${Math.round(x/displayScale)},${Math.round(y/displayScale)} → ${origW}×${origH}`;
  } else if (activeAppliedOverlay) {
    const unscaledX = mx / displayScale;
    const unscaledY = my / displayScale;
    activeAppliedOverlay.x = unscaledX - activeOverlayOffset.x;
    activeAppliedOverlay.y = unscaledY - activeOverlayOffset.y;
    render();
  } else if (isDraggingOverlay && (activeMode === 'text' || activeMode === 'watermark')) {
    const dx = mx - dragStartCoords.x;
    const dy = my - dragStartCoords.y;
    overlayX = overlayStartCoords.x + dx;
    overlayY = overlayStartCoords.y + dy;
    
    // Automatically switch dropdowns to "Custom (Drag)" to reflect that user took control
    if (activeMode === 'text') {
        const textPosSel = document.getElementById('txt-pos');
        if([...textPosSel.options].every(o => o.value !== 'drag')) {
            const opt = new Option('Custom (Dragged)', 'drag');
            textPosSel.add(opt);
            textPosSel.value = 'drag';
        } else {
            textPosSel.value = 'drag';
        }
    } else if (activeMode === 'watermark') {
        const wmPosSel = document.getElementById('wm-pos');
        if(wmPosSel.value === 'tile') wmPosSel.value = 'center'; // Don't allow drag on tile, change it
        if([...wmPosSel.options].every(o => o.value !== 'drag')) {
            const opt = new Option('Custom (Dragged)', 'drag');
            wmPosSel.add(opt);
            wmPosSel.value = 'drag';
        } else {
            wmPosSel.value = 'drag';
        }
    }
    render();
  }
});
window.addEventListener('mouseup', () => {
  if (isCropping && activeMode === 'crop') {
    isCropping = false;
    const w = Math.abs(cropEnd.x - cropStart.x), h = Math.abs(cropEnd.y - cropStart.y);
    if (w > 5 && h > 5) {
      hasCrop = true;
      document.getElementById('btn-apply-crop').disabled = false;
      document.getElementById('btn-apply-crop').classList.remove('opacity-50');
    }
  }
  if (activeAppliedOverlay) {
      activeAppliedOverlay = null;
      if (activeMode === 'text' || activeMode === 'watermark') mainCanvas.style.cursor = 'grab';
      else mainCanvas.style.cursor = activeMode === 'crop' || activeMode === 'draw' ? 'crosshair' : 'default';
      render();
      saveHistory(); // Save the new position
  }
  if (isDraggingOverlay) {
    isDraggingOverlay = false;
    if (activeMode === 'text' || activeMode === 'watermark') mainCanvas.style.cursor = 'grab';
    render(); // Remove grab hint
  }
});
document.getElementById('btn-apply-crop').addEventListener('click', () => {
  if (!hasCrop) return;
  const ox = Math.round(Math.min(cropStart.x, cropEnd.x) / displayScale);
  const oy = Math.round(Math.min(cropStart.y, cropEnd.y) / displayScale);
  const ow = Math.round(Math.abs(cropEnd.x - cropStart.x) / displayScale);
  const oh = Math.round(Math.abs(cropEnd.y - cropStart.y) / displayScale);
  // Apply filters + crop to working canvas
  const tmp = document.createElement('canvas');
  tmp.width = workingCanvas.width; tmp.height = workingCanvas.height;
  const tc = tmp.getContext('2d');
  tc.filter = getFilterString();
  tc.drawImage(workingCanvas, 0, 0);
  tc.filter = 'none';
  const out = document.createElement('canvas');
  out.width = ow; out.height = oh;
  out.getContext('2d').drawImage(tmp, ox, oy, ow, oh, 0, 0, ow, oh);
  workingCanvas.width = ow; workingCanvas.height = oh;
  wctx.drawImage(out, 0, 0);
  Object.assign(filters, presets.original);
  resetSliders();
  saveHistory();
  selRect.style.display = 'none';
  hasCrop = false;
  document.getElementById('btn-apply-crop').disabled = true;
  document.getElementById('btn-apply-crop').classList.add('opacity-50');
  setupDisplay();
});
document.getElementById('btn-clear-crop').addEventListener('click', () => { selRect.style.display='none'; hasCrop=false; });

// ─── Text ──────────────────────────────────────────────────
document.getElementById('sl-fs').addEventListener('input', function() { document.getElementById('vfs').textContent = this.value+'px'; render(); });
document.getElementById('sl-tbo').addEventListener('input', function() { document.getElementById('vtbo').textContent = this.value+'%'; render(); });
document.getElementById('txt-content').addEventListener('input', render);
document.getElementById('txt-color').addEventListener('input', render);
document.getElementById('txt-style').addEventListener('change', render);

document.getElementById('txt-pos').addEventListener('change', (e) => {
  const pos = e.target.value;
  const pad = 20;
  if(pos === 'center') { overlayX = mainCanvas.width / 2; overlayY = mainCanvas.height / 2; }
  if(pos === 'top-left') { overlayX = pad + 100; overlayY = pad + 20; }
  if(pos === 'top-right') { overlayX = mainCanvas.width - 100; overlayY = pad + 20; }
  if(pos === 'bottom-left') { overlayX = pad + 100; overlayY = mainCanvas.height - 20; }
  if(pos === 'bottom-right') { overlayX = mainCanvas.width - 100; overlayY = mainCanvas.height - 20; }
  render();
});

document.getElementById('btn-apply-text').addEventListener('click', () => {
  const text = document.getElementById('txt-content').value.trim();
  if (!text) return;

  const fontSize = parseInt(document.getElementById('sl-fs').value);
  const color = document.getElementById('txt-color').value;
  const style = document.getElementById('txt-style').value;
  const bgOp = parseInt(document.getElementById('sl-tbo').value) / 100;

  // Real coordinates on the full size canvas
  const rx = overlayX / displayScale;
  const ry = overlayY / displayScale;

  appliedOverlays.push({
      id: Date.now(),
      type: 'text',
      text,
      size: fontSize,
      color,
      style,
      bgOp,
      x: rx,
      y: ry
  });

  // Reset inputs
  document.getElementById('txt-content').value = '';
  overlayX = mainCanvas.width / 2;
  overlayY = mainCanvas.height / 2;

  saveHistory();
  render();
});

// ─── Transform Buttons ─────────────────────────────────────
document.querySelectorAll('[data-tr]').forEach(btn => {
  btn.addEventListener('click', () => {
    const tr = btn.dataset.tr;
    // Burn current filters first
    burnFilters();
    const orig = document.createElement('canvas');
    orig.width = workingCanvas.width; orig.height = workingCanvas.height;
    orig.getContext('2d').drawImage(workingCanvas, 0, 0);
    const isRotatd90 = tr === 'r90' || tr === 'r-90';
    const nw = isRotatd90 ? orig.height : orig.width;
    const nh = isRotatd90 ? orig.width : orig.height;
    workingCanvas.width = nw; workingCanvas.height = nh;
    wctx.save();
    wctx.translate(nw/2, nh/2);
    if (tr === 'r90') wctx.rotate(Math.PI/2);
    else if (tr === 'r-90') wctx.rotate(-Math.PI/2);
    else if (tr === 'r180') wctx.rotate(Math.PI);
    else if (tr === 'fh') wctx.scale(-1, 1);
    else if (tr === 'fv') wctx.scale(1, -1);
    wctx.drawImage(orig, -orig.width/2, -orig.height/2);
    wctx.restore();
    saveHistory(); setupDisplay();
  });
});

// ─── Draw ──────────────────────────────────────────────────
document.getElementById('sl-ds').addEventListener('input', function() { document.getElementById('vds').textContent = this.value+'px'; });
document.getElementById('sl-do').addEventListener('input', function() { document.getElementById('vdo').textContent = this.value+'%'; });
document.getElementById('draw-pen').addEventListener('click', () => { drawMode='pen'; document.getElementById('draw-pen').className='flex-1 btn-secondary py-2 text-xs font-bold border-orange-400 text-orange-500 bg-orange-50'; document.getElementById('draw-eraser').className='flex-1 btn-secondary py-2 text-xs font-bold'; });
document.getElementById('draw-eraser').addEventListener('click', () => { drawMode='eraser'; document.getElementById('draw-eraser').className='flex-1 btn-secondary py-2 text-xs font-bold border-orange-400 text-orange-500 bg-orange-50'; document.getElementById('draw-pen').className='flex-1 btn-secondary py-2 text-xs font-bold'; });

drawCanvas.addEventListener('mousedown', e => {
  if (activeMode !== 'draw') return;
  isDrawing = true;
  const r = drawCanvas.getBoundingClientRect();
  dctx.beginPath();
  dctx.moveTo(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mousemove', e => {
  if (!isDrawing || activeMode !== 'draw') return;
  const r = drawCanvas.getBoundingClientRect();
  const size = parseInt(document.getElementById('sl-ds').value);
  const opacity = parseInt(document.getElementById('sl-do').value) / 100;
  dctx.globalAlpha = opacity;
  if (drawMode === 'eraser') {
    dctx.globalCompositeOperation = 'destination-out';
    dctx.strokeStyle = 'rgba(0,0,0,1)';
  } else {
    dctx.globalCompositeOperation = 'source-over';
    dctx.strokeStyle = document.getElementById('draw-color').value;
  }
  dctx.lineWidth = size / displayScale;
  dctx.lineCap = 'round';
  dctx.lineJoin = 'round';
  dctx.lineTo(e.clientX - r.left, e.clientY - r.top);
  dctx.stroke();
  dctx.beginPath();
  dctx.moveTo(e.clientX - r.left, e.clientY - r.top);
});
window.addEventListener('mouseup', () => { if (isDrawing) { isDrawing = false; dctx.beginPath(); } });
document.getElementById('btn-apply-draw').addEventListener('click', () => {
  burnFilters();
  // Scale draw canvas back to original resolution
  const tmp = document.createElement('canvas');
  tmp.width = workingCanvas.width; tmp.height = workingCanvas.height;
  tmp.getContext('2d').drawImage(drawCanvas, 0, 0, drawCanvas.width, drawCanvas.height, 0, 0, workingCanvas.width, workingCanvas.height);
  wctx.globalCompositeOperation = 'source-over';
  wctx.drawImage(tmp, 0, 0);
  dctx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
  saveHistory(); setupDisplay();
});
document.getElementById('btn-clear-draw').addEventListener('click', () => { dctx.clearRect(0,0,drawCanvas.width,drawCanvas.height); });

// ─── Watermark ─────────────────────────────────────────────
document.getElementById('wm-text').addEventListener('input', render);
document.getElementById('wm-color').addEventListener('input', render);
document.getElementById('wm-pos').addEventListener('change', (e) => {
  const pos = e.target.value;
  const pad = 20;
  if(pos === 'center') { overlayX = mainCanvas.width / 2; overlayY = mainCanvas.height / 2; }
  if(pos === 'top-left') { overlayX = pad + 100; overlayY = pad + 20; }
  if(pos === 'top-right') { overlayX = mainCanvas.width - 100; overlayY = pad + 20; }
  if(pos === 'bottom-left') { overlayX = pad + 100; overlayY = mainCanvas.height - 20; }
  if(pos === 'bottom-right') { overlayX = mainCanvas.width - 100; overlayY = mainCanvas.height - 20; }
  render();
});
document.getElementById('sl-wms').addEventListener('input', function() { document.getElementById('vwms').textContent = this.value+'px'; render(); });
document.getElementById('sl-wmo').addEventListener('input', function() { document.getElementById('vwmo').textContent = this.value+'%'; render(); });
document.getElementById('btn-apply-wm').addEventListener('click', () => {
  const text = document.getElementById('wm-text').value || '© DocChangify';
  const size = parseInt(document.getElementById('sl-wms').value);
  const opacity = parseInt(document.getElementById('sl-wmo').value) / 100;
  const color = document.getElementById('wm-color').value;
  const pos = document.getElementById('wm-pos').value;
  
  // Real coordinates
  const rx = overlayX / displayScale;
  const ry = overlayY / displayScale;

  appliedOverlays.push({
      id: Date.now(),
      type: 'watermark',
      text,
      size,
      opacity,
      color,
      pos,
      x: rx,
      y: ry
  });

  // Reset
  document.getElementById('wm-text').value = '';
  overlayX = mainCanvas.width / 2;
  overlayY = mainCanvas.height / 2;

  saveHistory();
  render();
});

// ─── History (Undo/Redo) ───────────────────────────────────
function saveHistory() {
  history = history.slice(0, historyIdx + 1);
  const snap = document.createElement('canvas');
  snap.width = workingCanvas.width; snap.height = workingCanvas.height;
  snap.getContext('2d').drawImage(workingCanvas, 0, 0);
  history.push({ 
      canvas: snap, 
      filters: {...filters}, 
      rotation: fineRotation,
      overlays: JSON.parse(JSON.stringify(appliedOverlays))
  });
  historyIdx = history.length - 1;
}
document.getElementById('btn-undo').addEventListener('click', () => {
  if (historyIdx <= 0) return;
  historyIdx--;
  restoreHistory(historyIdx);
});
document.getElementById('btn-redo').addEventListener('click', () => {
  if (historyIdx >= history.length - 1) return;
  historyIdx++;
  restoreHistory(historyIdx);
});
function restoreHistory(idx) {
  const snap = history[idx];
  workingCanvas.width = snap.canvas.width; workingCanvas.height = snap.canvas.height;
  wctx.drawImage(snap.canvas, 0, 0);
  Object.assign(filters, snap.filters);
  fineRotation = snap.rotation || 0;
  appliedOverlays = JSON.parse(JSON.stringify(snap.overlays || []));
  resetSliders();
  setupDisplay();
}

// ─── Helpers ───────────────────────────────────────────────
function burnFilters() {
  const tmp = document.createElement('canvas');
  tmp.width = workingCanvas.width; tmp.height = workingCanvas.height;
  const tc = tmp.getContext('2d');
  tc.filter = getFilterString();
  if (fineRotation !== 0) {
    tc.translate(tmp.width/2, tmp.height/2);
    tc.rotate(fineRotation * Math.PI / 180);
    tc.translate(-tmp.width/2, -tmp.height/2);
  }
  tc.drawImage(workingCanvas, 0, 0);
  tc.filter = 'none';
  wctx.clearRect(0,0,workingCanvas.width,workingCanvas.height);
  wctx.drawImage(tmp, 0, 0);
  Object.assign(filters, presets.original);
  fineRotation = 0;
  resetSliders();
}
function resetSliders() {
  Object.entries({b:filters.b,c:filters.c,s:filters.s,bl:filters.bl,h:filters.h,o:filters.o}).forEach(([k,v]) => {
    const mapK = {'b':'sl-b','c':'sl-c','s':'sl-s','bl':'sl-bl','h':'sl-h','o':'sl-o'};
    const mapV = {'b':'vb','c':'vc','s':'vs','bl':'vbl','h':'vh','o':'vo'};
    const fmt = {'b':'%','c':'%','s':'%','bl':'px','h':'°','o':'%'};
    document.getElementById(mapK[k]).value = v;
    document.getElementById(mapV[k]).textContent = v + fmt[k];
  });
  document.getElementById('sl-r').value = fineRotation;
  document.getElementById('vr').textContent = fineRotation + '°';
}

// ─── Reset & New Image ─────────────────────────────────────
document.getElementById('btn-reset-all').addEventListener('click', () => {
  if (confirm('Reset to original image?')) {
    workingCanvas.width = originalImg.width; workingCanvas.height = originalImg.height;
    wctx.drawImage(originalImg, 0, 0);
    Object.assign(filters, presets.original);
    fineRotation = 0;
    resetSliders();
    dctx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
    saveHistory(); setupDisplay();
  }
});
document.getElementById('btn-new-img').addEventListener('click', () => location.reload());

// ─── Download ──────────────────────────────────────────────
function downloadAs(type) {
  const out = document.createElement('canvas');
  out.width = workingCanvas.width; out.height = workingCanvas.height;
  const octx = out.getContext('2d');
  
  if (type === 'image/jpeg') { octx.fillStyle = '#ffffff'; octx.fillRect(0,0,out.width,out.height); }
  
  octx.filter = getFilterString();
  if (fineRotation !== 0) {
    octx.translate(out.width/2, out.height/2);
    octx.rotate(fineRotation * Math.PI / 180);
    octx.translate(-out.width/2, -out.height/2);
  }
  octx.drawImage(workingCanvas, 0, 0);
  octx.filter = 'none';

  // Burn all applied overlays ONLY on download
  appliedOverlays.forEach(o => {
    octx.save();
    if (o.type === 'text') {
      octx.font = `${o.style} ${o.size}px Inter, sans-serif`;
      octx.textBaseline = 'middle';
      const lines = o.text.split('\n');
      const lineH = o.size * 1.4;
      const totalH = lines.length * lineH;
      const maxW = Math.max(...lines.map(l => octx.measureText(l).width));
      
      if (o.bgOp > 0) {
        octx.globalAlpha = o.bgOp;
        octx.fillStyle = '#000000';
        octx.fillRect(o.x - maxW/2 - 8, o.y - totalH/2 - 8, maxW + 16, totalH + 16);
        octx.globalAlpha = 1;
      }
      octx.fillStyle = o.color;
      lines.forEach((line, i) => { octx.fillText(line, o.x - maxW/2, o.y - totalH/2 + i * lineH + lineH/2); });
    } else if (o.type === 'watermark') {
      octx.globalAlpha = o.opacity;
      octx.fillStyle = o.color;
      octx.font = `bold ${o.size}px Inter, sans-serif`;
      octx.textBaseline = 'middle';
      const tw = octx.measureText(o.text).width;
      
      if (o.pos === 'tile') {
        const sx = tw + o.size * 2, sy = o.size * 3;
        for (let y = 0; y < out.height + sy; y += sy) {
          for (let x = 0; x < out.width + sx; x += sx) octx.fillText(o.text, x - tw/2, y);
        }
      } else {
        octx.fillText(o.text, o.x - tw/2, o.y);
      }
    }
    octx.restore();
  });

  const ext = type === 'image/jpeg' ? 'jpg' : 'png';
  const a = document.createElement('a');
  a.href = out.toDataURL(type, 0.92);
  a.download = `${fileName}-edited.${ext}`;
  a.click();
}
document.getElementById('btn-download-png').addEventListener('click', () => downloadAs('image/png'));
document.getElementById('btn-download-jpg').addEventListener('click', () => downloadAs('image/jpeg'));

// Preset button styling
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.className = 'px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 transition-colors text-slate-600 dark:text-slate-300 cursor-pointer';
});
