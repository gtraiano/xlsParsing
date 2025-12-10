export class TableModel {
    constructor(columns = [], rows = []) {
        this.columns = columns;
        this.rows = rows;
        this.changeHandlers = [];
    }

    addRow(defaults = {}) {
        const row = {};
        for (const col of this.columns) {
            row[col.key] = defaults[col.key] ?? "";
        }
        this.rows.push(row);
        this.triggerChange();
    }

    addRowIndex(index, defaults = {}) {
        const row = {};
        for (const col of this.columns) {
            row[col.key] = defaults[col.key] ?? "";
        }
        this.rows.splice(index, 0, row);
        this.triggerChange();
    }

    deleteRow(index) {
        this.rows.splice(index, 1);
        this.triggerChange();
    }

    onChange(handler) {
        this.changeHandlers.push(handler);
    }

    triggerChange() {
        this.changeHandlers.forEach(h => h(this.rows));
    }

    // Optional: delete selected columns
    deleteColumns(keys = []) {
        if (!keys.length) return;
        this.columns = this.columns.filter(c => !keys.includes(c.key));
        this.rows.forEach(row => {
            keys.forEach(k => delete row[k]);
        });
        this.triggerChange();
    }
}

export function createEditableTable(container, tableModel) {
    container.innerHTML = "";
    const table = document.createElement("table");
    table.className = "data-table";

    // ----- THEAD -----
    const thead = document.createElement("thead");
    const trHead1 = document.createElement("tr"); // selection row
    const trHead2 = document.createElement("tr"); // header row

    tableModel.columns.forEach(col => {
        // Selection row
        const th1 = document.createElement("th");
        th1.dataset.colname = col.key;
        th1.title = col.key;

        // Header row (editable)
        const th2 = document.createElement("th");
        th2.contentEditable = true;
        th2.dataset.colname = col.key;
        th2.textContent = col.header;
        th2.title = col.key;

        trHead1.appendChild(th1);
        trHead2.appendChild(th2);
    });

    // Actions column
    const thActions = document.createElement("th");
    thActions.textContent = "Actions";
    trHead2.appendChild(thActions);

    thead.appendChild(trHead1);
    thead.appendChild(trHead2);
    table.appendChild(thead);

    // ----- TBODY -----
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

        // Add/Delete buttons
        const tdActions = document.createElement("td");
        const btnDel = document.createElement("button");
        btnDel.textContent = "✘︎";
        btnDel.dataset.action = "del";
        btnDel.title = "Delete row";

        const btnAdd = document.createElement("button");
        btnAdd.textContent = "✚";
        btnAdd.dataset.action = "add";
        btnAdd.title = "Add row";

        tdActions.appendChild(btnDel);
        tdActions.appendChild(btnAdd);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // ----- EVENT DELEGATION -----
    // Cell edits
    tbody.addEventListener("input", e => {
        const td = e.target.closest("td[contenteditable]");
        if (!td) return;
        const rowIndex = td.dataset.row;
        const colKey = td.dataset.col;
        tableModel.rows[rowIndex][colKey] = td.textContent;
        tableModel.triggerChange();
    });

    // Add/Delete row buttons
    tbody.addEventListener("click", e => {
        const target = e.target;
        if (!target.matches("button")) return;
        const rowIndex = target.closest("tr").sectionRowIndex;
        if (target.dataset.action === "add") tableModel.addRowIndex(rowIndex + 1);
        if (target.dataset.action === "del") tableModel.deleteRow(rowIndex);
        createEditableTable(container, tableModel);
    });

    // Column selection
    table.addEventListener("click", e => {
        if (!e.target.matches("thead tr:first-child th")) return;
        const th = e.target;
        const idx = [...th.parentNode.children].indexOf(th);
        const isSelected = th.classList.toggle("col-selected");
        table.querySelectorAll(`thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`)
            .forEach(cell => cell.classList.toggle("col-selected", isSelected));
    });

    // Drag-drop remapping
    table.addEventListener("dragover", e => {
        if (e.target.matches("th")) { e.preventDefault(); e.target.classList.add("dragover"); }
    });
    table.addEventListener("dragleave", e => {
        if (e.target.matches("th")) e.target.classList.remove("dragover");
    });
    table.addEventListener("drop", e => {
        if (!e.target.matches("th")) return;
        e.preventDefault();
        const th = e.target;
        th.classList.remove("dragover");
        const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
        const oldProp = th.dataset.colname;
        const newProp = dropped.property;
        tableModel.rows.forEach(row => {
            row[newProp] = row[oldProp];
            delete row[oldProp];
        });
        th.dataset.colname = newProp;
        th.textContent = dropped.label;
        th.title = dropped.property;
        tableModel.triggerChange();
    });
}
