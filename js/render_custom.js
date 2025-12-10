import { createEditableTable } from './table.js';
import { state } from './state.js';
import { updateJSON } from './syntax_highlight.js';

export function renderCustomTable(container, output) {
  if (!state.createTableModel) return;
  createEditableTable(container, state.createTableModel);
  if (state.createTableModel.rows.length) {
    updateJSON(state.createTableModel.rows, output);
  }
}
