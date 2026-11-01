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

@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  private readonly ipLogger = new Logger('RateLimit');
  private reported = false;

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const { ip, source } = clientIpFrom(req);
    if (!this.reported) {
      // One line on the first request so the deployment can be checked from
      // the logs. The address itself is never logged.
      this.reported = true;
      if (source === 'cf-connecting-ip') {
        this.ipLogger.log(
          'Rate limits are keyed on the visitor IP from CF-Connecting-IP.',
        );
      } else if (shouldTrustCfConnectingIp()) {
        this.ipLogger.warn(
          'CF-Connecting-IP was expected but missing; rate limits fall back to the proxy address.',
        );
      }
    }
    return ip;
  }
}
