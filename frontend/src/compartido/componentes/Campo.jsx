export function Campo({ label, children }) {
  return (
    <label className="config-field">
      {label}
      {children}
    </label>
  );
}
