import { state } from './state.js';
import { TableModel } from './table.js';
import { renderCustomTable } from './render_custom.js';

export function initCreateTableEvents({
  container,
  btnCreate,
  btnAddRow,
  presetSelect,
  tableContainer,
  output
}) {

  btnCreate.addEventListener('click', () => {
    let spec;
    if (presetSelect.value === 'default') {
      spec = [
        { key: 'amka', header: 'ΑΜΚΑ Ασθενή', type: 'string' },
        { key: 'commercial_name', header: 'Εμπορική Ονομασία', type: 'string' },
        { key: 'eof_code', header: 'Κωδικός ΕΟΦ', type: 'string' },
        { key: 'barcode', header: 'Barcode', type: 'string' },
        { key: 'expiry_date', header: 'Ημερομηνία Λήξης', type: 'string' },
      ];
    } else {
      alert('Only default preset supported in refactor demo');
      return;
    }

    state.createTableModel = new TableModel(spec, []);
    if (btnAddRow) btnAddRow.style.display = 'inline-block';
    renderCustomTable(tableContainer, output);
  });

  btnAddRow.addEventListener('click', () => {
    if (!state.createTableModel) return;
    state.createTableModel.addRow();
    renderCustomTable(tableContainer, output);
  });
}
