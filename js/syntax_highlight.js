// ---------------------------------------------------------------------
// syntax_highlight.js
// Simple JSON pretty-print and live update
// ---------------------------------------------------------------------

/**
 * Updates a <pre> element with formatted JSON.
 * @param {Object|Array} data - The data to display
 * @param {HTMLElement} container - The <pre> element
 */
export function updateJSON(data, container) {
    if (!container) return;
    try {
        const jsonString = JSON.stringify(data, null, 2);

        // Optional: basic syntax highlighting
        const highlighted = jsonString
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, match => {
                let cls = "number";
                if (/^"/.test(match)) {
                    cls = /:$/.test(match) ? "key" : "string";
                } else if (/true|false/.test(match)) {
                    cls = "boolean";
                } else if (/null/.test(match)) {
                    cls = "null";
                }
                return `<span class="${cls}">${match}</span>`;
            });

        container.innerHTML = highlighted;
    } catch (e) {
        container.textContent = "Invalid JSON";
        console.error(e);
    }
}
