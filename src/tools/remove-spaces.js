const textInput = document.getElementById('text-input');
const textOutput = document.getElementById('text-output');
const btnClear = document.getElementById('btn-clear');
const btnCopy = document.getElementById('btn-copy');
const spacesSaved = document.getElementById('spaces-saved');

const btnDownloadToggle = document.getElementById('btn-download-toggle');
const downloadMenu = document.getElementById('download-menu');
const dlOpts = document.querySelectorAll('.dl-opt');

function formatText() {
  const original = textInput.value;
  if(!original) {
      textOutput.value = '';
      spacesSaved.textContent = '0 spaces removed';
      return;
  }

  // regex to replace 2 or more spaces with ' '
  let cleaned = original.replace(/ {2,}/g, ' ');
  // replace tabs with single space
  cleaned = cleaned.replace(/\t+/g, ' ');
  // replace 3 or more newlines with 2 newlines (preserve paragraphs)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  // trim lines
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  // overall trim
  cleaned = cleaned.trim();
  
  textOutput.value = cleaned;
  
  // Calculate difference
  const saved = original.length - cleaned.length;
  spacesSaved.textContent = `${saved} characters removed`;
}

textInput.addEventListener('input', formatText);

btnClear.addEventListener('click', () => {
    textInput.value = '';
    textOutput.value = '';
    spacesSaved.textContent = '0 spaces removed';
    textInput.focus();
});

btnCopy.addEventListener('click', () => {
  if(!textOutput.value) return;
  navigator.clipboard.writeText(textOutput.value).then(() => {
    const originalText = btnCopy.innerHTML;
    btnCopy.innerHTML = '<i class="ph ph-check mr-1"></i> Copied!';
    btnCopy.classList.replace('text-slate-500', 'text-emerald-500');
    setTimeout(() => {
      btnCopy.innerHTML = originalText;
      btnCopy.classList.replace('text-emerald-500', 'text-slate-500');
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
    const text = textOutput.value;
    
    if (!text) {
      downloadMenu.classList.add('hidden');
      return;
    }

    if (format === 'txt') {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      triggerDownload(URL.createObjectURL(blob), 'cleaned-text.txt');
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
      
      doc.save('cleaned-text.pdf');
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
      triggerDownload(URL.createObjectURL(blob), 'cleaned-text.docx');
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
