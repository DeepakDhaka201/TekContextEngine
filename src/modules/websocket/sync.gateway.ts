import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WebSocketService } from './websocket.service';

@WebSocketGateway({
  cors: {
    origin: process.env.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(','),
    credentials: true,
  },
  namespace: '/sync',
})
export class SyncGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SyncGateway.name);

  constructor(private webSocketService: WebSocketService) {}

  afterInit(server: Server) {
    this.webSocketService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Send welcome message
    client.emit('connected', {
      message: 'Connected to TekAI Context Engine sync service',
      clientId: client.id,
      timestamp: new Date(),
    });

    // Join global sync room by default
    client.join('sync:global');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:project')
  handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `project:${data.projectId}`;
    client.join(roomName);
    
    this.logger.debug(`Client ${client.id} joined project room: ${roomName}`);
    
    client.emit('joined:project', {
      projectId: data.projectId,
      roomName,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `project:${data.projectId}`;
    client.leave(roomName);
    
    this.logger.debug(`Client ${client.id} left project room: ${roomName}`);
    
    client.emit('left:project', {
      projectId: data.projectId,
      roomName,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('join:codebase')
  handleJoinCodebase(
    @MessageBody() data: { codebaseId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `codebase:${data.codebaseId}`;
    client.join(roomName);
    
    this.logger.debug(`Client ${client.id} joined codebase room: ${roomName}`);
    
    client.emit('joined:codebase', {
      codebaseId: data.codebaseId,
      roomName,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('leave:codebase')
  handleLeaveCodebase(
    @MessageBody() data: { codebaseId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `codebase:${data.codebaseId}`;
    client.leave(roomName);
    
    this.logger.debug(`Client ${client.id} left codebase room: ${roomName}`);
    
    client.emit('left:codebase', {
      codebaseId: data.codebaseId,
      roomName,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('join:user')
  handleJoinUser(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `user:${data.userId}`;
    client.join(roomName);
    
    this.logger.debug(`Client ${client.id} joined user room: ${roomName}`);
    
    client.emit('joined:user', {
      userId: data.userId,
      roomName,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('join:system')
  handleJoinSystem(@ConnectedSocket() client: Socket) {
    client.join('system:status');
    
    this.logger.debug(`Client ${client.id} joined system status room`);
    
    client.emit('joined:system', {
      roomName: 'system:status',
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('get:stats')
  handleGetStats(@ConnectedSocket() client: Socket) {
    const stats = this.webSocketService.getServerStats();
    
    client.emit('stats', {
      ...stats,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', {
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('subscribe:notifications')
  handleSubscribeNotifications(
    @MessageBody() data: { userId?: string; projectId?: string; codebaseId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const rooms = [];
    
    if (data.userId) {
      const userRoom = `user:${data.userId}`;
      client.join(userRoom);
      rooms.push(userRoom);
    }
    
    if (data.projectId) {
      const projectRoom = `project:${data.projectId}`;
      client.join(projectRoom);
      rooms.push(projectRoom);
    }
    
    if (data.codebaseId) {
      const codebaseRoom = `codebase:${data.codebaseId}`;
      client.join(codebaseRoom);
      rooms.push(codebaseRoom);
    }
    
    this.logger.debug(`Client ${client.id} subscribed to notifications: ${rooms.join(', ')}`);
    
    client.emit('subscribed:notifications', {
      rooms,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('unsubscribe:notifications')
  handleUnsubscribeNotifications(
    @MessageBody() data: { userId?: string; projectId?: string; codebaseId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const rooms = [];
    
    if (data.userId) {
      const userRoom = `user:${data.userId}`;
      client.leave(userRoom);
      rooms.push(userRoom);
    }
    
    if (data.projectId) {
      const projectRoom = `project:${data.projectId}`;
      client.leave(projectRoom);
      rooms.push(projectRoom);
    }
    
    if (data.codebaseId) {
      const codebaseRoom = `codebase:${data.codebaseId}`;
      client.leave(codebaseRoom);
      rooms.push(codebaseRoom);
    }
    
    this.logger.debug(`Client ${client.id} unsubscribed from notifications: ${rooms.join(', ')}`);
    
    client.emit('unsubscribed:notifications', {
      rooms,
      timestamp: new Date(),
    });
  }
}
