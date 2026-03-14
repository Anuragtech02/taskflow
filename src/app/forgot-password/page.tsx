"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowLeft, Mail } from "lucide-react";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BorderBeam } from "@/components/ui/border-beam";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-white/20">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-[#050505] border-r border-white/[0.08] relative overflow-hidden">
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
            <Image src="/logo.png" alt="TaskFlow Logo" width={48} height={48} className="w-12 h-12 object-contain shadow-lg group-hover:scale-105 transition-transform duration-300" />
            <span className="text-white font-semibold text-lg tracking-tight">
              TaskFlow
            </span>
            <div className="h-4 w-[1px] bg-white/[0.1] mx-1"></div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">Enterprise</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-lg mt-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-[0.9] tracking-tighter text-white">
            Locked out?<br /><span className="text-zinc-500">We&apos;ve got you.</span>
          </h1>
          <p className="text-zinc-500 text-lg leading-relaxed font-medium tracking-tight">
            Enter your email and we&apos;ll send you a link to reset your password. You&apos;ll be back in no time.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="text-xs text-zinc-600 font-medium tracking-tight">
            &copy; {new Date().getFullYear()} TaskFlow Inc.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-600">
            <Link href="#" className="hover:text-zinc-300 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-zinc-300 transition-colors">Terms</Link>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-black">
        <div className="w-full max-w-[400px] border border-white/[0.08] relative p-8 rounded-2xl bg-[#030303] shadow-2xl space-y-8 z-10 group overflow-hidden">
          <BorderBeam size={200} duration={10} delay={9} colorFrom="#818cf8" colorTo="#c084fc" />

          {/* Mobile Logo */}
          <div className="lg:hidden text-center justify-center flex mb-10">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image src="/logo.png" alt="TaskFlow Logo" width={48} height={48} className="w-12 h-12 object-contain shadow-lg" />
              <span className="text-white font-semibold text-lg tracking-tight">
                TaskFlow
              </span>
            </Link>
          </div>

          {sent ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto lg:mx-0">
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                  Check your email
                </h2>
                <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                  If an account exists for <span className="text-zinc-300">{email}</span>, we&apos;ve sent a password reset link. It expires in 1 hour.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black py-2.5 rounded-md text-sm font-semibold transition-all duration-200 group active:scale-[0.98] shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
                  Reset your password
                </h2>
                <p className="text-zinc-500 text-sm font-medium">
                  Enter your email address and we&apos;ll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-zinc-400 uppercase tracking-widest"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-transparent border border-white/[0.1] rounded-md text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/[0.2] focus:border-white/[0.2] transition-all bg-[#050505] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                    placeholder="name@company.com"
                    required
                    autoFocus
                  />
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
                      Send reset link
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-zinc-400">
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="text-white hover:text-indigo-400 font-medium transition-colors border-b border-transparent hover:border-indigo-400/50 pb-0.5"
                >
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
