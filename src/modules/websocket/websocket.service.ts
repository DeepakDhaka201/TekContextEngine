import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

export interface SyncStatusUpdate {
  syncJobId: string;
  codebaseId: string;
  projectId?: string;
  status: string;
  progress: number;
  message?: string;
  error?: string;
  filesProcessed?: number;
  totalFiles?: number;
  startedAt?: Date;
  estimatedCompletion?: Date;
}

export interface NotificationMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  userId?: string;
  projectId?: string;
  codebaseId?: string;
}

@Injectable()
export class WebSocketService {
  private readonly logger = new Logger(WebSocketService.name);
  private server: Server;

  setServer(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server initialized');
  }

  /**
   * Emit sync status update to relevant clients
   */
  emitSyncStatusUpdate(update: SyncStatusUpdate): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    try {
      // Emit to codebase-specific room
      this.server.to(`codebase:${update.codebaseId}`).emit('sync:status', update);

      // Emit to project-specific room if projectId is available
      if (update.projectId) {
        this.server.to(`project:${update.projectId}`).emit('sync:status', update);
      }

      // Emit to global sync room
      this.server.to('sync:global').emit('sync:status', update);

      this.logger.debug(`Sync status update emitted for job: ${update.syncJobId}`);
    } catch (error) {
      this.logger.error('Failed to emit sync status update:', error);
    }
  }

  /**
   * Emit notification to specific user or broadcast
   */
  emitNotification(notification: NotificationMessage): void {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    try {
      if (notification.userId) {
        // Send to specific user
        this.server.to(`user:${notification.userId}`).emit('notification', notification);
      } else if (notification.projectId) {
        // Send to all users in project
        this.server.to(`project:${notification.projectId}`).emit('notification', notification);
      } else if (notification.codebaseId) {
        // Send to all users watching codebase
        this.server.to(`codebase:${notification.codebaseId}`).emit('notification', notification);
      } else {
        // Broadcast to all connected clients
        this.server.emit('notification', notification);
      }

      this.logger.debug(`Notification emitted: ${notification.type} - ${notification.title}`);
    } catch (error) {
      this.logger.error('Failed to emit notification:', error);
    }
  }

  /**
   * Emit system status update
   */
  emitSystemStatus(status: {
    queueStats: any;
    systemHealth: any;
    activeJobs: number;
    timestamp: Date;
  }): void {
    if (!this.server) {
      return;
    }

    try {
      this.server.to('system:status').emit('system:status', status);
      this.logger.debug('System status update emitted');
    } catch (error) {
      this.logger.error('Failed to emit system status:', error);
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    if (!this.server) {
      return 0;
    }
    return this.server.sockets.sockets.size;
  }

  /**
   * Get room information
   */
  getRoomInfo(roomName: string): {
    clientCount: number;
    clients: string[];
  } {
    if (!this.server) {
      return { clientCount: 0, clients: [] };
    }

    const room = this.server.sockets.adapter.rooms.get(roomName);
    if (!room) {
      return { clientCount: 0, clients: [] };
    }

    return {
      clientCount: room.size,
      clients: Array.from(room),
    };
  }

  /**
   * Force disconnect a client
   */
  disconnectClient(clientId: string, reason?: string): void {
    if (!this.server) {
      return;
    }

    const socket = this.server.sockets.sockets.get(clientId);
    if (socket) {
      socket.disconnect(true);
      this.logger.log(`Client ${clientId} disconnected: ${reason || 'No reason provided'}`);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, event: string, data: any): void {
    if (!this.server) {
      return;
    }

    const socket = this.server.sockets.sockets.get(clientId);
    if (socket) {
      socket.emit(event, data);
      this.logger.debug(`Message sent to client ${clientId}: ${event}`);
    }
  }

  /**
   * Get server statistics
   */
  getServerStats(): {
    connectedClients: number;
    rooms: Array<{ name: string; clientCount: number }>;
    uptime: number;
  } {
    if (!this.server) {
      return {
        connectedClients: 0,
        rooms: [],
        uptime: 0,
      };
    }

    const rooms = Array.from(this.server.sockets.adapter.rooms.entries())
      .filter(([name]) => !name.startsWith('user:')) // Filter out individual socket IDs
      .map(([name, room]) => ({
        name,
        clientCount: room.size,
      }));

    return {
      connectedClients: this.server.sockets.sockets.size,
      rooms,
      uptime: process.uptime(),
    };
  }
}
