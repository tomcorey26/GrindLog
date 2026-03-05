"use client";

export function CookieBanner() {
  return (
    <div
      style={{
        background: "red",
        color: "white",
        textAlign: "center",
        padding: "8px",
        fontWeight: "bold",
        fontSize: "14px",
      }}
    >
      WARNING: Secure cookies are OFF — turn back on before real prod use
    </div>
  );
}
