import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Trophy,
  ArrowRight,
  Compass,
  X,
} from "lucide-react";
import { Role } from "../../types";

export interface QuestTask {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

export interface OnboardingQuestBarProps {
  role: Role;
  tasks: QuestTask[];
  onStartTour: () => void;
  onDismissPermanently?: () => void;
}

export const OnboardingQuestBar: React.FC<OnboardingQuestBarProps> = ({
  role,
  tasks,
  onStartTour,
  onDismissPermanently,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("cleanique_quest_expanded");
      return saved === null ? true : saved === "true";
    } catch {
      return true;
    }
  });

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("cleanique_quest_dismissed") === "true";
    } catch {
      return false;
    }
  });

  if (isDismissed) return null;

  const completedCount = tasks.filter((t) => t.isCompleted).length;
  const totalCount = tasks.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isAllDone = completedCount === totalCount;

  const toggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    try {
      localStorage.setItem("cleanique_quest_expanded", next ? "true" : "false");
    } catch {}
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("cleanique_quest_dismissed", "true");
    } catch {}
    onDismissPermanently?.();
  };

  return (
    <aside
      aria-label="Checklist Onboarding Misi"
      className="fixed bottom-6 left-4 sm:left-6 z-40 max-w-sm w-[calc(100%-32px)] sm:w-84 no-print animate-fade-in"
    >
      {/* ========================================================================= */}
      {/* COLLAPSED PILL STATE                                                      */}
      {/* ========================================================================= */}
      {!isExpanded ? (
        <button
          type="button"
          onClick={toggleExpand}
          className="group flex items-center justify-between gap-3 w-full px-3.5 py-2.5 rounded-2xl bg-[#091b26]/95 border border-emerald-500/30 text-white shadow-xl shadow-black/40 backdrop-blur-md hover:border-emerald-400/60 transition-all cursor-pointer"
          title="Klik untuk membuka checklist misi onboarding"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
              {isAllDone ? (
                <Trophy className="w-4 h-4 text-amber-300" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400" />
              )}
            </span>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-white block truncate">
                {isAllDone ? "Misi Selesai!" : role === "staff" ? "Checklist Kasir" : "Misi Setup Toko"}
              </span>
              <span className="text-[10px] text-emerald-300 font-semibold block">
                {completedCount}/{totalCount} Tugas ({progressPercent}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-white transition-colors">
            <ChevronUp className="w-4 h-4" />
          </div>
        </button>
      ) : (
        /* ========================================================================= */
        /* EXPANDED CHECKLIST CARD                                                   */
        /* ========================================================================= */
        <div className="flex flex-col bg-gradient-to-b from-[#0e2230] via-[#091b26] to-[#06121b] border border-emerald-500/30 rounded-3xl shadow-2xl shadow-black/70 text-white overflow-hidden backdrop-blur-md transition-all">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {isAllDone ? (
                  <Trophy className="w-4 h-4 text-amber-300" />
                ) : (
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                )}
              </span>
              <div>
                <h4 className="text-xs font-extrabold text-white leading-tight">
                  {role === "staff" ? "Checklist Kasir Baru" : "Misi Setup Outlet"}
                </h4>
                <p className="text-[10px] text-slate-400 font-medium">
                  {completedCount} dari {totalCount} tugas selesai
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={toggleExpand}
                className="p-1 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
                title="Kecilkan widget"
                aria-label="Kecilkan widget"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:text-white hover:bg-white/10 transition-colors"
                title="Tutup checklist"
                aria-label="Tutup checklist"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5 text-slate-300">
              <span>Progres Misi</span>
              <span className="text-emerald-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                style={{ width: `${progressPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-sm shadow-emerald-400/50"
              />
            </div>
          </div>

          {/* Task List */}
          <div className="p-3.5 space-y-2 max-h-56 overflow-y-auto">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={task.onAction}
                className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all ${
                  task.isCompleted
                    ? "bg-emerald-950/20 border-emerald-500/20 text-slate-300 opacity-80"
                    : "bg-white/[0.04] border-white/5 text-white hover:bg-white/[0.08] hover:border-emerald-500/30 cursor-pointer"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 hover:text-emerald-400 transition-colors" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-semibold leading-tight ${
                      task.isCompleted ? "line-through text-slate-400" : "text-slate-100"
                    }`}
                  >
                    {task.title}
                  </div>
                  {task.description && (
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                      {task.description}
                    </p>
                  )}
                </div>

                {!task.isCompleted && task.actionLabel && (
                  <span className="text-[10px] font-bold text-emerald-300 hover:text-emerald-200 shrink-0 self-center flex items-center gap-0.5">
                    {task.actionLabel}
                    <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Footer Action: Mulai Tur Spotlight */}
          <div className="px-4 py-2.5 border-t border-white/10 bg-slate-950/40 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onStartTour}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 hover:underline transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Buka Tur Spotlight Layar</span>
            </button>

            {isAllDone && (
              <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" /> Hebat!
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
