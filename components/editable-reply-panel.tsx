"use client";

import { useEffect, useRef, useState } from "react";

type FeedbackTone = "success" | "info";

type EditableReplyPanelProps = {
  text: string;
  onTextChange: (nextText: string) => void;
  onCopy: () => void;
  onSave: () => void;
  onOpenEmailDraft: () => void;
  isSaving?: boolean;
  isSaved?: boolean;
  feedback?: {
    message: string;
    tone: FeedbackTone;
  } | null;
};

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M7.5 6.5h7a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 13.5h-1a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path d="M10 2.5 12.3 7l4.9.7-3.6 3.5.8 4.8-4.4-2.3-4.4 2.3.8-4.8L2.8 7.7 7.7 7 10 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-4 w-4">
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}

export default function EditableReplyPanel({
  text,
  onTextChange,
  onCopy,
  onSave,
  onOpenEmailDraft,
  isSaving = false,
  isSaved = false,
  feedback = null,
}: EditableReplyPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [text]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="mb-4">
      <div className="group rounded-lg border border-slate-800/90 bg-slate-950/35 transition-colors duration-200 hover:border-sky-500/30 focus-within:border-sky-400/50 focus-within:bg-slate-950/55">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          spellCheck
          rows={1}
          className="min-h-[116px] w-full resize-none bg-transparent px-4 py-3.5 text-base leading-relaxed text-slate-100 outline-none placeholder:text-slate-500 md:text-sm md:leading-7"
          aria-label="Editable generated reply"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-sky-500/30 bg-sky-500/12 px-3 text-xs font-medium text-sky-200 transition hover:border-sky-400/50 hover:bg-sky-500/18"
          >
            <CopyIcon />
            Copy
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isSaved
                ? "border border-amber-500/35 bg-amber-500/12 text-amber-200 hover:bg-amber-500/16"
                : "border border-slate-600 bg-slate-900/70 text-slate-200 hover:border-amber-500/40 hover:text-amber-200"
            }`}
          >
            <SaveIcon />
            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
          </button>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-600 bg-slate-900/70 px-3 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-slate-100"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <MoreIcon />
              More
            </button>

            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-2 min-w-[13rem] overflow-hidden rounded-lg border border-slate-700 bg-slate-950/98 shadow-[0_18px_50px_rgba(2,6,23,0.5)] backdrop-blur">
                <button
                  type="button"
                  onClick={() => {
                    onOpenEmailDraft();
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium text-slate-200 transition hover:bg-slate-900/90 hover:text-sky-200"
                >
                  <span>Open email draft</span>
                  <span className="text-slate-500">↗</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-h-[1rem] text-xs text-right">
          {feedback ? <span className={feedback.tone === "success" ? "text-emerald-300" : "text-sky-300"}>{feedback.message}</span> : null}
        </div>
      </div>
    </div>
  );
}
