import { createTable } from "./table.js";
import { TableModel } from "./TableModel.js";
import { updateJSON } from "./syntax_highlight.js";
import { parseFileState, mapColumns } from "./state.js";
import { debounce } from "./utils.js";
import { subscribe, notify } from "./store.js";
import {
    bindCellEditing,
    bindRowActions,
    bindColumnSelection,
    bindColumnBoxes
} from "./tableEvents.js";

let initialized = false;
let worker = null;

// JSON preview
const preview = document.querySelector("#output");

// Subscribe to updates for live JSON preview
subscribe(() => {
    if (!parseFileState.tableModel) return;
    updateJSON(parseFileState.tableModel.rows, preview);
});

export function initParseFileTab() {
    if (initialized) return;

    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("fileInput");
    const tableContainer = document.getElementById("tableContainer");
    const columnBoxes = document.getElementById("columnBoxes");
    const resetBtn = document.getElementById("resetBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const skipLines = document.getElementById("skipLines");

    // ---------------- Worker ----------------
    worker = new Worker("./js/worker.js");

    worker.onmessage = (e) => {
        const result = e.data;
        const sheetNames = Object.keys(result);
        const firstSheet = result[sheetNames[0]];

        if (!firstSheet) {
            tableContainer.textContent = "Empty sheet";
            return;
        }

        // Build table model
        parseFileState.tableModel = new TableModel({
            columns: Object.keys(firstSheet[0]).map(k => ({ key: k, header: k })),
            rows: firstSheet,
            options: { disableColumnSelection: false }
        });

        // Render table and bind events
        renderTable();

        // Show controls
        resetBtn.style.display = "inline-block";
        deleteBtn.style.display = "inline-block";
    };

    // ---------------- Helpers ----------------
    function sendToWorker(file) {
        if (!file) return;
        parseFileState.lastFile = file;

        tableContainer.textContent = "Parsing…";
        preview.textContent = "Parsing…";

        const range = Number.parseInt(skipLines.value);
        worker.postMessage({ file, range });
    }

    function renderTable() {
        if (!parseFileState.tableModel) return;

        createTable(tableContainer, parseFileState.tableModel);
        const table = tableContainer.querySelector("table");

        // Bind table events
        bindCellEditing(table, parseFileState.tableModel);
        bindRowActions(table, parseFileState.tableModel);
        bindColumnSelection(table, parseFileState.tableModel);
        bindColumnBoxes(columnBoxes, parseFileState.tableModel);

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

        notify();
    }

    // ---------------- Controls ----------------
    resetBtn.addEventListener("click", () => {
        if (!parseFileState.lastFile) return;
        sendToWorker(parseFileState.lastFile);
    });

    deleteBtn.addEventListener("click", () => {
        const model = parseFileState.tableModel;
        if (!model) return;
        if (!confirm("Delete selected columns?")) return;

        const selected = [
            ...tableContainer.querySelectorAll("th.col-selected")
        ].map(th => th.dataset.colname);

        if (!selected.length) return;

        model.deleteColumns(selected);
        renderTable();
    });

    // ---------------- File Drag & Drop ----------------
    dropArea.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
        if (e.target.files.length) sendToWorker(e.target.files[0]);
    });

    dropArea.addEventListener("dragover", e => {
        e.preventDefault();
        dropArea.classList.add("dragover");
    });

    dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));

    dropArea.addEventListener("drop", e => {
        e.preventDefault();
        dropArea.classList.remove("dragover");

        if (e.dataTransfer.files.length) {
            sendToWorker(e.dataTransfer.files[0]);
        }
    });

    // ---------------- Skip Lines Input ----------------
    skipLines.addEventListener("input", debounce(() => {
        if (!parseFileState.lastFile) return;
        sendToWorker(parseFileState.lastFile);
    }, 300));

    initialized = true;
}
