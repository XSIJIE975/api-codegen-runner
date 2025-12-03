import { defineConfig } from 'tsup';

export default defineConfig({
  // index 用于导包，cli 用于命令行
  entry: ['src/index.ts', 'src/cli.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  // 不打包 node_modules (让它们作为依赖安装)
  skipNodeModulesBundle: true,
  // 关闭代码分割 (让 cli.js 和 index.js 独立，减少出错概率)
  splitting: false,
  target: 'node20',
});