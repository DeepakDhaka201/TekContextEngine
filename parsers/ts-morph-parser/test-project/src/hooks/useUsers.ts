import { useState, useEffect, useCallback } from 'react';
import { User, UserCreateRequest, UserUpdateRequest, UserRole } from '../types/user';
import { UserService } from '../services/UserService';

interface UseUsersOptions {
  userService: UserService;
  initialPage?: number;
  pageSize?: number;
  autoLoad?: boolean;
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalUsers: number;
  totalPages: number;
  
  // Actions
  loadUsers: () => Promise<void>;
  createUser: (userData: UserCreateRequest) => Promise<User>;
  updateUser: (id: string, userData: UserUpdateRequest) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  searchUsers: (query: string) => Promise<User[]>;
  getUsersByRole: (role: UserRole) => Promise<User[]>;
  
  // Pagination
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  
  // Utilities
  refreshUsers: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook for managing users state and operations
 */
export const useUsers = ({
  userService,
  initialPage = 1,
  pageSize = 10,
  autoLoad = true
}: UseUsersOptions): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalUsers, setTotalUsers] = useState(0);

  const totalPages = Math.ceil(totalUsers / pageSize);

  // Load users with pagination
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await userService.getAllUsers(currentPage, pageSize);
      setUsers(response.users);
      setTotalUsers(response.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMessage);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  }, [userService, currentPage, pageSize]);

  // Create a new user
  const createUser = useCallback(async (userData: UserCreateRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const newUser = await userService.createUser(userData);
      setUsers(prev => [newUser, ...prev]);
      setTotalUsers(prev => prev + 1);
      return newUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userService]);

  // Update an existing user
  const updateUser = useCallback(async (id: string, userData: UserUpdateRequest): Promise<User> => {
    setLoading(true);
    setError(null);
    
    try {
      const updatedUser = await userService.updateUser(id, userData);
      setUsers(prev => prev.map(user => user.id === id ? updatedUser : user));
      return updatedUser;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userService]);

  // Delete a user
  const deleteUser = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await userService.deleteUser(id);
      setUsers(prev => prev.filter(user => user.id !== id));
      setTotalUsers(prev => prev - 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userService]);

  // Search users
  const searchUsers = useCallback(async (query: string): Promise<User[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const searchResults = await userService.searchUsers(query);
      setUsers(searchResults);
      setTotalUsers(searchResults.length);
      return searchResults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userService]);

  // Get users by role
  const getUsersByRole = useCallback(async (role: UserRole): Promise<User[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const roleUsers = await userService.getUsersByRole(role);
      setUsers(roleUsers);
      setTotalUsers(roleUsers.length);
      return roleUsers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get users by role';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userService]);

  // Pagination functions
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  // Refresh users (reload current page)
  const refreshUsers = useCallback(async () => {
    await loadUsers();
  }, [loadUsers]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load users on mount and page change
  useEffect(() => {
    if (autoLoad) {
      loadUsers();
    }
  }, [loadUsers, autoLoad]);

  return {
    users,
    loading,
    error,
    currentPage,
    totalUsers,
    totalPages,
    
    // Actions
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    searchUsers,
    getUsersByRole,
    
    // Pagination
    goToPage,
    nextPage,
    prevPage,
    
    // Utilities
    refreshUsers,
    clearError
  };
};
