import { TableModel, createIncrementalTable } from "./table.js";
import { updateJSON } from "./syntax_highlight.js";
import { mapColumns } from "./mapColumns.js";

let initialized = false;

export function initCreateTableTab() {
    if (initialized) return;

    // --- DOM ---
    const container = document.getElementById("customTableContainer");
    const output = document.getElementById("customOutput");
    const createBtn = document.getElementById("create-table-btn");
    const presetSelect = document.getElementById("presetSelect");
    const addRowBtn = document.getElementById("add-row-btn");
    const addRowCount = document.getElementById("add-row-count");

    let tableModel = null;

    function renderTable() {
        if (!tableModel) return;
        createIncrementalTable(container, tableModel);
        updateJSON(tableModel.rows, output);
    }

    // --- CREATE TABLE ---
    createBtn.addEventListener("click", () => {
        // Columns from mapColumns
        const columns = Object.values(mapColumns).map((mp, idx) => ({
            key: mp.property,
            header: mp.label
        }));

        // Empty rows initially
        const rows = [];

        tableModel = new TableModel(columns, rows);

        // Live JSON output
        tableModel.onChange(() => updateJSON(tableModel.rows, output));

        renderTable();
    });

    // --- ADD ROWS ---
    addRowBtn.addEventListener("click", () => {
        if (!tableModel) return;
        const n = Math.max(1, parseInt(addRowCount.value));
        tableModel.addRows(n); // append n rows
        renderTable();
    });

    initialized = true;
}
