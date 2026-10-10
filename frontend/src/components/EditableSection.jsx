import { useState } from "react";
import Icon from "./Icon";
import AutoTextarea from "./AutoTextarea";

/**
 * One section of the report document (Findings, Impression, …).
 * Click the text or "Edit" to change it in place. Ctrl/⌘+Enter saves, Esc cancels.
 */
export default function EditableSection({
  label,
  value,
  original,
  onSave,
  onRevert,
  locked = false,
  tag,
  emphasis = false,
  placeholder = "—",
  hint,
}) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);

  const edited = original !== undefined && value !== original;
  const isEditing = editing && !locked;

  const start = () => {
    if (locked) return;
    setTemp(value);
    setEditing(true);
  };
  const cancel = () => setEditing(false);
  const save = () => {
    onSave(temp.replace(/\s+$/, ""));
    setEditing(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      save();
    }
  };

  return (
    <section
      className={[
        "psec",
        isEditing && "is-editing",
        emphasis && "is-emphasis",
        locked && "is-locked",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="psec-head">
        <h3 className="psec-label">{label}</h3>
        {tag && <span className="chip">{tag}</span>}
        {edited && <span className="chip chip-edited">Edited</span>}
        {!locked && !isEditing && (
          <div className="psec-actions">
            {edited && onRevert && (
              <button type="button" className="btn-text" onClick={onRevert}>
                <Icon name="undo" size={13} /> Revert
              </button>
            )}
            <button type="button" className="btn-text btn-text-primary" onClick={start}>
              <Icon name="pencil" size={13} /> Edit
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="psec-editor">
          <AutoTextarea
            autoFocus
            minRows={3}
            value={temp}
            onChange={(e) => setTemp(e.target.value)}
            onKeyDown={onKeyDown}
            className="paper-textarea"
            aria-label={`Edit ${label}`}
          />
          <div className="psec-editor-bar">
            <span className="hint">
              {hint || "Ctrl + Enter to save · Esc to cancel"}
            </span>
            <div className="row gap-8">
              <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={save}>
                <Icon name="check" size={13} /> Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`psec-body${value ? "" : " is-empty"}`}
          onClick={start}
          onKeyDown={(e) => {
            if (!locked && e.key === "Enter") start();
          }}
          role={locked ? undefined : "button"}
          tabIndex={locked ? undefined : 0}
          title={locked ? undefined : `Click to edit ${label.toLowerCase()}`}
        >
          {value || placeholder}
        </div>
      )}
    </section>
  );
}
