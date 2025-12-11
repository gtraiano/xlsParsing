import { TableModel, createEditableTable } from "./table.js";
import { updateJSON } from "./syntax_highlight.js";
import { createTableState } from "./state.js";
import { mapColumns } from "./mapColumns.js";

let initialized = false;

export function initCreateTableTab() {
    if (initialized) return;

    const container = document.getElementById("create-table");
    const btnCreate = container.querySelector("#create-table-btn");
    const btnAddRow = container.querySelector("#add-row-btn");
    const columnsInput = container.querySelector("#columns-input");
    const presetSelect = container.querySelector("#presetSelect");
    const tableContainer = container.querySelector("#customTableContainer");
    const output = container.querySelector("#customOutput");

    // Build table
    btnCreate.addEventListener("click", () => {
        let spec;

        if (presetSelect.value === "default") {
            spec = Object.values(mapColumns).map(c => ({
                key: c.property,
                header: c.label
            }));
        } else {
            try {
                spec = JSON.parse(columnsInput.value);
            } catch (err) {
                alert("Provide valid JSON columns");
                return;
            }
        }

        createTableState.tableModel = new TableModel(spec, []);
        renderTable();
    });

    // Add row
    btnAddRow.addEventListener("click", () => {
        //createTableState.tableModel.addRow();
        const n = Number.parseInt(document.querySelector("#add-row-count").value);
        createTableState.tableModel.addRows(n);
        renderTable();
    });

    function renderTable() {
        const model = createTableState.tableModel;
        createEditableTable(tableContainer, model);

        model.onChange(() => updateJSON(model.rows, output));
        updateJSON(model.rows, output);
    }

    initialized = true;
}
