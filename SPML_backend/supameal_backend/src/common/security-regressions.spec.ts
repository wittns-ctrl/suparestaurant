import {
  BadRequestException,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import {
  clientIpFrom,
  shouldTrustCfConnectingIp,
} from './guards/client-ip-throttler.guard';
import { isTrustedImageRef } from './validators/trusted-image.validator';
import { NewsletterUnsubscribeDto } from 'src/mail/dto/newsletter-unsubscribe.dto';
import { RemoveImageDto } from 'src/restaurants/dto/remove-image.dto';
import { AddImagesDto } from 'src/restaurants/dto/add-images.dto';
import { CreateMenuDto } from 'src/menus/dto/create-menu.dto';
import { UploadsController } from 'src/uploads/uploads.controller';
import { CloudinaryService } from 'src/uploads/cloudinary.service';

// Same options as main.ts
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const validate = (metatype: any, body: unknown) =>
  pipe.transform(body, { type: 'body', metatype });

describe('rate limiting is per visitor, not per proxy', () => {
  const req = (headers: Record<string, string> = {}) => ({
    headers,
    ip: '10.0.0.1', // Render's proxy as seen by Express
    ips: [],
  });

  it('uses CF-Connecting-IP on Render (behind Cloudflare)', () => {
    const env = { RENDER: 'true' };
    expect(
      clientIpFrom(req({ 'cf-connecting-ip': '203.0.113.7' }), env),
    ).toEqual({ ip: '203.0.113.7', source: 'cf-connecting-ip' });
  });

  it('gives two visitors two different buckets', () => {
    const env = { RENDER: 'true' };
    const a = clientIpFrom(req({ 'cf-connecting-ip': '203.0.113.7' }), env);
    const b = clientIpFrom(req({ 'cf-connecting-ip': '198.51.100.9' }), env);
    expect(a.ip).not.toBe(b.ip);
  });

  it('ignores the header outside Render unless explicitly enabled', () => {
    expect(
      clientIpFrom(req({ 'cf-connecting-ip': '203.0.113.7' }), {}).ip,
    ).toBe('10.0.0.1');
    expect(shouldTrustCfConnectingIp({ TRUST_CF_CONNECTING_IP: 'true' })).toBe(
      true,
    );
    expect(
      shouldTrustCfConnectingIp({
        RENDER: 'true',
        TRUST_CF_CONNECTING_IP: 'false',
      }),
    ).toBe(false);
  });

  it('rejects junk in the header and falls back safely', () => {
    const env = { RENDER: 'true' };
    expect(
      clientIpFrom(req({ 'cf-connecting-ip': 'not-an-ip, 1.2.3.4' }), env),
    ).toEqual({ ip: '10.0.0.1', source: 'express' });
  });
});

describe('newsletter unsubscribe cannot be abused with Mongo operators', () => {
  it('rejects an operator object instead of a token', async () => {
    await expect(
      validate(NewsletterUnsubscribeDto, { token: { $ne: null } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a real unsubscribe token (UUID v4)', async () => {
    await expect(
      validate(NewsletterUnsubscribeDto, {
        token: '3b241101-e2bb-4255-8caf-4136c566a962',
      }),
    ).resolves.toBeDefined();
  });

  it('rejects an operator object when removing a gallery image', async () => {
    await expect(
      validate(RemoveImageDto, { imageUrl: { $regex: '.*' } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('only images uploaded to SupaMeal are accepted', () => {
  const cloud = 'dqs9px23b';
  beforeAll(() => {
    process.env.CLOUDINARY_CLOUD_NAME = cloud;
  });

  it('accepts our Cloudinary account and local upload paths', () => {
    expect(
      isTrustedImageRef(
        `https://res.cloudinary.com/${cloud}/image/upload/v1/supameal/u/x.jpg`,
      ),
    ).toBe(true);
    expect(
      isTrustedImageRef(
        '/uploads/0123456789abcdef01234567_3b241101-e2bb-4255-8caf-4136c566a962.png',
      ),
    ).toBe(true);
    expect(
      isTrustedImageRef('/uploads/3b241101-e2bb-4255-8caf-4136c566a962.webp'),
    ).toBe(true);
  });

  it('rejects third-party hosts, other Cloudinary accounts and tricks', () => {
    for (const bad of [
      'https://tracker.example.com/pixel.gif',
      'https://res.cloudinary.com/someone-else/image/upload/x.jpg',
      `https://res.cloudinary.com/${cloud}.evil.com/image/upload/x.jpg`,
      `https://res.cloudinary.com/${cloud}/image/upload/x.jpg") ; background:url("https://evil`,
      'javascript:alert(1)',
      '/uploads/../../etc/passwd',
      'data:image/svg+xml;base64,PHN2Zz4=',
    ]) {
      expect(isTrustedImageRef(bad)).toBe(false);
    }
  });

  it('allows a menu emoji but not a disguised URL', () => {
    expect(isTrustedImageRef('🍽️', { allowEmoji: true })).toBe(true);
    expect(isTrustedImageRef('https://x.io/a', { allowEmoji: true })).toBe(
      false,
    );
  });

  it('allows legacy base64 profile photos only where enabled', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    expect(isTrustedImageRef(data)).toBe(false);
    expect(isTrustedImageRef(data, { allowDataImage: true })).toBe(true);
  });

  it('is enforced on the restaurant gallery and menu DTOs', async () => {
    await expect(
      validate(AddImagesDto, { images: ['https://tracker.example.com/p.gif'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validate(AddImagesDto, {
        images: [`https://res.cloudinary.com/${cloud}/image/upload/a.jpg`],
      }),
    ).resolves.toBeDefined();
    const menu = {
      restaurant: '507f1f77bcf86cd799439011',
      name: 'Soup',
      description: 'Hot',
      price: 5,
      category: 'Mains',
    };
    await expect(
      validate(CreateMenuDto, { ...menu, image: 'https://evil.example/x.png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      validate(CreateMenuDto, { ...menu, image: '🍲' }),
    ).resolves.toBeDefined();
  });
});

describe('uploaded images can only be deleted by their uploader (or an admin)', () => {
  const OWNER_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
  const OWNER_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';
  const config = {
    get: (k: string) =>
      ({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'k',
        CLOUDINARY_API_SECRET: 's',
        CLOUDINARY_FOLDER: 'supameal',
      })[k],
  };

  function build() {
    const cloudinary = new CloudinaryService(config as never);
    const deleteSpy = jest.spyOn(cloudinary, 'delete').mockResolvedValue(true);
    const uploadSpy = jest.spyOn(cloudinary, 'upload').mockResolvedValue({
      secure_url: 'https://res.cloudinary.com/demo/image/upload/x.png',
      public_id: 'supameal/x',
      bytes: 10,
    });
    return {
      controller: new UploadsController(cloudinary),
      deleteSpy,
      uploadSpy,
    };
  }

  it("refuses to delete another owner's image", async () => {
    const { controller, deleteSpy } = build();
    await expect(
      controller.removeCloudinary(`supameal/${OWNER_B}/photo`, {
        id: OWNER_A,
        role: 'owner',
        roles: ['owner'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('lets an owner delete their own image, and an admin delete any', async () => {
    const { controller, deleteSpy } = build();
    await controller.removeCloudinary(`supameal/${OWNER_A}/photo`, {
      id: OWNER_A,
      role: 'owner',
      roles: ['owner'],
    });
    await controller.removeCloudinary(`supameal/${OWNER_B}/photo`, {
      id: 'cccccccccccccccccccccccc',
      role: 'admin',
      roles: ['admin'],
    });
    expect(deleteSpy).toHaveBeenCalledTimes(2);
  });

  it('rejects non-string ids (operator objects) with 400', async () => {
    const { controller } = build();
    await expect(
      controller.removeCloudinary({ $ne: '' } as never, {
        id: OWNER_A,
        role: 'owner',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores new uploads inside the uploader namespace', async () => {
    const { controller, uploadSpy } = build();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64',
    );
    await controller.upload(
      { buffer: png, size: png.length },
      {
        id: OWNER_A,
        role: 'owner',
      },
    );
    const publicId = uploadSpy.mock.calls[0][2];
    expect(publicId.startsWith(`${OWNER_A}/`)).toBe(true);
  });
});
