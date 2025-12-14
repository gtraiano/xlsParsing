// TableModel.js
import { notify } from "./store.js";
import { mapColumns } from "./state.js";

export class TableModel {
    constructor({ columns = [], rows = [] }) {
        this.columns = columns;          // { key, header }
        this.rows = rows;                // array of objects
        this.history = [];               // for undo/redo
        this.saveHistory();              // initial snapshot
    }

    // ---------------- HISTORY ----------------
    saveHistory() {
        // Save a deep copy of rows and columns
        this.history.push({
            columns: JSON.parse(JSON.stringify(this.columns)),
            rows: JSON.parse(JSON.stringify(this.rows))
        });
        notify();
    }

    undo() {
        if (this.history.length < 2) return;
        this.history.pop(); // discard current
        const last = this.history[this.history.length - 1];
        this.columns = JSON.parse(JSON.stringify(last.columns));
        this.rows = JSON.parse(JSON.stringify(last.rows));
        notify();
    }

    // ---------------- ROW OPERATIONS ----------------
    addRow(index = this.rows.length) {
        const newRow = {};
        this.columns.forEach(c => newRow[c.key] = "");
        this.rows.splice(index, 0, newRow);
        this.saveHistory();
    }

    deleteRow(index) {
        if (index < 0 || index >= this.rows.length) return;
        this.rows.splice(index, 1);
        this.saveHistory();
    }

    // ---------------- COLUMN OPERATIONS ----------------
    addColumn(key, header) {
        this.columns.push({ key, header });
        this.rows.forEach(r => r[key] = "");
        this.saveHistory();
    }

    removeColumns(keys) {
        // Remove columns from model
        this.columns = this.columns.filter(c => !keys.includes(c.key));
        this.rows.forEach(row => keys.forEach(k => delete row[k]));

        // Clear mapping if any
        keys.forEach(k => {
            if (mapColumns[k]) mapColumns[k].mapped = null;
        });

        this.saveHistory();
    }

    renameColumn(oldKey, newKey, newHeader) {
        const col = this.columns.find(c => c.key === oldKey);
        if (!col) return;

        col.key = newKey;
        if (newHeader) col.header = newHeader;

        this.rows.forEach(row => {
            if (row.hasOwnProperty(oldKey)) {
                row[newKey] = row[oldKey];
                delete row[oldKey];
            }
        });

        // Update mapping if present
        if (mapColumns[oldKey]) {
            mapColumns[oldKey].mapped = null;
            mapColumns[newKey] = mapColumns[newKey] || { ...mapColumns[oldKey] };
            mapColumns[newKey].mapped = newKey;
        }

        this.saveHistory();
    }
}
