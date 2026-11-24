import { createHash, createHmac } from 'node:crypto';

export interface PresignInput {
  method: 'GET' | 'PUT' | 'HEAD' | 'DELETE';
  host: string;
  /** Absolute object path, e.g. `/bucket/key`. Segments are encoded here. */
  path: string;
  /** Extra query parameters to sign (e.g. response-content-disposition). */
  query?: Record<string, string>;
  /** Headers the caller must send unchanged; signed along with `host`. */
  headers?: Record<string, string>;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  now: Date;
  expiresSeconds: number;
}

/** RFC 3986 percent-encoding, as AWS Signature V4 requires. */
const encode = (value: string): string => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const sha256 = (data: string): string => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string): Buffer => createHmac('sha256', key).update(data).digest();

/**
 * AWS Signature V4 query-string signing for an S3-compatible endpoint (Cloudflare R2). Returns the full URL.
 * Pure, so a known AWS test vector pins it. Payload is never signed: UNSIGNED-PAYLOAD.
 */
export function presignUrl(input: PresignInput): string {
  const amzDate = input.now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const scope = `${day}/${input.region}/s3/aws4_request`;

  const headers: Record<string, string> = { host: input.host };
  for (const [k, v] of Object.entries(input.headers ?? {})) headers[k.toLowerCase()] = v.trim();
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(';');

  const query: Record<string, string> = {
    ...input.query,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${input.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(input.expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k] as string)}`)
    .join('&');
  const canonicalPath = input.path.split('/').map(encode).join('/');
  const canonicalHeaders = headerNames.map((n) => `${n}:${headers[n]}\n`).join('');
  // canonicalHeaders already ends in a newline, so joining with "\n" leaves the blank line the spec requires.
  const canonicalRequest = [input.method, canonicalPath, canonicalQuery, canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, day), input.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  return `https://${input.host}${canonicalPath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
