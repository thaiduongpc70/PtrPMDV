import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { HttpError } from '../../shared/http/http-error.js';

const mimeToExtension = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);

export async function storeImageData(dataUrl, folder = 'restaurants') {
  const match = String(dataUrl ?? '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) throw new HttpError(400, 'Image data must be a JPEG, PNG or WebP data URL');
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) throw new HttpError(400, 'Image must be between 1 byte and 5 MB');
  const extension = mimeToExtension.get(match[1]);
  const root = join(process.cwd(), '..', '..', 'storage', folder);
  await mkdir(root, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(join(root, fileName), buffer, { flag: 'wx' });
  return `/uploads/${folder}/${fileName}`;
}
