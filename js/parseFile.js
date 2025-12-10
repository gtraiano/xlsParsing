// parseFile.js
import { TableModel, createEditableTable } from "./table.js";
import { updateJSON } from "./syntax_highlight.js";
import { parseFileState } from "./state.js";
import { initColumnBoxes } from "./table_ui.js";
import { mapColumns } from "./mapColumns.js";

let parseFileInitialized = false;

export function initParseFileTab() {
    if (parseFileInitialized) return;

    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("fileInput");
    const output = document.getElementById("output");
    const tableContainer = document.getElementById("tableContainer");
    const skipLines = document.getElementById("skipLines");

    if (!dropArea || !fileInput || !tableContainer || !output) return;

    const debounce = (fn, delay = 250) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };

    const worker = new Worker("/js/worker.js");

    function parseFileWithSkip(file) {
        if (!file) return;
        parseFileState.lastFile = file;

        tableContainer.textContent = "Parsing…";
        output.textContent = "Parsing…";

        worker.onmessage = e => {
            try {
                const sheetName = Object.keys(e.data)[0];
                const sheet = e.data[sheetName];

                parseFileState.tableModel = new TableModel(
                    Object.keys(sheet[0] || {}).map(k => ({ key: k, header: k, type: "string" })),
                    sheet
                );

                // Live JSON output
                parseFileState.tableModel.onChange = () => updateJSON(parseFileState.tableModel.rows, output);

                createEditableTable(tableContainer, parseFileState.tableModel);

                // Column mapping UI
                if (typeof initColumnBoxes === "function") {
                    initColumnBoxes(parseFileState.tableModel, mapColumns);
                }

            } catch (err) {
                output.textContent = "Parsing error: " + err.message;
            }
        };

        worker.postMessage({ file });
    }

    fileInput.addEventListener("change", e => {
        if (e.target.files.length) parseFileWithSkip(e.target.files[0]);
    });

    dropArea.addEventListener("click", () => fileInput.click());
    dropArea.addEventListener("dragover", e => { e.preventDefault(); dropArea.classList.add("dragover"); });
    dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));
    dropArea.addEventListener("drop", e => {
        e.preventDefault();
        dropArea.classList.remove("dragover");
        if (e.dataTransfer.files.length) parseFileWithSkip(e.dataTransfer.files[0]);
    });

    skipLines.addEventListener("input", debounce(() => {
        if (!parseFileState.lastFile) return;
        parseFileWithSkip(parseFileState.lastFile);
    }, 300));

    parseFileInitialized = true;
}
