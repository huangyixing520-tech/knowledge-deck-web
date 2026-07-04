"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const visitorKey = "knowledge-deck-visitor-id";
const sessionKey = "knowledge-deck-session-id";
const scrollMarks = [25, 50, 75, 90];

function createId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getStoredId(storage, key, prefix) {
  let id = storage.getItem(key);
  if (!id) {
    id = createId(prefix);
    storage.setItem(key, id);
  }
  return id;
}

function safeLocation() {
  return {
    path: window.location.pathname,
    search: window.location.search ? "[present]" : "",
    hash: window.location.hash ? "[present]" : "",
    href: `${window.location.origin}${window.location.pathname}`
  };
}

function textLabel(element) {
  const label =
    element.getAttribute("data-analytics-label") ||
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.textContent ||
    "";

  return label.replace(/\s+/g, " ").trim().slice(0, 90);
}

function safeHref(element) {
  const rawHref = element.getAttribute("href");
  if (!rawHref) return "";
  try {
    const url = new URL(rawHref, window.location.href);
    return url.origin === window.location.origin ? url.pathname : url.origin;
  } catch {
    return "";
  }
}

function elementPayload(element) {
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id || "",
    label: textLabel(element),
    href: safeHref(element),
    role: element.getAttribute("role") || "",
    analyticsId: element.getAttribute("data-analytics") || ""
  };
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const { status } = useSession();
  const idsRef = useRef(null);
  const queueRef = useRef([]);
  const sentScrollRef = useRef(new Set());
  const pageStartedAtRef = useRef(Date.now());

  useEffect(() => {
    idsRef.current = {
      visitorId: getStoredId(window.localStorage, visitorKey, "vis"),
      sessionId: getStoredId(window.sessionStorage, sessionKey, "ses")
    };
  }, []);

  const context = useMemo(() => {
    if (typeof window === "undefined") return {};
    return {
      ...safeLocation(),
      pagePath: window.location.pathname,
      pageTitle: document.title,
      referrer: document.referrer,
      locale: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      device: {
        platform: navigator.platform,
        touchPoints: navigator.maxTouchPoints || 0
      }
    };
  }, [pathname]);

  function send(type, metadata = {}, options = {}) {
    if (!idsRef.current) return;

    const event = {
      type,
      metadata,
      visitorId: idsRef.current.visitorId,
      sessionId: idsRef.current.sessionId,
      context: {
        ...context,
        pagePath: window.location.pathname,
        pageTitle: document.title
      }
    };

    if (options.immediate) {
      flush([event], options.beacon);
      return;
    }

    queueRef.current.push(event);
    window.clearTimeout(queueRef.current.timer);
    queueRef.current.timer = window.setTimeout(() => flush(), 600);
  }

  function flush(events = queueRef.current.splice(0), useBeacon = false) {
    if (!events.length) return;
    const payload = JSON.stringify({ events });

    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics", blob);
      return;
    }

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  useEffect(() => {
    if (!idsRef.current) return undefined;
    sentScrollRef.current = new Set();
    pageStartedAtRef.current = Date.now();
    send("page_view", {
      path: window.location.pathname,
      title: document.title
    }, { immediate: true });
    return undefined;
  }, [pathname]);

  useEffect(() => {
    if (status !== "authenticated") return;
    send("session_identified", {}, { immediate: true });
  }, [status]);

  useEffect(() => {
    function handleClick(event) {
      const target = event.target.closest?.("a, button, [role='button'], [data-analytics]");
      if (!target) return;
      send("ui_click", elementPayload(target));
    }

    function handleSubmit(event) {
      const form = event.target;
      send("form_submit", {
        id: form.id || "",
        name: form.getAttribute("name") || "",
        action: form.getAttribute("action") || window.location.pathname,
        method: form.getAttribute("method") || "get"
      }, { immediate: true });
    }

    function handleScroll() {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const percent = Math.round((window.scrollY / scrollable) * 100);
      for (const mark of scrollMarks) {
        if (percent >= mark && !sentScrollRef.current.has(mark)) {
          sentScrollRef.current.add(mark);
          send("scroll_depth", { percent: mark });
        }
      }
    }

    function handleVisibility() {
      if (document.visibilityState !== "hidden") return;
      send("page_hidden", {
        durationMs: Date.now() - pageStartedAtRef.current,
        maxScrollDepth: Math.max(0, ...Array.from(sentScrollRef.current))
      }, { immediate: true, beacon: true });
    }

    function handleError(event) {
      send("client_error", {
        message: String(event.message || "error").slice(0, 240),
        source: String(event.filename || "").slice(0, 160)
      });
    }

    function handleRejection(event) {
      send("client_rejection", {
        message: String(event.reason?.message || event.reason || "promise_rejection").slice(0, 240)
      });
    }

    window.addEventListener("click", handleClick, true);
    window.addEventListener("submit", handleSubmit, true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleVisibility);
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleVisibility);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
      flush();
    };
  }, [context]);

  return null;
}
