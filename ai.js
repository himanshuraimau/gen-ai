import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv';
import { loadQARefineChain } from "langchain/chains";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";



dotenv.config()

const parser = StructuredOutputParser.fromZodSchema(
    z.object({
        questions: z.array(z.string())
            .max(10, "The number of questions must not exceed 10.")
            .describe("Extract exactly 10 relevant questions from the content, no more and no less."),
    })
);

const getPrompt = async (entry) => {
    const format_instructions = parser.getFormatInstructions();

    const prompt = new PromptTemplate({
        template: `You are a content analysis expert. Analyze the following content and generate exactly 10 relevant questions based on the content provided. 
        Do not include more than 10 questions. Ensure your response strictly follows the format instructions provided. 
        {format_instructions}
        Content: {entry}`,
        inputVariables: ['entry'],
        partialVariables: { format_instructions },
    });

    const input = await prompt.format({ entry });
    return input;
}

export const analyze = async (content) => {   
    const input = await getPrompt(content);
    const model = new ChatOpenAI({
        temperature: 0,
        modelName: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY,
    });

    const result = await model.generate([[input]]);

    const generatedText = result.generations.flat(2).map((item) => item.text).join('\n');

    try {
        const parsedResult = parser.parse(generatedText);
        return parsedResult;
    } catch (e) {
        console.error("Error parsing the generated text:", e);
        throw e; 
    }
};



export const relevantLinks = async (content, links) => {
    try {
        const model = new ChatOpenAI({
            temperature: 0,
            modelName: 'gpt-3.5-turbo',
            apiKey: process.env.OPENAI_API_KEY,
        });

        const chain = loadQARefineChain(model);
        const embeddings = new OpenAIEmbeddings();
        const store = await MemoryVectorStore.fromDocuments(links, embeddings);

        // Perform similarity search
        const relevantDocs = await store.similaritySearch(content);

        // Sort and select the top 5 results
        const top5Docs = relevantDocs
            .sort((a, b) => b.score - a.score) // Assuming 'score' is available in the search results
            .slice(0, 5);

        // Format the results
        const formattedResults = top5Docs.map(doc => ({
            url: doc.url,
            title: doc.title
        }));

        console.log("Top 5 Relevant Links:", formattedResults);
        return formattedResults;
    } catch (error) {
        console.error("Error in relevantLinks function:", error);
        throw error; 
    }
}