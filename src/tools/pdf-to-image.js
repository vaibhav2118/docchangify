// PDF to Image — uses PDF.js + JSZip CDNs
const dropZone    = document.getElementById('drop-zone');
const fileInput   = document.getElementById('file-input');
const loadingZone = document.getElementById('loading-zone');
const resultZone  = document.getElementById('result-zone');
const pagesGrid   = document.getElementById('pages-grid');
const loadingMsg  = document.getElementById('loading-msg');
const resultTitle = document.getElementById('result-title');

let canvasDataUrls = [];
let baseFileName   = 'page';

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) processFile(e.target.files[0]); });
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
});

async function processFile(file) {
  if (file.type !== 'application/pdf') { alert('Please upload a PDF file.'); return; }

  baseFileName = file.name.replace(/\.pdf$/i, '');
  dropZone.classList.add('hidden');
  loadingZone.classList.remove('hidden');
  canvasDataUrls = [];

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  for (let i = 1; i <= pdf.numPages; i++) {
    loadingMsg.textContent = `Rendering page ${i} of ${pdf.numPages}…`;
    const page     = await pdf.getPage(i);
    const scale    = 2.0;
    const viewport = page.getViewport({ scale });
    const canvas   = document.createElement('canvas');
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;
    const ctx      = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    canvasDataUrls.push({ url: canvas.toDataURL('image/png'), num: i });
  }

  resultTitle.textContent = `${pdf.numPages} Page${pdf.numPages > 1 ? 's' : ''} Converted`;
  renderGrid();
  loadingZone.classList.add('hidden');
  resultZone.classList.remove('hidden');

  // Update "Download All" button label based on page count
  const btn = document.getElementById('btn-download-all');
  if (pdf.numPages > 1) {
    btn.innerHTML = '<i class="ph ph-file-archive"></i> Download All as ZIP';
  } else {
    btn.innerHTML = '<i class="ph ph-download-simple"></i> Download Image';
  }
}

function renderGrid() {
  pagesGrid.innerHTML = '';
  canvasDataUrls.forEach(({ url, num }) => {
    const card = document.createElement('div');
    card.className = 'bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden';
    card.innerHTML = `
      <img src="${url}" alt="Page ${num}" class="w-full object-cover" />
      <div class="p-3 flex items-center justify-between">
        <span class="text-xs font-bold text-slate-500">Page ${num}</span>
        <a href="${url}" download="${baseFileName}-page-${num}.png"
           class="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1">
          <i class="ph ph-download-simple"></i> PNG
        </a>
      </div>`;
    pagesGrid.appendChild(card);
  });
}

// ── Download All ───────────────────────────────────────────
document.getElementById('btn-download-all').addEventListener('click', async () => {
  if (canvasDataUrls.length === 0) return;
  const btn = document.getElementById('btn-download-all');

  // Single page → direct PNG download (no ZIP)
  if (canvasDataUrls.length === 1) {
    const { url, num } = canvasDataUrls[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}-page-${num}.png`;
    a.click();
    return;
  }

  // Multiple pages → ZIP archive
  const origHTML = btn.innerHTML;
  btn.innerHTML  = '<i class="ph ph-spinner animate-spin"></i> Zipping…';
  btn.disabled   = true;

  try {
    if (typeof JSZip === 'undefined') throw new Error('JSZip not loaded. Please refresh and try again.');

    const zip    = new JSZip();
    const folder = zip.folder(baseFileName || 'images');

    canvasDataUrls.forEach(({ url, num }) => {
      // Convert data URL to raw base64 string
      const base64 = url.split(',')[1];
      folder.file(`${baseFileName}-page-${num}.png`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${baseFileName}-images.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert('Failed to create ZIP: ' + err.message);
  } finally {
    btn.innerHTML = origHTML;
    btn.disabled  = false;
  }
});

document.getElementById('btn-reset').addEventListener('click', () => location.reload());
