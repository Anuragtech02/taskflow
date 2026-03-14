import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return the same response to prevent email enumeration
  const successResponse = NextResponse.json({
    message: "If an account exists with that email, a reset link has been sent.",
  });

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.passwordHash) {
      return successResponse;
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db
      .update(users)
      .set({
        resetToken: token,
        resetTokenExpiresAt: expiresAt,
      })
      .where(eq(users.id, user.id));

    await sendPasswordResetEmail(email, token);
  } catch (error) {
    console.error("Forgot password error:", error);
  }

  return successResponse;
}
