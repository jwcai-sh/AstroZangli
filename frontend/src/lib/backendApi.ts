const PRODUCTION_BACKEND_ORIGIN = "https://zangli-backend-api.zeabur.app";
const DEVELOPMENT_BACKEND_ORIGIN = "http://127.0.0.1:5001";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

export function getBackendOrigin(): string {
  const configuredOrigin = process.env.BACKEND_ORIGIN?.trim();
  if (configuredOrigin && /^https?:\/\//.test(configuredOrigin)) {
    return trimTrailingSlash(configuredOrigin);
  }

  const legacyApiBase = process.env.BACKEND_API_BASE?.trim();
  if (legacyApiBase && /^https?:\/\//.test(legacyApiBase)) {
    return trimTrailingSlash(legacyApiBase).replace(/\/api$/, "");
  }

  return process.env.NODE_ENV === "production"
    ? PRODUCTION_BACKEND_ORIGIN
    : DEVELOPMENT_BACKEND_ORIGIN;
}

export function getBackendApiBase(): string {
  const configuredApiBase = process.env.BACKEND_API_BASE?.trim();
  if (configuredApiBase && /^https?:\/\//.test(configuredApiBase)) {
    return trimTrailingSlash(configuredApiBase);
  }

  return `${getBackendOrigin()}/api`;
}
