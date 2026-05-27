# GUANLAN VIDEO Design System

本文件是观澜视频平台 / GUANLAN VIDEO 后续全站前端重构的唯一设计规范。所有页面、组件和局部样式必须先对齐本文件，再进入实现。

## 1. 产品定位

- 产品名称：观澜视频平台 / GUANLAN VIDEO
- 产品类型：视频、直播与创作者社区
- 风格关键词：清爽、科技、年轻、内容驱动、轻量高级
- 重构目标：从学生项目 UI 升级为有真实互联网产品感的前端作品，同时保留现有路由、接口、权限、上传、直播、评论、弹幕、通知和审核能力。
- 设计基调：浅色内容平台为主，蓝色作为可信科技主色，橙色作为少量活力强调。避免后台管理系统感，避免廉价渐变和厚重阴影。

## 2. 品牌色彩 Token

基础 token 必须落到全局 CSS 变量中，页面和组件不得继续散落硬编码颜色。

```css
:root {
  --gl-primary: #2F4F8F;
  --gl-primary-hover: #263F72;
  --gl-primary-soft: #E8EEF8;
  --gl-accent: #F4A340;
  --gl-accent-soft: #FFF2DE;
  --gl-background: #F5F7FA;
  --gl-surface: #FFFFFF;
  --gl-surface-soft: #EEF3F8;
  --gl-text-primary: #172033;
  --gl-text-secondary: #4F5E73;
  --gl-text-muted: #8491A6;
  --gl-border: #DDE5EF;
  --gl-divider: #E8EDF4;
  --gl-danger: #D94A4A;
  --gl-success: #2F9E6D;
  --gl-warning: #D8912E;
  --gl-live-red: #E43D4F;
}
```

使用规则：

- `primary` 用于导航 active、主按钮、关键链接、选中态，不用于大面积背景。
- `accent` 只用于投稿、创作者动作、精选标签或少量关键数据，不与 `primary` 竞争。
- `live-red` 只用于直播中、录制中、未读强提醒等即时状态。
- 页面背景统一使用 `background`；卡片和表单面板使用 `surface`；轻量分组使用 `surface-soft`。
- 禁止继续引入随机蓝色、紫色、荧光色、过饱和渐变。

## 3. 布局系统

- TopNav 高度：桌面端 72px，移动端 64px。允许内容换行时必须改为移动抽屉或折叠菜单，不允许把导航撑成多行。
- 页面 container max-width：主内容 `1280px`，宽媒体/直播/详情页 `1400px`，表单页 `560px` 到 `720px`。
- 页面左右 padding：桌面 32px，平板 24px，移动 16px。
- 页面顶部间距：TopNav 后首个内容区 28px；详情/直播页可为 24px。
- section 间距：同级 section 桌面 32px，移动 24px。
- card gap：视频网格 20px，直播网格 22px，后台/列表面板 16px。
- grid 断点：`<640px` 单列；`640px-959px` 双列；`960px-1279px` 三列；`>=1280px` 视频卡可四列或自适应。
- 移动端布局原则：所有非关键侧栏下沉；播放器、直播舞台、表单、评论区必须单列；禁止横向滚动；按钮组允许换行但需保持 8px 间距。
- 桌面端布局原则：内容平台页面以内容网格为主；详情页采用主内容 + 侧栏；直播页采用舞台 + 控制/消息侧栏；创作者中心可以分区但不得做成后台表格密集页。

## 4. 字体层级

推荐字体栈：

```css
font-family: "Geist", "Outfit", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
```

- page title：32px / 40px，weight 700，color `text-primary`
- page subtitle：15px / 24px，weight 400，color `text-secondary`，最大宽度 64ch
- section title：22px / 30px，weight 700
- card title：15px / 22px，weight 600，最多两行
- body text：14px / 22px，weight 400
- metadata：12px / 18px，weight 500，color `text-muted`
- button text：14px / 20px，weight 600
- nav text：14px / 20px，weight 600
- stat number：28px / 34px，weight 700，启用 `font-variant-numeric: tabular-nums`

## 5. 公共组件规范

### AppShell

- 负责 TopNav、全局背景、页面 container、主内容间距。
- 提供 `default`、`wide`、`media`、`auth` 四种页面宽度模式。
- 不在具体页面重复写 `max-width` 和页面 padding。

### TopNav

- 固定高度，轻量粘性顶部导航。
- 品牌区使用文字标识 + 小型品牌 mark；背景不使用大图铺满导航。
- 主导航包括推荐、娱乐、学习、游戏、科技、直播。
- active state 必须清晰：浅底色 + `primary` 文本/下划线，不只依靠 hover。
- 登录、用户中心、关注流、通知、退出等动作统一放在右侧 actions。

### SearchBar

- 支持输入、清空、建议面板、键盘上下选择、Enter 搜索。
- 搜索建议面板使用同一阴影、圆角、层级和 focus 样式。
- 搜索按钮不得在不同页面出现不同尺寸。

### VideoCard

- 封面比例统一 `16:9`，推荐 `aspect-ratio: 16 / 9`。
- 标题最多两行，描述可选但最多两行。
- 作者、时间、点赞、收藏、评论属于 metadata，不得抢标题层级。
- hover：卡片整体上浮 3px，封面 scale 1.025，阴影轻微加深。
- 所有视频列表、关注流、用户主页、相关推荐优先复用同一视觉规范。

### SectionHeader

- 左侧标题 + 描述，右侧放刷新、筛选、更多等动作。
- 移动端动作下沉，不挤压标题。

### EmptyState

- 统一替代裸 `el-empty`。
- 包含轻量图形/图标、标题、说明、可选主动作。
- 空状态语气具体：说明为什么为空以及下一步可以做什么。

### StatCard

- 用于播放量、粉丝、关注、稿件、未读、直播间数量等数据。
- 数字使用 tabular nums；标签使用 metadata。
- 不使用厚阴影，不使用后台仪表盘式大色块。

### UserAvatar

- 支持图片、昵称首字、状态点、尺寸 `sm/md/lg/xl`。
- 默认形状使用 14px 到 20px 圆角的 rounded-square，避免全站只有圆形头像。

### ChannelTabs

- 用于频道页、搜索结果 tab、用户中心 tab。
- active 使用 `primary` 下划线或浅底块；移动端可横向滚动但需要隐藏滚动条并保留边缘渐隐。

### FloatingActions

- 用于视频详情点赞/收藏/举报、直播快捷保存、移动端次级操作。
- 不得遮挡播放器、评论输入框或底部安全区域。

### PageHero

- 用于首页、频道、直播、用户主页的轻量首屏引导。
- 内容驱动，不做营销落地页式大口号。
- 允许非对称布局，但移动端必须回落单列。

### FormPanel

- 用于登录、注册、投稿、资料设置、举报。
- label 位于输入框上方；错误信息在输入框下方；按钮区统一右对齐或全宽。
- 不把用户侧表单做成后台管理表单。

### LivePanel

- 用于直播广场、直播间舞台、弹幕、状态数据。
- 主舞台优先保证媒体区域可读，侧栏信息密度中等。
- `live-red` 只用于直播中和结束直播等状态动作。

### ProfileHeader

- 用于用户中心和公开用户主页。
- 头像、昵称、简介、粉丝/关注/作品数、关注按钮统一布局。
- 编辑入口不得打断公开信息层级。

## 6. 页面级规范

### 推荐/首页

- 第一屏：PageHero + 精选视频/推荐摘要，随后是推荐视频网格。
- 推荐卡片全部使用 VideoCard。
- 刷新推荐属于次级动作，不应抢主视觉。

### 各频道页

- 当前项目频道由 `/search?tab=video&category=entertainment|study|game|tech` 承载。
- 频道页应拥有频道标题、频道说明、排序/筛选和内容网格。
- 不允许每个频道独立写一套视觉。

### 直播页

- `/live` 是直播广场 + 开播入口；`/live/:id` 是直播间。
- 直播广场使用 LivePanel + LiveRoomCard。
- 直播间以媒体舞台为核心，消息/弹幕/房间信息作为侧栏。
- 开播、结束直播、保存录播等高风险动作必须保留现有确认和状态反馈。

### 用户中心

- `/user/dashboard` 和 `/creator/dashboard` 指向同一页面。
- 应拆为 ProfileHeader、ChannelTabs、UploadPanel、DraftList、FavoriteGrid、LikeGrid、SettingsPanel、DangerZone 的视觉分区。
- 用户侧页面不得呈现为审核后台；投稿流程要像创作者工作台。

### 投稿/上传页

- 当前位于用户中心的投稿 tab。
- 使用 FormPanel + 上传区 + 自动封面预览 + 稿件列表。
- 文件选择、上传、封面截取、创建稿件、提交审核必须保留现有接口和状态。

### 视频详情页

- `/video/:id` 采用播放器主列 + 作者/简介/弹幕列表/相关推荐侧栏。
- 评论区、弹幕区、智能问答入口要共享同一面板体系。
- 点赞、收藏、关注、举报等交互必须有 active、loading、error 状态。

### 搜索页

- `/search` 支持 `tab=video|live|user`、`keyword`、`category`。
- 筛选区使用 ChannelTabs + Select，不用后台筛选表单感。
- video/live/user 结果分别复用 VideoCard、LiveRoomCard、UserResultCard。

### 消息/通知/私信页

- 当前项目仅发现 `/notifications` 通知页，未发现独立私信路由。
- 通知页使用 NotificationItem 列表，区分未读/已读，支持一键已读。
- 若后续增加私信，必须复用同一消息壳层和空状态，不另造风格。

### 设置页

- 当前项目未发现独立 `/settings` 路由，设置能力位于用户中心账号设置区域。
- 设置页或设置区使用 FormPanel；危险操作必须隔离在 DangerZone。

### 登录/注册相关页面

- `/login`、`/register` 使用 auth 宽度模式。
- 表单页面保持轻量、高信任感，不使用后台卡片堆叠。
- 管理员入口可保留，但视觉上必须作为次级入口。

## 7. 动效规范

- hover 上浮距离：普通卡片 `translateY(-3px)`；直播卡片和重点卡片 `translateY(-4px)`。
- 图片 hover scale：`scale(1.025)`，持续时间 260ms。
- transition duration：常规 220ms，复杂面板 280ms，press 120ms。
- easing：`cubic-bezier(0.16, 1, 0.3, 1)`。
- button hover：背景轻微加深或 surface 提升；active 使用 `translateY(1px)` 或 `scale(0.98)`。
- card hover：上浮 + 边框变浅 + 背景保持稳定；禁止发光外阴影。
- nav active state：浅色胶囊/下划线 + `primary`，并对路由 query category 正确高亮。
- focus state：所有输入、按钮、链接需有 2px `primary` 外环，透明度约 20% 到 28%。
- loading skeleton：优先使用与布局一致的骨架屏；列表页骨架应模拟卡片尺寸，表单按钮保留 loading 态。
- 弹幕和直播状态动画只使用 transform / opacity，不动画 top、left、width、height。

## 8. 禁止事项

- 不允许每个页面单独造一套风格。
- 不允许写死 mock 数据替代真实接口。
- 不允许破坏路由和接口。
- 不允许删除功能来换取 UI 好看。
- 不允许改后端、改接口字段或绕过权限。
- 不允许大面积死灰背景。
- 不允许廉价阴影。
- 不允许无意义渐变。
- 不允许过度圆角。
- 不允许过度玻璃拟态。
- 不允许把用户侧页面做成后台管理风格。
- 不允许引入大型依赖来解决普通 UI 问题。
- 不允许继续散落硬编码品牌色。
- 不允许在页面内复制 VideoCard、LiveRoomCard、EmptyState、ProfileHeader 等公共组件样式。

## 9. 第一批重构优先级

1. 全局 token 与 AppShell：统一背景、container、TopNav 高度、页面 padding。
2. TopNav 与 SearchBar：解决全站第一观感、导航拥挤、搜索组件不统一。
3. VideoCard 与 LiveRoomCard：统一内容平台最常见的信息单元。
4. EmptyState 与 SectionHeader：替代裸 `el-empty` 和散落标题区。
5. ProfileHeader、FormPanel、ChannelTabs：支撑用户中心、投稿、搜索、频道页。
6. 首页、搜索/频道页、直播页、用户中心作为第一批页面。

## 10. 实施边界

- 每次重构只改一类公共组件或一组页面，不混改接口和业务逻辑。
- 保留现有 Vue 3 + Vite + Pinia + Vue Router + Element Plus 技术栈。
- 先替换视觉结构，再做页面细节；先公共组件，后页面。
- 所有页面重构后至少验证：路由可进入、接口调用未变、表单可提交、移动端无横向滚动。
