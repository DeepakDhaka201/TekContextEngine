import axios, { AxiosResponse } from 'axios';
import { User, UserCreateRequest, UserUpdateRequest, UserListResponse, UserRole } from '../types/user';

/**
 * Service class for managing user operations
 */
export class UserService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string = '/api', apiKey: string = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get all users with pagination
   */
  public async getAllUsers(page: number = 1, limit: number = 10): Promise<UserListResponse> {
    try {
      const response: AxiosResponse<UserListResponse> = await axios.get(
        `${this.baseUrl}/users`,
        {
          params: { page, limit },
          headers: this.getHeaders()
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }

  /**
   * Get user by ID
   */
  public async getUserById(id: string): Promise<User> {
    try {
      const response: AxiosResponse<User> = await axios.get(
        `${this.baseUrl}/users/${id}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch user ${id}: ${error}`);
    }
  }

  /**
   * Create a new user
   */
  public async createUser(userData: UserCreateRequest): Promise<User> {
    try {
      const response: AxiosResponse<User> = await axios.post(
        `${this.baseUrl}/users`,
        userData,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }

  /**
   * Update an existing user
   */
  public async updateUser(id: string, userData: UserUpdateRequest): Promise<User> {
    try {
      const response: AxiosResponse<User> = await axios.put(
        `${this.baseUrl}/users/${id}`,
        userData,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update user ${id}: ${error}`);
    }
  }

  /**
   * Delete a user
   */
  public async deleteUser(id: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/users/${id}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      throw new Error(`Failed to delete user ${id}: ${error}`);
    }
  }

  /**
   * Get users by role
   */
  public async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const response: AxiosResponse<User[]> = await axios.get(
        `${this.baseUrl}/users/role/${role}`,
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch users by role ${role}: ${error}`);
    }
  }

  /**
   * Search users by name or email
   */
  public async searchUsers(query: string): Promise<User[]> {
    try {
      const response: AxiosResponse<User[]> = await axios.get(
        `${this.baseUrl}/users/search`,
        {
          params: { q: query },
          headers: this.getHeaders()
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to search users: ${error}`);
    }
  }

  /**
   * Get request headers with authentication
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Validate user data
   */
  private validateUserData(userData: UserCreateRequest | UserUpdateRequest): boolean {
    if ('email' in userData && userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(userData.email);
    }
    return true;
  }
}
