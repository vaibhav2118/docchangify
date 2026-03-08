const textInput = document.getElementById('text-input');
const btnUpper = document.getElementById('btn-upper');
const btnLower = document.getElementById('btn-lower');
const btnTitle = document.getElementById('btn-title');
const btnSentence = document.getElementById('btn-sentence');
const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');

const btnDownloadToggle = document.getElementById('btn-download-toggle');
const downloadMenu = document.getElementById('download-menu');
const dlOpts = document.querySelectorAll('.dl-opt');

// Store last cursor position to prevent jumping
let cursorStart = 0;
let cursorEnd = 0;

function saveCursor() {
  cursorStart = textInput.selectionStart;
  cursorEnd = textInput.selectionEnd;
}

function restoreCursor() {
  textInput.setSelectionRange(cursorStart, cursorEnd);
}

// UPPERCASE
btnUpper.addEventListener('click', () => {
    if(!textInput.value) return;
    saveCursor();
    textInput.value = textInput.value.toUpperCase();
    restoreCursor();
});

// lowercase
btnLower.addEventListener('click', () => {
    if(!textInput.value) return;
    saveCursor();
    textInput.value = textInput.value.toLowerCase();
    restoreCursor();
});

// Title Case
btnTitle.addEventListener('click', () => {
    if(!textInput.value) return;
    saveCursor();
    textInput.value = textInput.value.toLowerCase().replace(/(?:^|\s|-|\/)\w/g, function(match) {
        return match.toUpperCase();
    });
    restoreCursor();
});

// Sentence case
btnSentence.addEventListener('click', () => {
    if(!textInput.value) return;
    saveCursor();
    // Lowercase everything, then capitalize first letter of string and after [.!?]
    let text = textInput.value.toLowerCase();
    textInput.value = text.replace(/(^\s*\w|[\.\!\?]\s*\w)/g, function(match) {
        return match.toUpperCase();
    });
    restoreCursor();
});

btnClear.addEventListener('click', () => {
    textInput.value = '';
    textInput.focus();
});

btnCopy.addEventListener('click', () => {
  if(!textInput.value) return;
  navigator.clipboard.writeText(textInput.value).then(() => {
    const originalText = btnCopy.innerHTML;
    btnCopy.innerHTML = '<i class="ph ph-check"></i> Copied!';
    btnCopy.classList.replace('bg-indigo-600', 'bg-emerald-500');
    btnCopy.classList.replace('hover:bg-indigo-700', 'hover:bg-emerald-600');
    btnCopy.classList.replace('shadow-indigo-500/20', 'shadow-emerald-500/20');
    setTimeout(() => {
      btnCopy.innerHTML = originalText;
      btnCopy.classList.replace('bg-emerald-500', 'bg-indigo-600');
      btnCopy.classList.replace('hover:bg-emerald-600', 'hover:bg-indigo-700');
      btnCopy.classList.replace('shadow-emerald-500/20', 'shadow-indigo-500/20');
    }, 2000);
  });
});

// ── Download Menu Toggle ──────────────────────────────────
btnDownloadToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  downloadMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!downloadMenu.contains(e.target)) {
    downloadMenu.classList.add('hidden');
  }
});

// ── Download Handling ─────────────────────────────────────
dlOpts.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const format = e.currentTarget.dataset.format;
    const text = textInput.value;
    
    if (!text) {
      downloadMenu.classList.add('hidden');
      return;
    }

    if (format === 'txt') {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      triggerDownload(URL.createObjectURL(blob), 'formatted-text.txt');
    } 
    else if (format === 'pdf') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth() - (margin * 2);
      
      doc.setFont("helvetica");
      doc.setFontSize(12);
      
      // Split text into lines that fit the page width
      const splitText = doc.splitTextToSize(text, pageWidth);
      doc.text(splitText, margin, margin);
      
      doc.save('formatted-text.pdf');
    }
    else if (format === 'docx') {
      const { Document, Packer, Paragraph, TextRun } = docx;
      
      const paragraphs = text.split('\n').map(line => {
        return new Paragraph({
          children: [new TextRun(line)]
        });
      });

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs
        }]
      });

      const blob = await Packer.toBlob(doc);
      triggerDownload(URL.createObjectURL(blob), 'formatted-text.docx');
    }
    
    downloadMenu.classList.add('hidden');
  });
});

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
