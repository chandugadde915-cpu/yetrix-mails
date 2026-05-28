import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

@Injectable()
export class MailWorkspaceService {
  private readonly host: string;

  constructor(config: ConfigService) {
    this.host = config.get<string>("MAIL_CLIENT_HOST", "mail.yetrixtechnologies.com");
  }

  async testConnection(input: { email: string; password: string }) {
    await this.withImap(input, async (client) => {
      await client.noop();
    });

    const transport = this.smtpTransport(input);
    await transport.verify();

    return {
      imap: true,
      smtp: true,
      host: this.host,
    };
  }

  async listMessages(input: { email: string; password: string; limit?: number }) {
    const limit = input.limit ?? 20;
    return this.withInbox(input, async (client) => {
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
        source: { maxLength: 3500 },
        uid: true,
      })) {
        const text = this.rawBodyText(message.source);
        messages.push({
          id: String(message.uid),
          from: message.envelope?.from?.map((item) => item.address).join(", ") ?? "",
          to: message.envelope?.to?.map((item) => item.address).join(", ") ?? "",
          subject: message.envelope?.subject ?? "(No subject)",
          date: message.internalDate ? new Date(message.internalDate).toISOString() : null,
          seen: message.flags?.has("\\Seen") ?? false,
          preview: this.preview(text),
        });
      }

      return messages.reverse();
    });
  }

  async getMessage(input: { email: string; password: string; id: string }) {
    return this.withInbox(input, async (client) => {
      const message = await client.fetchOne(
        input.id,
        {
          envelope: true,
          flags: true,
          internalDate: true,
          source: { maxLength: 200000 },
          uid: true,
        },
        { uid: true },
      );

      if (!message) {
        throw new NotFoundException("Message not found");
      }

      await client.messageFlagsAdd(input.id, ["\\Seen"], { uid: true });
      const text = this.rawBodyText(message.source);

      return {
        id: String(message.uid),
        from: message.envelope?.from?.map((item) => item.address).join(", ") ?? "",
        to: message.envelope?.to?.map((item) => item.address).join(", ") ?? "",
        cc: message.envelope?.cc?.map((item) => item.address).join(", ") ?? "",
        subject: message.envelope?.subject ?? "(No subject)",
        date: message.internalDate ? new Date(message.internalDate).toISOString() : null,
        seen: true,
        text,
        rawPreview: message.source?.toString("utf8", 0, 6000) ?? "",
      };
    });
  }

  async deleteMessage(input: { email: string; password: string; id: string }) {
    return this.withInbox(input, async (client) => {
      await client.messageDelete(input.id, { uid: true });
      return {
        id: input.id,
        deleted: true,
      };
    });
  }

  async sendMessage(input: {
    from: string;
    password: string;
    to: string;
    subject: string;
    text: string;
    cc?: string;
  }) {
    const transport = this.smtpTransport({ email: input.from, password: input.password });

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

  private async withInbox<T>(
    input: { email: string; password: string },
    task: (client: ImapFlow) => Promise<T>,
  ) {
    return this.withImap(input, async (client) => {
      const lock = await client.getMailboxLock("INBOX");
      try {
        return await task(client);
      } finally {
        lock.release();
      }
    });
  }

  private async withImap<T>(
    input: { email: string; password: string },
    task: (client: ImapFlow) => Promise<T>,
  ) {
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
    try {
      return await task(client);
    } finally {
      await client.logout();
    }
  }

  private smtpTransport(input: { email: string; password: string }) {
    return nodemailer.createTransport({
      host: this.host,
      port: 587,
      secure: false,
      auth: {
        user: input.email,
        pass: input.password,
      },
      requireTLS: true,
    });
  }

  private rawBodyText(source?: Buffer) {
    if (!source) return "";

    const raw = source.toString("utf8");
    const body = raw.split(/\r?\n\r?\n/).slice(1).join("\n\n") || raw;
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=20/g, " ")
      .replace(/=0A/g, "\n")
      .replace(/\r/g, "")
      .trim();
  }

  private preview(text: string) {
    return text.replace(/\s+/g, " ").trim().slice(0, 180);
  }
}
