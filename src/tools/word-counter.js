const textInput = document.getElementById('text-input');
const statWords = document.getElementById('stat-words');
const statChars = document.getElementById('stat-chars');
const statSentences = document.getElementById('stat-sentences');
const statTime = document.getElementById('stat-time');

const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');
const btnUpload = document.getElementById('btn-upload');
const fileUpload = document.getElementById('file-upload');
const btnDownload = document.getElementById('btn-download');

function analyzeText() {
    const text = textInput.value;
    
    // Characters
    statChars.textContent = text.length;
    
    // Words
    const words = text.match(/\b[-?(\w+)?]+\b/gi);
    const wordCount = words ? words.length : 0;
    statWords.textContent = wordCount;
    
    // Sentences
    const sentences = text.match(/[\w|)][.?!]+(\s|$)/g);
    statSentences.textContent = sentences ? sentences.length : 0;
    
    // Read Time (assuming 200 words per minute)
    const minutes = Math.ceil(wordCount / 200);
    statTime.textContent = wordCount === 0 ? '0m' : `${minutes}m`;
}

textInput.addEventListener('input', analyzeText);

btnClear.addEventListener('click', () => {
    textInput.value = '';
    analyzeText();
    textInput.focus();
});

btnCopy.addEventListener('click', () => {
  if(!textInput.value) return;
  navigator.clipboard.writeText(textInput.value).then(() => {
    const originalText = btnCopy.innerHTML;
    btnCopy.innerHTML = '<i class="ph ph-check mr-1"></i> Copied!';
    btnCopy.classList.replace('text-slate-500', 'text-blue-500');
    setTimeout(() => {
      btnCopy.innerHTML = originalText;
      btnCopy.classList.replace('text-blue-500', 'text-slate-500');
    }, 2000);
  });
});

// ── File Upload (TXT, MD, PDF) ────────────────────────────
btnUpload.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', (e) => {
  if (e.target.files.length) {
    processFile(e.target.files[0]);
  }
  e.target.value = ''; // reset so same file can be selected again
});

// Drag and Drop support for the text editor
textInput.addEventListener('dragover', (e) => {
  e.preventDefault();
  textInput.classList.add('bg-blue-50', 'dark:bg-slate-700');
});
textInput.addEventListener('dragleave', () => {
  textInput.classList.remove('bg-blue-50', 'dark:bg-slate-700');
});
textInput.addEventListener('drop', (e) => {
  e.preventDefault();
  textInput.classList.remove('bg-blue-50', 'dark:bg-slate-700');
  if (e.dataTransfer.files.length) {
    processFile(e.dataTransfer.files[0]);
  }
});

async function processFile(file) {
  const originalPlaceholder = textInput.placeholder;
  textInput.value = '';
  textInput.placeholder = 'Extracting text...';
  analyzeText();

  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        textInput.placeholder = `Extracting page ${i} of ${pdf.numPages}...`;
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      textInput.value = fullText.trim();
    } else {
      // Treat as plain text (txt, md, csv, etc.)
      const text = await file.text();
      textInput.value = text;
    }
  } catch (error) {
    alert('Error reading file: ' + error.message);
  } finally {
    textInput.placeholder = originalPlaceholder;
    analyzeText();
  }
}

// ── Download Text ─────────────────────────────────────────
btnDownload.addEventListener('click', () => {
    if (!textInput.value) return;
    const blob = new Blob([textInput.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "word-count-document.txt");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Run once on load just in case of browser autofill
analyzeText();
