import { state } from './state.js';
import { updateJSON } from './syntax_highlight.js';

export function renderSheet(sheetName, container) {
  const data = state.parsedSheets[sheetName];
  if (!data?.length) {
    container.innerHTML = "<p>No data</p>";
    return;
  }

  const cols = Object.keys(data[0]);
  const html = `
    <table>
      <thead>
        <tr>${cols.map(c => `<th class="column-selector" data-colname="${c}"></th>`).join('')}</tr>
        <tr>${cols.map(c => `<th contenteditable="true" data-colname="${c}" title="${c}">${c}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${data.map((row, i) =>
          `<tr>${cols.map(col => `<td contenteditable="true" data-row="${i}" data-colname="${col}">${row[col] ?? ''}</td>`).join('')}</tr>`
        ).join('')}
      </tbody>
    </table>
  `;
  container.innerHTML = html;
  updateJSON(state.parsedSheets[sheetName]);
}
