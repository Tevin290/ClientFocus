'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Building, Plus, Edit, Trash2, Users, Calendar, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { getAllCompanies, deleteCompany, updateCompanyProfile, type CompanyProfile } from '@/lib/firestoreService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CreateCompany from './create-company';

export default function CompaniesManagement() {
  const { role } = useRole();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingCompany, setEditingCompany] = useState<CompanyProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const companiesData = await getAllCompanies();
      setCompanies(companiesData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'super-admin') {
      loadCompanies();
    }
  }, [role]);

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    try {
      const result = await deleteCompany(companyId);
      if (result.success) {
        toast({
          title: 'Company Deleted',
          description: `${companyName} has been successfully deleted.`,
        });
        loadCompanies(); // Refresh the list
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete company',
        variant: 'destructive',
      });
    }
  };

  const handleEditCompany = async (updates: Partial<CompanyProfile>) => {
    if (!editingCompany) return;

    try {
      await updateCompanyProfile(editingCompany.id, updates);
      toast({
        title: 'Company Updated',
        description: 'Company information has been successfully updated.',
      });
      setIsEditDialogOpen(false);
      setEditingCompany(null);
      loadCompanies(); // Refresh the list
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Failed to update company',
        variant: 'destructive',
      });
    }
  };

  if (role !== 'super-admin') {
    return (
      <Alert>
        <AlertDescription>
          Access denied. Only super administrators can manage companies.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Companies Management
            </CardTitle>
            <CardDescription>
              Manage all companies on the platform
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <CreateCompany />
        </CardContent>
      </Card>

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Companies ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No companies found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Admin Email</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {company.branding?.logoUrl && (
                          <img 
                            src={company.branding.logoUrl} 
                            alt={`${company.name} logo`}
                            className="h-8 w-8 rounded"
                          />
                        )}
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ID: {company.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{company.slug}</Badge>
                    </TableCell>
                    <TableCell>{company.adminEmail}</TableCell>
                    <TableCell>
                      {company.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog open={isEditDialogOpen && editingCompany?.id === company.id} onOpenChange={(open) => {
                          setIsEditDialogOpen(open);
                          if (!open) setEditingCompany(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingCompany(company)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Company</DialogTitle>
                              <DialogDescription>
                                Update company information
                              </DialogDescription>
                            </DialogHeader>
                            {editingCompany && (
                              <CompanyEditForm 
                                company={editingCompany}
                                onSubmit={handleEditCompany}
                              />
                            )}
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Company</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{company.name}"? This action cannot be undone and will remove all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCompany(company.id, company.name)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompanyEditForm({ 
  company, 
  onSubmit 
}: { 
  company: CompanyProfile; 
  onSubmit: (updates: Partial<CompanyProfile>) => void;
}) {
  const [formData, setFormData] = useState({
    name: company.name || '',
    adminEmail: company.adminEmail || '',
    logoUrl: company.branding?.logoUrl || '',
    primaryColor: company.branding?.primaryColor || '#3b82f6',
    backgroundColor: company.branding?.backgroundColor || '#ffffff',
  });

  // Update form data when company prop changes
  useEffect(() => {
    setFormData({
      name: company.name || '',
      adminEmail: company.adminEmail || '',
      logoUrl: company.branding?.logoUrl || '',
      primaryColor: company.branding?.primaryColor || '#3b82f6',
      backgroundColor: company.branding?.backgroundColor || '#ffffff',
    });
  }, [company]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      adminEmail: formData.adminEmail,
      branding: {
        ...company.branding,
        logoUrl: formData.logoUrl,
        primaryColor: formData.primaryColor,
        backgroundColor: formData.backgroundColor,
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Company Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input
          id="adminEmail"
          type="email"
          value={formData.adminEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
          required
        />
      </div>

      <div>
        <Label htmlFor="logoUrl">Logo URL</Label>
        <Input
          id="logoUrl"
          type="url"
          value={formData.logoUrl}
          onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="w-12 h-8 p-0 border-0"
              value={formData.primaryColor}
              onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
            />
            <Input
              value={formData.primaryColor}
              onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
              placeholder="#3b82f6"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="backgroundColor">Background Color</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              className="w-12 h-8 p-0 border-0"
              value={formData.backgroundColor}
              onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
            />
            <Input
              value={formData.backgroundColor}
              onChange={(e) => setFormData(prev => ({ ...prev, backgroundColor: e.target.value }))}
              placeholder="#ffffff"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}