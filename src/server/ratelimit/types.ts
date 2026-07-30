export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

export interface RateLimiter {
  /** Records a hit against `key` and reports whether it's still within the window. */
  check(key: string): Promise<RateLimitResult>;
}
