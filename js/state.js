export const parseFileState = {
    tableModel: null,
    lastFile: null
};

export const createTableState = {
    tableModel: null
};

export const dragState = {
    key: null,
    label: null
};

export const mapColumns = {
    commercial_name: { label: "Εμπορική Ονομασία", property: "commercial_name", mapped: null },
    eof_code: { label: "Κωδικός ΕΟΦ", property: "eof_code", mapped: null },
    barcode: { label: "Barcode", property: "barcode", mapped: null },
    amka: { label: "ΑΜΚΑ Ασθενή", property: "amka", mapped: null },
    expiry_date: { label: "Ημερομηνία λήξης", property: "expiry_date", mapped: null },
    icd10_title: { label: "Διάγνωση ICD10", property: "icd10_title", optional: true, mapped: null },
    icd10_code: { label: "Κωδικός ICD10", property: "icd10_code", mapped: null }
};

