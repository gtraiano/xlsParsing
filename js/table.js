// ----------------------------- TableModel -----------------------------
export class TableModel {
    constructor(columns = [], rows = []) {
        this.columns = columns; // [{key, header}]
        this.rows = rows;       // array of objects
        this._onChange = () => {};
    }

    onChange(cb) {
        this._onChange = cb;
    }

    // Always emit a diff array (default empty)
    triggerChange(diff = []) {
        if (!Array.isArray(diff)) diff = [];
        this._onChange(diff);
    }

    addRow(defaults = {}) {
        const row = {};
        this.columns.forEach(c => {
            row[c.key] = defaults[c.key] ?? "";
        });
        this.rows.push(row);

        this.triggerChange([{ type: "row-add-index", index: this.rows.length - 1, rowData: row }]);
    }

    addRows(n, defaults = {}) {
        const newRows = [];
        for (let i = 0; i < n; i++) {
            const row = {};
            this.columns.forEach(c => {
                row[c.key] = defaults[c.key] ?? "";
            });
            this.rows.push(row);
            newRows.push(row);
        }

        this.triggerChange(newRows.map((row, i) => ({
            type: "row-add-index",
            index: this.rows.length - n + i,
            rowData: row
        })));
    }

    addRowIndex(index, defaults = {}) {
        const row = {};
        this.columns.forEach(c => {
            row[c.key] = defaults[c.key] ?? "";
        });
        this.rows.splice(index, 0, row);

        this.triggerChange([{ type: "row-add-index", index, rowData: row }]);
    }

    deleteRow(index) {
        const removed = this.rows.splice(index, 1)[0];
        this.triggerChange([{ type: "row-delete-index", index, rowData: removed }]);
    }

    deleteColumns(keys) {
        const removedCols = [];
        // Remove from column list
        this.columns = this.columns.filter(c => {
            if (keys.includes(c.key)) removedCols.push(c.key);
            return !keys.includes(c.key);
        });

        // Remove from each row
        this.rows.forEach(row => {
            keys.forEach(k => delete row[k]);
        });

        this.triggerChange([{ type: "col-delete", keys: removedCols }]);
    }

    renameColumn(oldKey, newKey, newHeader = null) {
        const col = this.columns.find(c => c.key === oldKey);
        if (!col) return;

        col.key = newKey;
        col.header = newHeader ?? newKey;

        this.rows.forEach(r => {
            r[newKey] = r[oldKey];
            delete r[oldKey];
        });

        this.triggerChange([{ type: "col-rename", oldKey, newKey, newHeader: col.header }]);
    }
}

// ----------------------------- Table Renderer -----------------------------
export function createEditableTable(container, tableModel) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const trHead1 = document.createElement("tr"); // column selection row
    const trHead2 = document.createElement("tr"); // header edit row

    // ---------------- HEADERS ----------------
    tableModel.columns.forEach(col => {
        const th1 = document.createElement("th");
        th1.dataset.colname = col.key;

        const th2 = document.createElement("th");
        th2.contentEditable = true;
        th2.dataset.colname = col.key;
        th2.textContent = col.header;
        th2.title = col.key;

        trHead1.appendChild(th1);
        trHead2.appendChild(th2);
    });

    // Actions columns
    const thActionSelector = document.createElement("th");
    trHead1.appendChild(thActionSelector);
    const thActions = document.createElement("th");
    thActions.textContent = "Actions";
    trHead2.appendChild(thActions);

    thead.appendChild(trHead1);
    thead.appendChild(trHead2);
    table.appendChild(thead);

    // ---------------- BODY ----------------
    const tbody = document.createElement("tbody");
    tableModel.rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        tableModel.columns.forEach(col => {
            const td = document.createElement("td");
            td.contentEditable = true;
            td.dataset.row = rowIndex;
            td.dataset.col = col.key;
            td.textContent = row[col.key];
            tr.appendChild(td);
        });

        // Row actions
        const tdActions = document.createElement("td");
        tdActions.innerHTML = `
            <button data-action="del" title="Delete row">✘</button>
            <button data-action="add" title="Add row">✚</button>
        `;
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // ---------------- EVENTS ----------------

    // Cell editing
    tbody.addEventListener("input", e => {
        const td = e.target.closest("td[contenteditable]");
        if (!td) return;

        const row = +td.dataset.row;
        const col = td.dataset.col;

        tableModel.rows[row][col] = td.textContent;
        tableModel.triggerChange([{ type: "cell-edit", row, col, value: td.textContent }]);
    });

    // Row add/delete
    tbody.addEventListener("click", e => {
        if (!e.target.matches("button")) return;

        const rowIndex = e.target.closest("tr").sectionRowIndex;
        const action = e.target.dataset.action;

        if (action === "add") tableModel.addRowIndex(rowIndex + 1);
        if (action === "del") tableModel.deleteRow(rowIndex);

        createEditableTable(container, tableModel); // optional if not fully incremental
    });

    // Column selection
    table.addEventListener("click", e => {
        const th = e.target.closest("thead tr:first-child th[data-colname]");
        if (!th) return;

        const idx = [...th.parentNode.children].indexOf(th);
        const on = th.classList.toggle("col-selected");

        table.querySelectorAll(
            `thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`
        ).forEach(cell => cell.classList.toggle("col-selected", on));
    });

    // ---------------- Drag & Drop ----------------
    table.addEventListener("dragover", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;
        e.preventDefault();
        th.classList.add("dragover");
    });

    table.addEventListener("dragleave", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;
        th.classList.remove("dragover");
    });

    table.addEventListener("drop", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;

        e.preventDefault();
        th.classList.remove("dragover");

        const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
        const oldKey = th.dataset.colname;
        const newKey = dropped.property;
        const newHeader = dropped.label;

        tableModel.renameColumn(oldKey, newKey, newHeader);

        // Full re-render optional; incremental diff renderer can handle column rename
        createEditableTable(container, tableModel);
    });
}
