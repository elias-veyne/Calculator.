/**
 * HistoryPanel.kt-compose  →  HistoryPanel.tsx
 * ============================================================
 * Scrollable log of past calculations with per-entry actions:
 * tap to reuse the result, copy it to the clipboard, or delete
 * the entry with a slide-out animation.
 * ============================================================
 */
import { memo, useState } from "react";
import type { HistoryEntry } from "../viewmodel/useCalculator";

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClear: () => void;
  onTap: (entry: HistoryEntry) => void;
  onCopy: (entry: HistoryEntry) => void;
  onDelete: (id: number) => void;
}

export const HistoryPanel = memo(function HistoryPanel({
  history,
  onClear,
  onTap,
  onCopy,
  onDelete,
}: HistoryPanelProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const handleCopy = (entry: HistoryEntry) => {
    onCopy(entry);
    setCopiedId(entry.id);
    window.setTimeout(() => setCopiedId((c) => (c === entry.id ? null : c)), 1200);
  };

  const handleDelete = (id: number) => {
    setRemovingId(id);
    window.setTimeout(() => {
      onDelete(id);
      setRemovingId(null);
    }, 260);
  };

  return (
    <div className="flex max-h-[44vh] flex-col rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-sm lg:max-h-[calc(100dvh-6rem)]">
      {/* header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-display text-[0.65rem] font-bold tracking-[0.28em] text-slate-300">
          HISTORY
          {history.length > 0 && <span className="ml-2 text-slate-500">({history.length})</span>}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-[0.65rem] font-bold tracking-wider text-slate-500 transition-colors hover:text-pink-300"
        >
          CLEAR
        </button>
      </div>

      {/* entries */}
      <div className="history-scroll flex-1 space-y-1.5 overflow-y-auto p-2">
        {history.length === 0 ? (
          <div className="grid h-full min-h-[96px] place-items-center px-6 text-center">
            <p className="text-xs leading-relaxed text-slate-500">
              No calculations yet.
              <br />
              Results appear here — tap one to reuse it.
            </p>
          </div>
        ) : (
          history.map((entry) => (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => onTap(entry)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onTap(entry);
              }}
              title="Tap to reuse this result"
              className={`group w-full cursor-pointer rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-left transition-all hover:border-cyan-300/30 hover:bg-cyan-300/[0.06] hover:shadow-[0_0_16px_-6px_rgba(0,240,255,0.4)] ${
                removingId === entry.id ? "history-remove" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-[0.55rem] tracking-wider text-slate-600">
                  {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Copy result"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(entry);
                    }}
                    className={`grid h-6 w-6 place-items-center rounded-md text-[0.7rem] transition-all active:scale-90 ${
                      copiedId === entry.id
                        ? "text-cyan-300"
                        : "text-slate-500 hover:bg-white/5 hover:text-cyan-300"
                    }`}
                  >
                    {copiedId === entry.id ? "✓" : "⧉"}
                  </button>
                  <button
                    type="button"
                    aria-label="Delete entry"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(entry.id);
                    }}
                    className="grid h-6 w-6 place-items-center rounded-md text-[0.7rem] text-slate-500 transition-all hover:bg-white/5 hover:text-pink-300 active:scale-90"
                  >
                    ✕
                  </button>
                </span>
              </div>
              <div className="font-display mt-0.5 truncate text-[0.68rem] text-slate-400 group-hover:text-violet-200/80">
                {entry.expression}
              </div>
              <p className="font-display glow-cyan mt-0.5 truncate text-right text-sm font-bold text-cyan-200">
                = {entry.result}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
