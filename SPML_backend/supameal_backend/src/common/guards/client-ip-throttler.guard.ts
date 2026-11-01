import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { isIP } from 'net';

/**
 * Rate limits must count requests per *visitor*. On Render every request
 * reaches the app from Render's own proxy, so with the default tracker
 * (`req.ip`) all users shared ONE bucket: five bad logins from anyone locked
 * everybody out of logging in, and per-attacker brute-force limits did not
 * exist.
 *
 * Render sits behind Cloudflare, which writes the real client address into
 * `CF-Connecting-IP` and overwrites any value a client sends, so that header
 * is trustworthy there. It is used when running on Render (Render sets
 * RENDER=true) or when TRUST_CF_CONNECTING_IP=true; set it to "false" to opt
 * out. Everywhere else the Express-derived address is used.
 */
export function shouldTrustCfConnectingIp(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const explicit = env.TRUST_CF_CONNECTING_IP?.trim().toLowerCase();
  if (explicit === 'true') return true;
  if (explicit === 'false') return false;
  return env.RENDER === 'true';
}

export function clientIpFrom(
  req: Record<string, any>,
  env: NodeJS.ProcessEnv = process.env,
): { ip: string; source: 'cf-connecting-ip' | 'express' } {
  if (shouldTrustCfConnectingIp(env)) {
    const raw = req?.headers?.['cf-connecting-ip'];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.toString().trim();
    if (value && isIP(value)) return { ip: value, source: 'cf-connecting-ip' };
  }
  const ip = req?.ips?.length ? req.ips[0] : req?.ip;
  return { ip: String(ip ?? 'unknown'), source: 'express' };
}

/** Which forwarding headers a request carried (names and counts only). */
export function forwardingShape(req: Record<string, any>): string {
  const h = req?.headers ?? {};
  const xff = String(h['x-forwarded-for'] ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return [
    `cf-connecting-ip=${h['cf-connecting-ip'] ? 'yes' : 'no'}`,
    `true-client-ip=${h['true-client-ip'] ? 'yes' : 'no'}`,
    `x-forwarded-for entries=${xff.length}`,
  ].join(', ');
}

@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  private readonly ipLogger = new Logger('RateLimit');
  private reportedVisitorIp = false;
  private reportedFallback = false;

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const { ip, source } = clientIpFrom(req);
    // At most two log lines per process, so the deployment can be checked from
    // the logs. Addresses themselves are never logged.
    if (source === 'cf-connecting-ip' && !this.reportedVisitorIp) {
      this.reportedVisitorIp = true;
      this.ipLogger.log(
        'Rate limits are keyed on the visitor IP from CF-Connecting-IP.',
      );
    } else if (
      source === 'express' &&
      shouldTrustCfConnectingIp() &&
      !this.reportedFallback &&
      !String(req?.url ?? '').startsWith('/health')
    ) {
      // Internal health checks never pass through Cloudflare; only report
      // real traffic that arrives without the header.
      this.reportedFallback = true;
      this.ipLogger.warn(
        `A request arrived without CF-Connecting-IP (${String(req?.url ?? '').split('?')[0]}; ${forwardingShape(req)}); it was keyed on the proxy address.`,
      );
    }
    return ip;
  }
}
