# API 文档 V1

## 1 文档说明

本文档定义观澜视频平台首版的核心接口，用于指导前后端联调与测试。首版接口采用 RESTful 风格，统一返回格式，鉴权方式使用 Bearer Token。

## 2 通用约定

### 2.1 请求前缀

- 基础前缀：`/api/v1`

### 2.2 统一返回格式

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 2.3 常用错误码

| 错误码 | 说明 |
| --- | --- |
| 0 | 成功 |
| 40001 | 参数错误 |
| 40101 | 未登录或 Token 无效 |
| 40301 | 无权限 |
| 40401 | 资源不存在 |
| 40901 | 状态冲突 |
| 50001 | 服务内部错误 |

### 2.4 分页参数

- `page`: 页码，从 1 开始
- `pageSize`: 每页条数

## 3 认证与用户模块

### 3.1 用户注册

**基本信息**

- 请求路径：`/auth/register`
- 请求方式：`POST`
- 接口描述：注册普通用户账号

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 用户名 |
| email | string | 是 | 邮箱 |
| password | string | 是 | 密码 |
| nickname | string | 否 | 昵称 |

**请求样例**

```json
{
  "username": "alice01",
  "email": "alice@example.com",
  "password": "123456Aa!",
  "nickname": "Alice"
}
```

### 3.2 用户登录

**基本信息**

- 请求路径：`/auth/login`
- 请求方式：`POST`
- 接口描述：使用用户名或邮箱登录

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| account | string | 是 | 用户名或邮箱 |
| password | string | 是 | 密码 |

**响应字段**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| token | string | 访问令牌 |
| userId | number | 用户 ID |
| role | string | 用户角色 |

### 3.3 获取当前用户信息

- 请求路径：`/auth/me`
- 请求方式：`GET`
- 接口描述：获取当前登录用户基础信息

### 3.4 更新个人资料

- 请求路径：`/users/profile`
- 请求方式：`PUT`
- 接口描述：更新昵称、头像、简介等信息

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| nickname | string | 否 | 昵称 |
| avatarUrl | string | 否 | 头像地址 |
| bio | string | 否 | 简介 |

### 3.5 获取用户主页

- 请求路径：`/users/:id/homepage`
- 请求方式：`GET`
- 接口描述：获取用户主页信息、作品列表和粉丝统计

## 4 首页分发与搜索模块

### 4.1 首页推荐流

- 请求路径：`/feeds/recommend`
- 请求方式：`GET`
- 接口描述：获取首页推荐视频列表

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |
| categoryCode | string | 否 | 可选分区过滤 |

### 4.2 分区内容列表

- 请求路径：`/feeds/categories/:code/videos`
- 请求方式：`GET`
- 接口描述：按分区获取视频列表

### 4.3 热门榜单

- 请求路径：`/feeds/hot`
- 请求方式：`GET`
- 接口描述：获取热门视频或热门直播榜单

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| targetType | string | 是 | `VIDEO` 或 `LIVE` |

### 4.4 全局搜索

- 请求路径：`/search/all`
- 请求方式：`GET`
- 接口描述：统一搜索入口，返回视频、直播、用户三类结果

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 是 | 关键词 |
| tab | string | 否 | `video/live/user` |
| sortBy | string | 否 | `hot/latest` |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

### 4.5 搜索热词

- 请求路径：`/search/hotwords`
- 请求方式：`GET`
- 接口描述：获取搜索热词列表

## 5 视频内容模块

### 5.1 上传视频文件

- 请求路径：`/videos/upload`
- 请求方式：`POST`
- 接口描述：上传视频原始文件
- 请求类型：`multipart/form-data`

**表单字段**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| file | file | 是 | 视频文件 |

### 5.2 创建或保存视频草稿

- 请求路径：`/videos`
- 请求方式：`POST`
- 接口描述：创建视频草稿并保存元数据

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| uploadToken | string | 是 | 上传返回的文件令牌 |
| title | string | 是 | 标题 |
| description | string | 否 | 简介 |
| categoryId | number | 是 | 分区 ID |
| tagIds | number[] | 否 | 标签列表 |
| coverUrl | string | 否 | 封面地址 |

### 5.3 获取我的视频列表

- 请求路径：`/creator/videos`
- 请求方式：`GET`
- 接口描述：用户查看自己所有视频及审核状态（路径保留兼容）

### 5.4 获取视频详情

- 请求路径：`/videos/:id`
- 请求方式：`GET`
- 接口描述：获取视频详情页信息

### 5.5 更新视频草稿

- 请求路径：`/videos/:id`
- 请求方式：`PUT`
- 接口描述：更新草稿或驳回后的视频信息

### 5.6 提交视频审核

- 请求路径：`/videos/:id/submit-review`
- 请求方式：`POST`
- 接口描述：将视频提交至审核队列

### 5.7 获取视频审核记录

- 请求路径：`/videos/:id/reviews`
- 请求方式：`GET`
- 接口描述：查看视频审核历史和驳回原因

## 6 互动模块

### 6.1 点赞视频

- 请求路径：`/videos/:id/like`
- 请求方式：`POST`
- 接口描述：对视频点赞

### 6.2 取消点赞视频

- 请求路径：`/videos/:id/like`
- 请求方式：`DELETE`
- 接口描述：取消点赞

### 6.3 收藏视频

- 请求路径：`/videos/:id/favorite`
- 请求方式：`POST`
- 接口描述：收藏视频

### 6.4 取消收藏视频

- 请求路径：`/videos/:id/favorite`
- 请求方式：`DELETE`
- 接口描述：取消收藏

### 6.5 获取评论列表

- 请求路径：`/videos/:id/comments`
- 请求方式：`GET`
- 接口描述：分页获取评论和二级回复

### 6.6 发表评论

- 请求路径：`/videos/:id/comments`
- 请求方式：`POST`
- 接口描述：发表评论

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| content | string | 是 | 评论内容 |
| parentId | number | 否 | 父评论 ID，一级评论为空 |
| rootId | number | 否 | 根评论 ID |

### 6.7 获取视频弹幕列表

- 请求路径：`/videos/:id/danmaku`
- 请求方式：`GET`
- 接口描述：按时间范围拉取视频弹幕

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| fromMs | number | 否 | 起始毫秒 |
| toMs | number | 否 | 结束毫秒 |

### 6.8 发送视频弹幕

- 请求路径：`/videos/:id/danmaku`
- 请求方式：`POST`
- 接口描述：发送视频弹幕

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| content | string | 是 | 弹幕内容 |
| timeOffsetMs | number | 是 | 视频时间偏移 |
| color | string | 否 | 颜色 |

### 6.9 举报内容

- 请求路径：`/reports`
- 请求方式：`POST`
- 接口描述：举报视频、评论或弹幕

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| targetType | string | 是 | `VIDEO/COMMENT/VIDEO_DANMAKU/LIVE_CHAT/LIVE_DANMAKU` |
| targetId | number | 是 | 对象 ID |
| reason | string | 是 | 举报原因 |

### 6.10 我的通知列表

- 请求路径：`/notifications`
- 请求方式：`GET`
- 接口描述：获取当前用户通知列表

## 7 关注订阅模块

### 7.1 关注用户

- 请求路径：`/users/:id/follow`
- 请求方式：`POST`
- 接口描述：关注用户

### 7.2 取消关注用户

- 请求路径：`/users/:id/follow`
- 请求方式：`DELETE`
- 接口描述：取消关注

### 7.3 获取订阅流

- 请求路径：`/feeds/following`
- 请求方式：`GET`
- 接口描述：获取已关注用户的内容流

## 8 直播模块

### 8.1 创建直播间

- 请求路径：`/lives/rooms`
- 请求方式：`POST`
- 接口描述：创建直播间

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| title | string | 是 | 直播标题 |
| categoryId | number | 是 | 分区 ID |
| coverUrl | string | 否 | 封面 |

### 8.2 获取直播间配置

- 请求路径：`/lives/rooms/:id`
- 请求方式：`GET`
- 接口描述：获取直播间详情、推流信息和播放地址

### 8.3 开始直播

- 请求路径：`/lives/rooms/:id/start`
- 请求方式：`POST`
- 接口描述：标记直播开始，创建直播场次

### 8.4 结束直播

- 请求路径：`/lives/rooms/:id/stop`
- 请求方式：`POST`
- 接口描述：结束当前直播场次并触发录播处理

### 8.5 直播间详情

- 请求路径：`/lives/sessions/:id`
- 请求方式：`GET`
- 接口描述：获取直播间观看页信息

### 8.6 发送直播聊天消息

- 请求路径：`/lives/sessions/:id/chat`
- 请求方式：`POST`
- 接口描述：发送直播聊天消息

### 8.7 获取直播聊天历史

- 请求路径：`/lives/sessions/:id/chat`
- 请求方式：`GET`
- 接口描述：获取直播历史聊天消息

### 8.8 发送直播弹幕

- 请求路径：`/lives/sessions/:id/danmaku`
- 请求方式：`POST`
- 接口描述：发送直播弹幕

### 8.9 获取录播信息

- 请求路径：`/lives/sessions/:id/recording`
- 请求方式：`GET`
- 接口描述：获取录播回看地址与状态

## 9 用户中心模块

### 9.1 用户数据概览

- 请求路径：`/creator/dashboard`
- 请求方式：`GET`
- 接口描述：获取用户播放、点赞、评论、粉丝等概览数据

### 9.2 粉丝趋势

- 请求路径：`/creator/fans/trend`
- 请求方式：`GET`
- 接口描述：获取指定时间范围内粉丝增长趋势

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| range | string | 否 | `7d/30d/90d` |

### 9.3 违规提醒列表

- 请求路径：`/creator/violations`
- 请求方式：`GET`
- 接口描述：获取作品驳回和违规提醒列表

### 9.4 我的直播历史

- 请求路径：`/creator/lives/history`
- 请求方式：`GET`
- 接口描述：获取历史直播与录播记录

## 10 礼物币模块

### 10.1 获取钱包余额

- 请求路径：`/gift-coins/wallet`
- 请求方式：`GET`
- 接口描述：获取当前用户礼物币余额和累计数据

### 10.2 每日领取礼物币

- 请求路径：`/gift-coins/daily-claim`
- 请求方式：`POST`
- 接口描述：每日首次登录领取礼物币

### 10.3 发送礼物

- 请求路径：`/gift-coins/send`
- 请求方式：`POST`
- 接口描述：在直播间送礼

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| sessionId | number | 是 | 直播场次 ID |
| receiverId | number | 是 | 主播 ID |
| giftName | string | 是 | 礼物名称 |
| giftCost | number | 是 | 礼物单价 |
| quantity | number | 是 | 数量 |

## 11 管理审核后台模块

### 11.1 获取待审视频列表

- 请求路径：`/admin/reviews/videos`
- 请求方式：`GET`
- 接口描述：获取视频审核队列

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| status | string | 否 | `PENDING/APPROVED/REJECTED` |
| page | number | 否 | 页码 |
| pageSize | number | 否 | 每页数量 |

### 11.2 审核视频

- 请求路径：`/admin/reviews/videos/:id`
- 请求方式：`POST`
- 接口描述：审核通过或驳回某个视频

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| action | string | 是 | `APPROVE/REJECT/OFFLINE` |
| reason | string | 否 | 审核意见 |

### 11.3 获取待处理举报列表

- 请求路径：`/admin/reports`
- 请求方式：`GET`
- 接口描述：获取举报记录列表

### 11.4 处理举报

- 请求路径：`/admin/reports/:id`
- 请求方式：`POST`
- 接口描述：处理举报记录

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| action | string | 是 | `KEEP/DELETE/BAN/MUTE` |
| reason | string | 否 | 处理说明 |

### 11.5 评论/弹幕审核列表

- 请求路径：`/admin/reviews/text-content`
- 请求方式：`GET`
- 接口描述：统一获取评论、视频弹幕、直播聊天、直播弹幕等文本审核对象

### 11.6 用户处罚

- 请求路径：`/admin/users/:id/punish`
- 请求方式：`POST`
- 接口描述：对用户执行禁言或封禁

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| action | string | 是 | `MUTE/BAN/UNBAN` |
| reason | string | 否 | 处罚原因 |

### 11.7 运营看板

- 请求路径：`/admin/dashboard`
- 请求方式：`GET`
- 接口描述：获取视频数、待审数、直播场次、举报量等概览统计

## 12 Agent 模块

### 12.1 获取 Agent 审核预览

- 请求路径：`/agent/review-preview`
- 请求方式：`POST`
- 接口描述：对指定文本内容进行风险分析预览

**请求参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| targetType | string | 是 | `VIDEO/COMMENT/VIDEO_DANMAKU/LIVE_CHAT/LIVE_DANMAKU` |
| content | string | 是 | 待分析文本 |
| metadata | object | 否 | 附加上下文 |

**响应字段**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| riskLevel | string | 风险等级 |
| suggestedAction | string | 建议动作 |
| summary | string | 理由摘要 |
| hitRules | string[] | 命中规则 |

### 12.2 获取对象关联的 Agent 结果

- 请求路径：`/agent/results`
- 请求方式：`GET`
- 接口描述：按对象类型和对象 ID 查询 Agent 审核结果

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| targetType | string | 是 | 对象类型 |
| targetId | number | 是 | 对象 ID |

## 13 WebSocket 事件约定

### 13.1 直播聊天通道

- 通道名：`live-chat`
- 方向：服务端广播
- 数据结构：`sessionId`、`userId`、`nickname`、`content`、`createdAt`

### 13.2 直播弹幕通道

- 通道名：`live-danmaku`
- 方向：服务端广播
- 数据结构：`sessionId`、`userId`、`content`、`color`、`createdAt`

### 13.3 审核通知通道

- 通道名：`audit-notify`
- 方向：服务端推送给用户
- 数据结构：`targetType`、`targetId`、`status`、`reason`

### 13.4 系统通知通道

- 通道名：`system-notify`
- 方向：服务端推送给用户
- 数据结构：`type`、`title`、`content`、`relatedId`

## 14 首版联调优先级

### 14.1 P0 接口

- `/auth/register`
- `/auth/login`
- `/feeds/recommend`
- `/videos/upload`
- `/videos`
- `/videos/:id/submit-review`
- `/videos/:id`
- `/videos/:id/comments`
- `/lives/rooms`
- `/lives/rooms/:id/start`
- `/lives/sessions/:id`
- `/admin/reviews/videos`
- `/admin/reviews/videos/:id`

### 14.2 P1 接口

- `/videos/:id/danmaku`
- `/users/:id/follow`
- `/feeds/following`
- `/creator/dashboard`
- `/gift-coins/daily-claim`
- `/gift-coins/send`
- `/admin/reports`
- `/agent/review-preview`

## 15 当前待补充项

- 上传接口的文件大小和格式白名单
- 直播播放协议的最终选型
- 礼物配置项是否单独维护礼物字典表
- Agent 接口的具体鉴权与超时策略
