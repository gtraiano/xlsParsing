export function insertRowState(model, index, rowData = null) {
    const row = rowData ?? Object.fromEntries(
        model.columns.map(c => [c.key, ""])
    );
    model.rows.splice(index, 0, row);
    return row;
}

export function removeRowState(model, index) {
    return model.rows.splice(index, 1)[0];
}

export function insertRowDOM(table, model, index) {
    const tbody = table.tBodies[0];
    const tr = document.createElement("tr");
    tr.dataset.row = index;

    model.columns.forEach(col => {
        const td = document.createElement("td");
        td.dataset.col = col.key;
        td.contentEditable = true;
        td.textContent = model.rows[index][col.key];
        tr.appendChild(td);
    });

    const tdActions = document.createElement("td");
    tdActions.innerHTML = `<button data-action="del">✘</button><button data-action="add">✚</button>`;
    tr.appendChild(tdActions);

    tbody.insertBefore(tr, tbody.children[index] || null);
    syncRowIndices(tbody);
}

export function removeRowDOM(table, index) {
    const tbody = table.tBodies[0];
    tbody.children[index]?.remove();
    syncRowIndices(tbody);
}

function syncRowIndices(tbody) {
    [...tbody.children].forEach((tr, i) => tr.dataset.row = i);
}
