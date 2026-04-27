import { defineConfig } from 'orval';

export default defineConfig({
  jsenergy: {
    input: {
      target: 'https://app.jsenergypowerhub.nl/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'lib/api/generated/services',
      schemas: 'lib/api/generated/models',
      client: 'react-query',
      clean: true,
    },
  },
});