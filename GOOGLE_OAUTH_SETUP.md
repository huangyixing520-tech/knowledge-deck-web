# Google 登录上线配置

当前代码已经接好 Google 登录，但线上真正跳转 Google 账号选择页，需要在 Google Cloud 创建 OAuth 凭证。

## 需要创建的凭证

类型选择：

```text
OAuth client ID
```

应用类型选择：

```text
Web application
```

Authorized JavaScript origins：

```text
https://knowledge-deck-web.vercel.app
```

Authorized redirect URIs：

```text
https://knowledge-deck-web.vercel.app/api/auth/callback/google
```

创建后复制：

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

## 写入 Vercel

在项目目录运行：

```bash
./scripts/configure_vercel_env.sh
```

脚本会把 Google 凭证写入 Production、Preview、Development 三个环境，并重新部署生产环境。

## 数据库

后台默认可以运行，但如果没有 `DATABASE_URL`，它是内存预览模式，线上重启后数据会丢失。

生产环境推荐创建 Neon 或 Supabase Postgres，然后把连接串填给脚本里的 `Database URL`。
