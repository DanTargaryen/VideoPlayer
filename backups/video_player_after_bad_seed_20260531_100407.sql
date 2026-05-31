-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: 182.92.132.80    Database: video_player
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.22.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `CoinTransaction`
--

DROP TABLE IF EXISTS `CoinTransaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CoinTransaction` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `type` enum('DAILY_CLAIM','VIDEO_COIN','STREAK_REWARD') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` int NOT NULL,
  `balanceAfter` int NOT NULL,
  `videoId` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `CoinTransaction_userId_createdAt_idx` (`userId`,`createdAt`),
  KEY `CoinTransaction_videoId_createdAt_idx` (`videoId`,`createdAt`),
  CONSTRAINT `CoinTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `CoinTransaction_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CoinTransaction`
--

LOCK TABLES `CoinTransaction` WRITE;
/*!40000 ALTER TABLE `CoinTransaction` DISABLE KEYS */;
/*!40000 ALTER TABLE `CoinTransaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Comment`
--

DROP TABLE IF EXISTS `Comment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Comment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `userId` int NOT NULL,
  `parentId` int DEFAULT NULL,
  `rootId` int DEFAULT NULL,
  `content` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `imageUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('NORMAL','HIDDEN','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `replyCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Comment_videoId_parentId_createdAt_idx` (`videoId`,`parentId`,`createdAt`),
  KEY `Comment_userId_createdAt_idx` (`userId`,`createdAt`),
  CONSTRAINT `Comment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Comment_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Comment`
--

LOCK TABLES `Comment` WRITE;
/*!40000 ALTER TABLE `Comment` DISABLE KEYS */;
INSERT INTO `Comment` VALUES (19,46,17,NULL,NULL,'这个演示视频把整体链路讲得很清楚，适合第一次看项目的人。',NULL,'NORMAL',0,'2026-05-31 01:27:54.971','2026-05-31 01:27:54.971'),(20,46,23,NULL,NULL,'首页和详情页的交互都挺完整，做答辩展示很合适。',NULL,'NORMAL',0,'2026-05-31 01:27:54.971','2026-05-31 01:27:54.971'),(21,53,20,NULL,NULL,'这个现场氛围感好强，封面也选得不错。',NULL,'NORMAL',0,'2026-05-31 01:27:54.971','2026-05-31 01:27:54.971');
/*!40000 ALTER TABLE `Comment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CommentAiTask`
--

DROP TABLE IF EXISTS `CommentAiTask`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CommentAiTask` (
  `id` int NOT NULL AUTO_INCREMENT,
  `commentId` int NOT NULL,
  `videoId` int NOT NULL,
  `requesterId` int NOT NULL,
  `prompt` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','RUNNING','SUCCESS','FAILED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `replyCommentId` int DEFAULT NULL,
  `errorMessage` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attempts` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `CommentAiTask_commentId_key` (`commentId`),
  UNIQUE KEY `CommentAiTask_replyCommentId_key` (`replyCommentId`),
  KEY `CommentAiTask_status_updatedAt_idx` (`status`,`updatedAt`),
  KEY `CommentAiTask_requesterId_createdAt_idx` (`requesterId`,`createdAt`),
  KEY `CommentAiTask_videoId_createdAt_idx` (`videoId`,`createdAt`),
  CONSTRAINT `CommentAiTask_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CommentAiTask_replyCommentId_fkey` FOREIGN KEY (`replyCommentId`) REFERENCES `Comment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `CommentAiTask_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `CommentAiTask_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CommentAiTask`
--

LOCK TABLES `CommentAiTask` WRITE;
/*!40000 ALTER TABLE `CommentAiTask` DISABLE KEYS */;
/*!40000 ALTER TABLE `CommentAiTask` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CreatorFollowerDaily`
--

DROP TABLE IF EXISTS `CreatorFollowerDaily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CreatorFollowerDaily` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creatorId` int NOT NULL,
  `statDate` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `followerCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `CreatorFollowerDaily_creatorId_statDate_key` (`creatorId`,`statDate`),
  KEY `CreatorFollowerDaily_creatorId_statDate_idx` (`creatorId`,`statDate`),
  CONSTRAINT `CreatorFollowerDaily_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=176 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CreatorFollowerDaily`
--

LOCK TABLES `CreatorFollowerDaily` WRITE;
/*!40000 ALTER TABLE `CreatorFollowerDaily` DISABLE KEYS */;
/*!40000 ALTER TABLE `CreatorFollowerDaily` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `CreatorPlayDaily`
--

DROP TABLE IF EXISTS `CreatorPlayDaily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CreatorPlayDaily` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creatorId` int NOT NULL,
  `statDate` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `playCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `CreatorPlayDaily_creatorId_statDate_key` (`creatorId`,`statDate`),
  KEY `CreatorPlayDaily_creatorId_statDate_idx` (`creatorId`,`statDate`),
  CONSTRAINT `CreatorPlayDaily_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `CreatorPlayDaily`
--

LOCK TABLES `CreatorPlayDaily` WRITE;
/*!40000 ALTER TABLE `CreatorPlayDaily` DISABLE KEYS */;
/*!40000 ALTER TABLE `CreatorPlayDaily` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DailyCoinClaim`
--

DROP TABLE IF EXISTS `DailyCoinClaim`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DailyCoinClaim` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `claimDate` date NOT NULL,
  `amount` int NOT NULL DEFAULT '2',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `DailyCoinClaim_userId_claimDate_key` (`userId`,`claimDate`),
  KEY `DailyCoinClaim_claimDate_idx` (`claimDate`),
  CONSTRAINT `DailyCoinClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DailyCoinClaim`
--

LOCK TABLES `DailyCoinClaim` WRITE;
/*!40000 ALTER TABLE `DailyCoinClaim` DISABLE KEYS */;
/*!40000 ALTER TABLE `DailyCoinClaim` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DirectMessage`
--

DROP TABLE IF EXISTS `DirectMessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DirectMessage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `senderId` int NOT NULL,
  `recipientId` int NOT NULL,
  `content` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `readAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `DirectMessage_senderId_createdAt_idx` (`senderId`,`createdAt`),
  KEY `DirectMessage_recipientId_isRead_createdAt_idx` (`recipientId`,`isRead`,`createdAt`),
  KEY `DirectMessage_senderId_recipientId_createdAt_idx` (`senderId`,`recipientId`,`createdAt`),
  CONSTRAINT `DirectMessage_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `DirectMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DirectMessage`
--

LOCK TABLES `DirectMessage` WRITE;
/*!40000 ALTER TABLE `DirectMessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `DirectMessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DynamicPost`
--

DROP TABLE IF EXISTS `DynamicPost`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DynamicPost` (
  `id` int NOT NULL AUTO_INCREMENT,
  `authorId` int NOT NULL,
  `content` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `imageUrls` json DEFAULT NULL,
  `status` enum('NORMAL','HIDDEN','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `likeCount` int NOT NULL DEFAULT '0',
  `commentCount` int NOT NULL DEFAULT '0',
  `favoriteCount` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `DynamicPost_authorId_createdAt_idx` (`authorId`,`createdAt`),
  KEY `DynamicPost_status_createdAt_idx` (`status`,`createdAt`),
  CONSTRAINT `DynamicPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DynamicPost`
--

LOCK TABLES `DynamicPost` WRITE;
/*!40000 ALTER TABLE `DynamicPost` DISABLE KEYS */;
INSERT INTO `DynamicPost` VALUES (6,22,'这周把 Java 后端项目里的 AI Agent 流程重新梳理了一遍：工具调用要有边界，任务队列要能追踪，异常兜底也得提前想好。#AI Agent #Java后端','[\"https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80\"]','NORMAL',1280,96,540,'2026-05-30 23:27:55.013','2026-05-31 01:28:47.238'),(7,19,'后端复习别只背八股。今天这张图把缓存击穿、事务传播和 MQ 幂等放到一个业务链路里，项目答辩讲起来会自然很多。#Java后端','[\"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80\"]','NORMAL',860,72,430,'2026-05-30 19:27:55.013','2026-05-30 19:27:55.013'),(8,14,'做桌面机器人时，AI Agent 最难的不是“会说话”，而是知道什么时候该闭嘴、什么时候该动手。今晚继续拆传感器和动作规划。','[\"https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?auto=format&fit=crop&w=900&q=80\"]','NORMAL',2460,210,1180,'2026-05-30 16:27:55.013','2026-05-31 01:28:47.366'),(9,11,'一个小实验：如果 AI 助手不是一个 App，而是桌面上一个“物件”，我们会更愿意和它互动吗？今天先把脚本和分镜定下来。','[\"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80\"]','NORMAL',1860,188,760,'2026-05-30 12:27:55.013','2026-05-30 12:27:55.013'),(10,25,'数学建模赛前别急着套模板：先把变量、约束、评价指标写成三列，再决定用动态规划、优化还是仿真。晚上直播讲几个常见坑。#数学建模','[\"https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80\"]','NORMAL',920,118,1320,'2026-05-30 20:27:55.013','2026-05-31 01:28:47.432'),(11,15,'论文图表不用追求“花”，要让读者一眼看出模型假设、输入输出和对比基线。今天整理一版建模写作检查清单。','[]','NORMAL',520,64,870,'2026-05-30 06:27:55.013','2026-05-30 06:27:55.013'),(12,13,'今晚剪游戏实况，发现最难的不是保留笑点，而是别把剧情惊喜剪没了。这个独立游戏真的有点东西。','[\"https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=900&q=80\"]','NORMAL',1760,224,690,'2026-05-30 21:27:55.013','2026-05-31 01:28:47.497'),(13,16,'新游戏开荒第一小时：弹幕说我很稳，然后三分钟后我就被教程关卡教育了。直播切片在剪，今晚发。#游戏实况','[\"https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80\"]','NORMAL',1320,180,420,'2026-05-30 17:27:55.013','2026-05-31 01:28:47.561'),(14,24,'多人企划的隐藏规则已经写完了，录完才发现大家理解的“合作”完全不是一个意思。明天开始粗剪。','[\"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80\", \"https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=900&q=80\"]','NORMAL',1480,170,560,'2026-05-30 09:27:55.013','2026-05-30 09:27:55.013'),(15,18,'今天外拍收工。图文动态如果想讲清楚一个拍摄流程，前三张图最好分别交代现场、设备和结果，不然读者很难跟上。','[\"https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80\"]','NORMAL',980,86,820,'2026-05-30 15:27:55.013','2026-05-31 01:28:47.626'),(16,12,'期末复习进度条：数据库范式和索引优化已经整理完，明天补 ER 图和接口测试截图。','[]','NORMAL',120,16,88,'2026-05-30 22:27:55.013','2026-05-30 22:27:55.013'),(17,21,'手柄延迟测试数据出来了，体感差异比想象中明显。下一条把游戏实况和设备评测合在一起讲。','[\"https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=900&q=80\"]','NORMAL',150,22,64,'2026-05-30 13:27:55.013','2026-05-30 13:27:55.013');
/*!40000 ALTER TABLE `DynamicPost` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DynamicPostComment`
--

DROP TABLE IF EXISTS `DynamicPostComment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DynamicPostComment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postId` int NOT NULL,
  `userId` int NOT NULL,
  `content` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('NORMAL','HIDDEN','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `DynamicPostComment_postId_createdAt_idx` (`postId`,`createdAt`),
  KEY `DynamicPostComment_userId_createdAt_idx` (`userId`,`createdAt`),
  CONSTRAINT `DynamicPostComment_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DynamicPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DynamicPostComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DynamicPostComment`
--

LOCK TABLES `DynamicPostComment` WRITE;
/*!40000 ALTER TABLE `DynamicPostComment` DISABLE KEYS */;
INSERT INTO `DynamicPostComment` VALUES (1,6,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-31 00:27:55.571','2026-05-31 00:27:55.571'),(2,7,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 23:27:55.571','2026-05-30 23:27:55.571'),(3,8,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 22:27:55.571','2026-05-30 22:27:55.571'),(4,8,17,'图文信息量很足，先收藏慢慢看。','NORMAL','2026-05-30 21:27:55.571','2026-05-30 21:27:55.571'),(5,8,12,'期待展开讲一下实现细节。','NORMAL','2026-05-30 20:27:55.571','2026-05-30 20:27:55.571'),(6,9,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 21:27:55.571','2026-05-30 21:27:55.571'),(7,9,17,'图文信息量很足，先收藏慢慢看。','NORMAL','2026-05-30 20:27:55.571','2026-05-30 20:27:55.571'),(8,10,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 20:27:55.571','2026-05-30 20:27:55.571'),(9,11,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 19:27:55.571','2026-05-30 19:27:55.571'),(10,12,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 18:27:55.571','2026-05-30 18:27:55.571'),(11,12,17,'图文信息量很足，先收藏慢慢看。','NORMAL','2026-05-30 17:27:55.571','2026-05-30 17:27:55.571'),(12,12,12,'期待展开讲一下实现细节。','NORMAL','2026-05-30 16:27:55.571','2026-05-30 16:27:55.571'),(13,13,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 17:27:55.571','2026-05-30 17:27:55.571'),(14,13,17,'图文信息量很足，先收藏慢慢看。','NORMAL','2026-05-30 16:27:55.571','2026-05-30 16:27:55.571'),(15,14,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 16:27:55.571','2026-05-30 16:27:55.571'),(16,14,17,'图文信息量很足，先收藏慢慢看。','NORMAL','2026-05-30 15:27:55.571','2026-05-30 15:27:55.571'),(17,15,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 15:27:55.571','2026-05-30 15:27:55.571'),(18,16,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 14:27:55.571','2026-05-30 14:27:55.571'),(19,17,20,'这个思路可以直接放进项目演示里。','NORMAL','2026-05-30 13:27:55.571','2026-05-30 13:27:55.571');
/*!40000 ALTER TABLE `DynamicPostComment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DynamicPostLike`
--

DROP TABLE IF EXISTS `DynamicPostLike`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DynamicPostLike` (
  `id` int NOT NULL AUTO_INCREMENT,
  `postId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `DynamicPostLike_postId_userId_key` (`postId`,`userId`),
  KEY `DynamicPostLike_userId_createdAt_idx` (`userId`,`createdAt`),
  CONSTRAINT `DynamicPostLike_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `DynamicPost` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `DynamicPostLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DynamicPostLike`
--

LOCK TABLES `DynamicPostLike` WRITE;
/*!40000 ALTER TABLE `DynamicPostLike` DISABLE KEYS */;
INSERT INTO `DynamicPostLike` VALUES (1,6,20,'2026-05-31 00:27:55.618'),(2,6,17,'2026-05-31 00:27:55.618'),(3,6,12,'2026-05-31 00:27:55.618'),(4,7,20,'2026-05-31 00:27:55.618'),(5,7,17,'2026-05-31 00:27:55.618'),(6,7,12,'2026-05-31 00:27:55.618'),(7,8,20,'2026-05-31 00:27:55.618'),(8,8,17,'2026-05-31 00:27:55.618'),(9,8,12,'2026-05-31 00:27:55.618'),(10,9,20,'2026-05-31 00:27:55.618'),(11,9,17,'2026-05-31 00:27:55.618'),(12,9,12,'2026-05-31 00:27:55.618'),(13,10,20,'2026-05-31 00:27:55.618'),(14,10,17,'2026-05-31 00:27:55.618'),(15,10,12,'2026-05-31 00:27:55.618'),(16,11,20,'2026-05-31 00:27:55.618'),(17,11,17,'2026-05-31 00:27:55.618'),(18,11,12,'2026-05-31 00:27:55.618'),(19,12,20,'2026-05-31 00:27:55.618'),(20,12,17,'2026-05-31 00:27:55.618'),(21,12,12,'2026-05-31 00:27:55.618'),(22,13,20,'2026-05-31 00:27:55.618'),(23,13,17,'2026-05-31 00:27:55.618'),(24,13,12,'2026-05-31 00:27:55.618'),(25,14,20,'2026-05-31 00:27:55.618'),(26,14,17,'2026-05-31 00:27:55.618'),(27,14,12,'2026-05-31 00:27:55.618'),(28,15,20,'2026-05-31 00:27:55.618'),(29,15,17,'2026-05-31 00:27:55.618'),(30,15,12,'2026-05-31 00:27:55.618'),(31,16,20,'2026-05-31 00:27:55.618'),(32,16,17,'2026-05-31 00:27:55.618'),(33,16,21,'2026-05-31 00:27:55.618'),(34,17,20,'2026-05-31 00:27:55.618'),(35,17,17,'2026-05-31 00:27:55.618'),(36,17,12,'2026-05-31 00:27:55.618');
/*!40000 ALTER TABLE `DynamicPostLike` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Favorite`
--

DROP TABLE IF EXISTS `Favorite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Favorite` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `userId` int NOT NULL,
  `folderId` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Favorite_videoId_userId_key` (`videoId`,`userId`),
  KEY `Favorite_userId_createdAt_idx` (`userId`,`createdAt`),
  KEY `Favorite_folderId_createdAt_idx` (`folderId`,`createdAt`),
  CONSTRAINT `Favorite_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `FavoriteFolder` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Favorite_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `Favorite_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Favorite`
--

LOCK TABLES `Favorite` WRITE;
/*!40000 ALTER TABLE `Favorite` DISABLE KEYS */;
/*!40000 ALTER TABLE `Favorite` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FavoriteFolder`
--

DROP TABLE IF EXISTS `FavoriteFolder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FavoriteFolder` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `name` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `FavoriteFolder_userId_name_key` (`userId`,`name`),
  KEY `FavoriteFolder_userId_isDefault_idx` (`userId`,`isDefault`),
  CONSTRAINT `FavoriteFolder_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FavoriteFolder`
--

LOCK TABLES `FavoriteFolder` WRITE;
/*!40000 ALTER TABLE `FavoriteFolder` DISABLE KEYS */;
/*!40000 ALTER TABLE `FavoriteFolder` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FollowRelation`
--

DROP TABLE IF EXISTS `FollowRelation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FollowRelation` (
  `id` int NOT NULL AUTO_INCREMENT,
  `followerId` int NOT NULL,
  `followingId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `FollowRelation_followerId_followingId_key` (`followerId`,`followingId`),
  KEY `FollowRelation_followingId_createdAt_idx` (`followingId`,`createdAt`),
  CONSTRAINT `FollowRelation_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `FollowRelation_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FollowRelation`
--

LOCK TABLES `FollowRelation` WRITE;
/*!40000 ALTER TABLE `FollowRelation` DISABLE KEYS */;
INSERT INTO `FollowRelation` VALUES (13,20,17,'2026-05-31 01:27:52.883'),(14,20,12,'2026-05-31 01:27:52.883'),(15,20,23,'2026-05-31 01:27:52.883'),(16,20,22,'2026-05-31 01:27:52.883'),(17,20,19,'2026-05-31 01:27:52.883'),(18,20,14,'2026-05-31 01:27:52.883'),(19,20,11,'2026-05-31 01:27:52.883'),(20,20,25,'2026-05-31 01:27:52.883'),(21,20,15,'2026-05-31 01:27:52.883'),(22,20,13,'2026-05-31 01:27:52.883'),(23,20,16,'2026-05-31 01:27:52.883'),(24,20,24,'2026-05-31 01:27:52.883'),(25,20,18,'2026-05-31 01:27:52.883'),(26,17,23,'2026-05-31 01:27:52.883'),(27,12,17,'2026-05-31 01:27:52.883'),(28,22,19,'2026-05-31 01:27:52.883'),(29,19,22,'2026-05-31 01:27:52.883'),(30,25,15,'2026-05-31 01:27:52.883'),(31,16,13,'2026-05-31 01:27:52.883'),(32,18,11,'2026-05-31 01:27:52.883');
/*!40000 ALTER TABLE `FollowRelation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Notification`
--

DROP TABLE IF EXISTS `Notification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Notification` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipientId` int NOT NULL,
  `actorId` int DEFAULT NULL,
  `type` enum('COMMENT','REPLY','FOLLOW','SYSTEM','LIKE','FAVORITE','REPORT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relatedType` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `relatedId` int DEFAULT NULL,
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Notification_recipientId_isRead_createdAt_idx` (`recipientId`,`isRead`,`createdAt`),
  KEY `Notification_actorId_fkey` (`actorId`),
  CONSTRAINT `Notification_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `Notification_recipientId_fkey` FOREIGN KEY (`recipientId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Notification`
--

LOCK TABLES `Notification` WRITE;
/*!40000 ALTER TABLE `Notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `Notification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ReportRecord`
--

DROP TABLE IF EXISTS `ReportRecord`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ReportRecord` (
  `id` int NOT NULL AUTO_INCREMENT,
  `reporterId` int NOT NULL,
  `handlerId` int DEFAULT NULL,
  `targetType` enum('VIDEO','COMMENT','VIDEO_DANMAKU') COLLATE utf8mb4_unicode_ci NOT NULL,
  `videoId` int DEFAULT NULL,
  `commentId` int DEFAULT NULL,
  `danmakuId` int DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PENDING','PROCESSED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `handleNote` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `handledAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ReportRecord_status_createdAt_idx` (`status`,`createdAt`),
  KEY `ReportRecord_targetType_createdAt_idx` (`targetType`,`createdAt`),
  KEY `ReportRecord_reporterId_fkey` (`reporterId`),
  KEY `ReportRecord_handlerId_fkey` (`handlerId`),
  KEY `ReportRecord_videoId_fkey` (`videoId`),
  KEY `ReportRecord_commentId_fkey` (`commentId`),
  KEY `ReportRecord_danmakuId_fkey` (`danmakuId`),
  CONSTRAINT `ReportRecord_commentId_fkey` FOREIGN KEY (`commentId`) REFERENCES `Comment` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ReportRecord_danmakuId_fkey` FOREIGN KEY (`danmakuId`) REFERENCES `VideoDanmaku` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ReportRecord_handlerId_fkey` FOREIGN KEY (`handlerId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ReportRecord_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ReportRecord_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ReportRecord`
--

LOCK TABLES `ReportRecord` WRITE;
/*!40000 ALTER TABLE `ReportRecord` DISABLE KEYS */;
/*!40000 ALTER TABLE `ReportRecord` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `StreakMilestoneClaim`
--

DROP TABLE IF EXISTS `StreakMilestoneClaim`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StreakMilestoneClaim` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `milestone` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `StreakMilestoneClaim_userId_milestone_key` (`userId`,`milestone`),
  KEY `StreakMilestoneClaim_userId_idx` (`userId`),
  CONSTRAINT `StreakMilestoneClaim_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `StreakMilestoneClaim`
--

LOCK TABLES `StreakMilestoneClaim` WRITE;
/*!40000 ALTER TABLE `StreakMilestoneClaim` DISABLE KEYS */;
/*!40000 ALTER TABLE `StreakMilestoneClaim` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('USER','ADMIN') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nickname` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatarUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coinBalance` int NOT NULL DEFAULT '0',
  `messagePrivacy` enum('ALLOW_ALL','FOLLOWING_ONLY','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ALLOW_ALL',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_username_key` (`username`),
  UNIQUE KEY `User_email_key` (`email`),
  UNIQUE KEY `User_phone_key` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User`
--

LOCK TABLES `User` WRITE;
/*!40000 ALTER TABLE `User` DISABLE KEYS */;
INSERT INTO `User` VALUES (10,'demo_admin','admin@guanlan.dev','Admin123456!','ADMIN','平台管理员','https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=320&q=80','负责平台治理、审核演示和全站巡检。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:27:52.764'),(11,'hetongxue_seed','hetongxue@guanlan.dev','creator123','USER','老师好我叫何同学','https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=320&q=80','公开数码创作者风格种子账号，关注产品体验与视频叙事。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.343'),(12,'study_xiaoyu','xiaoyu@guanlan.dev','creator123','USER','小鱼自习室','https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=320&q=80','专注课程复盘、笔记整理和考试经验。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:27:52.764'),(13,'laofangqie_seed','laofangqie@guanlan.dev','creator123','USER','老番茄','https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=320&q=80','公开游戏创作者风格种子账号，偏游戏实况与剧情向剪辑。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.510'),(14,'peng_zhihui_seed','pengzhihui@guanlan.dev','creator123','USER','稚晖君','https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=320&q=80','公开科技创作者风格种子账号，关注硬件、机器人和 AI Agent。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.291'),(15,'dr_can_seed','drcan@guanlan.dev','creator123','USER','DR_CAN','https://images.unsplash.com/photo-1507120410856-1f35574c3b45?auto=format&fit=crop&w=320&q=80','公开课程创作者风格种子账号，关注控制、建模和论文写作。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.458'),(16,'chinaboy_seed','chinaboy@guanlan.dev','creator123','USER','中国BOY超级大猩猩','https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=320&q=80','公开游戏创作者风格种子账号，关注游戏试玩、直播和整活实况。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.565'),(17,'tech_ming','ming@guanlan.dev','creator123','USER','阿明实验室','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=320&q=80','主做后端、工程化和效率工具分享。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:27:52.764'),(18,'mediastorm_seed','mediastorm@guanlan.dev','creator123','USER','影视飓风','https://images.unsplash.com/photo-1492447166138-50c3889fccb1?auto=format&fit=crop&w=320&q=80','公开影视创作者风格种子账号，关注影像器材、拍摄流程和行业观察。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.668'),(19,'atguigu_seed','atguigu@guanlan.dev','creator123','USER','尚硅谷','https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=320&q=80','公开技术创作者风格种子账号，偏后端、工程化和面试复盘。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.220'),(20,'demo_user','user@guanlan.dev','User123456!','USER','演示用户','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80','分享科技与学习内容，也会偶尔记录校园生活。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:27:52.764'),(21,'game_omega','omega@guanlan.dev','creator123','USER','欧米伽打机台','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=320&q=80','游戏实况、整活剪辑和设备评测。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:27:52.764'),(22,'itheima_seed','itheima@guanlan.dev','creator123','USER','黑马程序员','https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=320&q=80','公开技术创作者风格种子账号，覆盖 Java、前端、AI 工具链课程。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.129'),(23,'life_yiyi','yiyi@guanlan.dev','creator123','USER','依依日常','https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=320&q=80','记录校园、旅行和演出现场的轻松瞬间。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:27:52.764'),(24,'xiaochao_seed','xiaochao@guanlan.dev','creator123','USER','小潮院长','https://images.unsplash.com/photo-1507591064344-4c6ce005b128?auto=format&fit=crop&w=320&q=80','公开娱乐创作者风格种子账号，偏多人企划、轻剧情和游戏内容。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.617'),(25,'math_model_bro_seed','mathmodel@guanlan.dev','creator123','USER','数学建模老哥','https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=320&q=80','公开学习创作者风格种子账号，整理建模、论文和竞赛经验。',NULL,0,'ALLOW_ALL','2026-05-31 01:27:52.764','2026-05-31 01:28:45.403'),(26,'grok_bot','grok_bot@local.invalid','GrokBot@123456','USER','Grok 机器人','/assets/grok-bot-avatar.svg',NULL,NULL,0,'ALLOW_ALL','2026-05-31 01:27:53.819','2026-05-31 02:03:38.548');
/*!40000 ALTER TABLE `User` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserCategoryPreference`
--

DROP TABLE IF EXISTS `UserCategoryPreference`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserCategoryPreference` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `categoryId` int NOT NULL,
  `score` double NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserCategoryPreference_userId_categoryId_key` (`userId`,`categoryId`),
  KEY `UserCategoryPreference_userId_score_idx` (`userId`,`score`),
  CONSTRAINT `UserCategoryPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserCategoryPreference`
--

LOCK TABLES `UserCategoryPreference` WRITE;
/*!40000 ALTER TABLE `UserCategoryPreference` DISABLE KEYS */;
INSERT INTO `UserCategoryPreference` VALUES (1130,20,4,8,'2026-05-31 01:29:16.124','2026-05-31 01:29:16.124'),(1131,20,1,4,'2026-05-31 01:29:16.124','2026-05-31 01:29:16.124'),(1132,20,5,4,'2026-05-31 01:29:16.124','2026-05-31 01:29:16.124');
/*!40000 ALTER TABLE `UserCategoryPreference` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserCreatorPreference`
--

DROP TABLE IF EXISTS `UserCreatorPreference`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserCreatorPreference` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `creatorId` int NOT NULL,
  `score` double NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserCreatorPreference_userId_creatorId_key` (`userId`,`creatorId`),
  KEY `UserCreatorPreference_userId_score_idx` (`userId`,`score`),
  KEY `UserCreatorPreference_creatorId_fkey` (`creatorId`),
  CONSTRAINT `UserCreatorPreference_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `UserCreatorPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=886 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserCreatorPreference`
--

LOCK TABLES `UserCreatorPreference` WRITE;
/*!40000 ALTER TABLE `UserCreatorPreference` DISABLE KEYS */;
INSERT INTO `UserCreatorPreference` VALUES (873,20,23,9,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(874,20,11,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(875,20,12,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(876,20,13,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(877,20,14,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(878,20,15,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(879,20,16,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(880,20,17,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(881,20,18,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(882,20,19,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(883,20,22,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(884,20,24,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164'),(885,20,25,6,'2026-05-31 01:29:16.164','2026-05-31 01:29:16.164');
/*!40000 ALTER TABLE `UserCreatorPreference` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserProfileSummary`
--

DROP TABLE IF EXISTS `UserProfileSummary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserProfileSummary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `activityScore` int NOT NULL DEFAULT '0',
  `activityLevel` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `behaviorSignalCount` int NOT NULL DEFAULT '0',
  `viewerScore` int NOT NULL DEFAULT '0',
  `creatorScore` int NOT NULL DEFAULT '0',
  `creatorViewerTendency` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isColdStart` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserProfileSummary_userId_key` (`userId`),
  CONSTRAINT `UserProfileSummary_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserProfileSummary`
--

LOCK TABLES `UserProfileSummary` WRITE;
/*!40000 ALTER TABLE `UserProfileSummary` DISABLE KEYS */;
INSERT INTO `UserProfileSummary` VALUES (16,20,50,'HIGH',17,41,15,'VIEWER',0,'2026-05-31 01:29:16.204','2026-05-31 01:29:16.204');
/*!40000 ALTER TABLE `UserProfileSummary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserVideoWatch`
--

DROP TABLE IF EXISTS `UserVideoWatch`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserVideoWatch` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `videoId` int NOT NULL,
  `playCount` int NOT NULL DEFAULT '0',
  `totalWatchDurationSeconds` int NOT NULL DEFAULT '0',
  `lastWatchDurationSeconds` int NOT NULL DEFAULT '0',
  `videoDurationSeconds` int NOT NULL DEFAULT '0',
  `maxWatchRatio` double NOT NULL DEFAULT '0',
  `lastWatchRatio` double NOT NULL DEFAULT '0',
  `completedCount` int NOT NULL DEFAULT '0',
  `lastWatchedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UserVideoWatch_userId_videoId_key` (`userId`,`videoId`),
  KEY `UserVideoWatch_userId_lastWatchedAt_idx` (`userId`,`lastWatchedAt`),
  KEY `UserVideoWatch_videoId_lastWatchedAt_idx` (`videoId`,`lastWatchedAt`),
  CONSTRAINT `UserVideoWatch_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `UserVideoWatch_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserVideoWatch`
--

LOCK TABLES `UserVideoWatch` WRITE;
/*!40000 ALTER TABLE `UserVideoWatch` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserVideoWatch` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Video`
--

DROP TABLE IF EXISTS `Video`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Video` (
  `id` int NOT NULL AUTO_INCREMENT,
  `creatorId` int NOT NULL,
  `title` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'entertainment',
  `coverUrl` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `playUrl` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `uploadToken` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rejectReason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submittedAt` datetime(3) DEFAULT NULL,
  `publishedAt` datetime(3) DEFAULT NULL,
  `playCount` int NOT NULL DEFAULT '0',
  `likeCount` int NOT NULL DEFAULT '0',
  `favoriteCount` int NOT NULL DEFAULT '0',
  `commentCount` int NOT NULL DEFAULT '0',
  `coinCount` int NOT NULL DEFAULT '0',
  `durationSeconds` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Video_creatorId_status_idx` (`creatorId`,`status`),
  CONSTRAINT `Video_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Video`
--

LOCK TABLES `Video` WRITE;
/*!40000 ALTER TABLE `Video` DISABLE KEYS */;
INSERT INTO `Video` VALUES (46,20,'观澜视频平台演示视频','用于展示首页推荐、搜索筛选、详情页互动和上传链路的综合演示视频。','tech','https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-demo-platform-intro',NULL,NULL,'2026-05-30 15:27:52.928',686,18,7,3,0,600,'2026-05-31 01:27:52.930','2026-05-31 01:27:52.930'),(47,17,'NestJS + Prisma 从零搭一个视频平台后端','用最小可运行项目讲清楚模块划分、数据建模、接口设计和开发流程。','tech','https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-tech-backend-starter',NULL,NULL,'2026-05-30 07:27:52.928',1178,26,13,8,0,600,'2026-05-31 01:27:53.048','2026-05-31 01:27:53.048'),(48,17,'FFmpeg 自动抽帧封面和转码流程实战','演示如何在上传后自动生成封面、转码视频并回写数据库状态。','tech','https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-tech-ffmpeg-pipeline',NULL,NULL,'2026-05-29 17:27:52.928',650,14,9,4,0,600,'2026-05-31 01:27:53.131','2026-05-31 01:27:53.131'),(49,12,'数据库设计入门：从需求到表结构','用课程项目举例，讲解实体拆分、关系设计和常见建模误区。','study','https://images.unsplash.com/photo-1513258496099-48168024aec0?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-study-db-design',NULL,NULL,'2026-05-30 05:27:52.928',1036,22,16,6,0,600,'2026-05-31 01:27:53.206','2026-05-31 01:27:53.206'),(50,12,'软件工程课程答辩怎么准备','从演示结构、时间控制到答辩问答，帮你把课程汇报讲清楚。','study','https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-study-defense-guide',NULL,NULL,'2026-05-30 19:27:52.928',848,19,11,5,0,600,'2026-05-31 01:27:53.284','2026-05-31 01:27:53.284'),(51,21,'三分钟看懂这周最上头的独立游戏','节奏快、信息密、带一点整活的游戏速报，适合碎片时间观看。','game','https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-game-weekly-fastlook',NULL,NULL,'2026-05-30 13:27:52.928',1458,31,18,10,0,600,'2026-05-31 01:27:53.362','2026-05-31 01:27:53.362'),(52,21,'手柄、键盘还是摇杆？格斗游戏设备体验分享','聊聊不同输入设备的手感差异、延迟体验和适合人群。','game','https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-game-controller-review',NULL,NULL,'2026-05-29 05:27:52.928',648,16,8,3,0,600,'2026-05-31 01:27:53.442','2026-05-31 01:27:53.442'),(53,23,'校园音乐节 Vlog：从彩排到压轴曲','记录社团演出当天的后台准备、现场观众和最后的返场时刻。','entertainment','https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-life-campus-festival',NULL,NULL,'2026-05-30 16:27:52.928',1418,28,15,12,0,600,'2026-05-31 01:27:53.539','2026-05-31 01:27:53.539'),(54,23,'宿舍改造小记：200 块做出更舒服的桌面','不走极客风，分享更适合学生党预算的桌面布置思路。','entertainment','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-life-dorm-makeover',NULL,NULL,'2026-05-29 23:27:52.928',890,17,12,7,0,600,'2026-05-31 01:27:53.645','2026-05-31 01:27:53.645'),(55,10,'平台审核后台功能演示','展示视频审核、文本审核、举报处理和仪表盘等后台核心能力。','tech','https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-admin-review-dashboard',NULL,NULL,'2026-05-29 19:27:52.928',450,11,6,2,0,600,'2026-05-31 01:27:53.723','2026-05-31 01:27:53.723'),(56,20,'直播回放：第一次试播踩坑总结','整理了推流、封面、播放地址和录播生成过程中遇到的几个坑。','live','https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-live-replay-summary',NULL,NULL,'2026-05-28 21:27:52.928',330,9,4,1,0,600,'2026-05-31 01:27:53.802','2026-05-31 01:27:53.802'),(57,22,'Java 后端项目如何接入 AI Agent 工作流','从接口编排、上下文缓存到任务队列，复盘一次课程项目里的智能体落地过程。','tech','https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-itheima-java-agent',NULL,NULL,'2026-05-30 21:27:52.928',86400,1820,940,226,0,1260,'2026-05-31 01:27:53.887','2026-05-31 01:28:46.197'),(58,19,'Spring Boot 面试题回炉：缓存、事务和消息队列','把最近高频后端面试点串成一条排查链，适合项目答辩前快速过一遍。','tech','https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-atguigu-spring-interview',NULL,NULL,'2026-05-30 10:27:52.928',52200,1210,760,148,0,980,'2026-05-31 01:27:53.968','2026-05-31 01:28:46.337'),(59,14,'给桌面机器人接一个多模态 AI Agent','把语音、视觉和动作规划串起来，聊聊硬件项目里智能体最容易翻车的地方。','tech','https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-pengzhihui-robot-agent',NULL,NULL,'2026-05-30 03:27:52.928',138000,4200,2300,520,0,1104,'2026-05-31 01:27:54.052','2026-05-31 01:28:46.432'),(60,11,'如果把 AI 助手做成一件日用品，会发生什么','从使用场景、交互节奏到产品边界，记录一次偏叙事向的数码体验实验。','life','https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-hetongxue-ai-daily-product',NULL,NULL,'2026-05-29 21:27:52.928',112000,3600,1500,410,0,860,'2026-05-31 01:27:54.136','2026-05-31 01:28:46.537'),(61,25,'数学建模赛前 72 小时：选题、分工和论文模板','把动态规划、优化模型和写作节奏放到同一张清单里，适合队伍临赛复盘。','study','https://images.unsplash.com/photo-1509228627152-72ae9ae6848d?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-math-model-72h',NULL,NULL,'2026-05-30 18:27:52.928',43600,980,1350,166,0,1430,'2026-05-31 01:27:54.216','2026-05-31 01:28:46.649'),(62,15,'控制与建模论文写作：怎么把仿真结果讲清楚','从模型假设、实验图表到摘要措辞，整理一套建模论文的表达框架。','study','https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-drcan-model-paper',NULL,NULL,'2026-05-29 13:27:52.928',31800,720,910,92,0,1190,'2026-05-31 01:27:54.297','2026-05-31 01:28:46.743'),(63,13,'本周独立游戏实况：一个晚上打完还想二刷','偏剧情向的游戏实况剪辑，保留惊喜点，也聊聊关卡和叙事节奏。','game','https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-laofangqie-indie-game',NULL,NULL,'2026-05-30 14:27:52.928',90500,2600,1180,380,0,1540,'2026-05-31 01:27:54.375','2026-05-31 01:28:46.837'),(64,16,'直播切片：新游戏第一小时到底有多上头','把直播里最密集的反应、弹幕和翻车瞬间剪成一条游戏实况。','game','https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-chinaboy-first-hour',NULL,NULL,'2026-05-30 07:27:52.928',75600,1980,740,315,0,720,'2026-05-31 01:27:54.454','2026-05-31 01:28:46.932'),(65,24,'多人企划实况：规则一变，场面就控制不住了','游戏和轻剧情混剪，主打节目效果、反转和最后一分钟的名场面。','entertainment','https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-xiaochao-party-game',NULL,NULL,'2026-05-30 01:27:52.928',68800,2100,860,280,0,980,'2026-05-31 01:27:54.530','2026-05-31 01:28:47.025'),(66,18,'拍一条图文动态前，我们会怎么做分镜和调色','从器材选择、现场布光到后期节点，拆一条影视图文内容的制作流程。','film','https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PUBLISHED','seed-mediastorm-image-workflow',NULL,NULL,'2026-05-30 05:27:52.928',48200,1360,1020,132,0,1040,'2026-05-31 01:27:54.607','2026-05-31 01:28:47.120'),(67,20,'待审核：校园创作者功能预告','准备提交审核的视频草稿，介绍即将上线的创作者成长体系。','tech','https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','PENDING_REVIEW','seed-pending-creator-preview',NULL,'2026-05-30 22:27:52.928',NULL,0,0,0,0,0,600,'2026-05-31 01:27:54.685','2026-05-31 01:27:54.685'),(68,21,'被打回的版本：标题和封面还要再改','这是一个被驳回的示例稿件，用于展示创作者后台中的修改重投流程。','game','https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','REJECTED','seed-rejected-video-case','封面和标题表达不清晰，建议重新整理后提交。','2026-05-30 09:27:52.928',NULL,0,0,0,0,0,600,'2026-05-31 01:27:54.768','2026-05-31 01:27:54.768'),(69,12,'草稿：下周复习计划安排','还在整理中的学习规划视频草稿，尚未投稿。','study','https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80','https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','DRAFT','seed-draft-study-plan',NULL,NULL,NULL,0,0,0,0,0,600,'2026-05-31 01:27:54.847','2026-05-31 01:27:54.847');
/*!40000 ALTER TABLE `Video` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoAiChatMessage`
--

DROP TABLE IF EXISTS `VideoAiChatMessage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoAiChatMessage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sessionId` int NOT NULL,
  `role` enum('USER','ASSISTANT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `model` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `frameCount` int DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `VideoAiChatMessage_sessionId_createdAt_idx` (`sessionId`,`createdAt`),
  CONSTRAINT `VideoAiChatMessage_sessionId_fkey` FOREIGN KEY (`sessionId`) REFERENCES `VideoAiChatSession` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoAiChatMessage`
--

LOCK TABLES `VideoAiChatMessage` WRITE;
/*!40000 ALTER TABLE `VideoAiChatMessage` DISABLE KEYS */;
/*!40000 ALTER TABLE `VideoAiChatMessage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoAiChatSession`
--

DROP TABLE IF EXISTS `VideoAiChatSession`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoAiChatSession` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `videoId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoAiChatSession_userId_videoId_key` (`userId`,`videoId`),
  KEY `VideoAiChatSession_videoId_updatedAt_idx` (`videoId`,`updatedAt`),
  CONSTRAINT `VideoAiChatSession_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `VideoAiChatSession_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoAiChatSession`
--

LOCK TABLES `VideoAiChatSession` WRITE;
/*!40000 ALTER TABLE `VideoAiChatSession` DISABLE KEYS */;
/*!40000 ALTER TABLE `VideoAiChatSession` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoAiSummary`
--

DROP TABLE IF EXISTS `VideoAiSummary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoAiSummary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `summary` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `frameCount` int NOT NULL DEFAULT '0',
  `model` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoAiSummary_videoId_key` (`videoId`),
  CONSTRAINT `VideoAiSummary_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoAiSummary`
--

LOCK TABLES `VideoAiSummary` WRITE;
/*!40000 ALTER TABLE `VideoAiSummary` DISABLE KEYS */;
/*!40000 ALTER TABLE `VideoAiSummary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoAsset`
--

DROP TABLE IF EXISTS `VideoAsset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoAsset` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int DEFAULT NULL,
  `assetType` enum('ORIGINAL','COVER','TRANSCODED','RECORDING') COLLATE utf8mb4_unicode_ci NOT NULL,
  `objectKey` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `bucket` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mimeType` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `originalName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fileSize` int NOT NULL DEFAULT '0',
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoAsset_objectKey_key` (`objectKey`),
  KEY `VideoAsset_videoId_assetType_idx` (`videoId`,`assetType`),
  CONSTRAINT `VideoAsset_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoAsset`
--

LOCK TABLES `VideoAsset` WRITE;
/*!40000 ALTER TABLE `VideoAsset` DISABLE KEYS */;
/*!40000 ALTER TABLE `VideoAsset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoCategory`
--

DROP TABLE IF EXISTS `VideoCategory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoCategory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoCategory_videoId_code_key` (`videoId`,`code`),
  KEY `VideoCategory_code_idx` (`code`),
  CONSTRAINT `VideoCategory_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=165 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoCategory`
--

LOCK TABLES `VideoCategory` WRITE;
/*!40000 ALTER TABLE `VideoCategory` DISABLE KEYS */;
INSERT INTO `VideoCategory` VALUES (93,46,'tech','2026-05-31 01:27:53.001'),(94,46,'animation','2026-05-31 01:27:53.001'),(95,47,'tech','2026-05-31 01:27:53.094'),(96,47,'animation','2026-05-31 01:27:53.094'),(97,48,'tech','2026-05-31 01:27:53.173'),(98,48,'animation','2026-05-31 01:27:53.173'),(99,49,'study','2026-05-31 01:27:53.251'),(100,49,'tech','2026-05-31 01:27:53.251'),(101,50,'study','2026-05-31 01:27:53.329'),(102,50,'tech','2026-05-31 01:27:53.329'),(103,51,'game','2026-05-31 01:27:53.409'),(104,51,'comedy','2026-05-31 01:27:53.409'),(105,52,'game','2026-05-31 01:27:53.497'),(106,52,'comedy','2026-05-31 01:27:53.497'),(107,53,'entertainment','2026-05-31 01:27:53.582'),(108,53,'music','2026-05-31 01:27:53.582'),(109,53,'life','2026-05-31 01:27:53.582'),(110,54,'entertainment','2026-05-31 01:27:53.690'),(111,54,'music','2026-05-31 01:27:53.690'),(112,54,'life','2026-05-31 01:27:53.690'),(113,55,'tech','2026-05-31 01:27:53.768'),(114,55,'animation','2026-05-31 01:27:53.768'),(115,56,'live','2026-05-31 01:27:53.846'),(116,57,'tech','2026-05-31 01:27:53.933'),(117,57,'animation','2026-05-31 01:27:53.933'),(118,58,'tech','2026-05-31 01:27:54.018'),(119,58,'animation','2026-05-31 01:27:54.018'),(120,59,'tech','2026-05-31 01:27:54.096'),(121,59,'animation','2026-05-31 01:27:54.096'),(122,60,'life','2026-05-31 01:27:54.182'),(123,60,'travel','2026-05-31 01:27:54.182'),(124,60,'food','2026-05-31 01:27:54.182'),(125,61,'study','2026-05-31 01:27:54.263'),(126,61,'tech','2026-05-31 01:27:54.263'),(127,62,'study','2026-05-31 01:27:54.341'),(128,62,'tech','2026-05-31 01:27:54.341'),(129,63,'game','2026-05-31 01:27:54.420'),(130,63,'comedy','2026-05-31 01:27:54.420'),(131,64,'game','2026-05-31 01:27:54.497'),(132,64,'comedy','2026-05-31 01:27:54.497'),(133,65,'entertainment','2026-05-31 01:27:54.574'),(134,65,'music','2026-05-31 01:27:54.574'),(135,65,'life','2026-05-31 01:27:54.574'),(136,66,'film','2026-05-31 01:27:54.653'),(137,67,'tech','2026-05-31 01:27:54.734'),(138,67,'animation','2026-05-31 01:27:54.734'),(139,68,'game','2026-05-31 01:27:54.812'),(140,68,'comedy','2026-05-31 01:27:54.812'),(141,69,'study','2026-05-31 01:27:54.893'),(142,69,'tech','2026-05-31 01:27:54.893'),(163,66,'entertainment','2026-05-31 01:28:47.173');
/*!40000 ALTER TABLE `VideoCategory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoCoinContribution`
--

DROP TABLE IF EXISTS `VideoCoinContribution`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoCoinContribution` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `userId` int NOT NULL,
  `amount` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoCoinContribution_videoId_userId_key` (`videoId`,`userId`),
  KEY `VideoCoinContribution_userId_createdAt_idx` (`userId`,`createdAt`),
  CONSTRAINT `VideoCoinContribution_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `VideoCoinContribution_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoCoinContribution`
--

LOCK TABLES `VideoCoinContribution` WRITE;
/*!40000 ALTER TABLE `VideoCoinContribution` DISABLE KEYS */;
/*!40000 ALTER TABLE `VideoCoinContribution` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoDanmaku`
--

DROP TABLE IF EXISTS `VideoDanmaku`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoDanmaku` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `userId` int NOT NULL,
  `content` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#FFFFFF',
  `timeOffsetMs` int NOT NULL,
  `status` enum('NORMAL','HIDDEN','DELETED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NORMAL',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `VideoDanmaku_videoId_timeOffsetMs_createdAt_idx` (`videoId`,`timeOffsetMs`,`createdAt`),
  KEY `VideoDanmaku_userId_fkey` (`userId`),
  CONSTRAINT `VideoDanmaku_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `VideoDanmaku_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoDanmaku`
--

LOCK TABLES `VideoDanmaku` WRITE;
/*!40000 ALTER TABLE `VideoDanmaku` DISABLE KEYS */;
/*!40000 ALTER TABLE `VideoDanmaku` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoLike`
--

DROP TABLE IF EXISTS `VideoLike`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoLike` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `userId` int NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `VideoLike_videoId_userId_key` (`videoId`,`userId`),
  KEY `VideoLike_userId_createdAt_idx` (`userId`,`createdAt`),
  CONSTRAINT `VideoLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `VideoLike_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoLike`
--

LOCK TABLES `VideoLike` WRITE;
/*!40000 ALTER TABLE `VideoLike` DISABLE KEYS */;
/*!40000 ALTER TABLE `VideoLike` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `VideoReview`
--

DROP TABLE IF EXISTS `VideoReview`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoReview` (
  `id` int NOT NULL AUTO_INCREMENT,
  `videoId` int NOT NULL,
  `reviewerId` int DEFAULT NULL,
  `status` enum('PENDING','APPROVED','REJECTED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewedAt` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `VideoReview_status_createdAt_idx` (`status`,`createdAt`),
  KEY `VideoReview_videoId_fkey` (`videoId`),
  KEY `VideoReview_reviewerId_fkey` (`reviewerId`),
  CONSTRAINT `VideoReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `VideoReview_videoId_fkey` FOREIGN KEY (`videoId`) REFERENCES `Video` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `VideoReview`
--

LOCK TABLES `VideoReview` WRITE;
/*!40000 ALTER TABLE `VideoReview` DISABLE KEYS */;
INSERT INTO `VideoReview` VALUES (34,67,NULL,'PENDING',NULL,'2026-05-31 01:27:54.926',NULL),(35,68,10,'REJECTED','封面和标题表达不清晰，建议重新整理后提交。','2026-05-31 01:27:54.926','2026-05-30 11:27:54.925');
/*!40000 ALTER TABLE `VideoReview` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'video_player'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-31 10:04:13
