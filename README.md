# API Codegen Runner

[![npm version](https://img.shields.io/npm/v/api-codegen-runner.svg)](https://www.npmjs.com/package/api-codegen-runner)
[![License](https://img.shields.io/npm/l/api-codegen-runner.svg)](https://github.com/XSIJIE975/api-codegen-runner/blob/main/LICENSE)

An efficient API code generation tool built on `api-codegen-universal`. Supports OpenAPI (Swagger) 3.0/3.1 and Apifox data sources, generating standardized TypeScript interface definitions and request functions via the EJS template engine.

## Core Features

- **Multi-Source Compatibility**: Perfect support for OpenAPI (Swagger) specifications and Apifox project synchronization.
- **Type Safety**: Automatically generates complete TypeScript type definitions, supporting generics and complex nested structures.
- **Highly Configurable**: Built-in EJS template engine supporting fully custom code generation logic.
- **Developer Friendly**: Provides CLI tools and Watch mode, supporting hot configuration updates and automatic synchronization.
- **Flexible Extension**: Supports lifecycle hooks, path rewriting, method name formatting, and type normalization.

## Installation

Recommended to install as a development dependency:

```bash
# npm
npm install api-codegen-runner -D

# pnpm
pnpm add api-codegen-runner -D

# yarn
yarn add api-codegen-runner -D
```

## Quick Start

### 1. Initialize Configuration

Run the initialization command in the project root directory:

```bash
npx api-codegen-runner init
```

This command will generate a `codegen.config.ts` configuration file. If you need custom generation templates, you can choose to eject the default templates locally during the interaction.

### 2. Modify Configuration

Edit `codegen.config.ts` to configure data sources and output options:

```typescript
import { defineConfig } from 'api-codegen-runner';

export default defineConfig({
  // Data source: Supports URL or local JSON file path
  input: 'https://petstore3.swagger.io/api/v3/openapi.json',

  // Output settings
  output: {
    apiDir: 'src/api', // API function output directory
    typeDir: 'src/types', // Type definition output directory
    separateTypes: true, // Whether to split type files
  },

  // Generation options
  methodNameCase: 'PascalCase', // Method name format: PascalCase | camelCase | snake_case
  clean: true, // Clean directory before generation

  // Global context: Variables injected into templates
  globalContext: {
    importRequestStr: "import request from '@/utils/request';",
  },
});
```

### 3. Generate Code

Execute the generation command:

```bash
npx api-codegen-runner generate
```

It is recommended to add shortcut scripts to `package.json`:

```json
{
  "scripts": {
    "api:gen": "api-codegen-runner generate",
    "api:watch": "api-codegen-runner generate --watch"
  }
}
```

## CLI Commands

| Command    | Description                               | Options                                                                        |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------ |
| `init`     | Initialize configuration file             | -                                                                              |
| `generate` | Execute code generation (default command) | `-c, --config <path>`: Specify config path<br>`-w, --watch`: Enable watch mode |
| `update`   | Update tool or templates                  | -                                                                              |

## Vite Integration

This tool provides a Vite plugin that automatically generates code when the development server starts and regenerates when configuration or template files change.

### Usage

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { ApiCodegenPlugin } from 'api-codegen-runner';

export default defineConfig({
  plugins: [ApiCodegenPlugin()],
});
```

The plugin will:

- Run code generation on server start (dev mode only).
- Watch `codegen.config.ts` and `.ejs` template files.
- Automatically regenerate code when changes are detected.

## Configuration Reference

The `UserConfig` interface definition is as follows:

```typescript
import type {
  OpenAPIOptions,
  ApifoxConfig,
  InputSource,
} from 'api-codegen-universal';

interface UserConfig {
  /**
   * Data source configuration
   * - string: OpenAPI URL or local file path
   * - object: Apifox project configuration
   * See [InputSource | ApifoxConfig](https://www.npmjs.com/package/api-codegen-universal)
   */
  input: InputSource | ApifoxConfig;

  /**
   * Explicitly specify mode (optional)
   * Defaults to 'openapi' if input is string
   * Defaults to 'apifox' if input is object
   */
  mode?: 'openapi' | 'apifox';

  /** Output configuration */
  output: {
    apiDir: string; // API file output path
    typeDir: string; // Type file output path
    /** Whether to generate types as separate files (default: false, generates single index.ts) */
    separateTypes?: boolean;
  };

  /**
   * API method name formatting style
   * @default 'camelCase'
   */
  methodNameCase?: 'camelCase' | 'PascalCase' | 'snake_case';

  /**
   * Underlying parser configuration (api-codegen-universal)
   * Controls path classification, parameter naming style, interface export mode, etc.
   * See [OpenAPIOptions](https://www.npmjs.com/package/api-codegen-universal)
   */
  requestConfig?: OpenAPIOptions;

  /** Whether to clean the output directory before generation */
  clean?: boolean;

  /** Whether to enable debug mode (outputs debug files to .debug directory) */
  debug?: boolean;

  /** Custom template paths */
  templates?: {
    api?: string; // API generation template path (.ejs)
    type?: string; // Type generation template path (.ejs)
  };

  /** Global context, injected into EJS templates, accessible via `config` in templates */
  globalContext?: Record<string, any>;

  /** Lifecycle hooks */
  hooks?: {
    /** Callback after generation completes */
    onComplete?: (config: UserConfig) => void | Promise<void>;
  };
}
```

### Apifox Configuration Example

```typescript
export default defineConfig({
  input: {
    projectId: '123456',
    token: 'YOUR_APIFOX_ACCESS_TOKEN',
  },
  // ...other config
});
```

## Template Customization

This tool uses EJS as the template engine. You can eject default templates via the `init` command or manually create `.ejs` files.

### Template Context (ViewModel)

The following variables are available in templates. The complete type definitions are as follows:

```typescript
/** Root object passed to the template */
interface ApiFileViewModel {
  meta: {
    generatedAt: string; // Generation time ISO string
  };
  imports: {
    types: string[]; // List of types referenced in the current file
    relativePath: string; // Relative path to the type directory
  };
  /** Interface export mode, from requestConfig */
  interfaceExportMode: 'export' | 'declare';
  /** globalContext from global configuration */
  config: Record<string, unknown>;
  /** List of API functions */
  functions: ApiFunctionViewModel[];
}

/** Data model for a single API function */
interface ApiFunctionViewModel {
  name: string; // Function name
  method: string; // HTTP method (get, post, put...)
  url: string; // Request path (may contain template variables ${id})
  description: string; // Interface description
  responseType: string; // Return type string

  hasPathParams: boolean; // Whether it has path parameters
  hasQueryParams: boolean; // Whether it has query parameters
  hasBody: boolean; // Whether it has a request body

  /**
   * Pre-generated function parameter signature string
   * Example: "id: string, dto: UserDto"
   */
  paramsSignature: string;

  /** Detailed parameter list for custom generation logic */
  allParams: FunctionParam[];
}

/** Parameter details */
interface FunctionParam {
  name: string; // Parameter name
  type: string; // Parameter type
  in: 'path' | 'query' | 'body'; // Parameter location
  required: boolean; // Whether it is required
}
```

### Utility Functions (utils)

The `utils` object is also injected into the template, containing the following formatting tools:

- `camelCase(str)`: camelCase naming (user-name -> userName)
- `pascalCase(str)`: PascalCase naming (user_name -> UserName)
- `kebabCase(str)`: kebab-case naming (userName -> user-name)
- `upperFirst(str)`: Capitalize first letter (userName -> UserName)
- `commentBlock(str)`: Generate JSDoc comment block

## License

MIT
