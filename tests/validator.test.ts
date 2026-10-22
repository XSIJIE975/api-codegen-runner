import { describe, expect, it } from 'vitest';
import { validateConfig, ConfigValidationError } from '../src/core/validator';

const baseConfig = {
  input: 'https://example.com/openapi.json',
  output: { apiDir: 'src/api', typeDir: 'src/types' },
};

describe('validateConfig', () => {
  it('keeps watch and watchDebounce in the validated output', async () => {
    const config = await validateConfig({
      ...baseConfig,
      watch: false,
      watchDebounce: 500,
    });

    expect(config.watch).toBe(false);
    expect(config.watchDebounce).toBe(500);
  });

  it('rejects non-positive watchDebounce', async () => {
    await expect(
      validateConfig({ ...baseConfig, watchDebounce: 0 }),
    ).rejects.toThrow(ConfigValidationError);

    await expect(
      validateConfig({ ...baseConfig, watchDebounce: -100 }),
    ).rejects.toThrow(ConfigValidationError);
  });

  it('still passes without optional watch options', async () => {
    const config = await validateConfig(baseConfig);

    expect(config.watch).toBeUndefined();
    expect(config.watchDebounce).toBeUndefined();
  });

  it('preserves nested requestConfig.codeGeneration options', async () => {
    const config = await validateConfig({
      ...baseConfig,
      requestConfig: {
        codeGeneration: {
          interfaceExportMode: 'declare',
          typeNamePrefix: 'Demo',
        },
      },
    });

    expect(config.requestConfig?.codeGeneration?.typeNamePrefix).toBe('Demo');
    expect(config.requestConfig?.codeGeneration?.interfaceExportMode).toBe(
      'declare',
    );
  });
});
