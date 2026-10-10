import { useEffect } from "react";
import Icon from "./Icon";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(onClose, 3400);
    return () => window.clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const icon = toast.tone === "success" ? "checkCircle" : toast.tone === "warning" ? "alert" : "info";
  return (
    <div className={`toast toast-${toast.tone}`} role="status">
      <Icon name={icon} size={16} />
      <span>{toast.message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
