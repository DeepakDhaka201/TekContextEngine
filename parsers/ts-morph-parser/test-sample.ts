// Sample TypeScript file for testing the parser

export interface UserInterface {
  id: string;
  name: string;
  email: string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

/**
 * Sample user class for testing
 */
export class UserService {
  private users: UserInterface[] = [];

  constructor(private readonly logger: any) {}

  /**
   * Get all users
   */
  public getAllUsers(): UserInterface[] {
    return this.users;
  }

  /**
   * Add a new user
   */
  public addUser(user: UserInterface): void {
    this.users.push(user);
    this.logger.info(`Added user: ${user.name}`);
  }

  /**
   * Find user by ID
   */
  public findUserById(id: string): UserInterface | undefined {
    return this.users.find(user => user.id === id);
  }
}

export class AdminService extends UserService {
  constructor(logger: any) {
    super(logger);
  }

  public deleteUser(id: string): boolean {
    const index = this.users.findIndex(user => user.id === id);
    if (index !== -1) {
      this.users.splice(index, 1);
      return true;
    }
    return false;
  }
}
