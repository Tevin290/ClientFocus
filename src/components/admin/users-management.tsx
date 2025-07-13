'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/context/role-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Users, Edit, Trash2, UserPlus, Loader2, Crown, ShieldCheck, Briefcase, User as UserIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAllUsers, getAllCompanies, getAllCoaches, deleteUser, updateUserRole, type UserProfile, type CompanyProfile } from '@/lib/firestoreService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { UserRole } from '@/context/role-context';

export default function UsersManagement() {
  const { role } = useRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, companiesData] = await Promise.all([
        getAllUsers(),
        getAllCompanies()
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'super-admin') {
      loadData();
    }
  }, [role]);

  const handleDeleteUser = async (uid: string, displayName: string) => {
    try {
      const result = await deleteUser(uid);
      if (result.success) {
        toast({
          title: 'User Deleted',
          description: `${displayName} has been successfully deleted.`,
        });
        loadData(); // Refresh the list
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (uid: string, newRole: UserRole, companyId?: string, coachId?: string) => {
    try {
      // Business rule validation
      if (newRole === 'client' && !coachId) {
        throw new Error('Clients must be assigned to a coach');
      }
      
      if ((newRole === 'coach' || newRole === 'admin') && !companyId) {
        throw new Error('Coaches and admins must belong to a company');
      }
      
      const result = await updateUserRole(uid, newRole, companyId, coachId);
      if (result.success) {
        toast({
          title: 'User Updated',
          description: 'User information has been successfully updated.',
        });
        setIsEditDialogOpen(false);
        setEditingUser(null);
        loadData(); // Refresh the list
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'super-admin': return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'admin': return <ShieldCheck className="h-4 w-4 text-blue-500" />;
      case 'coach': return <Briefcase className="h-4 w-4 text-green-500" />;
      case 'client': return <UserIcon className="h-4 w-4 text-gray-500" />;
      default: return <UserIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super-admin': return 'bg-yellow-100 text-yellow-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'coach': return 'bg-green-100 text-green-800';
      case 'client': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return 'No Company';
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  };

  // Filter users based on company and role
  const filteredUsers = users.filter(user => {
    const companyMatch = filterCompany === 'all' || user.companyId === filterCompany;
    const roleMatch = filterRole === 'all' || user.role === filterRole;
    return companyMatch && roleMatch;
  });

  if (role !== 'super-admin') {
    return (
      <Alert>
        <AlertDescription>
          Access denied. Only super administrators can manage users.
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users Management
          </CardTitle>
          <CardDescription>
            Manage all users across all companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="filterCompany">Filter by Company</Label>
              <Select value={filterCompany} onValueChange={setFilterCompany}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label htmlFor="filterRole">Filter by Role</Label>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.photoURL ? (
                            <img 
                              src={user.photoURL} 
                              alt={user.displayName}
                              className="h-8 w-8 rounded-full"
                            />
                          ) : (
                            <UserIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.displayName}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        <div className="flex items-center gap-1">
                          {getRoleIcon(user.role)}
                          {user.role?.replace('-', ' ')}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>{getCompanyName(user.companyId)}</TableCell>
                    <TableCell>
                      {user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog open={isEditDialogOpen && editingUser?.uid === user.uid} onOpenChange={(open) => {
                          setIsEditDialogOpen(open);
                          if (!open) setEditingUser(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User</DialogTitle>
                              <DialogDescription>
                                Update user role and company assignment
                              </DialogDescription>
                            </DialogHeader>
                            {editingUser && (
                              <UserEditForm 
                                user={editingUser}
                                companies={companies}
                                onSubmit={handleUpdateUser}
                              />
                            )}
                          </DialogContent>
                        </Dialog>

                        {user.role !== 'super-admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{user.displayName}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.uid, user.displayName)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
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

function UserEditForm({ 
  user, 
  companies,
  onSubmit 
}: { 
  user: UserProfile; 
  companies: CompanyProfile[];
  onSubmit: (uid: string, role: UserRole, companyId?: string, coachId?: string) => void;
}) {
  const [formData, setFormData] = useState({
    role: user.role,
    companyId: user.companyId || '',
    coachId: user.coachId || '',
  });
  
  const [coaches, setCoaches] = useState<UserProfile[]>([]);
  
  // Load coaches when company changes
  useEffect(() => {
    const loadCoaches = async () => {
      if (formData.companyId && formData.role === 'client') {
        try {
          const coachList = await getAllCoaches(formData.companyId);
          setCoaches(coachList);
        } catch (error) {
          console.error('Failed to load coaches:', error);
        }
      }
    };
    loadCoaches();
  }, [formData.companyId, formData.role]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(user.uid, formData.role, formData.companyId || undefined, formData.coachId || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role || ''} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="coach">Coach</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="company">Company</Label>
        <Select value={formData.companyId} onValueChange={(value) => setFormData(prev => ({ ...prev, companyId: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select a company" />
          </SelectTrigger>
          <SelectContent>
            {companies.map(company => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.role === 'client' && (
        <div>
          <Label htmlFor="coach">Coach (Required)</Label>
          <Select value={formData.coachId} onValueChange={(value) => setFormData(prev => ({ ...prev, coachId: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a coach" />
            </SelectTrigger>
            <SelectContent>
              {coaches.map(coach => (
                <SelectItem key={coach.uid} value={coach.uid}>
                  {coach.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DialogFooter>
        <Button type="submit">Save Changes</Button>
      </DialogFooter>
    </form>
  );
}