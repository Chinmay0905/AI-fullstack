"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  className?: string;
  label?: string;
  placeholder?: string;
}

/**
 * Section 12: "make editing feel immediate rather than round-tripping for
 * every keystroke." Local state updates on every keystroke; the save call
 * is debounced (700ms) and also fires on blur so a quick edit isn't lost.
 *
 * The tricky part: while the user is mid-edit, background polling keeps
 * refetching the kit — a naive `value` prop sync would stomp on what
 * they're typing every 2s. `savedRef` tracks the last value *this
 * component itself* saved; the effect below only pulls in an external
 * `value` change (a regeneration, an edit from another tab) when it
 * doesn't match what we last saved ourselves — so our own save echoing
 * back through a refetch is a no-op, but a real external change still
 * refreshes the field.
 */
export function EditableText({ value, onSave, multiline, rows, className, label, placeholder }: Props) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(value);

  useEffect(() => {
    if (value !== savedRef.current) {
      setLocal(value);
      savedRef.current = value;
    }
    // Only re-sync on genuinely external changes — see doc comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(next: string) {
    if (next !== savedRef.current) {
      savedRef.current = next;
      onSave(next);
    }
  }

  function handleChange(next: string) {
    setLocal(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(next), 700);
  }

  function handleBlur() {
    if (timer.current) clearTimeout(timer.current);
    commit(local);
  }

  const baseClassName =
    className ??
    "w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm hover:border-neutral-200 focus:border-neutral-400 focus:outline-none";

  if (multiline) {
    return (
      <textarea
        aria-label={label}
        placeholder={placeholder}
        value={local}
        rows={rows ?? 3}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        className={baseClassName}
      />
    );
  }

  return (
    <input
      aria-label={label}
      placeholder={placeholder}
      value={local}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      className={baseClassName}
    />
  );
}
