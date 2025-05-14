'use server';

/**
 * @fileOverview Analyzes user-provided symptoms to suggest possible medical conditions.
 *
 * - analyzeSymptoms - A function that accepts a list of symptoms and returns a list of possible conditions.
 * - SymptomAnalysisInput - The input type for the analyzeSymptoms function.
 * - SymptomAnalysisOutput - The return type for the analyzeSymptoms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SymptomAnalysisInputSchema = z.object({
  symptoms: z
    .string()
    .describe('A comma-separated list of symptoms experienced by the user.'),
});
export type SymptomAnalysisInput = z.infer<typeof SymptomAnalysisInputSchema>;

const SymptomAnalysisOutputSchema = z.object({
  conditions: z
    .array(z.object({
      condition: z.string().describe('The name of the possible medical condition.'),
      likelihood: z.number().describe('A number between 0 and 1 indicating the likelihood of the condition.'),
    }))
    .describe('A list of possible medical conditions, ranked by likelihood.'),
});
export type SymptomAnalysisOutput = z.infer<typeof SymptomAnalysisOutputSchema>;

export async function analyzeSymptoms(input: SymptomAnalysisInput): Promise<SymptomAnalysisOutput> {
  return symptomAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'symptomAnalysisPrompt',
  input: {schema: SymptomAnalysisInputSchema},
  output: {schema: SymptomAnalysisOutputSchema},
  prompt: `You are a medical expert specializing in diagnosing possible conditions based on a user's symptoms.

You will receive a list of symptoms from the user and return a list of possible medical conditions, ranked by likelihood.

Symptoms: {{{symptoms}}}

Format the output as a JSON array of objects with the following structure:
[{
  "condition": "The name of the possible medical condition",
  "likelihood": A number between 0 and 1 indicating the likelihood of the condition
}]`,
});

const symptomAnalysisFlow = ai.defineFlow(
  {
    name: 'symptomAnalysisFlow',
    inputSchema: SymptomAnalysisInputSchema,
    outputSchema: SymptomAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
