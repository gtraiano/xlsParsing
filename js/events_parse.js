import { state } from './state.js';
import { parseFile, initWorker } from './parser.js';
import { renderSheet } from './render_parse.js';
import { debounce } from './utils.js';

export function initParseFileEvents({
  dropArea,
  fileInput,
  sheetSelector,
  tableContainer,
  skipLines,
  resetBtn,
  deleteBtn,
  sendBtn,
  columnBoxes
}) {
  initWorker(() => {
    // populate sheet selector
    sheetSelector.innerHTML = '';
    Object.keys(state.parsedSheets).forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sheetSelector.appendChild(opt);
    });
    sheetSelector.style.display = 'inline-block';
    renderSheet(sheetSelector.value, tableContainer);
    [resetBtn, deleteBtn].forEach(btn => btn.style.removeProperty('display'));
  });

  const parseWithSkip = () => parseFile(fileInput.files[0], +skipLines.value || 0);

  fileInput.addEventListener('change', () => parseWithSkip());
  dropArea.addEventListener('click', () => fileInput.click());
  dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('dragover'); });
  dropArea.addEventListener('dragleave', () => dropArea.classList.remove('dragover'));
  dropArea.addEventListener('drop', e => {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) parseFile(e.dataTransfer.files[0], +skipLines.value || 0);
  });

  skipLines.addEventListener('input', debounce(() => {
    if (!state.lastFile) return;
    parseFile(state.lastFile, +skipLines.value || 0);
  }, 300));

  sheetSelector.addEventListener('change', () => renderSheet(sheetSelector.value, tableContainer));

  document.body.addEventListener('click', e => {
    if (e.target === deleteBtn && confirm("Remove selected columns?")) {
      // remove selected columns
      const data = state.parsedSheets[sheetSelector.value];
      const table = tableContainer.querySelector('table');
      if (!table) return;
      const selected = [...table.querySelectorAll('thead tr:first-child th.col-selected')];
      const indices = selected.map(th => [...th.parentNode.children].indexOf(th)).sort((a, b) => b - a);
      indices.forEach(i => {
        const prop = Object.keys(data[0])[i];
        data.forEach(row => delete row[prop]);
      });
      renderSheet(sheetSelector.value, tableContainer);
    }
    if (e.target === resetBtn) {
      state.parsedSheets = structuredClone(state.originalSheets);
      renderSheet(sheetSelector.value, tableContainer);
    }
    if (e.target === sendBtn) {
      fetch('save.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state.parsedSheets) })
        .then(() => alert('Sent to backend!'));
    }
  });

  // Column drag/drop
  columnBoxes.addEventListener('dragstart', e => {
    const box = e.target.closest('.columnBox');
    if (!box) return;
    e.dataTransfer.setData('application/json', JSON.stringify({ label: box.textContent, property: box.dataset.property }));
    e.dataTransfer.effectAllowed = 'move';
  });
}
