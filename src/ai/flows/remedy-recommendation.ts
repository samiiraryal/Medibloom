
'use server';

/**
 * @fileOverview Recommends home remedies based on symptoms and location, drawing from traditional and modern medical knowledge.
 * Includes an optional section for less common ingredients.
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

const OptionalIngredientSchema = z.object({
  name: z.string().describe('The name of the less common or alternative ingredient.'),
  reasoning: z.string().describe('Why this ingredient might be considered, its benefits, and relevance to symptoms or location.'),
  availabilityNote: z.string().optional().describe('Notes on potential availability or sourcing of this ingredient in the specified location.'),
});

const RemedyRecommendationOutputSchema = z.object({
  remedies: z
    .array(RemedySchema)
    .describe(
      'A list of recommended home remedies, each with a name and detailed explanation. The AI should order these with the most generally applicable or strongest recommendation first.'
    ),
  optionalIngredients: z.array(OptionalIngredientSchema).optional().describe(
    'An optional list of less common ingredients that could be considered if available, along with reasoning and availability notes specific to the location.'
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

  1.  **Primary Remedies**: Recommend home remedies that are suitable for the user's location and symptoms, drawing from both traditional and modern medical knowledge.
      Order these remedies with the most generally applicable or strongest recommendation first.
      Consider the availability of ingredients in the specified location when relevant for a remedy.
      Provide a detailed explanation of each recommended remedy, including its purpose, how to prepare it, and how it addresses the symptoms and possible conditions.
      Ensure the remedies are safe and effective.

  2.  **Optional Ingredients**: You may also suggest a section for "optionalIngredients". This section should list ingredients that are not part of the main remedies but could be beneficial or act as alternatives.
      For each such ingredient, provide its name, why it might be considered (e.g., specific benefit, local availability for "{{{location}}}"), and any notes on sourcing it if it's uncommon for the provided location. This section is optional; only include it if relevant and useful.

  Format your response as a JSON object.
  -   The "remedies" key should be an array of objects, where each object has "name" and "explanation".
      Example: { "name": "Ginger Tea", "explanation": "Ginger tea can help soothe nausea..." }
  -   If you include optional ingredients, use an "optionalIngredients" key which is an array of objects. Each object should have "name" (string), "reasoning" (string), and "availabilityNote" (string, optional).
      Example: { "name": "Manuka Honey", "reasoning": "Powerful antibacterial properties, good for sore throats if available.", "availabilityNote": "Can be expensive and harder to find in some areas." }

  The entire output must be a single JSON object.
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
