import { initParseFileTab } from "./parseFile.js";
import { initCreateTableTab } from "./createTable.js";
import "./tabs.js";

document.addEventListener("DOMContentLoaded", () => {

    // Initialize first tab (Parse File)
    initParseFileTab();

    // Tab click handler
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tabId = tab.dataset.tab;

            // Toggle active class for tabs and content
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(tabId).classList.add("active");

            // Initialize tab if needed
            if (tabId === "parse-file") initParseFileTab();
            if (tabId === "create-table") initCreateTableTab();
        });
    });
});
