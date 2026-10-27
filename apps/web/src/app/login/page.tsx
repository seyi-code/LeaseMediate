"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const path = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : {
              email,
              password,
              name: name || undefined,
              organizationName: orgName,
              organizationSlug: orgSlug || orgName.toLowerCase().replace(/\s+/g, "-"),
            };
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Auth failed");
      localStorage.setItem("lm_token", data.token);
      localStorage.setItem("lm_user", JSON.stringify(data.user));
      router.push("/cases");
    } catch (err: any) {
      setError(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card space-y-4">
      <h1 className="text-xl font-bold">{mode === "login" ? "Sign in" : "Create organization"}</h1>
      <div className="flex gap-2 text-sm">
        <button type="button" className={mode === "login" ? "font-semibold text-brand-600" : ""} onClick={() => setMode("login")}>
          Login
        </button>
        <span className="text-slate-300">|</span>
        <button type="button" className={mode === "register" ? "font-semibold text-brand-600" : ""} onClick={() => setMode("register")}>
          Register
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <>
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Organization name" required value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="org-slug" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
          </>
        )}
        <input type="email" required className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" required minLength={10} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Password (min 10)" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
