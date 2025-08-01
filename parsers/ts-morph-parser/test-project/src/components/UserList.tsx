import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole } from '../types/user';
import { UserCard } from './UserCard';
import { UserService } from '../services/UserService';

interface UserListProps {
  userService: UserService;
  initialUsers?: User[];
  showFilters?: boolean;
  pageSize?: number;
}

/**
 * UserList component for displaying and managing a list of users
 */
export const UserList: React.FC<UserListProps> = ({
  userService,
  initialUsers = [],
  showFilters = true,
  pageSize = 10
}) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  // Load users on component mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [currentPage, roleFilter]);

  // Search users when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      loadUsers();
    }
  }, [searchQuery]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (roleFilter === 'all') {
        const response = await userService.getAllUsers(currentPage, pageSize);
        setUsers(response.users);
        setTotalUsers(response.total);
      } else {
        const roleUsers = await userService.getUsersByRole(roleFilter);
        setUsers(roleUsers);
        setTotalUsers(roleUsers.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await userService.searchUsers(searchQuery);
      setUsers(searchResults);
      setTotalUsers(searchResults.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    // In a real app, this would open an edit modal or navigate to edit page
    console.log('Edit user:', user);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
      setTotalUsers(prev => prev - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRoleFilterChange = (role: UserRole | 'all') => {
    setRoleFilter(role);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Memoized filtered users for performance
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = !searchQuery || 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const totalPages = Math.ceil(totalUsers / pageSize);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={loadUsers}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Role Filter */}
            <div>
              <select
                value={roleFilter}
                onChange={(e) => handleRoleFilterChange(e.target.value as UserRole | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.MODERATOR}>Moderator</option>
                <option value={UserRole.USER}>User</option>
                <option value={UserRole.GUEST}>Guest</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* User Cards */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredUsers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No users found</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          
          <span className="px-3 py-2 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default UserList;
