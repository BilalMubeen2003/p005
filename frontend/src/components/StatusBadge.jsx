import Icon from "./Icon";

export default function StatusBadge({ status }) {
  if (status === "approved") {
    return (
      <span className="badge badge-ok">
        <Icon name="check" size={12} strokeWidth={2.4} /> Approved
      </span>
    );
  }
  return (
    <span className="badge badge-pending">
      <span className="dot" /> Pending review
    </span>
  );
}
