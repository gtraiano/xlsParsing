/* ===========================
   Table / Parse State
=========================== */

export const parseFileState = {
    tableModel: null,
    lastFile: null
};

export const createTableState = {
    tableModel: null
};

/* ===========================
   Drag State
=========================== */

export const dragState = {
    type: null,      // "box" | "header"
    property: null,
    label: null
};

/* ===========================
   Mapping State (HISTORY AWARE)
=========================== */

export const mapColumns = {
    commercial_name: {
        label: "Εμπορική Ονομασία",
        property: "commercial_name",
        mapped: null,
        history: []
    },
    eof_code: {
        label: "Κωδικός ΕΟΦ",
        property: "eof_code",
        mapped: null,
        history: []
    },
    barcode: {
        label: "Barcode",
        property: "barcode",
        mapped: null,
        history: []
    },
    amka: {
        label: "ΑΜΚΑ Ασθενή",
        property: "amka",
        mapped: null,
        history: []
    },
    expiry_date: {
        label: "Ημερομηνία λήξης",
        property: "expiry_date",
        mapped: null,
        history: []
    },
    icd10_title: {
        label: "Διάγνωση ICD10",
        property: "icd10_title",
        optional: true,
        mapped: null,
        history: []
    },
    icd10_code: {
        label: "Κωδικός ICD10",
        property: "icd10_code",
        mapped: null,
        history: []
    }
};
