"use client";

import { useState } from "react";

export default function HelpfulFeedback({ slug }: { slug: string }) {
  const [voted, setVoted] = useState(false);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);

  function vote(v: "yes" | "no") {
    setChoice(v);
    setVoted(true);
    // Persist in sessionStorage so refreshing the same page won't re-ask
    try {
      sessionStorage.setItem(`feedback_${slug}`, v);
    } catch {}
  }

  if (voted) {
    return (
      <div className="mt-8 rounded-2xl bg-green-50 p-5 text-center">
        <p className="font-bold text-green-700">
          {choice === "yes" ? "感谢反馈！很高兴对您有帮助。" : "感谢告知，我们会持续完善教程内容。"}
        </p>
        <p className="mt-2 text-sm text-green-600">
          如有其他问题，欢迎{" "}
          <a href="/faq" className="underline">查看 FAQ</a> 或{" "}
          <a href="/tickets" className="underline">提交售后工单</a>。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center">
      <p className="font-bold text-slate-700">这个教程对您有帮助吗？</p>
      <div className="mt-4 flex justify-center gap-4">
        <button
          onClick={() => vote("yes")}
          className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
        >
          有帮助 👍
        </button>
        <button
          onClick={() => vote("no")}
          className="rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400"
        >
          没帮助 👎
        </button>
      </div>
    </div>
  );
}
