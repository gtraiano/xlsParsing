import { initParseFileTab } from "./parseFile.js";
import { initCreateTableTab } from "./createTable.js";
import "./tabs.js";

document.addEventListener("DOMContentLoaded", () => {
    initParseFileTab();

    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tabId = tab.dataset.tab;

            document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(tabId).classList.add("active");

            if (tabId === "parse-file") initParseFileTab();
            if (tabId === "create-table") initCreateTableTab();
        });
    });
});
