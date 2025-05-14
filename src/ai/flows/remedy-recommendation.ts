
'use server';

/**
 * @fileOverview Recommends home remedies based on symptoms and location, drawing from traditional and modern medical knowledge.
 *
 * - remedyRecommendation - A function that handles the remedy recommendation process.
 * - RemedyRecommendationInput - The input type for the remedyRecommendation function.
 * - RemedyRecommendationOutput - The return type for the remedyRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const RemedyRecommendationInputSchema = z.object({
  symptoms: z
    .string()
    .describe('A comma-separated list of symptoms the user is experiencing.'),
  location: z.string().describe('The user provided location to filter ingredients.'),
  possibleConditions: z.string().describe('A comma-separated list of possible conditions.'),
});
export type RemedyRecommendationInput = z.infer<typeof RemedyRecommendationInputSchema>;

const RemedySchema = z.object({
  name: z.string().describe('The name of the home remedy.'),
  explanation: z.string().describe('A detailed explanation of the remedy, including its purpose, how to prepare it, and how to use it. Mention ingredient availability based on the user\'s location if relevant.'),
});

const RemedyRecommendationOutputSchema = z.object({
  remedies: z
    .array(RemedySchema)
    .describe(
      'A list of recommended home remedies, each with a name and detailed explanation.'
    ),
});
export type RemedyRecommendationOutput = z.infer<typeof RemedyRecommendationOutputSchema>;

export async function remedyRecommendation(input: RemedyRecommendationInput): Promise<RemedyRecommendationOutput> {
  return remedyRecommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'remedyRecommendationPrompt',
  input: {schema: RemedyRecommendationInputSchema},
  output: {schema: RemedyRecommendationOutputSchema},
  prompt: `You are an expert in recommending home remedies based on symptoms, location, and possible conditions. You have access to both traditional and modern medical knowledge.

  Symptoms: {{{symptoms}}}
  Location: {{{location}}}
  Possible Conditions: {{{possibleConditions}}}

  Recommend home remedies that are suitable for the user's location and symptoms, drawing from both traditional and modern medical knowledge.
  Consider the availability of ingredients in the specified location when relevant for a remedy.
  Provide a detailed explanation of each recommended remedy, including its purpose, how to prepare it, and how it addresses the symptoms and possible conditions.
  Ensure the remedies are safe and effective.

  Format your response as a JSON object with a "remedies" key. The value of "remedies" should be an array of objects, where each object has the following structure:
  {
    "name": "Name of the remedy",
    "explanation": "Detailed explanation of the remedy, including purpose, preparation, usage instructions, and any notes on ingredient availability for the location: {{{location}}}."
  }
  `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
       {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  }
});

const remedyRecommendationFlow = ai.defineFlow(
  {
    name: 'remedyRecommendationFlow',
    inputSchema: RemedyRecommendationInputSchema,
    outputSchema: RemedyRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("Failed to get remedy recommendations from AI.");
    }
    return output;
  }
);
