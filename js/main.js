import { updateJSON } from './syntax_highlight.js';
/* ======================================================================
    UTIL: DEBOUNCE
====================================================================== */
const debounce = (cb, delay = 250) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => cb(...args), delay);
    };
};

/* ======================================================================
    ELEMENT REFERENCES
====================================================================== */
const drop = document.getElementById("drop-area");
const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");
const sheetSelector = document.getElementById("sheetSelector");
const tableContainer = document.getElementById("tableContainer");
const sendBtn = document.getElementById("sendBtn");
const resetBtn = document.getElementById("resetBtn");
const deleteBtn = document.getElementById("deleteBtn");
const columnBoxes = document.getElementById("columnBoxes");
const skipLines = document.getElementById("skipLines");

let lastFile = null;

/* ======================================================================
    COLUMN MAP DEFINITIONS
====================================================================== */
const mapColumns = {
    commercialName: { label: "Εμπορική Ονομασία", property: "commercial_name" },
    eofCode: { label: "Κωδικός ΕΟΦ", property: "eof_code" },
    barcode: { label: "Barcode", property: "barcode" },
    patientAmka: { label: "ΑΜΚΑ Ασθενή", property: "amka" },
    expiryDate: { label: "Ημερομηνία λήξης", property: "expiry_date" },
    icd10Title: { label: "Διάγνωση ICD10", optional: true, property: "icd10_title" },
    icd10Code: { label: "Κωδικός ICD10", property: "icd10_code" }
};

/* ======================================================================
    GLOBAL STATE + WORKER
====================================================================== */
const worker = new Worker("./js/worker.js");
let parsedSheets = {};
let originalSheets = {};

/* ======================================================================
    UNIFIED PARSE FUNCTION  (DRY!)
====================================================================== */
function parseFileWithSkip(file) {
    if (!file) return;

    lastFile = file;
    const range = parseInt(skipLines.value) || 0;

    tableContainer.textContent = "Parsing…";
    output.textContent = "Parsing…";

    worker.postMessage({ file, range });
}

/* ======================================================================
    WORKER RESPONSE: LOAD SHEETS
====================================================================== */
worker.onmessage = (e) => {
    parsedSheets = e.data;
    originalSheets = structuredClone(e.data);

    // populate sheet selector
    sheetSelector.innerHTML = "";
    Object.keys(parsedSheets).forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        sheetSelector.appendChild(opt);
    });

    sheetSelector.style.display = "inline-block";

    updateAfterChange();

    // show all buttons
    document.querySelectorAll("#controls button").forEach(btn => btn.style.removeProperty("display"));
};

/* ======================================================================
    TABLE RENDERING
====================================================================== */
function displaySheet(sheetName) {
    const data = parsedSheets[sheetName];
    if (!data?.length) {
        tableContainer.innerHTML = "<p>No data</p>";
        return;
    }

    const cols = Object.keys(data[0]);

    const html = `
        <table>
            <thead>
                <tr>
                    ${cols.map(col => `<th class="column-selector" data-colname="${col}"></th>`).join("")}
                </tr>
                <tr>
                    ${cols.map(col => `<th contenteditable="true" title="${col}" data-colname="${col}">${col}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${data.map((row, rowIndex) => `
                    <tr>
                        ${cols.map(col => `
                            <td contenteditable="true" data-row="${rowIndex}" data-colname="${col}">
                                ${row[col] ?? ""}
                            </td>
                        `).join("")}
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    tableContainer.innerHTML = html;
}

/* ======================================================================
    UPDATE JSON
====================================================================== */
/*
function updateJSON() {
    output.textContent = JSON.stringify(parsedSheets, null, 2);
    //output.innerHTML = syntaxHighlight(JSON.stringify(parsedSheets, null, 2));
}
*/
/* ======================================================================
    RENAME COLUMN ACROSS ALL ROWS
====================================================================== */
function renameColumn(oldName, newName) {
    const sheet = sheetSelector.value;
    parsedSheets[sheet].forEach(row => {
        row[newName] = row[oldName];
        delete row[oldName];
    });
}

/* ======================================================================
    DELETE SELECTED COLUMNS
====================================================================== */
function deleteSelectedColumns(sheetName) {
    const data = parsedSheets[sheetName];
    const table = tableContainer.querySelector("table");
    if (!table) return;

    const selected = [...table.querySelectorAll("thead tr:first-child th.col-selected")];
    const indices = selected.map(th => [...th.parentNode.children].indexOf(th));

    indices.sort((a, b) => b - a).forEach(i => {
        const prop = Object.keys(data[0])[i];
        data.forEach(row => delete row[prop]);
    });

    updateAfterChange();
}

/* ======================================================================
    GENERIC UPDATE PIPELINE
====================================================================== */
function updateAfterChange() {
    displaySheet(sheetSelector.value);
    updateJSON(parsedSheets[sheetSelector.value]);
}

/* ======================================================================
    CREATE DRAGGABLE COLUMN BOXES
====================================================================== */
Object.values(mapColumns).forEach(mp => {
    const box = document.createElement("span");
    box.className = "columnBox";
    box.draggable = true;
    box.textContent = mp.label;
    box.dataset.property = mp.property;
    columnBoxes.appendChild(box);
});

/* ======================================================================
    DOCUMENT-LEVEL EVENT DELEGATION
====================================================================== */
document.body.addEventListener("click", e => {
    // click drop area -> open file dialog
    if (drop.contains(e.target)) {
        fileInput.click();
        return;
    }

    if (e.target === deleteBtn) {
        if (confirm("Do you wish to remove selected columns?")) {
            deleteSelectedColumns(sheetSelector.value);
        }
        return;
    }

    if (e.target === resetBtn) {
        parsedSheets = structuredClone(originalSheets);
        updateAfterChange();
        return;
    }

    if (e.target === sendBtn) {
        (async () => {
            await fetch("save.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedSheets)
            });
            alert("Sent to backend!");
        })();
    }
});

/* ======================================================================
    SHEET SELECTOR
====================================================================== */
sheetSelector.addEventListener("change", () => updateAfterChange());

/* ======================================================================
    FILE INPUT
====================================================================== */
fileInput.addEventListener("change", e => {
    parseFileWithSkip(e.target.files[0]);
});

/* ======================================================================
    DROP AREA
====================================================================== */
drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("dragover"); });
drop.addEventListener("dragleave", () => drop.classList.remove("dragover"));

drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.classList.remove("dragover");
    parseFileWithSkip(e.dataTransfer.files[0]);
});

/* ======================================================================
    SKIP-LINES REPARSE
====================================================================== */
skipLines.addEventListener("input", debounce(() => {
    if (!lastFile) return;
    parseFileWithSkip(lastFile);
}, 300));

/* ======================================================================
    TABLE EDITING (event delegation)
====================================================================== */
tableContainer.addEventListener("input", debounce(e => {
    const el = e.target;
    if (!el.matches("td[contenteditable], th[contenteditable]")) return;

    const sheet = sheetSelector.value;

    if (el.tagName === "TD") {
        const row = +el.dataset.row;
        const col = el.dataset.colname;
        parsedSheets[sheet][row][col] = el.textContent;
    }

    if (el.tagName === "TH") {
        const oldName = el.dataset.colname;
        const newName = el.textContent.trim();
        renameColumn(oldName, newName);
        el.dataset.colname = newName;
        el.title = newName;
    }

    updateJSON(parsedSheets[sheetSelector.value]);
}, 350));

/* ======================================================================
    COLUMN SELECTION ("Excel-like" click on first header row)
====================================================================== */
tableContainer.addEventListener("click", e => {
    if (!e.target.matches("thead tr:first-child th")) return;

    const th = e.target;
    const idx = [...th.parentNode.children].indexOf(th);

    const isOn = th.classList.toggle("col-selected");

    tableContainer.querySelectorAll(`thead tr:last-child th:nth-child(${idx + 1}), tbody td:nth-child(${idx + 1})`)
        .forEach(cell => cell.classList.toggle("col-selected", isOn));
});

/* ======================================================================
    DRAG & DROP COLUMN RE-MAPPING
====================================================================== */
tableContainer.addEventListener("dragover", e => {
    if (e.target.matches("th")) {
        e.preventDefault();
        e.target.classList.add("dragover");
    }
});

tableContainer.addEventListener("dragleave", e => {
    if (e.target.matches("th")) {
        e.target.classList.remove("dragover");
    }
});

tableContainer.addEventListener("drop", e => {
    if (!e.target.matches("th")) return;

    e.preventDefault();
    const th = e.target;
    th.classList.remove("dragover");

    const dropped = JSON.parse(e.dataTransfer.getData("application/json"));
    const oldProp = th.dataset.colname;
    const newProp = dropped.property;

    renameColumn(oldProp, newProp);

    th.dataset.colname = newProp;
    th.textContent = dropped.label;
    th.title = dropped.property;

    updateJSON(parsedSheets[sheetSelector.value]);
});

/* ======================================================================
    DRAGGABLE COLUMN BOXES
====================================================================== */
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

