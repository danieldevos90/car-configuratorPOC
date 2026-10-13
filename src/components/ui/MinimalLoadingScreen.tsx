"use client";

type Props = {
  className?: string;
};

export function MinimalLoadingScreen({ className }: Props) {
  return (
    <div
      className={["loading-screen", className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <span className="loading-screen-line" aria-hidden />
    </div>
  );
}
