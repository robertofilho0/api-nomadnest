import { Injectable, Logger } from '@nestjs/common';

/**
 * Envio de e-mail simulado: registra no log.
 * Em produção, trocar por um provedor (SES, SendGrid, @nestjs/mail...).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`📧 Para: ${to} | ${subject} | ${body}`);
  }
}
