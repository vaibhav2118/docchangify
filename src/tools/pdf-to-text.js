// PDF to Text - uses PDF.js loaded via CDN script tag in HTML
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultZone = document.getElementById('result-zone');
const extractedText = document.getElementById('extracted-text');
const pageInfo = document.getElementById('page-info');
const btnReset = document.getElementById('btn-reset');
const btnCopy = document.getElementById('btn-copy');
const btnDownloadTxt = document.getElementById('btn-download-txt');

let currentFileName = 'extracted';

function showLoading(msg = 'Extracting text...') {
  dropZone.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-4 py-16">
      <div class="spinner"></div>
      <p class="text-slate-500 font-semibold">${msg}</p>
    </div>`;
}

async function processFile(file) {
  if (file.type !== 'application/pdf') {
    alert('Please upload a PDF file.');
    return;
  }
  currentFileName = file.name.replace(/\.pdf$/i, '');
  showLoading('Extracting text from PDF...');

  const arrayBuffer = await file.arrayBuffer();
  // pdfjsLib is injected by the CDN script tag
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let allText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    allText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  extractedText.value = allText.trim() || '[No text found. This PDF may be image-based.]';
  pageInfo.textContent = `✓ Extracted from ${pdf.numPages} page(s)`;

  dropZone.classList.add('hidden');
  resultZone.classList.remove('hidden');
}

// Drag & Drop
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => e.target.files[0] && processFile(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});

// Actions
btnReset.addEventListener('click', () => {
  location.reload();
});

btnCopy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(extractedText.value);
  const orig = btnCopy.innerHTML;
  btnCopy.innerHTML = '<i class="ph ph-check"></i> Copied!';
  setTimeout(() => btnCopy.innerHTML = orig, 2000);
});

btnDownloadTxt.addEventListener('click', () => {
  const blob = new Blob([extractedText.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentFileName}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});
