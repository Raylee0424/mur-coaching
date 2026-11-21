/** ISO-8601 timestamp as serialized by the API. */
export type IsoDateString = string;
/** Prisma Decimal columns serialize to JSON strings. Convert only in presentation code. */
export type DecimalString = string;

/** Nest exception body. Validation failures carry `message: string[]`. */
export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
