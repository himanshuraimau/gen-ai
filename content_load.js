import fs from "fs/promises";
import { scrapper } from './scrapper.js';
import { analyze } from "./ai.js";

await scrapper();
console.log("hello");

export const loadContent = async () => {
    try {
        const data = await fs.readFile('./page_content.json', 'utf8');
        const contentArray = JSON.parse(data);
        console.log("Content loaded successfully. Number of items:", contentArray.length);
        return contentArray;
    } catch (error) {
       // console.error("Error loading the content:", error);
       // throw error;
    }
}
