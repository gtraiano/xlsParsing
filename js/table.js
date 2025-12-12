export class TableModel {
    static defaultOptions = {
        disableColumnSelection: false
    };
    
    constructor({ columns = [], rows = [], options = {} }) {
        this.columns = columns;
        this.rows = rows;
        this.listeners = [];
        this.options = { ...TableModel.defaultOptions, ...options };
    }

    onChange(fn) {
        this.listeners.push(fn);
    }

    triggerChange(diff) {
        for (const fn of this.listeners) fn(diff);
    }

    addRow() {
        const newRow = {};
        this.columns.forEach(col => newRow[col.key] = "");
        this.rows.push(newRow);
        this.triggerChange([{ type: "row-add", row: newRow }]);
    }

    // <-- Add this method
    addRows(n = 1) {
        for (let i = 0; i < n; i++) this.addRow();
    }

    addRowIndex(index) {
        const newRow = {};
        this.columns.forEach(col => newRow[col.key] = "");
        this.rows.splice(index, 0, newRow);
        this.triggerChange([{ type: "row-add", row: newRow }]);
    }

    deleteRow(index) {
        const removed = this.rows.splice(index, 1)[0];
        this.triggerChange([{ type: "row-delete", row: removed }]);
    }

    deleteColumns(keys) {
        this.columns = this.columns.filter(c => !keys.includes(c.key));
        this.rows.forEach(row => keys.forEach(k => delete row[k]));
        this.triggerChange([{ type: "column-delete", keys }]);
    }

    renameColumn(oldKey, newKey, newHeader) {
        const col = this.columns.find(c => c.key === oldKey);
        if (!col) return;
        col.key = newKey;
        col.header = newHeader;

        this.rows.forEach(row => {
            if (row.hasOwnProperty(oldKey)) {
                row[newKey] = row[oldKey];
                delete row[oldKey];
            }
        });
        this.triggerChange([{ type: "column-rename", oldKey, newKey }]);
    }
}

import { mapColumns } from "./state.js";
// ----------------------------- Incremental Table Renderer -----------------------------
export function createIncrementalTable(container, tableModel) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const trSelect = document.createElement("tr"); // column selection
    const trHeader = document.createElement("tr"); // editable headers

    tableModel.columns.forEach(col => {
        const thSel = document.createElement("th");
        thSel.dataset.colname = col.key;

        const thHeader = document.createElement("th");
        thHeader.contentEditable = true;
        thHeader.dataset.colname = col.key;
        thHeader.textContent = col.header;
        thHeader.title = col.key;

        trSelect.appendChild(thSel);
        trHeader.appendChild(thHeader);
    });

    // Actions column
    const thSelAction = document.createElement("th");
    trSelect.appendChild(thSelAction);

    const thHeaderAction = document.createElement("th");
    thHeaderAction.textContent = "Actions";
    trHeader.appendChild(thHeaderAction);

    thead.appendChild(trSelect);
    thead.appendChild(trHeader);
    table.appendChild(thead);

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

        const tdActions = document.createElement("td");
        tdActions.innerHTML = `
            <button data-action="del" title="Διαγραφή Γραμμής">✘</button>
            <button data-action="add" title="Προσθήκη Γραμμής">✚</button>
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
        const tr = e.target.closest("tr");
        const rowIndex = Array.from(tr.parentNode.children).indexOf(tr);
        const action = e.target.dataset.action;

        if (action === "add") tableModel.addRowIndex(rowIndex + 1);
        if (action === "del") tableModel.deleteRow(rowIndex);

        createIncrementalTable(container, tableModel);
    });

    // Column selection
    tableModel.options.disableColumnSelection === false &&
    table.addEventListener("click", e => {
        const th = e.target.closest("thead tr:first-child th[data-colname]");
        if (!th) return;

        const idx = [...th.parentNode.children].indexOf(th);
        const on = th.classList.toggle("col-selected");

        table.querySelectorAll(
            `thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`
        ).forEach(cell => cell.classList.toggle("col-selected", on));
    });

    // Column header drag & drop
    /*
    table.addEventListener("dragover", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;
        e.preventDefault();
        th.classList.add("dragover");
    });
    */
    table.addEventListener("dragover", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;

        e.preventDefault();

        const draggedData = JSON.parse(e.dataTransfer.getData("application/json"));
        const targetKey = th.dataset.colname;

        const isAllowed = targetKey !== draggedData.property && !mapColumns[draggedData.property]?.mapped;

        th.classList.remove("dragover", "invalid-drop");

        if (isAllowed) {
            th.classList.add("dragover");
            e.dataTransfer.dropEffect = "move"; // green cursor
        } else {
            th.classList.add("invalid-drop");
            e.dataTransfer.dropEffect = "none"; // not-allowed cursor
        }
    });


    table.addEventListener("dragleave", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;
        th.classList.remove("dragover", "invalid-drop");
    });


    /*table.addEventListener("drop", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;

        e.preventDefault();

        const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
        const oldKey = th.dataset.colname;
        const newKey = dropped.property;

        th.classList.remove("dragover");
        if (oldKey !== newKey && !mapColumns[newKey].mapped) {
            const newHeader = dropped.label;

            tableModel.renameColumn(oldKey, newKey, newHeader);
            createIncrementalTable(container, tableModel);

            document.querySelector(`.columnBox[data-property=${newKey}]`).title = `Mapped to ${oldKey}`;
        }
        else {
            console.warn(`Column ${newKey} is already mapped to ${mapColumns[newKey].mapped}`);
        }
    });*/
    table.addEventListener("drop", e => {
        const th = e.target.closest("th[data-colname]");
        if (!th) return;

        e.preventDefault();

        const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
        const targetKey = th.dataset.colname;
        const isAllowed = targetKey !== dropped.property && !mapColumns[dropped.property]?.mapped;

        th.classList.remove("dragover", "invalid-drop");

        if (!isAllowed) {
            console.warn(`Cannot drop ${dropped.property} on ${targetKey}`);
            return; // block invalid drop
        }

        tableModel.renameColumn(targetKey, dropped.property, dropped.label);
        createIncrementalTable(container, tableModel);
        document.querySelector(`.columnBox[data-property=${dropped.property}]`).title = `Αντιστοιχισμένο στο ${targetKey}`;
        document.querySelector(`.columnBox[data-property=${dropped.property}]`).classList.add("disabled");
    });

}

// ----------------------------- Table Renderer -----------------------------
export function createEditableTable(container, tableModel) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const trHead1 = document.createElement("tr"); // selection row
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

    const thActionSelector = document.createElement("th");
    trHead1.appendChild(thActionSelector);
    const thActions = document.createElement("th");
    thActions.textContent = "Actions";
    trHead2.appendChild(thActions);

    thead.appendChild(trHead1);
    thead.appendChild(trHead2);
    table.appendChild(thead);

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
        const tdActions = document.createElement("td");
        tdActions.innerHTML = `
            <button data-action="del" title="Διαγραφή Γραμμής">✘</button>
            <button data-action="add" title="Προσθήκη Γραμμής">✚</button>
        `;
        tr.appendChild(tdActions);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // ---------------- EVENTS ----------------
    tbody.addEventListener("input", e => {
        const td = e.target.closest("td[contenteditable]");
        if (!td) return;
        const row = +td.dataset.row;
        const col = td.dataset.col;
        tableModel.rows[row][col] = td.textContent;
        tableModel.triggerChange([{ type: "cell-edit", row, col, value: td.textContent }]);
    });

    tbody.addEventListener("click", e => {
        if (!e.target.matches("button")) return;
        const tr = e.target.closest("tr");
        const rowIndex = [...tbody.children].indexOf(tr);
        const action = e.target.dataset.action;

        if (action === "add") tableModel.addRowIndex(rowIndex + 1);
        if (action === "del") tableModel.deleteRow(rowIndex);
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

    // Drag/drop columns
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
        tableModel.renameColumn(th.dataset.colname, dropped.property, dropped.label);
        tableModel.triggerChange();
    });
}
