import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv';

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


const linkParser = StructuredOutputParser.fromZodSchema(
    z.object({
        relevantLinks: z.array(z.object({
            title: z.string(),
            url: z.string().url()
        }))
        .max(5, "The number of relevant links and titles must not exceed 5.")
        .describe("Extract exactly 5 relevant links with titles from the content, no more and no less."),
    })
);

const getPrompt2 = async (content, questions, links) => {
    const formatInstructions = linkParser.getFormatInstructions();

    const promptTemplate = new PromptTemplate({
        template: `
            You are an expert in content analysis. 
            Review the provided content, questions, and existing links, then generate exactly 5 relevant links with appropriate titles. 
            Note that there are 10 questions, so the generated links should correlate with the questions, maintaining a ratio of 1 link for every 2 questions. 
            Do not include more than 5 links in total. 
            Follow the format instructions below:
            {formatInstructions}
            Content: {content}
            Questions: {questions}
            Existing Links: {links}
        `,
        inputVariables: ['content', 'questions', 'links'],
        partialVariables: { formatInstructions },
    });

    return await promptTemplate.format({ content, questions, links });
}

export const analyzeLinks = async (content, questions, links) => {   
    const input = await getPrompt2(content, questions, links);
    const model = new ChatOpenAI({
        temperature: 0,
        modelName: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const result = await model.generate([[input]]);
        const generatedText = result.generations.flat(2).map((item) => item.text).join('\n');
        return linkParser.parse(generatedText);
    } catch (e) {
        console.error("Error parsing the generated text:", e);
        throw e; 
    }
};
