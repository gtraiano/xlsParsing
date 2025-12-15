// TableModel.js
export class TableModel {
    constructor({ columns = [], rows = [], options = {} } = {}) {
        this.columns = columns.map(col => ({ ...col })); // { key, header }
        this.rows = rows.map(r => ({ ...r }));
        this.options = options;

        this.history = [];
        this.historyIndex = -1; // last applied entry
        this._listeners = [];
    }

    subscribe(fn) {
        if (typeof fn === "function") this._listeners.push(fn);
    }

    unsubscribe(fn) {
        this._listeners = this._listeners.filter(f => f !== fn);
    }

    notify() {
        this._listeners.forEach(fn => fn());
    }

    // --- Row manipulation ---
    addRows(count = 1, index = this.rows.length) {
        if (count < 1) return;
        const newRows = Array.from({ length: count }, () => {
            const row = {};
            this.columns.forEach(col => (row[col.key] = ""));
            return row;
        });
        this.rows.splice(index, 0, ...newRows);
        this._pushHistory({ type: "row-add", index, count, rows: newRows });
        this.notify();
    }

    removeRow(index) {
        if (index < 0 || index >= this.rows.length) return;
        const [removed] = this.rows.splice(index, 1);
        this._pushHistory({ type: "row-remove", index, row: removed });
        this.notify();
    }

    // --- Column manipulation ---
    renameColumn(key, newHeader) {
        const col = this.columns.find(c => c.key === key);
        if (!col) return;
        const oldHeader = col.header;
        col.header = newHeader;
        this._pushHistory({ type: "column-rename", column: col, oldHeader, newHeader });
        this.notify();
    }

    deleteColumns(keys = []) {
        if (!keys.length) return;
        const removedColumns = this.columns.filter(c => keys.includes(c.key));
        const removedData = this.rows.map(row => {
            const obj = {};
            removedColumns.forEach(col => (obj[col.key] = row[col.key]));
            return obj;
        });
        this.columns = this.columns.filter(c => !keys.includes(c.key));
        this.rows.forEach(row => keys.forEach(k => delete row[k]));
        this._pushHistory({ type: "column-delete", columns: removedColumns, data: removedData });
        this.notify();
    }

    setCell(rowIndex, colKey, value) {
        if (rowIndex < 0 || rowIndex >= this.rows.length) return;
        const row = this.rows[rowIndex];
        if (!(colKey in row)) return;
        const oldValue = row[colKey];
        row[colKey] = value;
        this._pushHistory({ type: "cell-edit", rowIndex, colKey, oldValue, newValue: value });
        this.notify();
    }

    // --- Undo/Redo ---
    undo() {
        if (this.historyIndex < 0) return;
        const entry = this.history[this.historyIndex];
        this._applyUndo(entry);
        this.historyIndex--;
        this.notify();
    }

    redo() {
        if (this.historyIndex + 1 >= this.history.length) return;
        const entry = this.history[this.historyIndex + 1];
        this._applyRedo(entry);
        this.historyIndex++;
        this.notify();
    }

    _pushHistory(entry) {
        this.history.splice(this.historyIndex + 1);
        this.history.push(entry);
        this.historyIndex = this.history.length - 1;
    }

    _applyUndo(entry) {
        switch (entry.type) {
            case "row-add":
                this.rows.splice(entry.index, entry.count);
                break;
            case "row-remove":
                this.rows.splice(entry.index, 0, entry.row);
                break;
            case "column-rename":
                entry.column.header = entry.oldHeader;
                break;
            case "column-delete":
                this.columns.splice(entry.columns[0].index, 0, ...entry.columns);
                this.rows.forEach((row, i) => Object.assign(row, entry.data[i]));
                break;
            case "cell-edit":
                this.rows[entry.rowIndex][entry.colKey] = entry.oldValue;
                break;
        }
    }

    _applyRedo(entry) {
        switch (entry.type) {
            case "row-add":
                this.rows.splice(entry.index, 0, ...entry.rows);
                break;
            case "row-remove":
                this.rows.splice(entry.index, 1);
                break;
            case "column-rename":
                entry.column.header = entry.newHeader;
                break;
            case "column-delete":
                this.columns = this.columns.filter(c => !entry.columns.find(rc => rc.key === c.key));
                this.rows.forEach((row, i) => entry.columns.forEach(col => delete row[col.key]));
                break;
            case "cell-edit":
                this.rows[entry.rowIndex][entry.colKey] = entry.newValue;
                break;
        }
    }
}
