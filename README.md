# Knowledge Deck Web

把播客、文章和视频链接整理成可分享的知识卡片。目标是让用户不用听完一小时播客，也能快速抓住内容主线、关键判断、可复用观点和记忆钩子。

线上预览：

- App: https://knowledge-deck-web.vercel.app
- Demo card: https://knowledge-deck-web.vercel.app/cards/demo-fde

## 当前版本

这是产品化 MVP，已经包含：

- 首页工作台：输入链接，预估 token 消耗，创建生成任务。
- Token 钱包雏形：展示余额、套餐和购买入口。
- 任务接口：`POST /api/jobs`，当前返回样例卡片，后续接真实生成队列。
- 公开分享页：可直接发给别人打开的知识卡片页面。
- 内容原则：只基于正文、文字稿或字幕；不使用简介、shownotes、评论或平台元信息替代正文。

## 本地运行

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`。

## Google 登录配置

本项目第一版只支持 Google 登录。复制 `.env.example` 为 `.env.local`，填入：

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=一段随机长字符串
GOOGLE_CLIENT_ID=你的 Google OAuth Client ID
GOOGLE_CLIENT_SECRET=你的 Google OAuth Client Secret
ADMIN_EMAILS=你的管理员邮箱,合伙人的管理员邮箱
```

Google OAuth 的回调地址需要配置为：

```text
http://localhost:3000/api/auth/callback/google
https://你的线上域名/api/auth/callback/google
```

线上快速配置可以直接运行：

```bash
./scripts/configure_vercel_env.sh
```

更详细的 Google Cloud 设置见 `GOOGLE_OAUTH_SETUP.md`。

## 后台和行为记录

管理员访问：

```text
/admin
```

后台会展示用户、登录事件、生成记录和购买点击。第一版支持两种存储：

- 配置 `DATABASE_URL`：自动写入 Postgres，并在第一次访问时创建 `kd_users`、`kd_events`、`kd_jobs` 三张表。
- 不配置 `DATABASE_URL`：使用内存预览模式，适合本地调试，但线上重启后数据会丢失。

推荐生产环境尽快配置 Neon 或 Supabase Postgres，把 `DATABASE_URL` 填到 Vercel 环境变量里。

如需生产构建：

```bash
npm run build
npm run start
```

## 目录

```text
app/
  api/jobs/route.js       生成任务 API
  cards/[id]/page.jsx     公开知识卡片页
  page.jsx                产品首页
  globals.css             全局视觉样式
lib/
  pricing.js              token 套餐和消耗估算
  sampleCards.js          demo 卡片数据
PRODUCT_PLAN.md           产品路线
```

## 接下来要共建的模块

1. 账号和真实 token 钱包。
2. 支付 checkout 和 webhook。
3. 真实生成队列：抓取、转写、提炼、渲染。
4. `CardJSON` 数据结构和版本管理。
5. 用户知识库、收藏、导出和搜索。

## 协作约定

- 不提交 `.env` 或任何 API key。
- 提炼内容必须来自全文、文字稿或字幕。
- 分享页优先保证内容质量、移动端可读性和转发欲。
- 前端设计不要退回普通文档模板，要保持卡片化、可交互、适合传播。
