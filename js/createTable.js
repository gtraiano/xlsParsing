// createTable.js
import { TableModel, createEditableTable } from "./table.js";
import { updateJSON } from "./syntax_highlight.js";
import { createTableState } from "./state.js";
import { mapColumns } from "./mapColumns.js";

let createTableInitialized = false;

export function initCreateTableTab() {
    if (createTableInitialized) return;

    const container = document.getElementById("create-table");
    if (!container) return;

    const btnCreate = container.querySelector("#create-table-btn");
    const btnAddRow = container.querySelector("#add-row-btn");
    const columnsInput = container.querySelector("#columns-input");
    const tableContainer = container.querySelector("#customTableContainer");
    const presetSelect = container.querySelector("#presetSelect");
    const output = container.querySelector("#customOutput");

    if (!btnCreate || !tableContainer || !output) return;

    function refreshTable(model) {
        if (!model) return;

        model.onChange = () => updateJSON(model.rows, output);
        createEditableTable(tableContainer, model);

        if (!model.rows.length) output.textContent = "No data to display";
        else updateJSON(model.rows, output);
    }

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
        } catch (e) {
            alert("Invalid JSON column mapping: " + e.message);
        }
    });

    if (btnAddRow) {
        btnAddRow.addEventListener("click", () => {
            if (!createTableState.tableModel) return;
            createTableState.tableModel.addRow();
            refreshTable(createTableState.tableModel);
        });
    }

    createTableInitialized = true;
}
