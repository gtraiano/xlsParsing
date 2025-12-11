export class TableModel {
    constructor(columns = [], rows = []) {
        this.columns = columns; // [{ key, header }]
        this.rows = rows;
        this._onChange = () => { };
    }

    onChange(cb) {
        this._onChange = cb;
    }

    triggerChange(diff) {
        this._onChange(diff);
    }

    // ---------------- ROWS ----------------

    addRow(defaults = {}) {
        const row = {};
        this.columns.forEach(c => row[c.key] = defaults[c.key] ?? "");
        this.rows.push(row);

        this.triggerChange([{ type: "row-add", rowData: row }]);
    }

    addRowIndex(index, defaults = {}) {
        const row = {};
        this.columns.forEach(c => row[c.key] = defaults[c.key] ?? "");
        this.rows.splice(index, 0, row);

        this.triggerChange([{ type: "row-add-index", index, rowData: row }]);
    }

    addRows(n, defaults = {}) {
        const newRows = [];

        for (let i = 0; i < n; i++) {
            const row = {};
            this.columns.forEach(c => {
                row[c.key] = defaults[c.key] ?? "";
            });
            newRows.push(row);
            this.rows.push(row);
        }

        // Emit a batch diff
        this.triggerChange(newRows.map((row, i) => ({
            type: "row-add-index",
            index: this.rows.length - n + i, // insert indices
            rowData: row
        })));
    }


    deleteRow(index) {
        this.rows.splice(index, 1);
        this.triggerChange([{ type: "row-delete", index }]);
    }

    // ---------------- COLUMNS ----------------

    deleteColumns(keys) {
        keys.forEach(key => {
            const colIndex = this.columns.findIndex(c => c.key === key);
            if (colIndex === -1) return;

            this.columns.splice(colIndex, 1);
            this.rows.forEach(r => delete r[key]);

            this.triggerChange([{ type: "col-delete", key, index: colIndex }]);
        });
    }

    addColumn(key, header, defaultValue = "") {
        const index = this.columns.length;
        this.columns.push({ key, header });
        this.rows.forEach(r => r[key] = defaultValue);

        this.triggerChange([{
            type: "col-add",
            key,
            header,
            defaultValue,
            index
        }]);
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

        this.triggerChange([{
            type: "col-rename",
            oldKey, newKey, newHeader
        }]);
    }

    reorderColumn(oldIndex, newIndex) {
        const col = this.columns.splice(oldIndex, 1)[0];
        this.columns.splice(newIndex, 0, col);

        this.triggerChange([{ type: "col-reorder", oldIndex, newIndex }]);
    }
}

export function createEditableTable(container, tableModel) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);

    // ============= INITIAL HEADER BUILD =============

    const trHead1 = document.createElement("tr");      // column selection row
    const trHead2 = document.createElement("tr");      // header edit row

    tableModel.columns.forEach(col => {
        const th1 = document.createElement("th");
        th1.dataset.colname = col.key;

        const th2 = document.createElement("th");
        th2.dataset.colname = col.key;
        th2.contentEditable = true;
        th2.textContent = col.header;
        th2.title = col.key;

        trHead1.appendChild(th1);
        trHead2.appendChild(th2);
    });

    trHead1.appendChild(document.createElement("th")); // spacer for actions

    const thActions = document.createElement("th");
    thActions.textContent = "Actions";
    trHead2.appendChild(thActions);

    thead.appendChild(trHead1);
    thead.appendChild(trHead2);

    // ============= INITIAL BODY BUILD =============

    const cellRefs = [];   // [{ colKey: td, ... }, ...]

    tableModel.rows.forEach((row, r) => {
        const tr = document.createElement("tr");
        const rowRef = {};

        tableModel.columns.forEach(col => {
            const td = document.createElement("td");
            td.dataset.row = r;
            td.dataset.col = col.key;
            td.contentEditable = true;
            td.textContent = row[col.key];
            tr.appendChild(td);

            rowRef[col.key] = td;
        });

        const tdActions = document.createElement("td");
        tdActions.innerHTML = `
            <button data-action="del">✘</button>
            <button data-action="add">✚</button>`;
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
        cellRefs.push(rowRef);
    });

    // ============================================================
    // EVENT DELEGATION
    // ============================================================

    // ---- CELL INPUT ----
    tbody.addEventListener("input", e => {
        const td = e.target.closest("td[contenteditable]");
        if (!td) return;

        const row = +td.dataset.row;
        const col = td.dataset.col;

        tableModel.rows[row][col] = td.textContent;

        tableModel.triggerChange([{
            type: "cell",
            row,
            col,
            value: td.textContent
        }]);
    });

    // ---- ADD/DELETE ROW ----
    tbody.addEventListener("click", e => {
        if (!e.target.matches("button")) return;

        const tr = e.target.closest("tr");
        const rowIndex = tr.sectionRowIndex;
        const action = e.target.dataset.action;

        if (action === "add") tableModel.addRowIndex(rowIndex + 1);
        if (action === "del") tableModel.deleteRow(rowIndex);
    });

    // ---- COLUMN SELECTION (RESTORED) ----
    table.addEventListener("click", e => {
        const th = e.target.closest("thead tr:first-child th[data-colname]");
        if (!th) return;

        const colKey = th.dataset.colname;
        const on = th.classList.toggle("col-selected");

        // header row 2
        const th2 = thead.querySelector(`tr:nth-child(2) th[data-colname="${colKey}"]`);
        if (th2) th2.classList.toggle("col-selected", on);

        // body cells
        cellRefs.forEach(rowRef => {
            const td = rowRef[colKey];
            if (td) td.classList.toggle("col-selected", on);
        });
    });

    // ============================================================
    // BATCH DIFF PROCESSING
    // ============================================================

    let pendingDiffs = [];
    let scheduled = false;

    const schedulePatch = diff => {
        pendingDiffs.push(...diff);

        if (!scheduled) {
            scheduled = true;
            queueMicrotask(() => {
                scheduled = false;
                const batch = pendingDiffs;
                pendingDiffs = [];
                patchTable(batch);
            });
        }
    };

    tableModel.onChange(schedulePatch);

    // ============================================================
    // PATCH FUNCTION (FULL DIFF ENGINE)
    // ============================================================

    function patchTable(diff) {
        preserveFocusBefore(() => {
            diff.forEach(change => {

                // ---------------- CELL UPDATE ----------------
                if (change.type === "cell") {
                    const td = cellRefs[change.row]?.[change.col];
                    if (td && td.textContent !== change.value) {
                        td.textContent = change.value;
                    }
                }

                // ---------------- ROW ADD ----------------
                if (change.type === "row-add") {
                    insertRow(cellRefs.length, change.rowData);
                }

                if (change.type === "row-add-index") {
                    insertRow(change.index, change.rowData);
                }

                // ---------------- ROW DELETE ----------------
                if (change.type === "row-delete") {
                    tbody.removeChild(tbody.children[change.index]);
                    cellRefs.splice(change.index, 1);

                    // reindex row dataset
                    cellRefs.forEach((ref, r) =>
                        Object.values(ref).forEach(td => td.dataset.row = r)
                    );
                }

                // ---------------- COLUMN RENAME ----------------
                if (change.type === "col-rename") {
                    const { oldKey, newKey, newHeader } = change;

                    const th = trHead2.querySelector(`th[data-colname="${oldKey}"]`);
                    if (th) {
                        th.dataset.colname = newKey;
                        th.textContent = newHeader;
                    }

                    cellRefs.forEach(rowRef => {
                        const td = rowRef[oldKey];
                        if (!td) return;
                        td.dataset.col = newKey;
                        rowRef[newKey] = td;
                        delete rowRef[oldKey];
                    });
                }

                // ---------------- COLUMN DELETE ----------------
                if (change.type === "col-delete") {
                    const { key, index } = change;

                    // clear selection
                    clearColumnSelection(key);

                    trHead1.removeChild(trHead1.children[index]);
                    trHead2.removeChild(trHead2.children[index]);

                    [...tbody.children].forEach((tr, r) => {
                        tr.removeChild(tr.children[index]);
                        delete cellRefs[r][key];
                    });
                }

                // ---------------- COLUMN ADD ----------------
                if (change.type === "col-add") {
                    const { index, key, header, defaultValue } = change;

                    const th1 = document.createElement("th");
                    th1.dataset.colname = key;

                    const th2 = document.createElement("th");
                    th2.dataset.colname = key;
                    th2.contentEditable = true;
                    th2.textContent = header;

                    trHead1.insertBefore(th1, trHead1.children[index]);
                    trHead2.insertBefore(th2, trHead2.children[index]);

                    [...tbody.children].forEach((tr, r) => {
                        const td = document.createElement("td");
                        td.dataset.row = r;
                        td.dataset.col = key;
                        td.contentEditable = true;
                        td.textContent = defaultValue;

                        tr.insertBefore(td, tr.children[index]);

                        const rowRef = cellRefs[r];
                        const entries = Object.entries(rowRef);
                        entries.splice(index, 0, [key, td]);

                        Object.keys(rowRef).forEach(k => delete rowRef[k]);
                        entries.forEach(([k, v]) => rowRef[k] = v);
                    });
                }

                // ---------------- COLUMN REORDER ----------------
                if (change.type === "col-reorder") {
                    reorderColumn(change.oldIndex, change.newIndex);
                    restoreSelectionAfterReorder();
                }
            });
        });
    }

    // ============================================================
    // HELPERS
    // ============================================================

    function insertRow(index, rowData) {
        const tr = document.createElement("tr");
        const rowRef = {};

        tableModel.columns.forEach(col => {
            const td = document.createElement("td");
            td.dataset.row = index;
            td.dataset.col = col.key;
            td.contentEditable = true;
            td.textContent = rowData[col.key];
            tr.appendChild(td);
            rowRef[col.key] = td;
        });

        const tdActions = document.createElement("td");
        tdActions.innerHTML = `
            <button data-action="del">✘</button>
            <button data-action="add">✚</button>`;
        tr.appendChild(tdActions);

        tbody.insertBefore(tr, tbody.children[index] || null);
        cellRefs.splice(index, 0, rowRef);

        // reindex rows
        cellRefs.forEach((ref, r) =>
            Object.values(ref).forEach(td => td.dataset.row = r)
        );
    }

    function reorderColumn(oldIndex, newIndex) {
        const headerRows = [trHead1, trHead2];

        headerRows.forEach(tr => {
            const th = tr.children[oldIndex];
            tr.removeChild(th);
            tr.insertBefore(th, tr.children[newIndex]);
        });

        [...tbody.children].forEach(tr => {
            const td = tr.children[oldIndex];
            tr.removeChild(td);
            tr.insertBefore(td, tr.children[newIndex]);
        });

        // rebuild rowRef mappings based on DOM order
        cellRefs.forEach((rowRef, r) => {
            const tr = tbody.children[r];
            const cells = [...tr.querySelectorAll("td[data-col]")];

            const newRef = {};
            cells.forEach(td => newRef[td.dataset.col] = td);
            cellRefs[r] = newRef;
        });
    }

    // ---- Selection restore after reorder ----
    function restoreSelectionAfterReorder() {
        const selectedCols = new Set(
            [...trHead1.querySelectorAll("th.col-selected")]
                .map(th => th.dataset.colname)
        );

        clearAllColumnSelections();

        selectedCols.forEach(key => {
            const th1 = trHead1.querySelector(`th[data-colname="${key}"]`);
            const th2 = trHead2.querySelector(`th[data-colname="${key}"]`);

            if (th1) th1.classList.add("col-selected");
            if (th2) th2.classList.add("col-selected");

            cellRefs.forEach(rowRef => {
                const td = rowRef[key];
                if (td) td.classList.add("col-selected");
            });
        });
    }

    function clearColumnSelection(key) {
        [...table.querySelectorAll(`*[data-colname="${key}"].col-selected`)]
            .forEach(n => n.classList.remove("col-selected"));

        cellRefs.forEach(rowRef => {
            const td = rowRef[key];
            if (td) td.classList.remove("col-selected");
        });
    }

    function clearAllColumnSelections() {
        table.querySelectorAll(".col-selected")
            .forEach(n => n.classList.remove("col-selected"));
    }

    // ---- Focus/selection preservation ----
    function preserveFocusBefore(applyFn) {
        const active = document.activeElement;
        const hasSel = active && active.closest("td");
        let selStart = null, selEnd = null;

        const sel = window.getSelection();
        if (hasSel && sel.rangeCount > 0) {
            const r = sel.getRangeAt(0);
            selStart = r.startOffset;
            selEnd = r.endOffset;
        }

        applyFn();

        if (hasSel && document.contains(active)) {
            active.focus();
            if (selStart !== null) {
                const range = document.createRange();
                const node = active.firstChild || active;
                range.setStart(node, Math.min(selStart, node.length));
                range.setEnd(node, Math.min(selEnd, node.length));

                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
}
