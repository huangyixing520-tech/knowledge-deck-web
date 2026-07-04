"use client";

import { SessionProvider } from "next-auth/react";
import AnalyticsTracker from "./AnalyticsTracker";

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <AnalyticsTracker />
      {children}
    </SessionProvider>
  );
}
