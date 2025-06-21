
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { summarizeSessionNotes, type SummarizeSessionNotesInput } from '@/ai/flows/summarize-session-notes';
import { Bot, Save, Loader2, TriangleAlert } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logSession, type NewSessionData, type UserProfile } from '@/lib/firestoreService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

const sessionLogSchema = z.object({
  clientId: z.string().min(1, 'Please select a client.'),
  sessionDate: z.string().min(1, "Session date is required"),
  sessionTime: z.string().min(1, 'Session time is required'),
  videoLink: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  sessionType: z.enum(['Full', 'Half'], { required_error: 'Session Type is required' }),
  sessionNotes: z.string().min(10, 'Session notes must be at least 10 characters').max(5000, 'Session notes cannot exceed 5000 characters'),
  summary: z.string().optional(),
});

type SessionLogFormValues = z.infer<typeof sessionLogSchema>;

interface SessionLogFormProps {
  coachId: string;
  coachName: string;
  clients: UserProfile[]; // Now receives a list of clients
}

export function SessionLogForm({ coachId, coachName, clients }: SessionLogFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [firebaseAvailable, setFirebaseAvailable] = useState(true);

  const prefilledClientId = searchParams.get('clientId');

  useEffect(() => {
    const isConfigured = isFirebaseConfigured();
    setFirebaseAvailable(isConfigured);
    if (!isConfigured) {
      toast({
        title: "Firebase Not Configured",
        description: "Logging sessions is disabled. Please contact an administrator.",
        variant: "destructive",
        duration: 8000
      });
    }
  }, [toast]);


  const form = useForm<SessionLogFormValues>({
    resolver: zodResolver(sessionLogSchema),
    defaultValues: {
      clientId: prefilledClientId || '',
      sessionDate: new Date().toISOString().split('T')[0],
      sessionTime: new Date().toTimeString().slice(0, 5),
      videoLink: '',
      sessionType: undefined,
      sessionNotes: '',
      summary: '',
    },
  });

  const { formState: { isSubmitting } } = form;

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

  const onInvalid = (errors: any) => {
    console.error('[SessionLogForm] Form validation failed:', errors);
    toast({
      title: 'Invalid Form Data',
      description: 'Please check the form for errors and try again.',
      variant: 'destructive',
    });
  };

  const onSubmit: SubmitHandler<SessionLogFormValues> = async (data) => {
    if (!firebaseAvailable) {
      toast({ title: "Operation Failed", description: "Firebase is not configured. Cannot log session.", variant: "destructive" });
      return;
    }
    
    const selectedClient = clients.find(c => c.uid === data.clientId);
    if (!selectedClient) {
      toast({ title: "Client not found", description: "The selected client could not be found. Please refresh and try again.", variant: "destructive" });
      return;
    }

    console.log("[SessionLogForm] Submission started. Data:", data);

    const sessionDataToLog: NewSessionData = {
      coachId,
      coachName,
      clientId: selectedClient.uid,
      clientName: selectedClient.displayName,
      clientEmail: selectedClient.email,
      sessionDate: new Date(`${data.sessionDate}T${data.sessionTime}`),
      sessionType: data.sessionType,
      videoLink: data.videoLink,
      sessionNotes: data.sessionNotes,
      summary: data.summary,
      status: 'Under Review',
    };

    try {
      await logSession(sessionDataToLog);
      console.log("[SessionLogForm] Session successfully logged to Firestore. Redirecting...");
      toast({
        title: 'Session Logged!',
        description: `Session for ${selectedClient.displayName} has been recorded.`,
      });
      router.push('/coach/log-session/success');
    } catch (error) {
      console.error('[SessionLogForm] Error logging session to Firestore:', error);
      toast({
        title: 'Logging Failed',
        description: 'Could not save session to database. Check console for details.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-light">
      <CardHeader>
        <CardTitle className="font-headline">Log New Coaching Session</CardTitle>
        <CardDescription>Fill in the details for your recent coaching session. Logged by: {coachName}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <CardContent className="space-y-6">
             {!firebaseAvailable && (
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Firebase Not Configured</AlertTitle>
                <AlertDescription>
                  Session logging is currently disabled. Please contact an administrator to configure the Firebase connection.
                </AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!firebaseAvailable}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.uid} value={client.uid}>
                          {client.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                  control={form.control}
                  name="sessionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Date</FormLabel>
                      <FormControl><Input type="date" {...field} disabled={!firebaseAvailable} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                  control={form.control}
                  name="sessionTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Time</FormLabel>
                      <FormControl><Input type="time" {...field} disabled={!firebaseAvailable} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>


            <FormField
              control={form.control}
              name="sessionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!firebaseAvailable}>
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
                  <FormControl><Input placeholder="https://example.com/session-recording" {...field} disabled={!firebaseAvailable} /></FormControl>
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
                  <FormControl><Textarea placeholder="Key discussion points, actions, client progress..." {...field} rows={6} disabled={!firebaseAvailable} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <FormLabel htmlFor="summary">AI Generated Summary</FormLabel>
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
                <Textarea id="summary" placeholder="Summary will appear here after generation..." {...form.register('summary')} readOnly={isSummarizing} rows={4} className="bg-muted/50" disabled={!firebaseAvailable}/>
              </FormControl>
              <FormMessage>{form.formState.errors.summary?.message}</FormMessage>
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || isSummarizing || !firebaseAvailable}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Log Session
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
