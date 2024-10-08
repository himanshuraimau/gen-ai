import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import { analyze, analyzeLinks } from './ai.js';
import { loadContent } from './content_load.js';

dotenv.config({
    path: './config.env'
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
    console.log(links);

    try {
        // Loop through each content item
        for (let i = 0; i < 6; i++) {
            const result = await analyze(content[i].content);
            content[i].content = content[i].content.replace(/(\r\n|\n|\r)/gm, " ");



            const relevantdata = await analyzeLinks(content[i].content, result.questions, links);
            


            // Store results in content_json
            content_json[i] = {
                links: content[i].link,
                questions: result.questions,
                relevantLinks: relevantdata.relevantLinks
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
        console.error('Error processing content:', err);
    }
}).catch(err => {
    console.error('Error loading content:', err);
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export default app;
