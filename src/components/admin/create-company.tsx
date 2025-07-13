'use client';

import { useState } from 'react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useLoading } from '@/context/loading-context';
import { Building, Plus, Loader2, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createCompany } from '@/lib/firestoreService';

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  adminEmail: z.string().email('Must be a valid email address'),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional().or(z.literal('')),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional().or(z.literal('')),
  backgroundColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional().or(z.literal('')),
  textColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color').optional().or(z.literal('')),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export default function CreateCompany() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { showLoading, updateLoading, showSuccess, showError } = useLoading();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      slug: '',
      adminEmail: '',
      logoUrl: '',
      primaryColor: '#3b82f6',
      secondaryColor: '#60a5fa',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
    },
  });

  // Auto-generate slug from company name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Watch name field and update slug
  const watchedName = form.watch('name');
  
  React.useEffect(() => {
    if (watchedName) {
      const newSlug = generateSlug(watchedName);
      form.setValue('slug', newSlug, { shouldValidate: false });
    }
  }, [watchedName, form]);

  const onSubmit = async (data: CompanyFormValues) => {
    showLoading({
      title: 'Creating Company',
      message: 'Setting up your new company...',
    });

    try {
      const companyData = {
        name: data.name,
        slug: data.slug,
        adminEmail: data.adminEmail,
        branding: {
          ...(data.logoUrl && { logoUrl: data.logoUrl }),
          primaryColor: data.primaryColor || '#3b82f6',
          secondaryColor: data.secondaryColor || '#60a5fa',
          backgroundColor: data.backgroundColor || '#ffffff',
          textColor: data.textColor || '#1f2937',
        },
      };

      updateLoading({
        message: 'Validating company details...',
        progress: 25,
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      updateLoading({
        message: 'Creating company profile...',
        progress: 50,
      });

      const result = await createCompany(companyData);
      
      updateLoading({
        message: 'Finalizing setup...',
        progress: 90,
      });

      await new Promise(resolve => setTimeout(resolve, 300));

      if (result.success) {
        showSuccess(`${data.name} created successfully!`);
        
        toast({
          title: 'Company Created Successfully',
          description: `${data.name} has been created with ID: ${result.companyId}`,
        });
        
        form.reset();
        setIsOpen(false);
      } else {
        throw new Error(result.error || 'Failed to create company');
      }
    } catch (error: any) {
      showError(error.message || 'Failed to create company');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Company Management
        </CardTitle>
        <CardDescription>
          Create and manage companies for multi-tenant coaching platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
              <DialogDescription>
                Set up a new company with branding and configuration
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Coaching" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="acme-coaching" {...field} />
                        </FormControl>
                        <FormMessage />
                        <p className="text-xs text-gray-500">
                          Used for white-label URLs: yourapp.com/{field.value || 'slug'}/login
                        </p>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@acme.com" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500">
                        Only this email can register as admin for this company
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logo URL (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/logo.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    <Label className="text-sm font-medium">Brand Colors</Label>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Primary</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-12 h-8 p-0 border-0" {...field} />
                              <Input placeholder="#3b82f6" className="flex-1" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="secondaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Secondary</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-12 h-8 p-0 border-0" {...field} />
                              <Input placeholder="#60a5fa" className="flex-1" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="backgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Background</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-12 h-8 p-0 border-0" {...field} />
                              <Input placeholder="#ffffff" className="flex-1" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="textColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Text</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input type="color" className="w-12 h-8 p-0 border-0" {...field} />
                              <Input placeholder="#1f2937" className="flex-1" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Company
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}