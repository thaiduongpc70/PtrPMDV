import { createApp } from './app.js';
import { env } from './shared/config/env.js';

const app = createApp();

app.listen(env.port, () => {
  console.log(`Food Delivery API is running on port ${env.port}`);
});
