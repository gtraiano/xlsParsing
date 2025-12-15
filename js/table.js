export function createTable(container, tableModel) {
    container.innerHTML = "";

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // --- Column selection row ---
    const selectRow = document.createElement("tr");
    tableModel.columns.forEach(col => {
        const th = document.createElement("th");
        th.dataset.colname = col.key;
        th.className = "selectable";
        selectRow.appendChild(th);
    });
    selectRow.innerHTML += `<th class="selectable"></th>`
    thead.appendChild(selectRow);

    // --- Column headers row ---
    const headerRow = document.createElement("tr");
    tableModel.columns.forEach(col => {
        const th = document.createElement("th");
        th.textContent = col.header;
        th.title = col.key;
        th.dataset.key = col.key;
        th.dataset.colname = col.key;
        th.contentEditable = "true";
        th.draggable = true;
        headerRow.appendChild(th);
    });
    headerRow.innerHTML += `<th></th>`;
    thead.appendChild(headerRow);

    // --- Table body ---
    tableModel.rows.forEach((row, i) => {
        const tr = document.createElement("tr");
        tr.dataset.row = i;

        tableModel.columns.forEach(col => {
            const td = document.createElement("td");
            td.dataset.row = i;
            td.dataset.col = col.key;
            td.contentEditable = true;
            td.textContent = row[col.key] ?? "";
            tr.appendChild(td);
        });

        // Row actions (add / delete)
        const tdActions = document.createElement("td");
        tdActions.innerHTML = `
            <div class="row-actions">
                <button data-action="del">🗙</button>
                <button data-action="add">✚</button>
            <div>
        `;
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);

    // --- Column selection listener ---
    if (tableModel.options.disableColumnSelection !== true) {
        table.addEventListener("click", e => {
            const th = e.target.closest("thead tr:first-child th[data-colname]");
            if (!th) return;

            const idx = [...th.parentNode.children].indexOf(th);
            const on = th.classList.toggle("col-selected");
            const checkbox = th.querySelector("input");
            if (checkbox) checkbox.checked = on;

            table.querySelectorAll(
                `thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`
            ).forEach(cell => cell.classList.toggle("col-selected", on));
        });
    }

    return table;
}
