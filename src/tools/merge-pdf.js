// ── Merge PDF — with drag-to-reorder ─────────────────────
const { PDFDocument } = PDFLib;

const dropZone        = document.getElementById('drop-zone');
const fileInput       = document.getElementById('file-input');
const fileListSection = document.getElementById('file-list-section');
const fileListEl      = document.getElementById('file-list');
const fileCountEl     = document.getElementById('file-count');
const resultZone      = document.getElementById('result-zone');
const mergeInfo       = document.getElementById('merge-info');
const btnMerge        = document.getElementById('btn-merge');
const btnAddMore      = document.getElementById('btn-add-more');
const btnDownload     = document.getElementById('btn-download');

let pdfFiles   = [];
let mergedBytes = null;

// ── Render list with drag handles + up/down buttons ───────
function renderFileList() {
  fileListEl.innerHTML = '';

  pdfFiles.forEach((f, i) => {
    const li = document.createElement('li');
    li.className =
      'flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-shadow cursor-grab active:cursor-grabbing select-none';
    li.draggable = true;
    li.dataset.idx = i;

    li.innerHTML = `
      <!-- Drag handle -->
      <span class="drag-handle text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 cursor-grab flex-shrink-0 px-1" title="Drag to reorder">
        <i class="ph ph-dots-six-vertical text-lg"></i>
      </span>

      <!-- Number badge -->
      <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 text-sm font-bold"
           style="background:linear-gradient(135deg,#ef4444,#f97316);">${i + 1}</div>

      <!-- File info -->
      <div class="flex-grow min-w-0">
        <p class="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">${f.name}</p>
        <p class="text-xs text-slate-400">${(f.size / 1024).toFixed(1)} KB</p>
      </div>

      <!-- Up / Down buttons -->
      <div class="flex flex-col gap-0.5 flex-shrink-0">
        <button data-move="up" data-idx="${i}"
          class="btn-move p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          title="Move up" ${i === 0 ? 'disabled' : ''}>
          <i class="ph ph-caret-up text-sm"></i>
        </button>
        <button data-move="down" data-idx="${i}"
          class="btn-move p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          title="Move down" ${i === pdfFiles.length - 1 ? 'disabled' : ''}>
          <i class="ph ph-caret-down text-sm"></i>
        </button>
      </div>

      <!-- Remove -->
      <button data-idx="${i}" class="btn-remove p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700 transition-colors flex-shrink-0" title="Remove">
        <i class="ph ph-x"></i>
      </button>`;

    fileListEl.appendChild(li);
  });

  fileCountEl.textContent = `(${pdfFiles.length} file${pdfFiles.length !== 1 ? 's' : ''})`;

  // ── Up/Down button handlers ────────────────────────────
  document.querySelectorAll('.btn-move').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const dir = btn.dataset.move;
      if (dir === 'up' && idx > 0) {
        [pdfFiles[idx - 1], pdfFiles[idx]] = [pdfFiles[idx], pdfFiles[idx - 1]];
      } else if (dir === 'down' && idx < pdfFiles.length - 1) {
        [pdfFiles[idx + 1], pdfFiles[idx]] = [pdfFiles[idx], pdfFiles[idx + 1]];
      }
      renderFileList();
    });
  });

  // ── Remove button handlers ─────────────────────────────
  document.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      pdfFiles.splice(parseInt(btn.dataset.idx), 1);
      if (pdfFiles.length === 0) {
        fileListSection.classList.add('hidden');
        dropZone.classList.remove('hidden');
      } else {
        renderFileList();
      }
    });
  });

  // ── HTML5 Drag-and-Drop reorder ───────────────────────
  let dragSrcIdx = null;

  fileListEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('dragstart', e => {
      dragSrcIdx = parseInt(li.dataset.idx);
      li.classList.add('opacity-50', 'ring-2', 'ring-indigo-400');
      e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('opacity-50', 'ring-2', 'ring-indigo-400');
      fileListEl.querySelectorAll('li').forEach(el => el.classList.remove('border-indigo-400', 'border-dashed'));
    });

    li.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      // Highlight drop target
      fileListEl.querySelectorAll('li').forEach(el => el.classList.remove('border-indigo-400', 'border-dashed'));
      li.classList.add('border-indigo-400', 'border-dashed');
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('border-indigo-400', 'border-dashed');
    });

    li.addEventListener('drop', e => {
      e.preventDefault();
      li.classList.remove('border-indigo-400', 'border-dashed');
      const targetIdx = parseInt(li.dataset.idx);
      if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;

      // Reorder array
      const moved = pdfFiles.splice(dragSrcIdx, 1)[0];
      pdfFiles.splice(targetIdx, 0, moved);
      dragSrcIdx = null;
      renderFileList();
    });
  });
}

// ── Add files ──────────────────────────────────────────────
function addFiles(newFiles) {
  for (const f of newFiles) {
    if (f.type === 'application/pdf') pdfFiles.push(f);
  }
  if (pdfFiles.length > 0) {
    dropZone.classList.add('hidden');
    fileListSection.classList.remove('hidden');
    renderFileList();
  }
}

// ── Drop zone & file input ─────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { addFiles(Array.from(e.target.files)); e.target.value = ''; });
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()=> dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); addFiles(Array.from(e.dataTransfer.files)); });

btnAddMore.addEventListener('click', () => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/pdf'; inp.multiple = true;
  inp.addEventListener('change', e => { addFiles(Array.from(e.target.files)); });
  inp.click();
});

// ── Merge ──────────────────────────────────────────────────
btnMerge.addEventListener('click', async () => {
  if (pdfFiles.length < 2) { alert('Please add at least 2 PDF files.'); return; }

  const origHTML = btnMerge.innerHTML;
  btnMerge.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Merging…';
  btnMerge.disabled = true;

  try {
    const mergedDoc = await PDFDocument.create();
    for (const f of pdfFiles) {
      const bytes = await f.arrayBuffer();
      const doc   = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      pages.forEach(page => mergedDoc.addPage(page));
    }
    mergedBytes = await mergedDoc.save();
    mergeInfo.textContent = `${pdfFiles.length} files merged — ${mergedDoc.getPageCount()} total pages`;
    fileListSection.classList.add('hidden');
    resultZone.classList.remove('hidden');
  } catch (err) {
    alert('Failed to merge: ' + err.message);
    btnMerge.innerHTML = origHTML;
    btnMerge.disabled = false;
  }
});

// ── Download ───────────────────────────────────────────────
btnDownload.addEventListener('click', () => {
  if (!mergedBytes) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([mergedBytes], { type: 'application/pdf' }));
  a.download = 'merged.pdf';
  a.click();
});

// ── Reset ──────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click',  () => location.reload());
document.getElementById('btn-reset2').addEventListener('click', () => location.reload());
