import { camelCase } from 'lodash-es';

const TS_BUILTIN_TYPES = new Set([
  'string',
  'number',
  'boolean',
  'any',
  'void',
  'null',
  'undefined',
  'never',
  'unknown',
  'object',
  'true',
  'false',
  'symbol',
  'bigint',
  'Array',
  'Record',
  'Date',
  'Promise',
  'Error',
  'Map',
  'Set',
  'ReadonlyArray',
  'Function',
  'Partial',
  'Required',
  'Readonly',
  'Pick',
  'Exclude',
  'Extract',
  'Omit',
  'NonNullable',
  'Parameters',
  'ConstructorParameters',
  'ReturnType',
  'InstanceType',
  'ThisParameterType',
  'OmitThisParameter',
  'ThisType',
]);

/**
 * 提取类型引用，用于生成 import 语句
 * 例如: "BaseType<UserDto>" -> ["BaseType", "UserDto"]
 * 支持 PascalCase, camelCase, snake_case 等命名风格
 */
export function extractRefTypes(typeStr: string): string[] {
  if (!typeStr || typeStr === 'any' || typeStr === 'void') return [];

  // 匹配合法的标识符
  const matches = typeStr.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);

  if (!matches) return [];

  return Array.from(new Set(matches)).filter((t) => !TS_BUILTIN_TYPES.has(t));
}

export function toPascalCase(str: string): string {
  const camel = camelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
