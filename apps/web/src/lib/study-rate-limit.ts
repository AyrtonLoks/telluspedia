import {
  checkRateLimit,
  checkRateLimitSync,
  resetRateLimitState,
  type RateLimitOptions,
} from "@/lib/rate-limit";

export type StudyRateLimitOptions = RateLimitOptions;

export function resetStudyRateLimitState(): void {
  resetRateLimitState("studies");
}

export function studyCreationRetryAfter(headers: Headers, now = Date.now()): number {
  const result = checkRateLimitSync("studies", headers, now);
  return result.allowed ? 0 : result.retryAfter;
}

export async function studyCreationRetryAfterAsync(
  headers: Headers,
  now = Date.now(),
  options: StudyRateLimitOptions = {}
): Promise<number> {
  const result = await checkRateLimit("studies", headers, now, options);
  return result.allowed ? 0 : result.retryAfter;
}
