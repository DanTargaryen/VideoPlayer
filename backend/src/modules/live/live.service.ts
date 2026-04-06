import { Injectable } from '@nestjs/common';

@Injectable()
export class LiveService {
  createRoom(payload: { title: string; categoryId: number; coverUrl?: string }) {
    return {
      id: 1,
      streamKey: 'demo-stream-key',
      rtmpUrl: 'rtmp://127.0.0.1/live/demo',
      playUrl: 'http://127.0.0.1:8080/live/demo.m3u8',
      ...payload,
    };
  }

  startRoom(id: number) {
    return {
      roomId: id,
      sessionId: 1,
      status: 'LIVING',
    };
  }

  getSession(id: number) {
    return {
      id,
      title: '演示直播',
      status: 'LIVING',
    };
  }
}
