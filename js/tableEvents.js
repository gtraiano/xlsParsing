import { delegateClosest } from "./dom-utils.js";
import { history } from "./history.js";
import {
    insertRowState,
    removeRowState,
    insertRowDOM,
    removeRowDOM
} from "./rowActions.js";
import {
    applyMap,
    applyUnmap
} from "./mappingActions.js";
import {
    renameColumnDOM,
    lockColumnBox,
    unlockColumnBox
} from "./mappingDOM.js";
import { createTableState, parseFileState } from "./state.js";
import { notify } from "./store.js";

/* ===========================
   Cell Edit
=========================== */
export function bindCellEditing(table, model) {
    table.tBodies[0].addEventListener("input", e => {
        const td = delegateClosest(e, "td[contenteditable]");
        if (!td) return;

        const row = +td.closest("tr").dataset.row;
        const col = td.dataset.col;
        if (!model.rows[row]) return;  // safeguard

        const oldVal = model.rows[row][col];
        const newVal = td.textContent;
        if (oldVal === newVal) return;

        history.push({
            type: "cell-edit",
            undo() {
                model.rows[row][col] = oldVal;
                td.textContent = oldVal;
                notify();  // update JSON preview
            },
            redo() {
                model.rows[row][col] = newVal;
                td.textContent = newVal;
                notify();
            }
        });

        model.rows[row][col] = newVal;
        notify();
    });
}

/* ===========================
   Row Add / Delete
=========================== */
export function bindRowActions(table, model) {
    table.tBodies[0].addEventListener("click", e => {
        const btn = delegateClosest(e, "button[data-action]");
        if (!btn) return;

        const row = +btn.closest("tr").dataset.row;

        if (btn.dataset.action === "add") {
            const snapshot = insertRowState(model, row + 1);

            history.push({
                type: "row-add",
                undo() {
                    removeRowState(model, row + 1);
                    removeRowDOM(table, row + 1);
                    notify();
                },
                redo() {
                    insertRowState(model, row + 1, snapshot);
                    insertRowDOM(table, model, row + 1);
                    notify();
                }
            });

            insertRowDOM(table, model, row + 1);
            notify();
        }

        if (btn.dataset.action === "del") {
            const snapshot = removeRowState(model, row);

            history.push({
                type: "row-delete",
                undo() {
                    insertRowState(model, row, snapshot);
                    insertRowDOM(table, model, row);
                    notify();
                },
                redo() {
                    removeRowState(model, row);
                    removeRowDOM(table, row);
                    notify();
                }
            });

            removeRowDOM(table, row);
            notify();
        }
    });
}

/* ===========================
   Column Selection
=========================== */
export function bindColumnSelection(table, model) {
    if (model.options.disableColumnSelection) return;

    table.addEventListener("click", e => {
        const th = e.target.closest("thead tr:first-child th[data-key]");
        if (!th) return;

        const idx = [...th.parentNode.children].indexOf(th);
        const selected = th.classList.toggle("col-selected");

        table.querySelectorAll(
            `thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`
        ).forEach(cell => cell.classList.toggle("col-selected", selected));
    });
}

/* ===========================
   Column Box Drag & Drop
=========================== */
export function bindColumnBoxes(columnBoxes, model) {
    if (!columnBoxes) return;

    columnBoxes.addEventListener("dragstart", e => {
        const box = e.target.closest(".columnBox");
        if (!box) return;

        e.dataTransfer.setData("application/json", JSON.stringify({
            label: box.textContent.trim(),
            property: box.dataset.property
        }));

        e.dataTransfer.effectAllowed = "move";
        box.classList.add("dragging");
    });

    columnBoxes.addEventListener("dragend", e => {
        const box = e.target.closest(".columnBox");
        if (!box) return;
        box.classList.remove("dragging");
    });

    tableDropListener(columnBoxes, model);
}

function tableDropListener(columnBoxes, model) {
    const table = model === parseFileState.tableModel
        ? document.getElementById("tableContainer").querySelector("table")
        : document.getElementById("customTableContainer").querySelector("table");

    if (!table) return;

    table.addEventListener("dragover", e => {
        e.preventDefault();

        const th = e.target.closest("th[data-key]");
        clearColumnDragState(table);

        if (!th) return;

        // Disallow dropping on locked columns
        if (th.classList.contains("locked")) {
            th.classList.add("invalid-drop");
            return;
        }

        th.classList.add("dragover");
    });

    table.addEventListener("dragleave", e => {
        if (!e.relatedTarget || !table.contains(e.relatedTarget)) {
            clearColumnDragState(table);
        }
    });

    table.addEventListener("drop", e => {
        e.preventDefault();
        clearColumnDragState(table);

        const data = e.dataTransfer.getData("application/json");
        if (!data) return;

        const th = e.target.closest("th[data-key]");
        if (!th || th.classList.contains("locked")) return;

        const { property, label } = JSON.parse(data);

        const oldKey = th.dataset.key;
        renameColumnDOM(table, model, oldKey, property, label);
        applyMap(property, th.dataset.key, th.textContent);
        lockColumnBox(property, th.dataset.key);
        notify();
    });
}

function clearColumnDragState(table) {
    table.querySelectorAll("th.dragover, th.invalid-drop")
        .forEach(th => th.classList.remove("dragover", "invalid-drop"));
}

