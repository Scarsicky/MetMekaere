import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      /*
       * `server-only` is een wachter die klapt zodra je hem buiten een
       * servercomponent importeert. In tests is dat nu juist waar we willen
       * zijn, dus daar vervangen we hem door een leeg bestand. De bescherming
       * in de echte build blijft gewoon staan.
       */
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
