export class TableModel {
    constructor(columns = [], rows = []) {
        this.columns = columns;
        this.rows = rows;
    }

    addRow(defaults = {}) {
        const row = {};
        for (const c of this.columns) {
            row[c.key] = defaults[c.key] ?? "";
        }
        this.rows.push(row);
    }

    deleteRow(index) {
        this.rows.splice(index, 1);
    }
}

export function createEditableTable(container, tableModel) {
    container.innerHTML = "";

    const table = document.createElement("table");
    table.className = "data-table";

    // ----- THEAD -----
    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");

    for (const col of tableModel.columns) {
        const th = document.createElement("th");
        th.textContent = col.header;
        trHead.appendChild(th);
    }

    const thDel = document.createElement("th");
    thDel.textContent = "Delete";
    trHead.appendChild(thDel);

    thead.appendChild(trHead);
    table.appendChild(thead);

    // ----- TBODY -----
    const tbody = document.createElement("tbody");

    tableModel.rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        tableModel.columns.forEach(col => {
            const td = document.createElement("td");
            td.contentEditable = "true";
            td.dataset.row = rowIndex;
            td.dataset.col = col.key;
            td.textContent = row[col.key];
            tr.appendChild(td);
        });

        const tdDel = document.createElement("td");
        const btnDel = document.createElement("button");
        btnDel.textContent = "X";
        btnDel.addEventListener("click", () => {
            tableModel.deleteRow(rowIndex);
            createEditableTable(container, tableModel);
        });
        tdDel.appendChild(btnDel);
        tr.appendChild(tdDel);

        tbody.appendChild(tr);
    });

    // ----- EVENT DELEGATION: One listener for all editable cells -----
    tbody.addEventListener("input", (e) => {
        const td = e.target.closest("td[contenteditable]");

        if (!td) return;

        const rowIndex = td.dataset.row;
        const colKey = td.dataset.col;

        tableModel.rows[rowIndex][colKey] = td.textContent;
    });

    table.appendChild(tbody);
    container.appendChild(table);
}
