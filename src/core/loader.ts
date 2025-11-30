import { OpenAPIAdapter, ApifoxAdapter } from 'api-codegen-universal';
import type { StandardOutput, ApifoxConfig, InputSource } from 'api-codegen-universal';
import chalk from 'chalk';
import { UserConfig } from '../types'

export class DataLoader {
  async load(config: UserConfig): Promise<StandardOutput> {
    const { input, mode, requestConfig } = config;

    // 1. 自动判断模式
    let adapterType = mode;
    if (!adapterType) {
      if (typeof input === 'string') {
        adapterType = 'openapi';
      } else if (typeof input === 'object' && 'projectId' in input) {
        adapterType = 'apifox';
      } else {
        throw new Error('无法自动识别 input 类型，请在配置中显式指定 mode: "openapi" | "apifox"');
      }
    }

    console.log(chalk.blue(`🚀 Mode: [${adapterType}]`));

    // 2. 根据模式调用不同的 Adapter
    let data;
    try {
      if (adapterType === 'apifox') {
        console.log(`⏳ Fetching from Apifox Project: ${(input as ApifoxConfig).projectId}...`);
        const adapter = new ApifoxAdapter();
        data = await adapter.parse(input as ApifoxConfig, requestConfig);
        
      } else {
        console.log(`⏳ Fetching OpenAPI Schema: ${input}...`);
        const adapter = new OpenAPIAdapter();
        data = await adapter.parse(input as InputSource, requestConfig);
      }
      
      console.log(chalk.green(`✅ Schema loaded successfully.`));
      return data as StandardOutput;

    } catch (error: any) {
      console.error(chalk.red('❌ Data loading failed:'));
      console.error(error);
      throw error;
    }
  }
}