const normalizeMojibake = (value) => {
  const text = String(value ?? "");
  if (!/[ÃâÅÄ]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from([...text].map((ch) => ch.charCodeAt(0) & 0xff));
    const fixed = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return fixed || text;
  } catch {
    return text;
  }
};

export const pushToast = (message, type = "info", duration = 4200) => {
  if (typeof window === "undefined") return;
  const detail = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message: normalizeMojibake(message),
    type,
    duration,
  };
  window.dispatchEvent(new CustomEvent("app-toast", { detail }));
};
