/**
 * 提取类型引用，用于生成 import 语句
 * 例如: "ApiResponse<UserDto>" -> ["ApiResponse", "UserDto"]
 */
export function extractRefTypes(typeStr: string): string[] {
  if (!typeStr || typeStr === 'any' || typeStr === 'void') return [];
  // 匹配大写开头的单词
  const matches = typeStr.match(/\b[A-Z][a-zA-Z0-9_]*\b/g);
  return matches ? Array.from(new Set(matches)) : [];
}

export function toCamelCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

export function toPascalCase(str: string): string {
  const camel = toCamelCase(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/\.?([A-Z]+)/g, (x, y) => "_" + y.toLowerCase())
    .replace(/^_/, "");
}