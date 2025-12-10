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

    const tbody = document.createElement("tbody");

    tableModel.rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        tableModel.columns.forEach(col => {
            const td = document.createElement("td");
            const input = document.createElement("input");
            input.value = row[col.key];
            input.addEventListener("input", () => row[col.key] = input.value);
            td.appendChild(input);
            tr.appendChild(td);
        });

        const tdDel = document.createElement("td");
        const btnDel = document.createElement("button");
        btnDel.textContent = "X";
        btnDel.onclick = () => {
            tableModel.deleteRow(rowIndex);
            createEditableTable(container, tableModel);
        };
        tdDel.appendChild(btnDel);
        tr.appendChild(tdDel);

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}
