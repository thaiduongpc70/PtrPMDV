import { cp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, '..', '..', 'release', 'food-delivery-platform');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(join(root, '..', '..', 'food_delivery_db.sql'), join(output, 'food_delivery_db.sql'));
await cp(join(root, '..', '..', 'docs'), join(output, 'docs'), { recursive: true });
await cp(join(root, '..', '..', 'postman'), join(output, 'postman'), { recursive: true });
await cp(join(root, '..', '..', '.github'), join(output, '.github'), { recursive: true });
await cp(join(root, '..', 'docker-compose.yml'), join(output, 'docker-compose.yml'));
await cp(join(root, '..', 'backend'), join(output, 'backend'), {
  recursive: true,
  filter: source => !source.includes('node_modules') && !source.endsWith('.env') && !source.includes(`${join('backend', 'backups')}`)
});
await cp(join(root, '..', 'frontend'), join(output, 'frontend'), { recursive: true });
console.log(`Release package created at ${output}`);
