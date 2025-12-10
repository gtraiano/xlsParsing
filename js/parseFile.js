import { TableModel, createEditableTable } from "./table.js";
import { updateJSON } from "./syntax_highlight.js";
import { parseFileState } from "./state.js";

let initialized = false;
let worker = null;

export function initParseFileTab() {
    if (initialized) return;

    // --- DOM ---
    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("fileInput");
    const tableContainer = document.getElementById("tableContainer");
    const output = document.getElementById("output");
    const columnBoxes = document.getElementById("columnBoxes");
    const resetBtn = document.getElementById("resetBtn");
    const deleteBtn = document.getElementById("deleteBtn");

    // --- Web Worker ---
    worker = new Worker("./js/worker.js");

    worker.onmessage = (e) => {
        const result = e.data;
        const sheetNames = Object.keys(result);
        const firstSheet = result[sheetNames[0]];

        if (!firstSheet) {
            tableContainer.textContent = "Empty sheet";
            return;
        }

        // Build model
        parseFileState.tableModel = new TableModel(
            Object.keys(firstSheet[0]).map(k => ({ key: k, header: k })),
            firstSheet
        );

        // Render editable table
        createEditableTable(tableContainer, parseFileState.tableModel);

        // Live update JSON
        parseFileState.tableModel.onChange(() =>
            updateJSON(parseFileState.tableModel.rows, output)
        );

        updateJSON(firstSheet, output);

        // Show controls
        resetBtn.style.display = "inline-block";
        deleteBtn.style.display = "inline-block";

        initColumnBoxes();
    };

    // --- Helpers ---
    function sendToWorker(file) {
        if (!file) return;

        parseFileState.lastFile = file;

        tableContainer.textContent = "Parsing…";
        output.textContent = "Parsing…";

        worker.postMessage({
            file,
            range: null // optional: pass skipLines or custom range here
        });
    }

    function initColumnBoxes() {
        const model = parseFileState.tableModel;
        if (!model) return;

        columnBoxes.innerHTML = "";
        model.columns.forEach(col => {
            const div = document.createElement("div");
            div.className = "column-box";
            div.textContent = col.header;
            div.dataset.col = col.key;
            columnBoxes.appendChild(div);
        });
    }

    // --- Controls: RESET ---
    resetBtn.addEventListener("click", () => {
        if (!parseFileState.lastFile) return;
        sendToWorker(parseFileState.lastFile);
    });

    // --- Controls: DELETE SELECTED COLUMNS ---
    deleteBtn.addEventListener("click", () => {
        const model = parseFileState.tableModel;
        if (!model) return;

        const selected = [
            ...tableContainer.querySelectorAll("th.col-selected")
        ].map(th => th.dataset.colname);

        if (!selected.length) return;

        model.deleteColumns(selected);
        createEditableTable(tableContainer, model);
        model.triggerChange();

        initColumnBoxes();
    });

    // --- Drag/drop + file selection ---
    dropArea.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", e => {
        if (e.target.files.length) sendToWorker(e.target.files[0]);
    });

    dropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropArea.classList.add("dragover");
    });

    dropArea.addEventListener("dragleave", () =>
        dropArea.classList.remove("dragover")
    );

    dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        dropArea.classList.remove("dragover");

        if (e.dataTransfer.files.length) {
            sendToWorker(e.dataTransfer.files[0]);
        }
    });

    initialized = true;
}
