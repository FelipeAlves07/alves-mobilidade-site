"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

type ToastProps = {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
};

export default function Toast({ message, type = "success", duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      window.setTimeout(onClose, 300);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = type === "success" ? "border-emerald-500/30 bg-emerald-500/10" : type === "error" ? "border-red-500/30 bg-red-500/10" : "border-[var(--accent-20)] bg-[var(--bg-card)]";
  const textColor = type === "success" ? "text-emerald-300" : type === "error" ? "text-red-300" : "text-[var(--accent)]";

  return (
    <div className={`fixed bottom-6 right-6 z-[200] transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${bgColor}`}>
        {type === "success" && <CheckCircle2 size={16} className="text-emerald-400" />}
        <p className={`text-sm font-medium ${textColor}`}>{message}</p>
        <button onClick={() => { setVisible(false); window.setTimeout(onClose, 300); }} className="ml-2 cursor-pointer text-zinc-500 hover:text-zinc-300">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
