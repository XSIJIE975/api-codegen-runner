import pkg from '../../package.json';

export function generateApiTemplate(): string {
  return `<%# 
  ========================================================================
  API 模板文档
  @version ${pkg.version}

  [警告] 请勿手动修改 @version 字段，该字段用于 CLI 自动更新检测。
  [提示] 如果你需要自定义模板，请确保保留此头部元数据。
  ========================================================================
  
  可用变量:
  
  1. imports (对象)
     - imports.types (string[]): 此文件中使用的类型名称列表。例如 ['UserDto', 'ApiResponse']
     - imports.relativePath (string): 类型目录的相对路径。例如 '../../types'
  
  2. functions (对象数组) - 每个函数对应一个 API 端点
     - fn.name (string): 函数名称。例如 'getUserById'
     - fn.method (string): HTTP 方法 (小写)。例如 'get', 'post'
     - fn.url (string): 带有模板字面量的请求 URL。例如 \`/users/\${id}\`
     - fn.description (string): JSDoc 描述或摘要。
     - fn.responseType (string): TypeScript 返回类型。例如 'ApiSuccessResponse<UserVo>'
     
     - fn.hasPathParams (boolean): URL 是否包含路径参数？
     - fn.hasQueryParams (boolean): 是否有查询参数？
     - fn.hasBody (boolean): 是否有请求体？
     
     - fn.paramsSignature (string): 
       用于函数定义的现成参数字符串。
       例如 "id: string, data: CreateUserDto"
       
     - fn.allParams (Array): 用于自定义逻辑的详细参数列表。
       [
         { name: 'id', type: 'string', in: 'path', required: true },
         { name: 'data', type: 'UserDto', in: 'body', required: true },
         { name: 'params', type: 'PageQuery', in: 'query', required: false }
       ]

  3. interfaceExportMode (string): 'export' | 'declare'

  4. config (对象)
     - 映射自 codegen.config.ts 中的 \`globalContext\`
     - 例如 config.importRequestStr

  5. utils (对象) - 实用工具函数 (基于 lodash-es)
     - utils.camelCase(str): 转换为小驼峰命名 (user-name -> userName)
     - utils.kebabCase(str): 转换为短横线命名 (userName -> user-name)
     - utils.pascalCase(str): 转换为帕斯卡命名 (user_name -> UserName)
     - utils.upperFirst(str): 首字母大写 (userName -> UserName)
     - utils.commentBlock(str): 生成格式化的 /** ... */ 注释块
     
  ========================================================================
%>
<% if (Array.isArray(config.importRequestStr)) { %>
<% config.importRequestStr.forEach(line => { %>
<%- line %>
<% }) %>
<% } else { %>
<%- config.importRequestStr %>
<% } %>
<% if (typeof interfaceExportMode === 'undefined' || interfaceExportMode === 'export') { %>
import type { 
<% imports.types.forEach(t => { %>  <%= t %>,
<% }) %> 
} from '<%= imports.relativePath %>';
<% } %>

<% functions.forEach(fn => { %>
/**
 * <%= fn.description %>
 */
export function <%= fn.name %>(<%- fn.paramsSignature %>) {
  return request.<%= fn.method %><<%- fn.responseType %>>(\`<%= fn.url %>\`, {
    <% if (fn.hasBody) { %>data,<% } %>
    <% if (fn.hasQueryParams) { %>params,<% } %>
  });
}
<% }) %>
`;
}
