# VideoPlayer 项目改造总结

## 1. 背景

这份报告总结了 `VideoPlayer` 我围绕本地开发启动、数据库初始化、推荐系统、搜索体验和演示数据所完成的主要工作，并说明当前系统的推荐与搜索排序逻辑。

---

## 2. 已完成事项总览

### 2.1 开发环境与启动链路

已将本地开发环境整理为统一启动入口：

- 启动命令：`npm run dev`
- 停止基础环境：`npm run dev:down`
- 初始化数据库：`npm run db:init`

当前 `npm run dev` 会自动完成以下动作：

1. 读取 `backend/.env`
2. 检查本机 MySQL 是否可连接
3. 必要时尝试启动 Linux 的 `mysql` 服务
4. 确保数据库 `video_player` 存在
5. 检查并拉起 Docker 中的 `Redis / MinIO / SRS`
6. 启动后端 Nest 服务
7. 启动前端 Vite 服务

这部分主要改造位于：

- `package.json`
- `scripts/dev.sh`
- `scripts/dev-down.sh`
- `scripts/init-db.sh`
- `scripts/mysql-common.sh`
- `scripts/infra-common.sh`
- `deploy/docker-compose.dev.yml`

当前本地默认数据库连接已按 Linux 安装版 MySQL 适配：

```env
mysql://root:proot@127.0.0.1:3306/video_player
```

---

### 2.2 数据库初始化与演示数据

我补强了数据库初始化和种子数据逻辑，并已经实际执行过：

```bash
npm run db:init
npm --workspace backend run db:seed
```

当前种子数据包含（zzz电脑的本地）：

- 6 个演示账号
- 14 条演示视频
- 其中 11 条已发布视频
- 1 条待审核视频
- 1 条已驳回视频
- 1 条草稿视频

演示内容覆盖了：

- 生活
- 学习
- 游戏
- 科技
- 直播回放
- 平台后台演示

默认演示账号：

- 普通用户：`demo_user / user123`
- 管理员：`demo_admin / admin123`

主要文件：

- `backend/prisma/seed.js`

---

### 2.3 用户画像系统落地

项目中原本缺少可真正接入推荐流的用户画像能力，我补充了推荐画像构建逻辑与权重体系，并接入了用户行为回写。

当前画像会综合以下行为：

- 点赞
- 收藏
- 评论
- 弹幕
- 关注
- 发布视频
- 播放次数
- 观看时长
- 观看深度
- 完播次数

画像结果会产出：

- 分类偏好分布
- 创作者偏好分布
- 用户活跃度等级
- 用户是偏观众、偏创作者，还是相对平衡
- 是否仍处于冷启动

主要文件：

- `backend/src/modules/user/user-profile.constants.ts`
- `backend/src/modules/user/user-profile.service.ts`
- `backend/src/modules/video/video-watch.constants.ts`

---

### 2.4 首页推荐接入个性化

我已经把首页推荐流从单纯规则排序，升级成“规则打底 + 用户画像个性化重排”。

当前入口：

- `GET /api/v1/feeds/recommend`
- `GET /api/v1/feeds/categories/:code/videos`

实现方式：

- 控制层读取登录态
- 服务层拿到 `currentUserId`
- 视频服务根据用户画像做个性化重排
- 未登录或冷启动用户则自然回退到全站规则流

涉及文件：

- `backend/src/modules/search/search.controller.ts`
- `backend/src/modules/search/search.service.ts`
- `backend/src/modules/video/video.service.ts`

---

### 2.5 详情页相关推荐接入个性化

我也把详情页相关推荐一起接入了个性化能力。

当前入口：

- `GET /api/v1/videos/:id/recommendations`

当前逻辑不再只是“同作者/同分类 + 最新补位”，而是：

1. 先召回和当前视频同作者或同分类的候选
2. 不足时补全站候选
3. 按“当前视频相关性 + 用户画像偏好 + 热度时效”统一打分排序

这样可以保证：

- 相关推荐仍然优先“和当前视频相关”
- 但在相关候选之间，会更偏向当前用户可能更感兴趣的内容

涉及文件：

- `backend/src/modules/video/video.controller.ts`
- `backend/src/modules/video/video.service.ts`

---

### 2.6 顶部搜索联想下拉框

我已经在首页顶部搜索框上新增了类似 B 站 / YouTube 的搜索联想下拉框，并抽成了可复用组件。

前端能力：

- 输入非空时展示建议面板
- 300ms 防抖请求
- 失焦延迟关闭
- 点击空白关闭
- 鼠标悬停高亮
- 支持 `ArrowDown / ArrowUp / Enter / Escape`
- 点击建议项后填入输入框并直接跳转搜索页
- 点击“搜索”可直接进入结果页

后端接口：

- `GET /api/v1/search/suggest?keyword=xxx`

当前联想来源：

- 已发布视频标题模糊匹配
- 先取热度更高的候选
- 去重后最多返回 10 条

涉及文件：

- `frontend/src/components/SearchSuggestBox.vue`
- `frontend/src/components/AppHeader.vue`
- `frontend/src/api/platform.ts`
- `frontend/src/types/api.ts`
- `backend/src/modules/search/search.controller.ts`
- `backend/src/modules/search/search.service.ts`

---

### 2.7 搜索结果页升级为“关键词召回 + 个性化排序”

我把搜索结果页默认排序从原先的 `latest` 升级成了 `best`，并打通了关键词召回与用户画像排序。

当前搜索页行为：

- 顶部搜索框点击“搜索”会进入 `/search`
- 默认 `sortBy=best`
- 用户仍然可以手动切换到 `latest` 或 `hot`

当前策略：

- `best`：关键词召回后再个性化重排
- `hot`：纯热度排序
- `latest`：纯最新排序

涉及文件：

- `frontend/src/views/search/SearchView.vue`
- `frontend/src/api/platform.ts`
- `frontend/src/types/api.ts`
- `backend/src/modules/search/search.controller.ts`
- `backend/src/modules/search/search.service.ts`
- `backend/src/modules/video/video.service.ts`

---

## 3. 当前推荐算法说明

当前项目里，推荐相关逻辑主要分为三块：

1. 首页推荐
2. 详情页相关推荐
3. 搜索结果页 `best` 排序

---

## 4. 首页推荐算法

### 4.1 候选召回

首页默认推荐会先从已发布视频中取一批候选，候选基础排序按热度优先：

```text
likeCount desc
favoriteCount desc
commentCount desc
publishedAt desc
id desc
```

### 4.2 基础分

首页基础推荐分是一个可解释的规则分：

```text
interactionScore = likeCount + favoriteCount * 2 + commentCount * 3
baseScore = interactionScore * timeDecay + freshnessBoost
```

其中：

- `timeDecay`：随发布时间变久逐步衰减
- `freshnessBoost`：给较新的内容一个轻量加成

### 4.3 个性化分

如果用户已有画像，则会在基础分上叠加用户偏好：

- 分类偏好分
- 创作者偏好分
- 活跃用户倍率
- 观众/创作者倾向修正
- 对自己发布的视频做轻微惩罚

当前个性化重排核心可概括为：

```text
personalizedScore =
  baseScore * activityMultiplier
  + categoryPreferenceScore * 30
  + creatorPreferenceScore * 36
  + tendencyBoost
  - selfVideoPenalty
```

### 4.4 多样性重排

为了避免首页前几条被同一个创作者或同一分类刷屏，还加入了去扎堆重排：

- 不让同一创作者连续出现
- 严格模式下限制同分类连续过多
- 放松模式下仍保留一定多样性

### 4.5 冷启动策略

如果用户没有足够行为数据：

- 不强行做个性化
- 自动回退到全站规则推荐

---

## 5. 详情页相关推荐算法

详情页相关推荐强调“先相关，再个性化”。

### 5.1 候选召回

优先召回：

- 同作者视频
- 同分类视频

如果数量不足，再补全站候选。

### 5.2 排序逻辑

在首页个性化分的基础上，再额外叠加“与当前视频的关联性”：

```text
relatedScore =
  personalizedScore
  + creatorMatchBoost
  + categoryMatchBoost
  + dualMatchBoost
```

其中：

- 同作者：较高加分
- 同分类：中等加分
- 同时满足：额外再加分

所以详情页不会被改成“纯猜你喜欢”，而是更接近：

```text
和当前视频足够相关的前提下，优先给当前用户更可能感兴趣的内容
```

---

## 6. 搜索结果页算法

### 6.1 当前搜索模式

项目当前不是语义搜索，也不是向量召回，仍然属于关键词搜索体系，但已经从“数据库简单 contains + 排序”升级为更像内容平台搜索的两阶段模型：

1. 关键词召回
2. 个性化排序

### 6.2 `best` 模式下的关键词召回

当用户搜索关键词时，后端会先做标准化处理：

- `trim`
- 小写归一化
- 生成 token
- 对连续中文关键词做简单 2-gram 拆分

召回字段包括：

- 视频标题
- 视频简介
- 创作者昵称

分类信息也会参与后续打分。

### 6.3 `best` 模式下的相关性打分

当前搜索相关性分包含以下因素：

- 标题完全等于关键词
- 标题以前缀命中关键词
- 标题包含整句关键词
- 简介包含关键词
- 创作者昵称包含关键词
- 分类 code 或分类 label 命中关键词
- token 命中数量
- token 覆盖率

可以概括成：

```text
finalSearchScore =
  relevanceScore * 6
  + tokenCoverageScore
  + personalizedScore
```

其中：

- `relevanceScore` 是关键词匹配强度
- `tokenCoverageScore` 是 token 覆盖补充项
- `personalizedScore` 复用了首页推荐中的用户画像能力

### 6.4 搜索排序原则

当前搜索页最重要的原则是：

```text
相关性优先，个性化辅助
```

也就是说：

- 先保证内容“确实和用户搜的词相关”
- 再在相关候选里按用户画像做排序优化

因此它不是简单“猜你喜欢”，而更接近：

```text
用户搜到了相关内容后，再尽量把更适合这个用户的结果排到前面
```

### 6.5 `hot` 与 `latest`

为了保留确定性，当前仍保留两个显式规则排序：

- `hot`：按热度排序
- `latest`：按发布时间排序

只有默认 `best` 会启用“关键词召回 + 个性化重排”。

---

## 7. 搜索联想算法

当前联想接口较轻量，优先保证交互体验。

### 7.1 联想来源

来源于已发布视频标题：

- 标题 `contains(keyword)`
- 先按热度排候选
- 取前 20
- 去重后返回前 10 条

### 7.2 当前特点

优点：

- 实现简单稳定
- 能快速支持标题补全
- 和当前内容库直接联动

当前边界：

- 还没有接搜索历史
- 还没有接热搜词权重
- 还没有拼音、错别字纠正、同义词
- 还没有用户级联想个性化

---

## 8. 已完成验证

已完成的验证包括：

- `npm --workspace backend run build`
- `npm --workspace frontend run build`
- `npm run db:init`
- `npm --workspace backend run db:seed`
- `GET /api/v1/search/suggest`
- `GET /api/v1/search/all`
- 首页推荐和详情页相关推荐的实际接口联调

另外已确认：

- 搜索页默认返回 `sortBy: "best"`
- `best` 与 `hot` 的结果顺序已出现差异，说明搜索结果页已不再是纯热度排序

---

## 9. 当前系统状态总结

接手后，这个项目已经从“基础视频平台雏形”推进到了“可本地一键启动、可演示推荐逻辑、可演示搜索联想、可演示搜索个性化排序”的状态。

现在已经具备：

- 一条命令启动主要开发环境
- 可跑通的 MySQL / Redis / MinIO / SRS / 前后端联动
- 可用的演示数据集
- 首页个性化推荐
- 详情页个性化相关推荐
- 顶部搜索联想下拉框
- 搜索结果页 `best` 综合排序

---

## 10. 当前仍可继续优化的方向

如果后续继续做，优先建议是：

1. 搜索联想增加热搜词、历史词和个性化词
2. 搜索结果加入标签、分类、作者名等更丰富召回源
3. 引入同义词、拼音、错别字纠正
4. 后续可演进到语义召回或向量检索
5. 继续扩充真实行为数据，让画像分布更稳定
6. 对推荐与搜索增加曝光、点击、播放完成等反馈闭环
7. 加入投流打赏等等推流逻辑
---

## 11. 目前发现的一个bug

目前发现有时候登录了之后点击查看已发布的视频的时候，显示未登录，投流等逻辑需要查看已经发布的视频，所以还需要修一下。


## 12. 结论

当前版本的核心推荐逻辑已经不是“简单按最新或热度排一下”，而是形成了三种层次：

- 首页：热度时效打底，叠加用户画像，再做多样性重排
- 详情页：当前视频相关性优先，再结合用户画像
- 搜索页：关键词相关性优先，再结合用户画像

这意味着项目已经具备了一个内容平台比较关键的基础能力：

```text
同一套用户行为画像，可以同时服务首页推荐、详情页相关推荐和搜索结果排序
```

从后续演进角度看，这会比单独做几个互相割裂的推荐入口更容易继续扩展。
