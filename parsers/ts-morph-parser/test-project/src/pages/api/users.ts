import { NextApiRequest, NextApiResponse } from 'next';
import { User, UserCreateRequest, UserRole } from '../../types/user';

// Mock database - in a real app, this would be a proper database
let mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.ADMIN,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: UserRole.USER,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-02-15')
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    role: UserRole.MODERATOR,
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-03-10')
  }
];

/**
 * API handler for users endpoint
 * Supports GET (list users) and POST (create user)
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGetUsers(req, res);
    case 'POST':
      return handleCreateUser(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * Handle GET request - list users with pagination
 */
function handleGetUsers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { page = '1', limit = '10', role, search } = req.query;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    
    // Validate pagination parameters
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: 'Invalid page number' });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: 'Invalid limit (must be 1-100)' });
    }

    let filteredUsers = [...mockUsers];

    // Filter by role if specified
    if (role && role !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    // Filter by search query if specified
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    // Apply pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    const response = {
      users: paginatedUsers,
      total: filteredUsers.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filteredUsers.length / limitNum)
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in handleGetUsers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle POST request - create new user
 */
function handleCreateUser(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userData: UserCreateRequest = req.body;

    // Validate required fields
    if (!userData.name || !userData.email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists
    const existingUser = mockUsers.find(user => user.email === userData.email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Create new user
    const newUser: User = {
      id: generateUserId(),
      name: userData.name,
      email: userData.email,
      role: userData.role || UserRole.USER,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add to mock database
    mockUsers.push(newUser);

    return res.status(201).json(newUser);
  } catch (error) {
    console.error('Error in handleCreateUser:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate a unique user ID
 */
function generateUserId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Validate user role
 */
function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}
