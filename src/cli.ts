import { Command } from 'commander';
import { loadConfig } from 'unconfig';
import { initCommand } from './commands/init';
import { DataLoader } from './core/loader';
import { Generator } from './core/generator';
import { UserConfig } from './types';

const program = new Command();
program.name('api-codegen-runner').version('1.0.0');

program.command('init').action(initCommand);

program.command('generate', { isDefault: true })
  .option('-c, --config <path>', 'Config path', 'codegen.config')
  .action(async (opts) => {
    const { config } = await loadConfig<UserConfig>({
      sources: [{ files: opts.config, extensions: ['ts', 'js'] }]
    });

    if (!config) {
      console.error('❌ Config not found');
      process.exit(1);
    }

    const loader = new DataLoader();
    const data = await loader.load(config);

    const generator = new Generator(config);
    await generator.generate(data);
  });

program.parse();