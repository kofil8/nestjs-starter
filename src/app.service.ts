import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    const appName = this.configService.get<string>('APP_NAME');
    const description = this.configService.get<string>('DESCRIPTION');
    return `Welcome to ${appName}! ${description}`;
  }
}
