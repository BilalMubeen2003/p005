import { useLayoutEffect, useRef } from "react";

// Textarea that grows with its content.
export default function AutoTextarea({ value, minRows = 3, className = "", ...rest }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      className={`input textarea ${className}`}
      {...rest}
    />
  );
}
