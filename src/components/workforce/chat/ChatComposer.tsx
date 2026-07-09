"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CHAT_MAX_BODY_LENGTH } from "@/lib/workforce/chat-types";

export function ChatComposer({
  disabled,
  disabledReason,
  sending,
  onSend,
  className = "",
}: {
  disabled?: boolean;
  disabledReason?: string;
  sending?: boolean;
  onSend: (text: string) => Promise<void>;
  className?: string;
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || sending) return;
    await onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, disabled, sending, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value.slice(0, CHAT_MAX_BODY_LENGTH));
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const remaining = CHAT_MAX_BODY_LENGTH - text.length;

  return (
    <div className={`border-t border-ink/[0.06] bg-surface/95 px-4 py-3 backdrop-blur-md ${className}`}>
      {disabled && disabledReason ? (
        <p className="mb-2 rounded-lg bg-warning-tint px-3 py-2 text-xs text-warning">
          {disabledReason}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder={disabled ? "Messaging unavailable" : "Write a message… (Enter to send)"}
          rows={1}
          className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-xl border border-ink/10 bg-canvas px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button
          variant="primary"
          size="md"
          loading={sending}
          disabled={disabled || !text.trim()}
          onClick={() => void handleSubmit()}
          className="shrink-0"
        >
          Send
        </Button>
      </div>
      {!disabled && text.length > CHAT_MAX_BODY_LENGTH * 0.8 ? (
        <p className="mt-1 text-right text-[10px] text-ink/35">{remaining} left</p>
      ) : null}
    </div>
  );
}
