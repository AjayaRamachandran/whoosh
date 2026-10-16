import iconUrl from "../../public/simple-icon.svg";

// Simplified app logo, tinted with currentColor so it sits beside Lucide icons.
export function WhooshIcon({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current mask-contain mask-center mask-no-repeat ${className}`}
      style={{ maskImage: `url("${iconUrl}")` }}
    />
  );
}
