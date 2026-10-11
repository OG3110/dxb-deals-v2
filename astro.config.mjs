// astro.config.mjs
import { defineConfig } from 'astro/config';
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
});
