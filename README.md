# Docsify Code Tools

A set of Docsify plugins for copying, collapsing, labeling, and numbering code blocks.

一组可按需组合的 Docsify 代码块插件，提供复制、折叠、标题栏和行号。

| 插件 | 用途 | 说明 |
| --- | --- | --- |
| `docsify-copy-code-v2.js` | 给代码块添加复制按钮 | [配置](docs/copy.md) |
| `docsify-code-collapse.js` | 折叠较长的代码块 | [配置](docs/collapse.md) |
| `docsify-code-header.js` | 添加代码块标题栏 | [配置](docs/header.md) |
| `docsify-code-line-numbers.js` | 显示代码行号 | [配置](docs/line-numbers.md) |

将 `plugins` 中需要的脚本复制到 Docsify 站点的 `_plugs` 目录，再按各自说明在站点 `index.html` 中引用。组合使用时，按复制、折叠、标题栏、行号的顺序加载。旧版复制插件 `docsify-copy-code-javen.js` 也附在仓库中，两个复制版本选其一。

## 许可

插件源码中的许可声明见各文件头。
