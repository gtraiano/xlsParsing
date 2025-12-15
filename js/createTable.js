import { createTable } from "./table.js";
import { TableModel } from "./TableModel.js";
import { updateJSON } from "./syntax_highlight.js";
import { createTableState, mapColumns } from "./state.js";
import { subscribe, notify } from "./store.js";
import {
    bindCellEditing,
    bindRowActions,
    bindColumnSelection,
    bindColumnBoxes
} from "./tableEvents.js";

let initialized = false;

const preview = document.querySelector("#customOutput");

subscribe(() => {
    if (!createTableState.tableModel) return;
    updateJSON(createTableState.tableModel.rows, preview);
});

export function initCreateTableTab() {
    if (initialized) return;

    const container = document.getElementById("customTableContainer");
    const createBtn = document.getElementById("create-table-btn");
    const addRowBtn = document.getElementById("add-row-btn");
    const addRowCount = document.getElementById("add-row-count");
    const columnBoxes = document.getElementById("columnBoxes");

    function renderTable() {
        if (!createTableState.tableModel) return;

        // Create table and append to container
        createTable(container, createTableState.tableModel);

        const table = container.querySelector("table");

        // Bind events
        bindCellEditing(table, createTableState.tableModel);
        bindRowActions(table, createTableState.tableModel);
        bindColumnSelection(table, createTableState.tableModel);
        bindColumnBoxes(columnBoxes, createTableState.tableModel);

        // Update JSON preview
        notify();
    }

    createBtn.addEventListener("click", () => {
        const columns = Object.values(mapColumns).map(mp => ({
            key: mp.property,
            header: mp.label
        }));

        createTableState.tableModel = new TableModel({
            columns,
            rows: [],
            options: { disableColumnSelection: false }
        });

        // Initialize column boxes
        columnBoxes.innerHTML = "";
        Object.values(mapColumns).forEach(mp => {
            const box = document.createElement("span");
            box.className = "columnBox";
            box.draggable = true;
            box.textContent = mp.label;
            box.dataset.property = mp.property;
            columnBoxes.appendChild(box);
        });

        renderTable();
    });

    addRowBtn.addEventListener("click", () => {
        if (!createTableState.tableModel) return;

        const n = Math.max(1, parseInt(addRowCount.value) || 1);
        createTableState.tableModel.addRows(n);

        renderTable();
    });

    initialized = true;
}
