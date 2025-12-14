import { createTable } from "./table.js";
import { TableModel } from "./TableModel.js";
import { updateJSON } from "./syntax_highlight.js";
import { createTableState, mapColumns } from "./state.js";
import { subscribe, notify } from "./store.js";

let initialized = false;

const preview = document.querySelector("#customOutput");

// Subscribe to state changes and update JSON preview
subscribe(() => {
    if (!createTableState.tableModel) return;
    updateJSON(createTableState.tableModel.rows, preview);
});

export function initCreateTableTab() {
    if (initialized) return;

    // --- DOM ---
    const container = document.getElementById("customTableContainer");
    const createBtn = document.getElementById("create-table-btn");
    const addRowBtn = document.getElementById("add-row-btn");
    const addRowCount = document.getElementById("add-row-count");

    function renderTable() {
        if (!createTableState.tableModel) return;
        createTable(container, createTableState.tableModel);
    }

    // --- CREATE TABLE ---
    createBtn.addEventListener("click", () => {
        const columns = Object.values(mapColumns).map(mp => ({
            key: mp.property,
            header: mp.label
        }));

        const rows = []; // empty initially

        createTableState.tableModel = new TableModel({
            columns,
            rows,
            options: { disableColumnSelection: true }
        });

        notify(); // trigger JSON preview update
        renderTable();
    });

    // --- ADD ROWS ---
    addRowBtn.addEventListener("click", () => {
        const model = createTableState.tableModel;
        if (!model) return;

        const n = Math.max(1, parseInt(addRowCount.value) || 1);

        for (let i = 0; i < n; i++) {
            const newRow = {};
            model.columns.forEach(col => {
                newRow[col.key] = "";
            });
            model.rows.push(newRow);
        }

        notify(); // update JSON preview
        renderTable();
    });

    initialized = true;
}
