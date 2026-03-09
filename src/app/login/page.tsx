"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { ArrowRight, Github, Mail } from "lucide-react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BorderBeam } from "@/components/ui/border-beam";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
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
            Access your <br/><span className="text-zinc-500">mission control.</span>
          </h1>
          <p className="text-zinc-500 text-lg leading-relaxed font-medium tracking-tight">
            The powerful, self-hosted project management tool designed for teams who demand speed, flexibility, and absolute control.
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

      {/* Right side - Login Form */}
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
              Log in to TaskFlow
            </h2>
            <p className="text-zinc-500 text-sm font-medium">
              Enter your email and password to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest"
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
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest"
                  >
                    Password
                  </label>
                  <Link href="#" className="text-xs text-zinc-500 hover:text-white transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  Log in
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#09090b] text-zinc-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 transition-all duration-200 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-zinc-300 transition-all duration-200 active:scale-[0.98]"
            >
              <Github className="w-5 h-5" />
              GitHub
            </button>
          </div>

          <p className="text-center text-sm text-zinc-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-white hover:text-indigo-400 font-medium transition-colors border-b border-transparent hover:border-indigo-400/50 pb-0.5"
            >
              Create workspace
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
