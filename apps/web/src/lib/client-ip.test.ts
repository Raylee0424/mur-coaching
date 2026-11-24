import { describe, expect, it } from 'vitest';
import { trustedClientIp } from './client-ip';

const headers = (h: Record<string, string>) => (name: string) => h[name] ?? null;

describe('trustedClientIp', () => {
  it('reads only the configured edge header', () => {
    expect(trustedClientIp(headers({ 'cf-connecting-ip': '203.0.113.9' }), 'CF-Connecting-IP')).toBe('203.0.113.9');
    expect(trustedClientIp(headers({ 'x-real-ip': '2001:db8::1' }), 'x-real-ip')).toBe('2001:db8::1');
  });

  it('ignores a spoofed X-Forwarded-For when no header is configured', () => {
    expect(trustedClientIp(headers({ 'x-forwarded-for': '1.2.3.4' }), undefined)).toBeNull();
  });

  it('refuses to treat X-Forwarded-For as the trusted header', () => {
    expect(trustedClientIp(headers({ 'x-forwarded-for': '1.2.3.4' }), 'x-forwarded-for')).toBeNull();
  });

  it('rejects lists and non-IP values', () => {
    expect(trustedClientIp(headers({ 'x-real-ip': '1.2.3.4, 5.6.7.8' }), 'x-real-ip')).toBeNull();
    expect(trustedClientIp(headers({ 'x-real-ip': 'evil' }), 'x-real-ip')).toBeNull();
    expect(trustedClientIp(headers({}), 'x-real-ip')).toBeNull();
  });
});
