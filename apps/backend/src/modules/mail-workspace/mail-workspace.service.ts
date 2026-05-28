import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

@Injectable()
export class MailWorkspaceService {
  private readonly host: string;

  constructor(config: ConfigService) {
    this.host = config.get<string>("MAIL_CLIENT_HOST", "mail.yetrixtechnologies.com");
  }

  async listMessages(input: { email: string; password: string; limit?: number }) {
    const limit = input.limit ?? 20;
    const client = new ImapFlow({
      host: this.host,
      port: 993,
      secure: true,
      auth: {
        user: input.email,
        pass: input.password,
      },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const exists = client.mailbox ? client.mailbox.exists : 0;
      if (exists === 0) {
        return [];
      }

      const start = Math.max(1, exists - limit + 1);
      const messages = [];
      for await (const message of client.fetch(`${start}:*`, {
        envelope: true,
        flags: true,
        internalDate: true,
        uid: true,
      })) {
        messages.push({
          id: String(message.uid),
          from: message.envelope?.from?.map((item) => item.address).join(", ") ?? "",
          subject: message.envelope?.subject ?? "(No subject)",
          date: message.internalDate ? new Date(message.internalDate).toISOString() : null,
          seen: message.flags?.has("\\Seen") ?? false,
        });
      }

      return messages.reverse();
    } finally {
      lock.release();
      await client.logout();
    }
  }

  async sendMessage(input: {
    from: string;
    password: string;
    to: string;
    subject: string;
    text: string;
    cc?: string;
  }) {
    const transport = nodemailer.createTransport({
      host: this.host,
      port: 587,
      secure: false,
      auth: {
        user: input.from,
        pass: input.password,
      },
      requireTLS: true,
    });

    const result = await transport.sendMail({
      from: input.from,
      to: input.to,
      cc: input.cc,
      subject: input.subject,
      text: input.text,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }
}
