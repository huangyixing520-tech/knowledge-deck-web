import { getAdminEmails } from "@/lib/admin";

export function getConfigStatus() {
  const googleReady = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const databaseReady = Boolean(process.env.DATABASE_URL);
  const nextAuthReady = Boolean(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET);
  const adminEmails = getAdminEmails();

  return [
    {
      key: "google",
      label: "Google 登录",
      ready: googleReady,
      detail: googleReady ? "OAuth 凭证已配置" : "缺 GOOGLE_CLIENT_ID 或 GOOGLE_CLIENT_SECRET"
    },
    {
      key: "database",
      label: "行为数据库",
      ready: databaseReady,
      detail: databaseReady ? "DATABASE_URL 已配置，后台会持久保存" : "未配置 DATABASE_URL，当前为内存预览模式"
    },
    {
      key: "nextauth",
      label: "会话安全",
      ready: nextAuthReady,
      detail: nextAuthReady ? "NEXTAUTH_URL 和 NEXTAUTH_SECRET 已配置" : "缺 NEXTAUTH_URL 或 NEXTAUTH_SECRET"
    },
    {
      key: "admins",
      label: "管理员",
      ready: adminEmails.length > 0,
      detail: adminEmails.join(", ")
    }
  ];
}
