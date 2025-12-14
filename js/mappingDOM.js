export function renameColumnDOM(table, model, oldKey, newKey, newHeader) {
    model.renameColumn(oldKey, newKey, newHeader);

    table.querySelectorAll(`[data-colname="${oldKey}"]`)
        .forEach(el => el.dataset.colname = newKey);

    table.querySelectorAll(`td[data-col="${oldKey}"]`)
        .forEach(td => td.dataset.col = newKey);

    const th = table.querySelector(
        `thead tr:nth-child(2) th[data-colname="${newKey}"]`
    );
    if (th) {
        th.textContent = newHeader;
        th.title = newKey;
        th.classList.toggle("locked", true);
        th.contentEditable = false;
        th.draggable = true;
    }
}

export function lockColumnBox(property, mappedTo) {
    const box = document.querySelector(`.columnBox[data-property="${property}"]`);
    if (!box) return;
    box.classList.add("disabled");
    box.title = `Mapped to ${mappedTo}`;
    box.draggable = false;
}

export function unlockColumnBox(property) {
    const box = document.querySelector(`.columnBox[data-property="${property}"]`);
    if (!box) return;
    box.classList.remove("disabled");
    box.title = "";
    box.draggable = true;
}
