export {};

const fileInput = document.getElementById("file-input");
const parseBtn = document.getElementById("parse-btn");
const fileOutput = document.getElementById("file-output");

parseBtn.onclick = () => {
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file.");
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        // Use first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        fileOutput.innerHTML = "<pre>" + JSON.stringify(json, null, 2) + "</pre>";
    };

    reader.readAsArrayBuffer(file);
};
