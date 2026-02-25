"use client";

import { useEffect } from "react";

export default function RecoveryHashRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash.includes("access_token=")) return;
    if (window.location.pathname === "/reset-password") return;

    window.location.replace(`/reset-password${hash}`);
  }, []);

  return null;
}
