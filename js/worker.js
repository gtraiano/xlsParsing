importScripts("https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js");

const trimObject = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key.trim(),
            typeof value === "string" ? value.trim() : value
        ])
    );
};

self.onmessage = (e) => {
    const { file, range } = e.data;
    const reader = new FileReader();

    reader.onload = (ev) => {
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
