// ── Image to PDF — with drag-to-reorder ──────────────────
const { PDFDocument } = PDFLib;

const dropZone       = document.getElementById('drop-zone');
const fileInput      = document.getElementById('file-input');
const previewSection = document.getElementById('preview-section');
const imgGrid        = document.getElementById('img-grid');
const imgCount       = document.getElementById('img-count');
const resultZone     = document.getElementById('result-zone');
const convertInfo    = document.getElementById('convert-info');

let imageFiles = [];
let pdfBytes   = null;

// ── Inject list styles once ───────────────────────────────
const style = document.createElement('style');
style.textContent = `
  #img-grid { display: flex; flex-direction: column; gap: 10px; }
  .img-row   { display: flex; align-items: center; gap: 12px; padding: 10px 12px;
               background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px;
               cursor: default; transition: box-shadow .15s; user-select: none; }
  .dark .img-row { background: #0f172a; border-color: #1e293b; }
  .img-row.drag-over { border-color: #6366f1; border-style: dashed; background: #eef2ff; }
  .img-row.dragging  { opacity: .45; box-shadow: 0 4px 16px rgba(99,102,241,.25); }
  .img-thumb { width: 52px; height: 52px; object-fit: cover; border-radius: 8px;
               border: 1px solid #e2e8f0; flex-shrink: 0; }
  .img-badge { width: 28px; height: 28px; border-radius: 7px; display: flex;
               align-items: center; justify-content: center; color: white; font-size: 12px;
               font-weight: 800; flex-shrink: 0;
               background: linear-gradient(135deg,#6366f1,#a855f7); }
  .img-name  { flex-grow: 1; font-size: 13px; font-weight: 600; color: #334155;
               overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dark .img-name { color: #cbd5e1; }
  .img-size  { font-size: 11px; color: #94a3b8; }
  .drag-grip { color: #cbd5e1; cursor: grab; font-size: 18px; flex-shrink: 0; line-height: 1; padding: 2px 4px; }
  .drag-grip:hover { color: #6366f1; }
  .move-btns { display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }
  .move-btn  { width: 22px; height: 22px; border-radius: 5px; border: none; background: transparent;
               color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;
               font-size: 11px; transition: background .12s, color .12s; }
  .move-btn:hover:not(:disabled) { background: #ede9fe; color: #7c3aed; }
  .move-btn:disabled { opacity: .3; cursor: not-allowed; }
  .img-row .rm-btn { width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent;
                     color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center;
                     font-size: 14px; transition: background .12s, color .12s; flex-shrink: 0; }
  .img-row .rm-btn:hover { background: #fee2e2; color: #ef4444; }
`;
document.head.appendChild(style);

// ── Render sortable list ──────────────────────────────────
function renderGrid() {
  imgGrid.innerHTML = '';

  imageFiles.forEach((f, i) => {
    const url = URL.createObjectURL(f);
    const row = document.createElement('div');
    row.className  = 'img-row';
    row.draggable  = true;
    row.dataset.idx = i;

    row.innerHTML = `
      <span class="drag-grip" title="Drag to reorder">⠿</span>
      <div class="img-badge">${i + 1}</div>
      <img class="img-thumb" src="${url}" alt="${f.name}" />
      <div class="flex flex-col flex-grow min-w-0">
        <span class="img-name">${f.name}</span>
        <span class="img-size">${(f.size / 1024).toFixed(1)} KB</span>
      </div>
      <div class="move-btns">
        <button class="move-btn" data-dir="up"   data-idx="${i}" title="Move up"   ${i === 0                    ? 'disabled' : ''}>▲</button>
        <button class="move-btn" data-dir="down"  data-idx="${i}" title="Move down" ${i === imageFiles.length - 1 ? 'disabled' : ''}>▼</button>
      </div>
      <button class="rm-btn" data-idx="${i}" title="Remove">✕</button>
    `;
    imgGrid.appendChild(row);
  });

  imgCount.textContent = `(${imageFiles.length})`;

  // Up / Down
  imgGrid.querySelectorAll('.move-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (btn.dataset.dir === 'up' && idx > 0) {
        [imageFiles[idx - 1], imageFiles[idx]] = [imageFiles[idx], imageFiles[idx - 1]];
      } else if (btn.dataset.dir === 'down' && idx < imageFiles.length - 1) {
        [imageFiles[idx + 1], imageFiles[idx]] = [imageFiles[idx], imageFiles[idx + 1]];
      }
      renderGrid();
    });
  });

  // Remove
  imgGrid.querySelectorAll('.rm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      imageFiles.splice(parseInt(btn.dataset.idx), 1);
      if (imageFiles.length === 0) {
        previewSection.classList.add('hidden');
        dropZone.classList.remove('hidden');
      } else {
        renderGrid();
      }
    });
  });

  // HTML5 Drag & Drop reorder
  let dragSrcIdx = null;

  imgGrid.querySelectorAll('.img-row').forEach(row => {
    row.addEventListener('dragstart', e => {
      dragSrcIdx = parseInt(row.dataset.idx);
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      imgGrid.querySelectorAll('.img-row').forEach(r => r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      imgGrid.querySelectorAll('.img-row').forEach(r => r.classList.remove('drag-over'));
      row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', e => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const targetIdx = parseInt(row.dataset.idx);
      if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;
      const moved = imageFiles.splice(dragSrcIdx, 1)[0];
      imageFiles.splice(targetIdx, 0, moved);
      dragSrcIdx = null;
      renderGrid();
    });
  });
}

// ── Add files ──────────────────────────────────────────────
function addFiles(files) {
  const valid = Array.from(files).filter(f => f.type.startsWith('image/'));
  imageFiles.push(...valid);
  if (imageFiles.length > 0) {
    dropZone.classList.add('hidden');
    previewSection.classList.remove('hidden');
    renderGrid();
  }
}

// ── Drop zone & input ──────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); addFiles(e.dataTransfer.files); });

document.getElementById('btn-add-more').addEventListener('click', () => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
  inp.addEventListener('change', e => addFiles(e.target.files));
  inp.click();
});

// ── Convert in current order ───────────────────────────────
document.getElementById('btn-convert').addEventListener('click', async () => {
  if (imageFiles.length === 0) return;
  const btn = document.getElementById('btn-convert');
  const origHTML = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Converting…';
  btn.disabled = true;

  try {
    const pdfDoc = await PDFDocument.create();

    for (const file of imageFiles) {
      const buf = await file.arrayBuffer();
      let img;
      if (file.type === 'image/jpeg') {
        img = await pdfDoc.embedJpg(buf);
      } else {
        // Convert to PNG via canvas
        const bmp    = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width; canvas.height = bmp.height;
        canvas.getContext('2d').drawImage(bmp, 0, 0);
        const pngBuf = await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer();
        img = await pdfDoc.embedPng(pngBuf);
      }
      const page = pdfDoc.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }

    pdfBytes = await pdfDoc.save();
    convertInfo.textContent =
      `${imageFiles.length} image${imageFiles.length > 1 ? 's' : ''} combined into a ${pdfDoc.getPageCount()}-page PDF`;
    previewSection.classList.add('hidden');
    resultZone.classList.remove('hidden');
  } catch (err) {
    alert('Conversion failed: ' + err.message);
    btn.innerHTML = origHTML;
    btn.disabled  = false;
  }
});

// ── Download ───────────────────────────────────────────────
document.getElementById('btn-download').addEventListener('click', () => {
  if (!pdfBytes) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  a.download = 'images-to-pdf.pdf';
  a.click();
});

document.getElementById('btn-reset').addEventListener('click',  () => location.reload());
document.getElementById('btn-reset2').addEventListener('click', () => location.reload());
