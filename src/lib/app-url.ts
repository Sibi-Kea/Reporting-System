function normalizeUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

export function getAppBaseUrl() {
  const explicitUrl = process.env.NEXTAUTH_URL?.trim();
  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) {
    return normalizeUrl(productionUrl).replace(/\/$/, "");
  }

  const previewUrl = process.env.VERCEL_URL?.trim();
  if (previewUrl) {
    return normalizeUrl(previewUrl).replace(/\/$/, "");
  }

  return "";
}
