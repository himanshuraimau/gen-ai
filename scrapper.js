import puppeteer from 'puppeteer-extra';
import axios from 'axios';
import fs from 'fs';
import url from 'url';
import stealth from 'puppeteer-extra-plugin-stealth';
import dotenv from 'dotenv';

dotenv.config()
puppeteer.use(stealth());
let page_content = [];

export const scrapper = async () => {
    
    const browser = await puppeteer.launch({ headless: true }); 
    const page = await browser.newPage();
    const baseURL = process.env.SCRAP_URL
    
    
    await page.goto(baseURL, { waitUntil: 'networkidle0', timeout: 40000 });

    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(anchor => anchor.href).filter(href => href); // Filter out empty hrefs
    });

    const uniqueLinks = new Set(links);

    const fetchContentPromises = Array.from(uniqueLinks).map(async (link) => {
        try{
            // const absoluteUrl = url.resolve(baseURL, link);
            const absoluteUrl = "https://r.jina.ai/"+link
            console.log(absoluteUrl);
            const response = await axios.get(absoluteUrl);
            page_content.push({ "link": link, "content": response.data });
        } catch (error) {
            console.error(`Error fetching ${link}:`, error.message);
        }
    });

    await Promise.all(fetchContentPromises);

    const dataToWrite = JSON.stringify(page_content, null, 2); 
    const filePath = 'page_content.json'; 

    fs.writeFile(filePath, dataToWrite, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log('Data written successfully!');
        }
    });

    await browser.close();
    console.log("Browser closed");
};
