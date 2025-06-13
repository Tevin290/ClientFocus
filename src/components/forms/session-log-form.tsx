'use client';

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { summarizeSessionNotes, type SummarizeSessionNotesInput } from '@/ai/flows/summarize-session-notes';
import { Bot, Save, Loader2 } from 'lucide-react';

const sessionLogSchema = z.object({
  clientName: z.string().min(1, 'Client Name is required'),
  clientEmail: z.string().email('Invalid email address').min(1, 'Client Email is required'),
  sessionDate: z.string().min(1, "Session date is required"), // Consider using a date picker if desired
  videoLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  sessionType: z.enum(['Full', 'Half'], { required_error: 'Session Type is required' }),
  sessionNotes: z.string().min(10, 'Session notes must be at least 10 characters').max(5000, 'Session notes cannot exceed 5000 characters'),
  summary: z.string().optional(),
});

type SessionLogFormValues = z.infer<typeof sessionLogSchema>;

export function SessionLogForm() {
  const { toast } = useToast();
  const [isSummarizing, setIsSummarizing] = useState(false);

  const form = useForm<SessionLogFormValues>({
    resolver: zodResolver(sessionLogSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      sessionDate: new Date().toISOString().split('T')[0], // Default to today
      videoLink: '',
      sessionType: undefined, // Let placeholder show
      sessionNotes: '',
      summary: '',
    },
  });

  const handleGenerateSummary = async () => {
    const notes = form.getValues('sessionNotes');
    if (!notes || notes.length < 10) {
      form.setError('sessionNotes', { type: 'manual', message: 'Please enter at least 10 characters of notes to summarize.' });
      return;
    }
    
    setIsSummarizing(true);
    try {
      const input: SummarizeSessionNotesInput = { sessionNotes: notes };
      const result = await summarizeSessionNotes(input);
      form.setValue('summary', result.summary, { shouldValidate: true });
      toast({
        title: 'Summary Generated',
        description: 'AI has summarized your session notes.',
      });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Summarization Failed',
        description: 'Could not generate summary. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const onSubmit: SubmitHandler<SessionLogFormValues> = (data) => {
    console.log('Session Log Data:', data);
    // Here you would typically send data to your backend
    toast({
      title: 'Session Logged',
      description: `Session for ${data.clientName} has been successfully logged.`,
      variant: 'default', // Using Shadcn default, which is not green. You might want custom success variant.
                          // For now, using default. Success variant could be added to globals.css
    });
    form.reset(); // Reset form after successful submission
  };

  return (
    <Card className="w-full max-w-2xl shadow-light">
      <CardHeader>
        <CardTitle className="font-headline">Log New Coaching Session</CardTitle>
        <CardDescription>Fill in the details for your recent coaching session.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Email</FormLabel>
                    <FormControl><Input type="email" placeholder="e.g., jane.doe@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select session type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Full">Full Session</SelectItem>
                      <SelectItem value="Half">Half Session</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="videoLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Video Link (Optional)</FormLabel>
                  <FormControl><Input placeholder="https://example.com/session-recording" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sessionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Notes</FormLabel>
                  <FormControl><Textarea placeholder="Key discussion points, actions, client progress..." {...field} rows={6} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="summary">AI Generated Summary</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isSummarizing} className="hover:border-primary">
                  {isSummarizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2 h-4 w-4" />
                  )}
                  Generate Summary
                </Button>
              </div>
              <Textarea id="summary" placeholder="Summary will appear here after generation..." {...form.register('summary')} readOnly={isSummarizing} rows={4} className="bg-muted/50" />
              <FormMessage>{form.formState.errors.summary?.message}</FormMessage>
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || isSummarizing}>
              <Save className="mr-2 h-4 w-4" />
              Log Session
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
