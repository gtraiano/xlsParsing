// Shared column definitions
export const mapColumns = {
    commercialName: { label: "Εμπορική Ονομασία", property: "commercial_name" },
    eofCode: { label: "Κωδικός ΕΟΦ", property: "eof_code" },
    barcode: { label: "Barcode", property: "barcode" },
    patientAmka: { label: "ΑΜΚΑ Ασθενή", property: "amka" },
    expiryDate: { label: "Ημερομηνία λήξης", property: "expiry_date" },
    icd10Title: { label: "Διάγνωση ICD10", optional: true, property: "icd10_title" },
    icd10Code: { label: "Κωδικός ICD10", property: "icd10_code" }
};
