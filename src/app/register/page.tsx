"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BorderBeam } from "@/components/ui/border-beam";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-white/20">
      {/* Left side - Branding/Hero (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-[#050505] border-r border-white/[0.08] relative overflow-hidden">
        {/* Structural Grid Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <FlickeringGrid
             className="relative inset-0 z-0 size-full [mask-image:radial-gradient(circle_at_center,white,transparent_80%)]"
             squareSize={3}
             gridGap={8}
             color="#ffffff"
             maxOpacity={0.15}
             flickerChance={0.1}
          />
        </div>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center font-bold text-black text-xs tracking-tighter shadow-lg group-hover:scale-105 transition-transform duration-300">
              TF
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              TaskFlow
            </span>
            <div className="h-4 w-[1px] bg-white/[0.1] mx-1"></div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Enterprise</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-[0.9] tracking-tighter text-white">
            Join the <br/><span className="text-zinc-500">elite tier.</span>
          </h1>
          <p className="text-zinc-500 text-lg leading-relaxed font-medium tracking-tight">
            Stop losing context. Start executing. TaskFlow is the workspace for teams who take performance seriously.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="text-xs text-zinc-600 font-medium tracking-tight">
            © {new Date().getFullYear()} TaskFlow Inc.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-600">
             <Link href="#" className="hover:text-zinc-300 transition-colors">Privacy</Link>
             <Link href="#" className="hover:text-zinc-300 transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-black">
        <div className="w-full max-w-[400px] border border-white/[0.08] relative p-8 rounded-2xl bg-[#030303] shadow-2xl space-y-8 z-10 group overflow-hidden">
          <BorderBeam size={200} duration={10} delay={9} colorFrom="#818cf8" colorTo="#c084fc" />
          {/* Mobile Logo */}
          <div className="lg:hidden text-center justify-center flex mb-10">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center font-bold text-black text-xs shadow-lg">
                TF
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">
                TaskFlow
              </span>
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Create your account
            </h2>
            <p className="text-zinc-500 text-sm font-medium">
              Enter your details below to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <div className="space-y-1.5 flex gap-4 w-full">
                <div className="w-full">
                  <label
                    htmlFor="name"
                    className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 bg-transparent border border-white/[0.1] rounded-md text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/[0.2] focus:border-white/[0.2] transition-all bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-transparent border border-white/[0.1] rounded-md text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/[0.2] focus:border-white/[0.2] transition-all bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-white/[0.1] rounded-md text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/[0.2] focus:border-white/[0.2] transition-all bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-1.5"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-transparent border border-white/[0.1] rounded-md text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/[0.2] focus:border-white/[0.2] transition-all bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-red-400 text-xs font-medium flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black py-2.5 rounded-md text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98] mt-2 shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.05]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-semibold">
              <span className="px-4 bg-black text-zinc-600">
                Or continue with
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-white/[0.08] hover:border-white/[0.2] bg-[#050505] hover:bg-white/[0.02] rounded-md text-xs font-semibold text-zinc-300 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-white/[0.08] hover:border-white/[0.2] bg-[#050505] hover:bg-white/[0.02] rounded-md text-xs font-semibold text-zinc-300 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* Login link */}
          <p className="mt-8 text-center text-xs font-semibold text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white hover:text-zinc-300 transition-colors border-b border-white/[0.2] hover:border-white"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
