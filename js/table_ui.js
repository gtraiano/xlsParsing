import { TableModel, createEditableTable } from "./table.js";
import { updateJSON } from "./syntax_highlight.js";

// ----------------------
// Global state
// ----------------------
let parseFileState = { tableModel: null, lastFile: null };
let createTableState = { tableModel: null };

// ----------------------
// Initialization flags
// ----------------------
let parseFileInitialized = false;
let createTableInitialized = false;

// ----------------------
// Parse File Tab
// ----------------------
function initParseFileTab() {
    if (parseFileInitialized) return true;

    const dropArea = document.getElementById("drop-area");
    const fileInput = document.getElementById("fileInput");
    const output = document.getElementById("output");
    const tableContainer = document.getElementById("tableContainer");
    const skipLines = document.getElementById("skipLines");

    if (!dropArea) return false;

    const debounce = (fn, delay = 250) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn(...args), delay);
        };
    };

    function parseFileWithSkip(file) {
        if (!file) return;
        parseFileState.lastFile = file;

        tableContainer.textContent = "Parsing…";
        output.textContent = "Parsing…";

        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

                parseFileState.tableModel = new TableModel(
                    Object.keys(sheet[0] || {}).map(k => ({ key: k, header: k, type: "string" })),
                    sheet
                );

                createEditableTable(tableContainer, parseFileState.tableModel);
                updateJSON(sheet, output);
            } catch (err) {
                output.textContent = "Parsing error: " + err.message;
            }
        };

        if (file.name.endsWith(".csv")) reader.readAsText(file);
        else reader.readAsArrayBuffer(file);
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
    return true;
}

// ----------------------
// Create Table Tab
// ----------------------
function initCreateTableTab() {
    if (createTableInitialized) return true;

    const container = document.getElementById("create-table");
    if (!container) return false;

    const btnCreate = container.querySelector("#create-table-btn");
    const btnAddRow = container.querySelector("#add-row-btn");
    const columnsInput = container.querySelector("#columns-input");
    const tableContainer = container.querySelector("#customTableContainer");
    const presetSelect = container.querySelector("#presetSelect");
    const output = container.querySelector("#customOutput");

    if (!btnCreate || !tableContainer) return false;

    function refreshTable(model) {
        if (!model) return;

        createEditableTable(tableContainer, model, {
            onChange: () => {
                if (model.data) updateJSON(model.data, output);
            }
        });

        // Update JSON once immediately
        if (model.data) {
            updateJSON(model.data, output);
        } else {
            output.textContent = "No data to display";
        }
    }


    // CREATE TABLE
    btnCreate.addEventListener("click", () => {
        try {
            let spec;
            if (presetSelect && presetSelect.value === "default") {
                spec = [
                    { key: "amka", header: "ΑΜΚΑ Ασθενή", type: "string" },
                    { key: "commercial_name", header: "Εμπορική Ονομασία", type: "string" },
                    { key: "eof_code", header: "Κωδικός ΕΟΦ", type: "string" },
                    { key: "barcode", header: "Barcode", type: "string" },
                    { key: "expiry_date", header: "Ημερομηνία Λήξης", type: "string" },
                ];
            } else if (columnsInput && columnsInput.value.trim()) {
                spec = JSON.parse(columnsInput.value);
            } else {
                alert("Please provide a valid JSON column mapping or select a preset.");
                return;
            }

            createTableState.tableModel = new TableModel(spec, []);
            if (btnAddRow) btnAddRow.style.display = "inline-block";

            refreshTable(createTableState.tableModel);

            document.querySelector("table.data-table").addEventListener("input", e => { console.log(e); });

        } catch (e) {
            alert("Invalid JSON column mapping: " + e.message);
        }
    });

    // ADD ROW
    if (btnAddRow) {
        btnAddRow.addEventListener("click", () => {
            if (!createTableState.tableModel) return;
            createTableState.tableModel.addRow();
            refreshTable(createTableState.tableModel);
        });
    }

    createTableInitialized = true;
    return true;
}


// ----------------------
// Tabs lazy init
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
    // Parse File tab is default
    initParseFileTab();

    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tabId = tab.dataset.tab;

            // Switch active class
            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

            tab.classList.add("active");
            const content = document.getElementById(tabId);
            content.classList.add("active");

            if (tabId === "create-table") initCreateTableTab();
            else if (tabId === "parse-file") initParseFileTab();
        });
    });
});
