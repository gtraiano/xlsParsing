importScripts("../libs/xlsx.full.min.js");

const trimObject = obj =>
    Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [k.trim(), typeof v === "string" ? v.trim() : v])
    );

self.onmessage = e => {
    const { file, range } = e.data;
    const reader = new FileReader();

    reader.onload = ev => {
        const data = ev.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const result = {};

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            result[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: null, range, raw: false })
                .map(trimObject);
        });

        self.postMessage(result);
    };

    reader.readAsArrayBuffer(file);
};
