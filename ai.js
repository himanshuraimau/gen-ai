import { ChatOpenAI } from "@langchain/openai";
import * as z from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv';

dotenv.config()

// First parser and prompt for generating questions
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

// Second parser and prompt for generating relevant links with titles
const parser2 = StructuredOutputParser.fromZodSchema(
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
    const format_instructions = parser2.getFormatInstructions();

    const prompt = new PromptTemplate({
        template: `You are a content analysis expert. Analyze the following content along with the generated questions and existing links. Generate exactly 5 relevant links with titles based on the content provided.
        Do not include more than 5 links and titles. Ensure your response strictly follows the format instructions provided.
        {format_instructions}
        Content: {content}
        Questions: {questions}
        Existing Links: {links}`,
        inputVariables: ['content', 'questions', 'links'],
        partialVariables: { format_instructions },
    });

    const input = await prompt.format({ content, questions, links });
    return input;
}

export const analyzeLinks = async (content, questions, links) => {   
    const input = await getPrompt2(content, questions, links);
    const model = new ChatOpenAI({
        temperature: 0,
        modelName: 'gpt-3.5-turbo',
        apiKey: process.env.OPENAI_API_KEY,
    });

    const result = await model.generate([[input]]);

    const generatedText = result.generations.flat(2).map((item) => item.text).join('\n');

    try {
        const parsedResult = parser2.parse(generatedText);
        return parsedResult;
    } catch (e) {
        console.error("Error parsing the generated text:", e);
        throw e; 
    }
};
