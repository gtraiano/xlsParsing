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

    addRowIndex(index, defaults = {}) {
        const row = {};
        for (const c of this.columns) {
            row[c.key] = defaults[c.key] ?? "";
        }
        this.rows.splice(index, 0, row);
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

        const tdActions = document.createElement("td");
        const btnDel = document.createElement("button");
        const btnAdd = document.createElement("button");

        btnDel.classList.add("del-row");
        btnDel.textContent = "X";
        btnDel.title = "delete row";
        btnDel.dataset.action = "del";

        btnAdd.classList.add("add-row");
        btnAdd.dataset.action = "add";
        btnAdd.textContent = "+";
        btnAdd.title = "add row";

        tdActions.appendChild(btnDel);
        tdActions.appendChild(btnAdd);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    // ----- EVENT DELEGATION: One listener for all editable cells -----
    tbody.addEventListener("input", (e) => {
        const td = e.target.closest("td[contenteditable]");

        if (!td) return;

        const rowIndex = td.dataset.row;
        const colKey = td.dataset.col;

        tableModel.rows[rowIndex][colKey] = td.textContent;

        e.target.dispatchEvent(new CustomEvent("updateJson", { detail: { rowIndex, colKey, value: td.textContent }, bubbles: true }));
    });

    tbody.addEventListener("click", e => {
        const target = e.target;

        if (target.matches("button")) {
            const rowIndex = e.target.closest("tr").sectionRowIndex;

            switch (target.dataset.action) {
                case "add":
                    tableModel.addRowIndex(rowIndex + 1, {});
                    break;
                case "del":
                    tableModel.deleteRow(rowIndex);
                    break;
                default:
                    break;
            }
            createEditableTable(container, tableModel);
        }
    })

    table.appendChild(tbody);
    container.appendChild(table);
}
