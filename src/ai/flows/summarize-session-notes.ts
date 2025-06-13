// Summarize Session Notes Flow
'use server';
/**
 * @fileOverview A session notes summarization AI agent.
 *
 * - summarizeSessionNotes - A function that handles the session notes summarization process.
 * - SummarizeSessionNotesInput - The input type for the summarizeSessionNotes function.
 * - SummarizeSessionNotesOutput - The return type for the summarizeSessionNotes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeSessionNotesInputSchema = z.object({
  sessionNotes: z
    .string()
    .describe('The session notes to summarize.'),
});
export type SummarizeSessionNotesInput = z.infer<typeof SummarizeSessionNotesInputSchema>;

const SummarizeSessionNotesOutputSchema = z.object({
  summary: z.string().describe('The summary of the session notes.'),
});
export type SummarizeSessionNotesOutput = z.infer<typeof SummarizeSessionNotesOutputSchema>;

export async function summarizeSessionNotes(input: SummarizeSessionNotesInput): Promise<SummarizeSessionNotesOutput> {
  return summarizeSessionNotesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeSessionNotesPrompt',
  input: {schema: SummarizeSessionNotesInputSchema},
  output: {schema: SummarizeSessionNotesOutputSchema},
  prompt: `You are an expert summarizer of coaching session notes. Please provide a concise summary of the following session notes, highlighting key discussion points:\n\nSession Notes: {{{sessionNotes}}}`,
});

const summarizeSessionNotesFlow = ai.defineFlow(
  {
    name: 'summarizeSessionNotesFlow',
    inputSchema: SummarizeSessionNotesInputSchema,
    outputSchema: SummarizeSessionNotesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
