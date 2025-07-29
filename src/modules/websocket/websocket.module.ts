import { Module } from '@nestjs/common';
import { SyncGateway } from './sync.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  providers: [SyncGateway, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
