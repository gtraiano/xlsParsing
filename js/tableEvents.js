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

/* ===========================
   Cell Edit
=========================== */

export function bindCellEditing(table, model) {
    table.tBodies[0].addEventListener("input", e => {
        const td = delegateClosest(e, "td[contenteditable]");
        if (!td) return;

        const row = +td.closest("tr").dataset.row;
        const col = td.dataset.col;
        const oldVal = model.rows[row][col];
        const newVal = td.textContent;

        if (oldVal === newVal) return;

        history.push({
            type: "cell-edit",
            undo() {
                model.rows[row][col] = oldVal;
                td.textContent = oldVal;
            },
            redo() {
                model.rows[row][col] = newVal;
                td.textContent = newVal;
            }
        });

        model.rows[row][col] = newVal;
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
                },
                redo() {
                    insertRowState(model, row + 1, snapshot);
                    insertRowDOM(table, model, row + 1);
                }
            });

            insertRowDOM(table, model, row + 1);
        }

        if (btn.dataset.action === "del") {
            const snapshot = removeRowState(model, row);

            history.push({
                type: "row-delete",
                undo() {
                    insertRowState(model, row, snapshot);
                    insertRowDOM(table, model, row);
                },
                redo() {
                    removeRowState(model, row);
                    removeRowDOM(table, row);
                }
            });

            removeRowDOM(table, row);
        }
    });
}
