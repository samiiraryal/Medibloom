'use server';

/**
 * @fileOverview Recommends home remedies based on symptoms and location, drawing from traditional and modern medical knowledge.
 *
 * - remedyRecommendation - A function that handles the remedy recommendation process.
 * - RemedyRecommendationInput - The input type for the remedyRecommendation function.
 * - RemedyRecommendationOutput - The return type for the remedyRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RemedyRecommendationInputSchema = z.object({
  symptoms: z
    .string()
    .describe('A comma-separated list of symptoms the user is experiencing.'),
  location: z.string().describe('The user provided location to filter ingredients.'),
  possibleConditions: z.string().describe('A comma-separated list of possible conditions.'),
});
export type RemedyRecommendationInput = z.infer<typeof RemedyRecommendationInputSchema>;

const RemedyRecommendationOutputSchema = z.object({
  remedies: z
    .string()
    .describe(
      'A list of recommended home remedies based on the symptoms, location, and possible conditions.'
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
  Consider the availability of ingredients in the specified location.
  Provide a detailed explanation of each recommended remedy, including its purpose and how it addresses the symptoms and possible conditions.
  Ensure the remedies are safe and effective.

  Format your response as a list of remedies with explanations for each remedy.
  `,
});

const remedyRecommendationFlow = ai.defineFlow(
  {
    name: 'remedyRecommendationFlow',
    inputSchema: RemedyRecommendationInputSchema,
    outputSchema: RemedyRecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
