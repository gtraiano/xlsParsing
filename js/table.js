import { mapColumns, dragState } from "./state.js";
import { notify } from "./store.js";

/**
 * Utility: delegateClosest
 * Like e.target.closest but works with event delegation
 */
function delegateClosest(e, selector) {
    if (!e.target) return null;
    return e.target.closest(selector);
}

// ----------------------------- Table Renderer -----------------------------
export function createTable(container, tableModel) {
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
        const td = delegateClosest(e, "td[contenteditable]");
        if (!td) return;
        const row = +td.dataset.row;
        const col = td.dataset.col;
        tableModel.rows[row][col] = td.textContent;
        notify();
    });

    // Row add/delete
    tbody.addEventListener("click", e => {
        if (!e.target.matches("button")) return;
        const tr = delegateClosest(e, "tr");
        const rowIndex = Array.from(tr.parentNode.children).indexOf(tr);
        const action = e.target.dataset.action;

        if (action === "add") {
            // Add row after current
            const newRow = {};
            tableModel.columns.forEach(c => newRow[c.key] = "");
            tableModel.rows.splice(rowIndex + 1, 0, newRow);

            const trNew = document.createElement("tr");
            tableModel.columns.forEach(c => {
                const td = document.createElement("td");
                td.contentEditable = true;
                td.dataset.row = rowIndex + 1;
                td.dataset.col = c.key;
                td.textContent = "";
                trNew.appendChild(td);
            });
            const tdActions = document.createElement("td");
            tdActions.innerHTML = `
                <button data-action="del" title="Διαγραφή Γραμμής">✘</button>
                <button data-action="add" title="Προσθήκη Γραμμής">✚</button>
            `;
            trNew.appendChild(tdActions);

            tr.parentNode.insertBefore(trNew, tr.nextSibling);

            // Update dataset.row for all rows after inserted row
            Array.from(tbody.querySelectorAll("tr")).forEach((r, idx) => {
                r.querySelectorAll("td").forEach(td => {
                    if (td.dataset.row !== undefined) td.dataset.row = idx;
                });
            });

            notify();
        }

        if (action === "del") {
            tableModel.rows.splice(rowIndex, 1);
            tr.remove();

            // Update dataset.row for remaining rows
            Array.from(tbody.querySelectorAll("tr")).forEach((r, idx) => {
                r.querySelectorAll("td").forEach(td => {
                    if (td.dataset.row !== undefined) td.dataset.row = idx;
                });
            });

            notify();
        }
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

    // Column header drag & drop
    table.addEventListener("dragover", e => {
        const th = delegateClosest(e, "thead tr:nth-child(2) th[data-colname]");
        if (!th) return;

        e.preventDefault();

        const draggedData = JSON.parse(e.dataTransfer.getData("application/json"));
        const targetKey = th.dataset.colname;
        const isAllowed = targetKey !== draggedData.property && !mapColumns[draggedData.property]?.mapped;

        th.classList.remove("dragover", "invalid-drop");

        if (isAllowed) {
            th.classList.add("dragover");
            e.dataTransfer.dropEffect = "move";
        } else {
            th.classList.add("invalid-drop");
            e.dataTransfer.dropEffect = "none";
        }
    });

    table.addEventListener("dragleave", e => {
        const th = delegateClosest(e, "th[data-colname]");
        if (!th) return;
        th.classList.remove("dragover", "invalid-drop");
    });

    table.addEventListener("drop", e => {
        const th = delegateClosest(e, "thead tr:nth-child(2) th[data-colname]");
        if (!th) return;

        e.preventDefault();

        const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
        const targetKey = th.dataset.colname;
        const isAllowed = targetKey !== dropped.property && !mapColumns[dropped.property]?.mapped;

        th.classList.remove("dragover", "invalid-drop");

        if (!isAllowed) return;

        // Swap column names & headers
        const oldHeader = tableModel.columns.find(c => c.key === targetKey).header;
        tableModel.columns.find(c => c.key === targetKey).header = dropped.label;
        tableModel.columns.find(c => c.key === dropped.property).header = oldHeader;

        // Mark mapping
        mapColumns[dropped.property].mapped = targetKey;
        document.querySelector(`.columnBox[data-property=${dropped.property}]`).title = `Mapped to ${targetKey}`;

        notify();
        // No need to rerender entire table
    });
}
