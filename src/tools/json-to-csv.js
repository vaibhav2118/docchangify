// ── JSON to CSV — CodeMirror 5 Live Editor ───────────────
// Waits for CodeMirror to be available (loaded via non-module CDN scripts)

const PLACEHOLDER = `[
  {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
]`;

// ── DOM refs ──────────────────────────────────────────────
const errorBanner = document.getElementById('error-banner');
const errorMsg    = document.getElementById('error-msg');
const statusChip  = document.getElementById('status-chip');
const arrowIcon   = document.getElementById('arrow-icon');
const rowCount    = document.getElementById('row-count');

// ── Init CodeMirror input editor ──────────────────────────
// CodeMirror is loaded as a global from CDN; we use setTimeout 0 to ensure
// all CDN scripts have executed before we reference window.CodeMirror.
let inputEditor  = null;
let outputEditor = null;

window.addEventListener('load', initEditors);

function initEditors() {
  if (!window.CodeMirror) {
    // Retry briefly if CDN hasn't finished
    setTimeout(initEditors, 100);
    return;
  }

  const isDark = document.documentElement.classList.contains('dark');

  // ── Input editor ──────────────────────────────────────
  inputEditor = CodeMirror(document.getElementById('input-cm-wrap'), {
    value:             PLACEHOLDER,
    mode:              { name: 'javascript', json: true },
    theme:             isDark ? 'material-darker' : 'default',
    lineNumbers:       true,
    lineWrapping:      false,
    autoCloseBrackets: true,
    matchBrackets:     true,
    tabSize:           2,
    indentWithTabs:    false,
    gutters:           ['CodeMirror-lint-markers'],
    lint:              true,
    extraKeys: {
      'Ctrl-Enter': () => convert(),
      Tab: cm => cm.execCommand('indentMore'),
      'Shift-Tab': cm => cm.execCommand('indentLess'),
    },
  });
  inputEditor.setSize('100%', '100%');

  // ── Output editor (read-only) ─────────────────────────
  outputEditor = CodeMirror(document.getElementById('output-cm-wrap'), {
    value:        '',
    mode:         'text/plain',
    theme:        isDark ? 'material-darker' : 'default',
    lineNumbers:  true,
    readOnly:     true,
    lineWrapping: false,
    tabSize:      2,
    gutters:      [],
    placeholder:  'id,name,email\n1,Jane Doe,jane@example.com',
  });
  outputEditor.setSize('100%', '100%');

  // Initial conversion from placeholder
  convert();

  // Live conversion: debounced on each change
  inputEditor.on('change', debouncedConvert);

  // Theme sync when dark mode toggled
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

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    showError('Invalid JSON — ' + e.message.replace('JSON.parse: ', ''));
    return;
  }

  // Normalise: accept single object or array of objects
  const data = Array.isArray(parsed) ? parsed : [parsed];

  if (!data.length || typeof data[0] !== 'object' || data[0] === null) {
    showError('JSON must be an array of objects, e.g. [{…}, {…}]');
    return;
  }

  try {
    const csv = Papa.unparse(data, { quotes: false, quoteChar: '"', delimiter: ',' });
    outputEditor.setValue(csv);
    showOk(data.length);
  } catch (e) {
    showError('Conversion error: ' + e.message);
  }
}

// ── Status helpers ────────────────────────────────────────
function showOk(rows) {
  errorBanner.classList.remove('show');
  statusChip.textContent = `✓ Converted`;
  statusChip.className   = 'ok';
  rowCount.textContent   = `${rows} row${rows !== 1 ? 's' : ''}`;
  // pulse arrow
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

// ── Format JSON ───────────────────────────────────────────
document.getElementById('btn-format').addEventListener('click', () => {
  const raw = inputEditor?.getValue().trim();
  if (!raw) return;
  try {
    const pretty = JSON.stringify(JSON.parse(raw), null, 2);
    inputEditor.setValue(pretty);
    convert();
  } catch {
    showError('Cannot format — JSON is invalid.');
  }
});

// ── Minify JSON ───────────────────────────────────────────
document.getElementById('btn-minify').addEventListener('click', () => {
  const raw = inputEditor?.getValue().trim();
  if (!raw) return;
  try {
    inputEditor.setValue(JSON.stringify(JSON.parse(raw)));
    convert();
  } catch {
    showError('Cannot minify — JSON is invalid.');
  }
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

// ── Copy CSV output ───────────────────────────────────────
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

// ── Download CSV ──────────────────────────────────────────
document.getElementById('btn-download').addEventListener('click', () => {
  const val = outputEditor?.getValue();
  if (!val) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([val], { type: 'text/csv;charset=utf-8;' }));
  a.download = 'data.csv';
  a.click();
});
