import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './modules/prisma/prisma.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { VideoModule } from './modules/video/video.module';
import { SearchModule } from './modules/search/search.module';
import { LiveModule } from './modules/live/live.module';
import { CreatorModule } from './modules/creator/creator.module';
import { CommentModule } from './modules/comment/comment.module';
import { FollowModule } from './modules/follow/follow.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ReportModule } from './modules/report/report.module';
import { AdminModule } from './modules/admin/admin.module';
import { GiftModule } from './modules/gift/gift.module';
import { AgentModule } from './modules/agent/agent.module';
import { AiModule } from './modules/ai/ai.module';
import { CaptchaModule } from './modules/captcha/captcha.module';
import { EmailModule } from './modules/email/email.module';
import { MessageModule } from './modules/message/message.module';
import { FeedModule } from './modules/feed/feed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['backend/.env', '.env'],
    }),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    UserModule,
    VideoModule,
    SearchModule,
    LiveModule,
    CommentModule,
    FollowModule,
    NotificationModule,
    ReportModule,
    CreatorModule,
    AdminModule,
    GiftModule,
    AgentModule,
    AiModule,
    CaptchaModule,
    EmailModule,
    MessageModule,
    FeedModule,
  ],
})
export class AppModule {}
