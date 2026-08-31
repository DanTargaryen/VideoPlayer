# UC01–UC05 三层模型源文件

> Task：`DOC-01`；适用范围：UC01–UC05。UC06 的系统级、组件级和对象级状态模型见 [`10-uc06-state-diagrams.md`](10-uc06-state-diagrams.md)。
>
> 本文件使用 Mermaid 保存可版本化的模型源。模型描述的是已合并的 Gateway + 四服务边界；最终行为由 REG-01 的单体/Gateway 12/12 回归和对应 contract 测试验证。

## 1. UC01 账户访问与资料维护

### SYS-SEQ01 系统级交互

```mermaid
sequenceDiagram
    actor User as 用户
    participant Web as Vue Web
    participant Gateway as API Gateway
    participant Identity as identity-community
    participant DB as Identity MySQL

    User->>Web: 注册/登录/修改资料/关注
    Web->>Gateway: Bearer Token + requestId
    Gateway->>Identity: 转发公开请求
    Identity->>DB: 事务写入 User/Profile/Follow
    DB-->>Identity: 持久化结果
    Identity-->>Gateway: 统一响应 + requestId
    Gateway-->>Web: 200/201 或可解释 4xx
    Web-->>User: 更新会话与页面状态
```

### COMP-SEQ01 组件级职责

```mermaid
flowchart LR
    UI[登录/资料/关注页面] --> GW[Gateway 路由与认证]
    GW --> AUTH[Auth Controller]
    GW --> PROFILE[Profile Controller]
    GW --> SOCIAL[Follow / Dynamic Controller]
    AUTH --> SESSION[Session Nonce 与 Token]
    PROFILE --> REPO[Identity Prisma Repository]
    SOCIAL --> REPO
    SESSION --> REPO
    REPO --> DB[(Identity schema)]
    AUTH -.失败回滚.-> MONO[Monolith fallback]
```

### OBJ-SEQ01 对象级模型

```mermaid
classDiagram
    class User {
      +String id
      +String username
      +String role
      +String sessionNonce
    }
    class Profile {
      +String userId
      +String nickname
      +String avatar
    }
    class Follow {
      +String followerId
      +String followingId
    }
    class DynamicPost {
      +String authorId
      +String content
    }
    class Notification {
      +String receiverId
      +String requestId
      +String type
    }
    User "1" *-- "0..1" Profile
    User "1" --> "0..*" Follow : follower/following
    User "1" --> "0..*" DynamicPost : authors
    User "1" --> "0..*" Notification : receives
```

## 2. UC02 视频发现、播放与观看记录

### SYS-SEQ02 系统级交互

```mermaid
sequenceDiagram
    actor Viewer as 观众
    participant Web as Vue Web
    participant Gateway as API Gateway
    participant Content as content-media
    participant Identity as identity-community
    participant MinIO as MinIO
    participant DB as Content MySQL

    Viewer->>Web: 浏览推荐/搜索/视频详情
    Web->>Gateway: GET feed/search/videos
    Gateway->>Content: 已开放读能力
    Content->>DB: 查询视频、分类、计数与进度
    Content->>Identity: 批量查询作者摘要
    Content-->>Web: 视频投影与媒体 URL
    Web->>Gateway: Range 媒体请求
    Gateway->>Content: media proxy
    Content->>MinIO: Range GET
    MinIO-->>Viewer: 206/200 媒体流
    Viewer->>Gateway: 播放/观看进度 requestId
    Gateway->>Content: 可信用户上下文
    Content->>DB: 幂等写入 Play/WatchProgress
```

### COMP-SEQ02 组件级职责

```mermaid
flowchart LR
    HOME[首页/搜索/详情] --> GW[Gateway capability map]
    GW --> DISCOVERY[Recommend/Search Service]
    GW --> VIDEO[Video Query Service]
    GW --> MEDIA[Media Proxy]
    GW --> WATCH[Play/Progress Service]
    DISCOVERY --> REPO[Content Repository]
    VIDEO --> REPO
    WATCH --> RECEIPT[Write Receipt]
    RECEIPT --> REPO
    VIDEO --> SUMMARY[Identity Batch Summary]
    MEDIA --> OBJ[(MinIO objects)]
    REPO --> DB[(Content schema)]
```

### OBJ-SEQ02 对象级模型

```mermaid
classDiagram
    class Video {
      +String id
      +String creatorId
      +String status
      +Int playCount
    }
    class VideoAsset {
      +String objectKey
      +String mimeType
      +String videoId
    }
    class Category {
      +Int id
      +String name
    }
    class WatchProgress {
      +String userId
      +String videoId
      +Int position
      +Boolean completed
    }
    class PlayRecord {
      +String requestId
      +String userId
      +String videoId
    }
    Video "1" o-- "0..*" VideoAsset
    Video "0..*" -- "0..*" Category
    Video "1" --> "0..*" WatchProgress
    Video "1" --> "0..*" PlayRecord
```

## 3. UC03 投稿、审核、发布与重提

### SYS-SEQ03 系统级交互

```mermaid
sequenceDiagram
    actor Creator as 创作者
    actor Admin as 审核员
    participant Web as Vue Web/Admin
    participant Gateway as API Gateway
    participant Content as content-media
    participant Governance as governance-ai
    participant MinIO as MinIO

    Creator->>Web: 上传媒体并保存草稿
    Web->>Gateway: multipart + requestId
    Gateway->>Content: 可信 creator 上下文
    Content->>MinIO: 上传原始对象
    Content->>Content: ffprobe/Range/资产与稿件事务
    Creator->>Gateway: 提交审核
    Gateway->>Content: SUBMIT 状态转换
    Content->>Governance: service JWT + requestId
    Governance-->>Admin: 待审快照
    Admin->>Governance: 通过或驳回
    Governance->>Content: 应用审核决定
    Content-->>Creator: PUBLISHED 或 REJECTED
    Creator->>Content: 修改后重提/撤回
```

### COMP-SEQ03 组件级职责

```mermaid
flowchart LR
    CREATOR[创作中心] --> GW[Gateway 身份与路由]
    GW --> UPLOAD[Multipart Upload]
    GW --> SUBMIT[Submission Service]
    UPLOAD --> PROBE[ffprobe / MIME Guard]
    UPLOAD --> MINIO[(MinIO)]
    UPLOAD --> DB[(Content schema)]
    SUBMIT --> RECEIPT[ContentWriteReceipt]
    SUBMIT --> GOVCLIENT[Governance Client]
    GOVCLIENT --> REVIEW[Review Queue / Decision]
    REVIEW --> APPLY[Content Decision Endpoint]
    APPLY --> DB
    SUBMIT -.timeout/失败.-> RETRY[保留状态并可重试]
```

### OBJ-SEQ03 对象级模型

```mermaid
classDiagram
    class VideoAsset {
      +String uploaderId
      +String objectKey
      +String mimeType
      +String videoId
    }
    class Video {
      +String id
      +String creatorId
      +String status
      +String rejectReason
      +DateTime publishedAt
    }
    class VideoReview {
      +String contentVideoId
      +String status
      +String requestId
    }
    class ModerationDecision {
      +String action
      +String reason
      +DateTime decidedAt
    }
    class ContentWriteReceipt {
      +String requestId
      +String operation
      +String payloadHash
    }
    VideoAsset "0..*" --> "0..1" Video
    Video "1" --> "0..*" VideoReview
    VideoReview "1" --> "0..1" ModerationDecision
    Video "1" --> "0..*" ContentWriteReceipt
```

## 4. UC04 互动、通知与幂等

### SYS-SEQ04 系统级交互

```mermaid
sequenceDiagram
    actor Actor as 互动用户
    actor Creator as 内容作者
    participant Web as Vue Web
    participant Gateway as API Gateway
    participant Content as content-media
    participant Identity as identity-community
    participant DB as Content MySQL

    Actor->>Web: 评论/回复/点赞/收藏/弹幕
    Web->>Gateway: requestId + Bearer Token
    Gateway->>Content: gateway.user.forward JWT
    Content->>DB: 主体、计数、Receipt、Outbox 同事务
    DB-->>Content: COMMIT
    Content-->>Actor: 成功或 409 payload conflict
    Content->>Identity: Outbox 投递通知（有界重试）
    Identity-->>Creator: COMMENT/REPLY/LIKE/FAVORITE 通知
    Note over Content,Identity: 通知失败不回滚已提交的互动主体
```

### COMP-SEQ04 组件级职责

```mermaid
flowchart LR
    UI[互动控件] --> GW[Gateway trusted context]
    GW --> COMMENT[Comment Service]
    GW --> LIKE[Like Service]
    GW --> FAVORITE[Favorite Service]
    GW --> DANMAKU[Danmaku Service]
    COMMENT --> TX[Prisma Transaction]
    LIKE --> TX
    FAVORITE --> TX
    DANMAKU --> TX
    TX --> RECEIPT[ContentWriteReceipt]
    TX --> OUTBOX[NotificationOutbox]
    OUTBOX --> NOTIFY[Identity Notification API]
    OUTBOX -.timeout.-> RETRY[指数退避，最多 5 次]
```

### OBJ-SEQ04 对象级模型

```mermaid
classDiagram
    class Comment {
      +String id
      +String videoId
      +String userId
      +String parentId
      +String status
    }
    class VideoLike {
      +String videoId
      +String userId
    }
    class FavoriteItem {
      +String folderId
      +String videoId
    }
    class Danmaku {
      +String videoId
      +String userId
      +Int offsetMs
    }
    class ContentWriteReceipt {
      +String requestId
      +String payloadHash
    }
    class NotificationOutbox {
      +String requestId
      +String status
      +Int attempts
    }
    ContentWriteReceipt "1" --> "1" Comment : protects
    ContentWriteReceipt "1" --> "0..1" VideoLike : protects
    ContentWriteReceipt "1" --> "0..1" FavoriteItem : protects
    ContentWriteReceipt "1" --> "0..1" Danmaku : protects
    Comment "1" --> "0..1" NotificationOutbox
    VideoLike "1" --> "0..1" NotificationOutbox
    FavoriteItem "1" --> "0..1" NotificationOutbox
```

## 5. UC05 直播、录播与币账本

### SYS-SEQ05 系统级交互

```mermaid
sequenceDiagram
    actor Host as 主播
    actor Viewer as 观众
    participant Web as Vue Web
    participant Gateway as API Gateway
    participant Live as live-reward
    participant SRS as SRS
    participant Content as content-media
    participant DB as Live MySQL

    Host->>Gateway: 创建房间并开播
    Gateway->>Live: 可信身份 + requestId
    Live->>SRS: readiness/API probe
    Live->>DB: LiveRoom/LiveSession 持久化
    Viewer->>Gateway: 加入、消息、兼容帧、投币
    Gateway->>Live: SSE/HTTP 与账本请求
    Live->>DB: ViewerEvent/Message/CoinTransaction
    Host->>Gateway: 停播并登记录播
    Live->>Content: service JWT + REPLAY asset
    Content-->>Live: contentVideoId 或可重试失败
    Live->>DB: Session=ENDED 与 ReplayRegistration
```

### COMP-SEQ05 组件级职责

```mermaid
flowchart LR
    LIVEUI[直播中心/房间] --> GW[Gateway UC05 capability]
    GW --> ROOM[Room Service]
    GW --> SESSION[Session Service]
    GW --> MESSAGE[Message/SSE Service]
    GW --> VIEWER[Viewer/Frame Service]
    GW --> LEDGER[Coin Ledger]
    SESSION --> SRS[SRS Client]
    ROOM --> REPO[Live Prisma Store]
    SESSION --> REPO
    MESSAGE --> REPO
    VIEWER --> REPO
    LEDGER --> REPO
    SESSION --> REPLAY[Content Replay Client]
    REPLAY -.timeout/5xx.-> RETRY[FAILED_RETRYABLE]
    REPO --> DB[(Live schema)]
```

### OBJ-SEQ05 对象级模型

```mermaid
classDiagram
    class LiveRoom {
      +String id
      +String ownerId
      +String status
    }
    class LiveSession {
      +String id
      +String roomId
      +String status
      +String replayVideoId
    }
    class LiveMessage {
      +String sessionId
      +String senderId
      +String type
    }
    class ViewerEvent {
      +String sessionId
      +String viewerId
      +String action
    }
    class CoinAccount {
      +String userId
      +Int balance
    }
    class CoinTransaction {
      +String requestId
      +String fromUserId
      +String toUserId
      +Int amount
    }
    class ReplayRegistration {
      +String sessionId
      +String status
      +String contentVideoId
    }
    LiveRoom "1" --> "0..*" LiveSession
    LiveSession "1" --> "0..*" LiveMessage
    LiveSession "1" --> "0..*" ViewerEvent
    LiveSession "1" --> "0..1" ReplayRegistration
    CoinAccount "1" --> "0..*" CoinTransaction
```

## 6. 追溯与验证

| UC | 代码边界 | 自动验证 | 最终结果 |
| --- | --- | --- | --- |
| UC01 | Gateway + identity-community | identity contract、REG-01 UC01（单体/Gateway） | PASS / PASS |
| UC02 | Gateway + content-media + MinIO | content contract、REG-01 UC02（单体/Gateway） | PASS / PASS |
| UC03 | content-media + governance-ai | publishing/review contract、REG-01 UC03（单体/Gateway） | PASS / PASS |
| UC04 | content-media + identity-community | receipt/outbox/notification contract、REG-01 UC04（单体/Gateway） | PASS / PASS |
| UC05 | live-reward + content-media + SRS | live/replay/ledger contract、REG-01 UC05（单体/Gateway） | PASS / PASS |

详细 endpoint 清单、真实运行值和对应 PR 见 [`06-evidence-and-dod.md`](06-evidence-and-dod.md)、[`00-progress.md`](00-progress.md) 与 REG-01 JSON 输出。
