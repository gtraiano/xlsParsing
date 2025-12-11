import { TableModel, createEditableTable } from "./table.js";
import { updateJSON } from "./syntax_highlight.js";
import { parseFileState } from "./state.js";
import { debounce } from "./utils.js";
import { mapColumns } from "./mapColumns.js";

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
    const skipLines = document.getElementById("skipLines");

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
        const range = Number.parseInt(skipLines.value);

        worker.postMessage({
            file,
            range
        });
    }

    function initColumnBoxes() {
        const model = parseFileState.tableModel;
        if (!model) return;

        columnBoxes.innerHTML = "";
        /*model.columns.forEach(col => {
            const div = document.createElement("span");
            div.draggable = true;
            div.className = "columnBox";
            div.textContent = col.header;
            div.dataset.col = col.key;
            columnBoxes.appendChild(div);
        });*/

        Object.values(mapColumns).forEach(mp => {
            const box = document.createElement("span");
            box.className = "columnBox";
            box.draggable = true;
            box.textContent = mp.label;
            box.dataset.property = mp.property;
            columnBoxes.appendChild(box);
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

        if (!confirm("Delete selected columns?")) return;

        const selected = [
            ...tableContainer.querySelectorAll("th.col-selected")
        ].map(th => th.dataset.colname);

        if (!selected.length) return;

        model.deleteColumns(selected);
        //createEditableTable(tableContainer, model);

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

    columnBoxes.addEventListener("dragstart", e => {
        const box = e.target.closest(".columnBox");
        if (!box) return;

        e.dataTransfer.setData("application/json", JSON.stringify({
            label: box.textContent.trim(),
            property: box.dataset.property
        }));

        e.dataTransfer.effectAllowed = "move";
        box.classList.add("dragging");
    });

    columnBoxes.addEventListener("dragend", e => {
        const box = e.target.closest(".columnBox");
        if (!box) return;
        box.classList.remove("dragging");
    });

    skipLines.addEventListener("input", debounce(() => {
        if (!parseFileState.lastFile) return;
        sendToWorker(parseFileState.lastFile)
    }, 300));

    initialized = true;
}
