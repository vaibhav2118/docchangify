// Split PDF - uses pdf-lib CDN
const { PDFDocument } = PDFLib;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const rangeSection = document.getElementById('range-section');
const resultZone = document.getElementById('result-zone');
const pageTo = document.getElementById('page-to');
const pageFrom = document.getElementById('page-from');
const splitInfo = document.getElementById('split-info');

let currentFileName = 'split';
let splitBytes = null;
let totalPages = 0;

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => e.target.files[0] && loadFile(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});

async function loadFile(file) {
  if (file.type !== 'application/pdf') { alert('Please upload a PDF.'); return; }
  currentFileName = file.name.replace(/\.pdf$/i, '');
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  totalPages = doc.getPageCount();
  document.getElementById('page-count-label').textContent = `📄 Loaded: ${file.name} (${totalPages} pages)`;
  pageTo.max = totalPages;
  pageFrom.max = totalPages;
  pageTo.value = totalPages;
  dropZone.classList.add('hidden');
  rangeSection.classList.remove('hidden');
  // Store for later
  rangeSection.dataset.bytes = '';
  rangeSection._fileBytes = bytes;
}

document.getElementById('btn-split').addEventListener('click', async () => {
  const from = parseInt(pageFrom.value);
  const to = parseInt(pageTo.value);
  if (from < 1 || to > totalPages || from > to) {
    alert(`Please enter a valid range between 1 and ${totalPages}.`);
    return;
  }

  const btn = document.getElementById('btn-split');
  btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Splitting...';
  btn.disabled = true;

  const originalDoc = await PDFDocument.load(rangeSection._fileBytes);
  const newDoc = await PDFDocument.create();
  const indices = [];
  for (let i = from - 1; i <= to - 1; i++) indices.push(i);
  const pages = await newDoc.copyPages(originalDoc, indices);
  pages.forEach(p => newDoc.addPage(p));
  splitBytes = await newDoc.save();

  splitInfo.textContent = `Extracted pages ${from}–${to} (${pages.length} page${pages.length !== 1 ? 's' : ''})`;
  rangeSection.classList.add('hidden');
  resultZone.classList.remove('hidden');
});

document.getElementById('btn-download').addEventListener('click', () => {
  if (!splitBytes) return;
  const blob = new Blob([splitBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentFileName}-split.pdf`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-reset').addEventListener('click', () => location.reload());
document.getElementById('btn-reset2').addEventListener('click', () => location.reload());
