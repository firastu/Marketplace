import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, Transporter } from "nodemailer";

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends email through SMTP when SMTP_HOST is set. Without it (local
 * development, demos) the message is written to the log instead, so a
 * reset link can still be copied from there. Under NODE_ENV=test messages
 * are kept in `outbox` for the e2e tests.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  readonly outbox: OutgoingMail[] = [];

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>("SMTP_HOST");
    const port = Number(config.get<string>("SMTP_PORT") ?? 587);
    const user = config.get<string>("SMTP_USER");
    const pass = config.get<string>("SMTP_PASS");
    this.from =
      config.get<string>("MAIL_FROM") || `Marketplace <no-reply@localhost>`;
    this.transporter = host
      ? createTransport({
          host,
          port,
          secure: port === 465,
          auth: user ? { user, pass } : undefined,
        })
      : null;
  }

  async send(mail: OutgoingMail): Promise<void> {
    if (this.config.get<string>("NODE_ENV") === "test") {
      this.outbox.push(mail);
      return;
    }
    if (!this.transporter) {
      this.logger.warn(
        `SMTP is not configured; email to ${mail.to} not sent. Content:\n` +
          `Subject: ${mail.subject}\n\n${mail.text}`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...mail });
    } catch (err) {
      // Never reveal delivery problems to the requester (it would leak
      // whether an account exists); log them for the operator instead.
      this.logger.error(
        `Failed to send email to ${mail.to}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
