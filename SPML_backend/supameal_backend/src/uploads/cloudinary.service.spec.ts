import { v2 as cloudinary } from 'cloudinary';
import { PassThrough } from 'stream';
import { CloudinaryService, MAX_STORED_DIMENSION } from './cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: { config: jest.fn(), uploader: { upload_stream: jest.fn() } },
}));

describe('CloudinaryService.upload', () => {
  const config = {
    get: (key: string) =>
      ({
        CLOUDINARY_CLOUD_NAME: 'demo',
        CLOUDINARY_API_KEY: 'key',
        CLOUDINARY_API_SECRET: 'secret',
        CLOUDINARY_FOLDER: 'supameal',
      })[key],
  };

  it('caps the stored size of every uploaded photo (long side, no upscaling, auto quality)', async () => {
    let received: Record<string, unknown> | undefined;
    (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
      (
        options: Record<string, unknown>,
        done: (e: unknown, r: unknown) => void,
      ) => {
        received = options;
        const sink = new PassThrough();
        sink.on('finish', () =>
          done(null, {
            secure_url: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
            public_id: 'supameal/a',
            bytes: 123,
          }),
        );
        sink.resume();
        return sink;
      },
    );

    const service = new CloudinaryService(config as never);
    const result = await service.upload(Buffer.from('x'), 'jpg', 'a');

    expect(result.public_id).toBe('supameal/a');
    expect(received).toMatchObject({
      folder: 'supameal',
      public_id: 'a',
      format: 'jpg',
      transformation: [
        {
          width: MAX_STORED_DIMENSION,
          height: MAX_STORED_DIMENSION,
          crop: 'limit',
          quality: 'auto:good',
        },
      ],
    });
    expect(MAX_STORED_DIMENSION).toBe(1920);
  });
});
