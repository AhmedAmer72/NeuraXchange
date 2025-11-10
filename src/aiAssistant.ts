import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import * as dotenv from 'dotenv';

dotenv.config();

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-3.5-turbo',
});

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful AI assistant for a crypto exchange bot. Your name is NeuraXchange.'],
  ['user', '{input}'],
]);

const outputParser = new StringOutputParser();

const chain = prompt.pipe(model).pipe(outputParser);

export async function handleNaturalLanguage(text: string, chatId: number): Promise<string> {
  try {
    const response = await chain.invoke({ input: text });
    return response;
  } catch (error) {
    console.error('Error handling natural language:', error);
    return "Sorry, I'm having trouble connecting to my brain right now. Please try again later.";
  }
}
