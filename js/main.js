import { initParseFileTab } from "./parseFile.js";
import { initCreateTableTab } from "./createTable.js";
import "./tabs.js";

document.addEventListener("DOMContentLoaded", () => {
    initParseFileTab(); // default tab

    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tabId = tab.dataset.tab;

            document.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));
            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

            tab.classList.add("active");
            const content = document.getElementById(tabId);
            content.classList.add("active");

            if (tabId === "parse-file") initParseFileTab();
            if (tabId === "create-table") initCreateTableTab();
        });
    });
});
