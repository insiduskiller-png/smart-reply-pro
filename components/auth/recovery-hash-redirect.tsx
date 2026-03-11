"use client";

import { useEffect } from "react";

export default function RecoveryHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const { pathname, hash, search } = window.location;
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
    const queryParams = new URLSearchParams(search);

    const authType = hashParams.get("type") || queryParams.get("type") || "";
    const hasAuthToken = Boolean(
      hashParams.get("access_token") || hashParams.get("token_hash") || queryParams.get("code"),
    );

    if (!hasAuthToken || !authType) return;

    if (authType === "recovery") {
      if (pathname === "/reset-password") return;
      const suffix = hash || search;
      window.location.replace(`/reset-password${suffix}`);
      return;
    }

    if (authType === "signup" || authType === "magiclink" || authType === "invite") {
      if (pathname === "/" || pathname.startsWith("/dashboard")) return;
      window.location.replace("/");
    }
  }, []);

  return null;
}
