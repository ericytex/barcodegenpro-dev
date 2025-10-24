import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown, 
  Edit, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  is_super_admin: boolean;
  created_at: string;
  last_login?: string;
}

interface UserManagerProps {
  isSuperAdmin: boolean;
}

const UserManager: React.FC<UserManagerProps> = ({ isSuperAdmin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'super_admin' | 'regular'>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
    is_admin: false,
    is_super_admin: false
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Users from API:", data);
        setUsers(data.users || []);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: number, field: 'is_admin' | 'is_super_admin', value: boolean) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ [field]: value })
      });
      
      if (response.ok) {
        toast.success('User role updated successfully');
        loadUsers();
      } else {
        toast.error('Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ is_active: !isActive })
      });
      
      if (response.ok) {
        toast.success(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
        loadUsers();
      } else {
        toast.error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const createUser = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';
      const response = await fetch(`${baseUrl}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(newUser)
      });
      
      if (response.ok) {
        toast.success('User created successfully');
        setNewUser({
          email: '',
          username: '',
          password: '',
          full_name: '',
          is_admin: false,
          is_super_admin: false
        });
        setShowAddUser(false);
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Failed to create user');
    }
  };

  const deleteUser = async (userId: number, email: string) => {
    if (!confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8034';
      const response = await fetch(`${baseUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (response.ok) {
        toast.success(`User "${email}" deleted successfully`);
        loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterRole === 'all') return matchesSearch;
    if (filterRole === 'admin') return matchesSearch && user.is_admin;
    if (filterRole === 'super_admin') return matchesSearch && user.is_super_admin;
    if (filterRole === 'regular') return matchesSearch && !user.is_admin && !user.is_super_admin;
    
    return matchesSearch;
  });

  const getRoleBadge = (user: User) => {
    if (user.is_super_admin) {
      return <Badge variant="default" className="bg-purple-600"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
    }
    if (user.is_admin) {
      return <Badge variant="default" className="bg-blue-600"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
    }
    return <Badge variant="secondary">Regular User</Badge>;
  };

  const getStatusBadge = (user: User) => {
    return user.is_active ? 
      <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge> :
      <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isSuperAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Super admin access required to manage users.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Manager</h2>
          <p className="text-muted-foreground">
            Manage users, assign admin rights, and control access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadUsers}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowAddUser(true)}
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div className="md:col-span-2 lg:col-span-2 xl:col-span-3">
              <Label htmlFor="search">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by email, username, or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">Filter by Role</Label>
              <select
                id="role-filter"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="all">All Users</option>
                <option value="super_admin">Super Admins</option>
                <option value="admin">Admins</option>
                <option value="regular">Regular Users</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add User Form */}
      {showAddUser && (
        <Card>
          <CardHeader>
            <CardTitle>Add New User</CardTitle>
            <CardDescription>Create a new user account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="username"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="Full Name"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_admin"
                  checked={newUser.is_admin}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, is_admin: checked })}
                />
                <Label htmlFor="is_admin">Admin Rights</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_super_admin"
                  checked={newUser.is_super_admin}
                  onCheckedChange={(checked) => setNewUser({ ...newUser, is_super_admin: checked })}
                />
                <Label htmlFor="is_super_admin">Super Admin Rights</Label>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-6">
              <Button onClick={createUser} className="sm:w-auto">
                Create User
              </Button>
              <Button variant="outline" onClick={() => setShowAddUser(false)} className="sm:w-auto">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  {/* Mobile-first responsive layout */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* User Info Section */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-medium truncate">{user.full_name || user.username}</p>
                          {getRoleBadge(user)}
                          {getStatusBadge(user)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                          <span>Created: {formatDate(user.created_at)}</span>
                          {user.last_login && <span>• Last login: {formatDate(user.last_login)}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Controls Section */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
                      {/* Role Controls */}
                      <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.is_active}
                            onCheckedChange={() => toggleUserStatus(user.id, user.is_active)}
                            className="flex-shrink-0"
                          />
                          <span className="text-sm whitespace-nowrap">Active</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.is_admin}
                            onCheckedChange={(checked) => updateUserRole(user.id, 'is_admin', checked)}
                            className="flex-shrink-0"
                          />
                          <span className="text-sm whitespace-nowrap">Admin</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={user.is_super_admin}
                            onCheckedChange={(checked) => updateUserRole(user.id, 'is_super_admin', checked)}
                            className="flex-shrink-0"
                          />
                          <span className="text-sm whitespace-nowrap">Super Admin</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete user</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No users found matching your criteria.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export { UserManager };
export default UserManager;
