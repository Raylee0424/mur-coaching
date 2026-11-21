import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../../config/env.service';

export interface Mail {
  to: string;
  subject: string;
  /** Plain-text body; includes the code or link a human would click. */
  body: string;
}

/**
 * No provider yet: "delivery" is a log line the developer can copy from the API console.
 * Swap this class for a real transport without touching callers.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');

  constructor(private readonly env: EnvService) {}

  send(mail: Mail): void {
    this.logger.log(`To: ${mail.to} | Subject: ${mail.subject}\n${mail.body}`);
  }

  webUrl(path: `/${string}`): string {
    return `${this.env.get('WEB_URL').replace(/\/$/, '')}${path}`;
  }

  sendVerificationCode(to: string, code: string): void {
    this.send({ to, subject: 'Verify your email', body: `Your verification code is ${code}. It expires in 15 minutes.` });
  }

  sendPasswordReset(to: string, token: string): void {
    this.send({
      to,
      subject: 'Reset your password',
      body: `Reset your password: ${this.webUrl(`/reset?token=${encodeURIComponent(token)}`)}\nThis link works once and expires in 1 hour.`,
    });
  }

  sendInvite(to: string, coachName: string, inviteUrl: string): void {
    this.send({ to, subject: `${coachName} invited you to train`, body: `Accept your invite: ${inviteUrl}\nThis link expires in 7 days.` });
  }
}
