import React, { useMemo } from 'react';
import { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { UserList } from '../../components/UserList';
import { UserService } from '../../services/UserService';
import { User } from '../../types/user';

interface UsersPageProps {
  initialUsers: User[];
  error?: string;
}

/**
 * Users page component - Next.js page for displaying users
 */
const UsersPage: NextPage<UsersPageProps> = ({ initialUsers, error }) => {
  // Create user service instance
  const userService = useMemo(() => new UserService(), []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Users - User Management System</title>
        <meta name="description" content="Manage users in the system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Users</h1>
            <p className="text-gray-600">Manage and view all users in the system</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Users"
              value={initialUsers.length.toString()}
              icon="👥"
              color="blue"
            />
            <StatsCard
              title="Active Users"
              value={initialUsers.filter(u => u.role !== 'guest').length.toString()}
              icon="✅"
              color="green"
            />
            <StatsCard
              title="Admins"
              value={initialUsers.filter(u => u.role === 'admin').length.toString()}
              icon="👑"
              color="purple"
            />
            <StatsCard
              title="New This Month"
              value={getNewUsersThisMonth(initialUsers).toString()}
              icon="📈"
              color="orange"
            />
          </div>

          {/* User List */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <UserList
              userService={userService}
              initialUsers={initialUsers}
              showFilters={true}
              pageSize={12}
            />
          </div>
        </div>
      </div>
    </>
  );
};

/**
 * Stats card component
 */
interface StatsCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]} mr-4`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper function to count new users this month
 */
const getNewUsersThisMonth = (users: User[]): number => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return users.filter(user => {
    const createdAt = new Date(user.createdAt);
    return createdAt >= startOfMonth;
  }).length;
};

/**
 * Server-side props for initial data loading
 */
export const getServerSideProps: GetServerSideProps<UsersPageProps> = async (context) => {
  try {
    // In a real app, this would fetch from an API or database
    // For demo purposes, we'll return mock data
    const mockUsers: User[] = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin' as const,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'user' as const,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-02-15')
      },
      {
        id: '3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'moderator' as const,
        createdAt: new Date('2024-03-05'),
        updatedAt: new Date('2024-03-10')
      }
    ];

    return {
      props: {
        initialUsers: mockUsers
      }
    };
  } catch (error) {
    console.error('Error loading users:', error);
    
    return {
      props: {
        initialUsers: [],
        error: 'Failed to load users'
      }
    };
  }
};

export default UsersPage;
