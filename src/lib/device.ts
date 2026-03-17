export function normalizeDeviceLabel(value: string) {
  const trimmed = value.replace(/\s+/g, " ").trim();

  if (trimmed.length <= 120) {
    return trimmed;
  }

  return `${trimmed.slice(0, 117).trimEnd()}...`;
}

export function getClientDeviceLabel() {
  if (typeof navigator === "undefined") {
    return "Web Browser";
  }

  const userAgent = navigator.userAgent;
  const platform =
    /iPhone/i.test(userAgent)
      ? "iPhone"
      : /iPad/i.test(userAgent)
        ? "iPad"
        : /Android/i.test(userAgent)
          ? "Android"
          : /Windows/i.test(userAgent)
            ? "Windows"
            : /Macintosh|Mac OS X/i.test(userAgent)
              ? "Mac"
              : /Linux/i.test(userAgent)
                ? "Linux"
                : "Web";

  const browser =
    /Edg\//i.test(userAgent)
      ? "Edge"
      : /OPR\//i.test(userAgent)
        ? "Opera"
        : /FxiOS|Firefox\//i.test(userAgent)
          ? "Firefox"
          : /CriOS|Chrome\//i.test(userAgent)
            ? "Chrome"
            : /Safari\//i.test(userAgent)
              ? "Safari"
              : "Browser";

  return normalizeDeviceLabel(`${platform} ${browser}`);
}
