export type MediaErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NETWORK_ERROR"
  | "API_ERROR"
  | "INVALID_RESPONSE"
  | "ABORTED";

interface MediaClientErrorOptions {
  code: MediaErrorCode;
  status?: number;
  retryable?: boolean;
  cause?: unknown;
}

export class MediaClientError extends Error {
  readonly code: MediaErrorCode;
  readonly status: number | undefined;
  readonly retryable: boolean;

  constructor(message: string, options: MediaClientErrorOptions) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "MediaClientError";
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}
