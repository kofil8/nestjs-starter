import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../../mail/mail.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    this.logger.log(`Processing email job #${job.id}: ${job.name}`);

    switch (job.name) {
      case 'password-reset':
        await this.mailService.sendPasswordResetEmail(
          job.data.to,
          job.data.resetToken,
        );
        break;
      case 'welcome':
        await this.mailService.sendWelcomeEmail(job.data.to, job.data.name);
        break;
      default:
        this.logger.warn(`Unknown email job type: ${job.name}`);
    }
  }
}
