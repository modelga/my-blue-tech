import { errorBanner, errorDetailList } from "@/lib/styles";

function stringify(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return JSON.stringify(detail);
}

export function ErrorBanner({ error, details }: { error: string; details?: unknown[] }) {
  const items = details?.filter((d) => d !== null && d !== undefined) ?? [];

  return (
    <div style={errorBanner}>
      <p style={{ margin: 0 }}>{error}</p>
      {items.length > 0 && (
        <ul style={errorDetailList}>
          {items.map((d, i) => (
            <li key={i}>{stringify(d)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
