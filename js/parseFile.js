// parseFile.js
import { createTable } from "./table.js";
import { TableModel } from "./TableModel.js";
import { updateJSON } from "./syntax_highlight.js";
import { parseFileState, mapColumns } from "./state.js";
import { debounce } from "./utils.js";
import { subscribe, notify } from "./store.js";

let initialized = false;
let worker = null;

// JSON preview
const preview = document.querySelector("#output");

// Subscribe to store updates to refresh JSON preview
subscribe(() => {
    if (!parseFileState.tableModel) return;
    updateJSON(parseFileState.tableModel.rows, preview);
});

export function initParseFileTab() {
    if (initialized) return;

    // ---------------- DOM ----------------
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
            rows: firstSheet
        });

        notify(); // initial update

        // Render table
        createTable(tableContainer, parseFileState.tableModel);

        // Show controls
        resetBtn.style.display = "inline-block";
        deleteBtn.style.display = "inline-block";

        initColumnBoxes();
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

    function initColumnBoxes() {
        const model = parseFileState.tableModel;
        if (!model) return;

        columnBoxes.innerHTML = "";

        Object.values(mapColumns).forEach(mp => {
            const box = document.createElement("span");
            box.className = "columnBox";
            box.draggable = true;
            box.textContent = mp.label;
            box.dataset.property = mp.property;
            columnBoxes.appendChild(box);
        });
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

        model.removeColumns(selected); // <-- updated method
        createTable(tableContainer, model); // update UI
        initColumnBoxes();
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

    // ---------------- Column Boxes Drag & Drop ----------------
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

    // ---------------- Skip Lines Input ----------------
    skipLines.addEventListener("input", debounce(() => {
        if (!parseFileState.lastFile) return;
        sendToWorker(parseFileState.lastFile);
    }, 300));

    initialized = true;
}
