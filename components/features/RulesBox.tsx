"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  isAdmin: boolean;
};

export default function RulesBox({ isAdmin }: Props) {
  const [rules, setRules] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 로드
  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "rules")
        .single();
      if (data) setRules(data.value);
    };
    load();
  }, []);

  const handleEdit = () => {
    setDraft(rules);
    setEditing(true);
    setMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("app_config")
      .update({ value: draft })
      .eq("key", "rules");

    if (error) {
      setMessage("저장 실패");
    } else {
      setRules(draft);
      setEditing(false);
      setMessage("저장됨 ✅");
      setTimeout(() => setMessage(""), 2000);
    }
    setSaving(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setMessage("");
  };

  return (
    <div className="border border-gray-700 rounded-xl p-4 bg-gray-900/50">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-300">📜 룰</h2>
        <div className="flex gap-2 items-center">
          {message && <span className="text-xs text-green-400">{message}</span>}
          {isAdmin && !editing && (
            <button
              onClick={handleEdit}
              className="px-3 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              수정
            </button>
          )}
          {isAdmin && editing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full h-40 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-y"
          placeholder="내전 룰을 입력하세요..."
          autoFocus
        />
      ) : (
        <div className="text-sm text-gray-300 whitespace-pre-wrap min-h-[40px]">
          {rules || <span className="text-gray-600">룰이 아직 설정되지 않았습니다.</span>}
        </div>
      )}
    </div>
  );
}
