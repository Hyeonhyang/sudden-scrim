"use server";

import { verifyPassword, createSession, destroySession } from "@/lib/auth";

type ActionResult = { success: boolean; error?: string };

export async function loginAction(password: string): Promise<ActionResult> {
  const valid = await verifyPassword(password);
  if (!valid) {
    return { success: false, error: "비밀번호가 올바르지 않습니다." };
  }
  await createSession();
  return { success: true };
}

export async function logoutAction(): Promise<ActionResult> {
  await destroySession();
  return { success: true };
}
