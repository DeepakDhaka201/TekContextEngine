import { UserService } from './UserService';
import { User, UserRole, UserStatus } from '../types/user';

/**
 * Admin service extending UserService with administrative functions
 */
export class AdminService extends UserService {
  private readonly adminRole: UserRole = UserRole.ADMIN;

  constructor(baseUrl?: string, apiKey?: string) {
    super(baseUrl, apiKey);
  }

  /**
   * Promote user to admin role
   */
  public async promoteToAdmin(userId: string): Promise<User> {
    return this.updateUser(userId, { role: UserRole.ADMIN });
  }

  /**
   * Demote admin to regular user
   */
  public async demoteFromAdmin(userId: string): Promise<User> {
    return this.updateUser(userId, { role: UserRole.USER });
  }

  /**
   * Suspend a user account
   */
  public async suspendUser(userId: string, reason?: string): Promise<void> {
    try {
      // In a real implementation, this would call a specific suspend endpoint
      await this.updateUser(userId, { 
        // Note: status is not in UserUpdateRequest, this is for demo purposes
      });
      console.log(`User ${userId} suspended. Reason: ${reason || 'No reason provided'}`);
    } catch (error) {
      throw new Error(`Failed to suspend user ${userId}: ${error}`);
    }
  }

  /**
   * Reactivate a suspended user
   */
  public async reactivateUser(userId: string): Promise<User> {
    try {
      const user = await this.getUserById(userId);
      // Reactivate user logic would go here
      console.log(`User ${userId} reactivated`);
      return user;
    } catch (error) {
      throw new Error(`Failed to reactivate user ${userId}: ${error}`);
    }
  }

  /**
   * Get all admin users
   */
  public async getAllAdmins(): Promise<User[]> {
    return this.getUsersByRole(UserRole.ADMIN);
  }

  /**
   * Get all moderators
   */
  public async getAllModerators(): Promise<User[]> {
    return this.getUsersByRole(UserRole.MODERATOR);
  }

  /**
   * Bulk delete users
   */
  public async bulkDeleteUsers(userIds: string[]): Promise<void> {
    const deletePromises = userIds.map(id => this.deleteUser(id));
    
    try {
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${userIds.length} users`);
    } catch (error) {
      throw new Error(`Failed to bulk delete users: ${error}`);
    }
  }

  /**
   * Get user statistics
   */
  public async getUserStatistics(): Promise<UserStatistics> {
    try {
      const allUsers = await this.getAllUsers(1, 1000); // Get all users
      
      const stats: UserStatistics = {
        total: allUsers.total,
        byRole: {
          admin: 0,
          moderator: 0,
          user: 0,
          guest: 0
        },
        byStatus: {
          active: 0,
          inactive: 0,
          pending: 0,
          suspended: 0
        }
      };

      // Count users by role (simplified for demo)
      allUsers.users.forEach(user => {
        stats.byRole[user.role]++;
      });

      return stats;
    } catch (error) {
      throw new Error(`Failed to get user statistics: ${error}`);
    }
  }

  /**
   * Check if user has admin privileges
   */
  public async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await this.getUserById(userId);
      return user.role === UserRole.ADMIN;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Interface for user statistics
 */
export interface UserStatistics {
  total: number;
  byRole: {
    admin: number;
    moderator: number;
    user: number;
    guest: number;
  };
  byStatus: {
    active: number;
    inactive: number;
    pending: number;
    suspended: number;
  };
}
