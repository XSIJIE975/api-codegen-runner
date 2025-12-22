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

const BUILTIN_TYPE_MAP = new Map<string, string>();
TS_BUILTIN_TYPES.forEach((t) => BUILTIN_TYPE_MAP.set(t.toLowerCase(), t));

/**
 * 规范化类型字符串
 * 1. 如果是已存在的 Schema 类型，保持原样
 * 2. 如果是 TS 内置关键字（忽略大小写），转换为正确的内置类型（如 Unknown -> unknown）
 * 3. 其他情况保持原样
 */
export function normalizeType(
  typeStr: string,
  validSchemaNames: Set<string>,
): string {
  if (!typeStr) return typeStr;

  return typeStr.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (match) => {
    // 1. 如果是有效的 Schema 名称，保持原样
    if (validSchemaNames.has(match)) {
      return match;
    }

    // 2. 检查是否为内置类型（忽略大小写）
    const builtin = BUILTIN_TYPE_MAP.get(match.toLowerCase());
    if (builtin) {
      return builtin;
    }

    // 3. 否则保持原样
    return match;
  });
}

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
