import { UserConfig } from '../types';
import pkg from '../../package.json';

/**
 * 默认配置对象
 * 使用 UserConfig 类型进行约束，确保配置项的正确性
 */
export const DEFAULT_CONFIG: UserConfig = {
  clean: true,
  debug: false,
  input: 'https://petstore3.swagger.io/api/v3/openapi.json',
  methodNameCase: 'PascalCase',
  requestConfig: {
    pathClassification: {
      outputPrefix: 'api',
    },
    codeGeneration: {
      parameterNamingStyle: 'PascalCase',
      interfaceExportMode: 'export',
      output: {
        schemas: true,
        interfaces: true,
        apis: true,
      },
    },
  },
  output: {
    apiDir: 'src/api',
    typeDir: 'src/types',
  },
  globalContext: {
    importRequestStr: "import request from '@/utils/request';",
  },
};

/**
 * 生成配置文件内容
 * @returns 带有版本信息和注释的配置文件字符串
 */
export function generateConfigFileContent(): string {
  const date = new Date().toISOString();
  const version = pkg.version;

  return `
import { defineConfig } from 'api-codegen-runner';

/**
 * @version ${version}
 * @generated ${date}
 * 
 * API Codegen Configuration
 * Documentation: https://github.com/XSIJIE975/api-codegen-runner
 */
export default defineConfig({
  clean: ${DEFAULT_CONFIG.clean},
  debug: ${DEFAULT_CONFIG.debug},
  // Option 1: OpenAPI Source (URL or File Path)
  input: '${DEFAULT_CONFIG.input}',

  // Option 2: Apifox Source (Uncomment to use)
  /*
  input: {
    projectId: 'YOUR_PROJECT_ID',
    token: 'YOUR_ACCESS_TOKEN',
  },
  */

  // Generated API method name format
  methodNameCase: '${DEFAULT_CONFIG.methodNameCase}', // 'camelCase' | 'PascalCase' | 'snake_case'

  // Options passed to the underlying parser (api-codegen-universal)
  requestConfig: {
    pathClassification: {
      outputPrefix: '${DEFAULT_CONFIG.requestConfig?.pathClassification?.outputPrefix}',
      // commonPrefix: '/api/v1',
    },
    codeGeneration: {
      parameterNamingStyle: '${DEFAULT_CONFIG.requestConfig?.codeGeneration?.parameterNamingStyle}', // 'PascalCase' | 'camelCase' | 'snake_case'
      interfaceExportMode: '${DEFAULT_CONFIG.requestConfig?.codeGeneration?.interfaceExportMode}', // Interface export mode: 'export' | 'declare'
      output: {
        schemas: ${DEFAULT_CONFIG.requestConfig?.codeGeneration?.output?.schemas},
        interfaces: ${DEFAULT_CONFIG.requestConfig?.codeGeneration?.output?.interfaces},
        apis: ${DEFAULT_CONFIG.requestConfig?.codeGeneration?.output?.apis}
      }
    }
  },

  output: {
    apiDir: '${DEFAULT_CONFIG.output.apiDir}',
    typeDir: '${DEFAULT_CONFIG.output.typeDir}',
  },

  // Custom Templates (Uncomment to use your own templates)
  templates: {
    // api: './templates/api.ejs',
    // type: './templates/type.ejs',
  },

  // Global variables injected into templates
  globalContext: {
    importRequestStr: "${DEFAULT_CONFIG.globalContext?.importRequestStr}",
  },

  // Hooks for custom logic
  "hooks": {
    "onComplete": (config) => {
      // do something after generation completes
    }
  }
});
`.trim();
}
