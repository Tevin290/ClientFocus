
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
import { useRouter, useSearchParams } from 'next/navigation'; // Added useSearchParams
import { logSession, type NewSessionData } from '@/lib/firestoreService'; // Import logSession and NewSessionData
import { isFirebaseConfigured } from '@/lib/firebase';

const sessionLogSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required (usually auto-filled or selected)').optional(), // Will make required if not auto-filled
  clientName: z.string().min(1, 'Client Name is required'),
  clientEmail: z.string().email('Invalid email address').min(1, 'Client Email is required'),
  sessionDate: z.string().min(1, "Session date is required"),
  videoLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  sessionType: z.enum(['Full', 'Half'], { required_error: 'Session Type is required' }),
  sessionNotes: z.string().min(10, 'Session notes must be at least 10 characters').max(5000, 'Session notes cannot exceed 5000 characters'),
  summary: z.string().optional(),
});

type SessionLogFormValues = z.infer<typeof sessionLogSchema>;

interface SessionLogFormProps {
  coachId: string;
  coachName: string;
}

export function SessionLogForm({ coachId, coachName }: SessionLogFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams(); // For getting clientId from URL if navigating from client's page
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isSubmittingReal, setIsSubmittingReal] = useState(false);
  const [firebaseAvailable, setFirebaseAvailable] = useState(isFirebaseConfigured());

  const prefilledClientId = searchParams.get('clientId');
  const prefilledClientName = searchParams.get('clientName');


  const form = useForm<SessionLogFormValues>({
    resolver: zodResolver(sessionLogSchema),
    defaultValues: {
      clientId: prefilledClientId || '', // Set if available
      clientName: prefilledClientName || '',
      clientEmail: '',
      sessionDate: new Date().toISOString().split('T')[0],
      videoLink: '',
      sessionType: undefined,
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

  const onSubmit: SubmitHandler<SessionLogFormValues> = async (data) => {
    if (!firebaseAvailable) {
      toast({ title: "Operation Failed", description: "Firebase is not configured. Cannot log session.", variant: "destructive" });
      return;
    }
    setIsSubmittingReal(true);

    // TODO: In a real app, you might have a client selection dropdown if not pre-filled
    // For now, we'll assume clientName and clientEmail are sufficient to identify or create a client record if needed.
    // If clientId is missing, you might want to query Firestore for a client by email or handle it.
    // For this example, if clientId is missing from URL, it's an issue.
    // However, the schema allows it to be optional for now. Ideally, it's always present.

    const sessionDataToLog: NewSessionData = {
      coachId,
      coachName,
      // For clientId, if you have a client selection mechanism, use that.
      // If navigating from "Log session for Client X", then clientId would be pre-filled.
      // For now, if not prefilled, it's an issue. We should enforce it or have a client lookup.
      // This is a simplified example.
      clientId: data.clientId || `unknown_client_${Date.now()}`, // Fallback, not ideal for real app
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      sessionDate: new Date(data.sessionDate),
      sessionType: data.sessionType,
      videoLink: data.videoLink || undefined,
      sessionNotes: data.sessionNotes,
      summary: data.summary || undefined,
      status: 'Logged',
    };

    try {
      await logSession(sessionDataToLog);
      toast({
        title: 'Session Logged!',
        description: `Session for ${data.clientName} has been recorded.`,
      });
      router.push('/coach/log-session/success');
    } catch (error) {
      console.error('Error logging session to Firestore:', error);
      toast({
        title: 'Logging Failed',
        description: 'Could not save session to database. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingReal(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-light">
      <CardHeader>
        <CardTitle className="font-headline">Log New Coaching Session</CardTitle>
        <CardDescription>Fill in the details for your recent coaching session. Logged by: {coachName}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Client ID field - can be hidden if always prefilled or handled differently */}
            {/* 
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client ID (Auto-filled if available)</FormLabel>
                  <FormControl><Input placeholder="Client's unique ID" {...field} readOnly={!!prefilledClientId} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Jane Doe" {...field} readOnly={!!prefilledClientName} /></FormControl>
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
                <FormLabel htmlFor="summary">AI Generated Summary</FormLabel> {/* Changed from Label to FormLabel */}
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isSummarizing || !firebaseAvailable} className="hover:border-primary">
                  {isSummarizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2 h-4 w-4" />
                  )}
                  Generate Summary
                </Button>
              </div>
              <FormControl>
                <Textarea id="summary" placeholder="Summary will appear here after generation..." {...form.register('summary')} readOnly={isSummarizing} rows={4} className="bg-muted/50" />
              </FormControl>
              <FormMessage>{form.formState.errors.summary?.message}</FormMessage>
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || isSummarizing || isSubmittingReal || !firebaseAvailable}>
              {isSubmittingReal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Log Session
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
