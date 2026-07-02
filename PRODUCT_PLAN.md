# Knowledge Deck Web 产品化路线

目标：把本地“链接/播客转知识卡片”能力做成公开 Web 产品，用户购买 tokens 后可生成、保存、分享知识卡。

## MVP 已实现

- Web 工作台：首页直接贴链接生成，不做纯营销落地页。
- Token 钱包：展示余额、生成消耗、套餐购买的交互闭环。
- 任务接口：`POST /api/jobs`，当前返回样例卡片，后续替换为真实队列。
- 分享页：`/cards/demo-fde`、`/cards/demo-harness`，展示 3 分钟速读、知识地图、判断卡、转折和记忆锚点。
- 生产构建：使用 Next.js + Webpack，规避中文路径下 Turbopack 崩溃。

## 真实上线需要的 6 个模块

1. 账号系统
   - 需要用户 ID、登录态、匿名试用额度。
   - 表：`users(id, email, created_at)`。

2. Token 钱包
   - 表：`wallets(user_id, balance)`。
   - 表：`token_ledger(id, user_id, amount, reason, job_id, created_at)`。
   - 所有扣费必须先写账本，再改余额，避免重复扣费。

3. 支付
   - `checkout_sessions` 记录套餐、金额、token 数和支付状态。
   - 支付成功 webhook 增加 token。
   - 前端购买按钮从“模拟购买”替换成创建 checkout。

4. 生成队列
   - `jobs(id, user_id, source_url, status, cost, error, card_id)`。
   - 状态：`queued -> transcribing -> extracting -> rendering -> published`。
   - 失败要退还未实际消耗的 token，或者给用户可重试机会。

5. 内容管线
   - 链接解析：识别小宇宙、文章、B 站、直链。
   - 内容门槛：只接受全文、文字稿或字幕；禁止用简介、shownotes、评论替代。
   - 转写：复用 DashScope/通义听悟或后续替换为更稳定 ASR 服务。
   - 提炼：按 `extraction_standard.md` 输出结构化 JSON。
   - 渲染：把 JSON 渲染成分享页，而不是每次生成一大段不可维护 HTML。

6. 分享与知识库
   - 每张卡有公开 slug。
   - 用户可收藏、复制链接、导出 Markdown/PDF。
   - 后续做个人知识库、标签、全文搜索和批量导入。

## Token 计费建议

- 文章：15-30 tokens。
- 短播客或短视频：40-60 tokens。
- 60 分钟播客：60-90 tokens。
- 长音频或高质量深度卡：100+ tokens。

第一版别把价格做复杂。重点验证用户是否愿意为“节省一小时 + 生成可分享卡片”付费。

## 下一步优先级

1. 接数据库和登录，把本地余额改成真实钱包。
2. 把 `POST /api/jobs` 接到真实 Python/队列服务。
3. 把样例卡片数据结构定成正式 `CardJSON` schema。
4. 接支付 checkout 和 webhook。
5. 部署到 Vercel，设置环境变量和域名。
