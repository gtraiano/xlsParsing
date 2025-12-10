export class TableModel {
    constructor(columns = [], rows = []) {
        this.columns = columns; // [{key, header}]
        this.rows = rows;       // array of objects
        this._onChange = () => {};
    }

    onChange(cb) {
        this._onChange = cb;
    }

    triggerChange() {
        this._onChange(this.rows);
    }

    addRow(defaults = {}) {
        const row = {};
        this.columns.forEach(c => {
            row[c.key] = defaults[c.key] ?? "";
        });
        this.rows.push(row);
        this.triggerChange();
    }

    addRowIndex(index, defaults = {}) {
        const row = {};
        this.columns.forEach(c => {
            row[c.key] = defaults[c.key] ?? "";
        });
        this.rows.splice(index, 0, row);
        this.triggerChange();
    }

    deleteRow(index) {
        this.rows.splice(index, 1);
        this.triggerChange();
    }

    deleteColumns(keys) {
        // Remove from column list
        this.columns = this.columns.filter(c => !keys.includes(c.key));

        // Remove from each row
        this.rows.forEach(row => {
            keys.forEach(k => delete row[k]);
        });

        this.triggerChange();
    }

    renameColumn(oldKey, newKey) {
        const col = this.columns.find(c => c.key === oldKey);
        if (!col) return;

        col.key = newKey;
        col.header = newKey;

        this.rows.forEach(r => {
            r[newKey] = r[oldKey];
            delete r[oldKey];
        });

        this.triggerChange();
    }
}

// ------------------------------------------------------------------
// TABLE UI RENDERER
// ------------------------------------------------------------------
export function createEditableTable(container, tableModel) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "data-table";

    // --------------------------- THEAD ------------------------------
    const thead = document.createElement("thead");

    const trHead1 = document.createElement("tr"); // column selection row
    const trHead2 = document.createElement("tr"); // header edit row

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

    const thActions = document.createElement("th");
    thActions.textContent = "Actions";
    trHead2.appendChild(thActions);

    thead.appendChild(trHead1);
    thead.appendChild(trHead2);
    table.appendChild(thead);

    // --------------------------- TBODY ------------------------------
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

    // ----------------------- EVENT DELEGATION ------------------------

    // Cell editing
    tbody.addEventListener("input", e => {
        const td = e.target.closest("td[contenteditable]");
        if (!td) return;

        const row = +td.dataset.row;
        const col = td.dataset.col;

        tableModel.rows[row][col] = td.textContent;
        tableModel.triggerChange();
    });

    // Add/Delete row
    tbody.addEventListener("click", e => {
        if (!e.target.matches("button")) return;

        const rowIndex = e.target.closest("tr").sectionRowIndex;
        const action = e.target.dataset.action;

        if (action === "add") tableModel.addRowIndex(rowIndex + 1);
        if (action === "del") tableModel.deleteRow(rowIndex);

        createEditableTable(container, tableModel);
    });

    // Column selection row
    table.addEventListener("click", e => {
        if (!e.target.matches("thead tr:first-child th")) return;

        const th = e.target;
        const idx = [...th.parentNode.children].indexOf(th);

        const on = th.classList.toggle("col-selected");

        table.querySelectorAll(
            `thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`
        ).forEach(cell => cell.classList.toggle("col-selected", on));
    });

    // Drag-drop remapping
    table.addEventListener("dragover", e => {
        if (e.target.matches("th")) {
            e.preventDefault();
            e.target.classList.add("dragover");
        }
    });

    table.addEventListener("dragleave", e => {
        if (e.target.matches("th")) {
            e.target.classList.remove("dragover");
        }
    });

    table.addEventListener("drop", e => {
        if (!e.target.matches("th")) return;

        e.preventDefault();
        e.target.classList.remove("dragover");

        const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
        const oldKey = e.target.dataset.colname;
        const newKey = dropped.property;

        tableModel.renameColumn(oldKey, newKey);
        createEditableTable(container, tableModel);
    });
}
