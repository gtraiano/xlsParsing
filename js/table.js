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

/* =========================================================
   Utilities
========================================================= */

function delegateClosest(e, selector) {
    const t =
        e.target instanceof Element
            ? e.target
            : e.target?.parentElement;
    return t?.closest(selector) || null;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

/* =========================================================
   History (Undo / Redo)
========================================================= */

class History {
    stack = [];
    index = -1;

    push(diff) {
        this.stack = this.stack.slice(0, this.index + 1);
        this.stack.push(diff);
        this.index++;
    }

    undo() {
        if (this.index < 0) return;
        this.stack[this.index--].undo();
    }

    redo() {
        if (this.index >= this.stack.length - 1) return;
        this.stack[++this.index].redo();
    }
}

const history = new History();

/* =========================================================
   Column Box Drag Helpers
========================================================= */

function lockColumnBox(property, mappedTo) {
    const box = document.querySelector(`.columnBox[data-property="${property}"]`);
    if (!box) return;
    box.classList.add("disabled");
    box.title = `Mapped to ${mappedTo}`;
    box.draggable = false;
}

function unlockColumnBox(property) {
    const box = document.querySelector(`.columnBox[data-property="${property}"]`);
    if (!box) return;
    box.classList.remove("disabled");
    box.title = "";
    box.draggable = true;
}

/* =========================================================
   Table Helpers
========================================================= */

function th(key, text = "", draggable = false) {
    const th = document.createElement("th");
    th.dataset.colname = key;
    th.textContent = text;
    if (draggable) th.draggable = true;
    return th;
}

function renameColumnDOM(table, model, oldKey, newKey, newHeader) {
    model.renameColumn(oldKey, newKey, newHeader);

    table.querySelectorAll(`[data-colname="${oldKey}"]`).forEach(th => th.dataset.colname = newKey);
    table.querySelectorAll(`td[data-col="${oldKey}"]`).forEach(td => td.dataset.col = newKey);

    const header = table.querySelector(`thead tr:nth-child(2) th[data-colname="${newKey}"]`);
    if (header) {
        header.textContent = newHeader;
        header.title = newKey;
        header.classList.add("locked");
        header.contentEditable = false;
    }
}

/* =========================================================
   Main Table Init
========================================================= */

export function initTable(container, tableModel, mapColumns) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "data-table";
    container.appendChild(table);

    const thead = table.createTHead();
    const tbody = table.createTBody();

    // Header rows
    const trSelect = thead.insertRow();
    const trHeader = thead.insertRow();

    function rebuildHeaders() {
        trSelect.innerHTML = "";
        trHeader.innerHTML = "";

        tableModel.columns.forEach(c => {
            trSelect.appendChild(th(c.key));
            trHeader.appendChild(th(c.key, c.header, true));
        });

        trSelect.appendChild(document.createElement("th"));
        trHeader.appendChild(Object.assign(document.createElement("th"), { textContent: "Actions" }));
    }

    rebuildHeaders();

    /* ---------- Render rows ---------- */
    function renderRows() {
        tbody.querySelectorAll("tr.data-row").forEach(r => r.remove());

        tableModel.rows.forEach((row, i) => {
            const tr = document.createElement("tr");
            tr.dataset.row = i;
            tr.className = "data-row";

            tableModel.columns.forEach(col => {
                const td = document.createElement("td");
                td.dataset.col = col.key;
                td.contentEditable = true;
                td.textContent = row[col.key];
                tr.appendChild(td);
            });

            const tdActions = document.createElement("td");
            tdActions.innerHTML = `<button data-action="del">✘</button><button data-action="add">✚</button>`;
            tr.appendChild(tdActions);

            tbody.appendChild(tr);
        });
    }

    renderRows();

    /* =========================================================
       Event Delegation
    ========================================================== */

    // Cell editing
    tbody.addEventListener("input", e => {
        const td = delegateClosest(e, "td[contenteditable]");
        if (!td) return;
        const tr = td.closest("tr");
        const row = +tr.dataset.row;
        const col = td.dataset.col;

        const old = tableModel.rows[row][col];
        const val = td.textContent;
        if (old === val) return;

        tableModel.rows[row][col] = val;

        history.push({
            undo: () => { tableModel.rows[row][col] = old; td.textContent = old; },
            redo: () => { tableModel.rows[row][col] = val; td.textContent = val; }
        });
    });

    // Row add/delete
    tbody.addEventListener("click", e => {
        const btn = delegateClosest(e, "button[data-action]");
        if (!btn) return;
        const tr = btn.closest("tr");
        const row = +tr.dataset.row;

        if (btn.dataset.action === "add") {
            tableModel.addRowIndex(row + 1);
            history.push({
                undo: () => { tableModel.deleteRow(row + 1); renderRows(); },
                redo: () => { tableModel.addRowIndex(row + 1); renderRows(); }
            });
        }
        if (btn.dataset.action === "del") {
            const snapshot = { ...tableModel.rows[row] };
            tableModel.deleteRow(row);
            history.push({
                undo: () => { tableModel.addRowIndex(row, snapshot); renderRows(); },
                redo: () => { tableModel.deleteRow(row); renderRows(); }
            });
        }
        renderRows();
    });

    // Column selection
    table.addEventListener("click", e => {
        const th = delegateClosest(e, "thead tr:first-child th[data-colname]");
        if (!th) return;
        const idx = [...th.parentNode.children].indexOf(th);
        const on = th.classList.toggle("col-selected");
        table.querySelectorAll(
            `thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`
        ).forEach(cell => cell.classList.toggle("col-selected", on));
    });

    /* =========================================================
       Column Box Drag & Drop Mapping
    ========================================================== */

    table.addEventListener("dragover", e => {
        const th = delegateClosest(e, "thead tr:nth-child(2) th[data-colname]");
        if (!th) return;

        const data = e.dataTransfer.getData("application/json");
        if (!data) return;
        const dragged = JSON.parse(data);
        const targetKey = th.dataset.colname;

        const allowed = targetKey !== dragged.property && !mapColumns[dragged.property]?.mapped;

        th.classList.remove("dragover", "invalid-drop");

        if (!allowed) { th.classList.add("invalid-drop"); e.dataTransfer.dropEffect = "none"; return; }
        e.preventDefault();
        th.classList.add("dragover");
        e.dataTransfer.dropEffect = "move";
    });

    table.addEventListener("dragleave", e => {
        const th = delegateClosest(e, "th[data-colname]");
        if (!th) return;
        th.classList.remove("dragover", "invalid-drop");
    });

    table.addEventListener("drop", e => {
        const th = delegateClosest(e, "thead tr:nth-child(2) th[data-colname]");
        if (!th) return;

        const data = e.dataTransfer.getData("application/json");
        if (!data) return;
        e.preventDefault();

        const dropped = JSON.parse(data);
        const targetKey = th.dataset.colname;
        const newKey = dropped.property;

        if (targetKey === newKey || mapColumns[newKey]?.mapped) return;

        const oldHeader = th.textContent;

        history.push({
            undo: () => { renameColumnDOM(table, tableModel, newKey, targetKey, oldHeader); mapColumns[newKey].mapped = null; unlockColumnBox(newKey); },
            redo: () => { renameColumnDOM(table, tableModel, targetKey, newKey, dropped.label); mapColumns[newKey].mapped = targetKey; lockColumnBox(newKey, targetKey); }
        });

        renameColumnDOM(table, tableModel, targetKey, newKey, dropped.label);
        mapColumns[newKey].mapped = targetKey;
        lockColumnBox(newKey, targetKey);
    });

    /* =========================================================
       Undo / Redo
    ========================================================== */
    document.addEventListener("keydown", e => {
        if (e.ctrlKey && e.key === "z") history.undo();
        if (e.ctrlKey && e.key === "y") history.redo();
    });
}
