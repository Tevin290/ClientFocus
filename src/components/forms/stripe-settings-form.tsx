'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Save } from 'lucide-react';

const stripeSettingsSchema = z.object({
  publishableKey: z.string().min(1, 'Publishable Key is required').refine(val => val.startsWith('pk_'), "Must be a valid Publishable Key"),
  secretKey: z.string().min(1, 'Secret Key is required').refine(val => val.startsWith('sk_'), "Must be a valid Secret Key"),
  isTestMode: z.boolean().default(true),
});

type StripeSettingsFormValues = z.infer<typeof stripeSettingsSchema>;

const LS_STRIPE_SETTINGS_KEY = 'stripeSettings';

export function StripeSettingsForm() {
  const { toast } = useToast();
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showPublishableKey, setShowPublishableKey] = useState(false);

  const form = useForm<StripeSettingsFormValues>({
    resolver: zodResolver(stripeSettingsSchema),
    defaultValues: {
      publishableKey: '',
      secretKey: '',
      isTestMode: true,
    },
  });

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(LS_STRIPE_SETTINGS_KEY);
      if (savedSettings) {
        form.reset(JSON.parse(savedSettings));
      }
    } catch (error) {
        console.error("Failed to access localStorage:", error);
    }
  }, [form]);

  const onSubmit: SubmitHandler<StripeSettingsFormValues> = (data) => {
    try {
      localStorage.setItem(LS_STRIPE_SETTINGS_KEY, JSON.stringify(data));
      toast({
        title: 'Settings Saved',
        description: 'Stripe settings have been updated successfully.',
        variant: 'default', 
      });
    } catch (error) {
        console.error("Failed to access localStorage:", error);
        toast({
            title: 'Error Saving Settings',
            description: 'Could not save settings to local storage.',
            variant: 'destructive',
        });
    }
  };

  return (
    <Card className="w-full max-w-2xl shadow-light">
      <CardHeader>
        <CardTitle className="font-headline">Stripe Configuration</CardTitle>
        <CardDescription>Enter your Stripe API keys and manage test mode.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="publishableKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publishable Key</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={showPublishableKey ? "text" : "password"} placeholder="pk_live_xxxxxxxx or pk_test_xxxxxxxx" {...field} />
                    </FormControl>
                    <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPublishableKey(!showPublishableKey)} aria-label={showPublishableKey ? "Hide key" : "Show key"}>
                      {showPublishableKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="secretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Key</FormLabel>
                   <div className="relative">
                    <FormControl>
                      <Input type={showSecretKey ? "text" : "password"} placeholder="sk_live_xxxxxxxx or sk_test_xxxxxxxx" {...field} />
                    </FormControl>
                     <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowSecretKey(!showSecretKey)} aria-label={showSecretKey ? "Hide key" : "Show key"}>
                      {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isTestMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Test Mode</FormLabel>
                    <FormDescription>
                      Use Stripe test keys for development and testing.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className={field.value ? 'animate-glow-pulse' : ''}
                      aria-label="Stripe Test Mode Toggle"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
