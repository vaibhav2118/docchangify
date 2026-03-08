// ── CSV to JSON — CodeMirror 5 Live Editor ───────────────

const PLACEHOLDER = `id,name,email,age
1,Jane Doe,jane@example.com,28
2,John Smith,john@example.com,34`;

// ── DOM refs ──────────────────────────────────────────────
const errorBanner = document.getElementById('error-banner');
const errorMsg    = document.getElementById('error-msg');
const statusChip  = document.getElementById('status-chip');
const arrowIcon   = document.getElementById('arrow-icon');
const rowCount    = document.getElementById('row-count');

// ── CodeMirror instances ──────────────────────────────────
let inputEditor  = null;
let outputEditor = null;

// Init after all CDN scripts have loaded
window.addEventListener('load', initEditors);

function initEditors() {
  if (!window.CodeMirror) { setTimeout(initEditors, 100); return; }

  const isDark = document.documentElement.classList.contains('dark');

  // ── CSV Input editor (plain text — CSV has no CM mode, plain monospace is fine)
  inputEditor = CodeMirror(document.getElementById('input-cm-wrap'), {
    value:             PLACEHOLDER,
    mode:              'text/plain',
    theme:             isDark ? 'material-darker' : 'default',
    lineNumbers:       true,
    lineWrapping:      false,
    tabSize:           2,
    indentWithTabs:    false,
    autofocus:         false,
  });
  inputEditor.setSize('100%', '100%');

  // ── JSON Output editor (read-only with JS/JSON highlighting)
  outputEditor = CodeMirror(document.getElementById('output-cm-wrap'), {
    value:        '',
    mode:         { name: 'javascript', json: true },
    theme:        isDark ? 'material-darker' : 'default',
    lineNumbers:  true,
    readOnly:     true,
    lineWrapping: false,
    tabSize:      2,
    matchBrackets: true,
  });
  outputEditor.setSize('100%', '100%');

  // Initial conversion from placeholder
  convert();

  // Live conversion — debounced
  inputEditor.on('change', debouncedConvert);

  // Dark mode sync
  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    setTimeout(() => {
      const dark = document.documentElement.classList.contains('dark');
      const t = dark ? 'material-darker' : 'default';
      inputEditor.setOption('theme', t);
      outputEditor.setOption('theme', t);
    }, 50);
  });
}

// ── Debounce ──────────────────────────────────────────────
let timer;
function debouncedConvert() {
  clearTimeout(timer);
  timer = setTimeout(convert, 220);
}

// ── Core conversion ───────────────────────────────────────
function convert() {
  if (!inputEditor || !outputEditor) return;
  const raw = inputEditor.getValue().trim();

  if (!raw) {
    outputEditor.setValue('');
    rowCount.textContent = '';
    clearStatus();
    return;
  }

  let result;
  try {
    result = Papa.parse(raw, {
      header:         true,
      skipEmptyLines: true,
      dynamicTyping:  true,  // auto-cast numbers & booleans
    });
  } catch (e) {
    showError('Parse error: ' + e.message);
    return;
  }

  if (result.errors && result.errors.length) {
    const e = result.errors[0];
    showError(`CSV error on row ${e.row ?? '?'}: ${e.message}`);
    // Still show partial result if data exists
    if (!result.data || !result.data.length) return;
  } else {
    errorBanner.classList.remove('show');
  }

  if (!result.data || result.data.length === 0) {
    showError('No data rows found — make sure your CSV has a header and at least one data row.');
    return;
  }

  try {
    const json = JSON.stringify(result.data, null, 2);
    outputEditor.setValue(json);
    showOk(result.data.length);
  } catch (e) {
    showError('Output error: ' + e.message);
  }
}

// ── Status helpers ────────────────────────────────────────
function showOk(rows) {
  errorBanner.classList.remove('show');
  statusChip.textContent = `✓ Converted`;
  statusChip.className   = 'ok';
  rowCount.textContent   = `${rows} row${rows !== 1 ? 's' : ''}`;
  arrowIcon.classList.remove('pulse');
  void arrowIcon.offsetWidth;
  arrowIcon.classList.add('pulse');
  setTimeout(() => arrowIcon.classList.remove('pulse'), 400);
}

function showError(msg) {
  outputEditor?.setValue('');
  rowCount.textContent   = '';
  statusChip.textContent = '✗ Error';
  statusChip.className   = 'err';
  errorBanner.classList.add('show');
  errorMsg.textContent   = msg;
}

function clearStatus() {
  errorBanner.classList.remove('show');
  statusChip.className = '';
}

// ── Beautify JSON output ──────────────────────────────────
document.getElementById('btn-beautify').addEventListener('click', () => {
  const val = outputEditor?.getValue().trim();
  if (!val) return;
  try {
    outputEditor.setValue(JSON.stringify(JSON.parse(val), null, 2));
  } catch { /* already prettified or empty */ }
});

// ── Minify JSON output ────────────────────────────────────
document.getElementById('btn-minify').addEventListener('click', () => {
  const val = outputEditor?.getValue().trim();
  if (!val) return;
  try {
    outputEditor.setValue(JSON.stringify(JSON.parse(val)));
  } catch { /* already minified or empty */ }
});

// ── Clear ─────────────────────────────────────────────────
document.getElementById('btn-clear').addEventListener('click', () => {
  inputEditor?.setValue('');
  outputEditor?.setValue('');
  clearStatus();
  rowCount.textContent = '';
  inputEditor?.focus();
});

// ── Copy input ────────────────────────────────────────────
document.getElementById('btn-copy-input').addEventListener('click', () => {
  const val = inputEditor?.getValue();
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => flash('btn-copy-input', '<i class="ph ph-check"></i> Copied!'));
});

// ── Copy JSON output ──────────────────────────────────────
document.getElementById('btn-copy-output').addEventListener('click', () => {
  const val = outputEditor?.getValue();
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => flash('btn-copy-output', '<i class="ph ph-check"></i> Copied!'));
});

function flash(id, html) {
  const btn = document.getElementById(id);
  const orig = btn.innerHTML;
  btn.innerHTML = html;
  setTimeout(() => { btn.innerHTML = orig; }, 2000);
}

// ── Download JSON ─────────────────────────────────────────
document.getElementById('btn-download').addEventListener('click', () => {
  const val = outputEditor?.getValue();
  if (!val) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([val], { type: 'application/json;charset=utf-8;' }));
  a.download = 'data.json';
  a.click();
});
