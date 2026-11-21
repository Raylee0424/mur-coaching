import 'server-only';

function readApiUrl(): string {
  const value = process.env.API_URL;
  if (!value) {
    throw new Error('API_URL is not set. Copy apps/web/.env.local.example to apps/web/.env.local.');
  }
  return value.replace(/\/+$/, '');
}

export const API_URL = readApiUrl();
