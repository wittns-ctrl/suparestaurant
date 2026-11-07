import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;
  const envKeys = [
    'SENDLIBERTY_API_KEY',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'FROM_EMAIL',
  ];
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(async () => {
    for (const key of envKeys) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendContactEmail', () => {
    const dto = {
      fullName: 'Jane',
      email: 'jane@example.com',
      message: 'Hello there, this is a test.',
    };

    it('rejects immediately when no email provider is configured', async () => {
      await expect(service.sendContactEmail(dto)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('responds without waiting for a slow provider', async () => {
      process.env.SENDLIBERTY_API_KEY = 'test-key';
      let finishDelivery: (sent: boolean) => void = () => {};
      const deliver = jest
        .spyOn(service as any, 'deliver')
        .mockReturnValue(
          new Promise<boolean>((resolve) => (finishDelivery = resolve)),
        );

      await expect(service.sendContactEmail(dto)).resolves.toBeUndefined();
      expect(deliver).toHaveBeenCalledTimes(1);
      finishDelivery(true);
    });

    it('logs the message when background delivery fails', async () => {
      process.env.SENDLIBERTY_API_KEY = 'test-key';
      jest.spyOn(service as any, 'deliver').mockResolvedValue(false);
      const print = jest
        .spyOn(service as any, 'printToConsole')
        .mockImplementation(() => {});
      jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});

      await service.sendContactEmail(dto);
      await new Promise((resolve) => setImmediate(resolve));

      expect(print).toHaveBeenCalledWith(
        'CONTACT',
        expect.any(String),
        expect.stringContaining(dto.message),
      );
    });
  });
});
