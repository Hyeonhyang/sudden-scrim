"use client";

import { useState } from "react";
import { loginAction } from "@/actions/auth";
import TeamBuilder from "@/components/features/TeamBuilder";

export default function Home() {
  const [mode, setMode] = useState<"login" | "admin" | "viewer">("login");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await loginAction(password);
    if (result.success) {
      setMode("admin");
    } else {
      setError(result.error || "로그인 실패");
    }
    setLoading(false);
  };

  if (mode === "admin") {
    return <TeamBuilder isAdmin={true} onGoHome={() => setMode("login")} />;
  }

  if (mode === "viewer") {
    return <TeamBuilder isAdmin={false} onGoHome={() => setMode("login")} />;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 text-[15px]">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">⚔️ SA 내전 팀짜기</h1>
        <p className="text-gray-400 mt-2">서든어택 내전 팀 편성 도구</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-3 w-full max-w-sm">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          className="px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold disabled:opacity-50 transition-colors"
        >
          {loading ? "로그인 중..." : "관리자 로그인"}
        </button>
      </form>

      <button
        onClick={() => setMode("viewer")}
        className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
      >
        🔍 뷰어 모드로 보기 (읽기 전용)
      </button>
    </main>
  );
}
