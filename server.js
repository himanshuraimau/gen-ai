import express from 'express';
import dotenv from 'dotenv';
import fs from "fs";
import  {analyze}  from './ai.js';
import { loadContent } from './content_load.js';
import { relevantLinks } from './ai.js';

dotenv.config({
    path: "./config.env"
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

loadContent().then(async (content) => {
    const content_json = [];
    const links = content.map(element => element.link);
    console.log(links)

    try {
        // Loop through each content item
        for (let i = 0; i < 2; i++) {
            const result = await analyze(content[i].content);
            const relevantdata = await relevantLinks(content[i].content, links);
            
            // Store results in content_json
            content_json[i] = {
                links: content[i].link,
                questions: result.questions,
                relevantLinks: relevantdata
            };

            console.log(content_json[i]);
        }

        // Write the final JSON to a file
        const dataToWrite = JSON.stringify(content_json, null, 2);
        const filePath = 'question.json';

        fs.writeFile(filePath, dataToWrite, (err) => {
            if (err) {
                console.error('Error writing to file:', err);
            } else {
                console.log('Data written successfully!');
            }
        });
    } catch (err) {
        console.error("Error processing content:", err);
    }
}).catch(err => {
    console.error("Error loading content:", err);
});


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default app;
