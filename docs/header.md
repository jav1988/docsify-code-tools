# docsify 代码块标题栏装饰插件 使用说明

适用插件版本：**v1.0.0**

代码块标题栏上有四样东西，这个插件给它们各配了一个开关，写在 `window.$docsify.codeHeader` 里，
想留哪个、想关哪个自己定：

| 开关 | 默认 | 是什么 |
| --- | --- | --- |
| `dots` | `true` | 左上角三颗窗口圆点 |
| `langIcon` | `true` | 语言名前面那枚 `<>` 图标 |
| `langPill` | `false` | 语言名用**彩色胶囊**（按语言上色的圆角底板） |
| `langLabel` | `true` | 语言名用**灰色文字** |

**不写这段配置时，页面和以前一模一样**（圆点 + `<>` 图标 + 灰色语言名）——加了插件不会变样，
只有把某个开关改成 `false` / `true` 才会动。

---

## 一、八种组合长什么样

下面这一条是把同一个代码块按不同配置各拍一张拼起来的（真实主题 + 真实插件）：

![开关组合](../主题样式改造/标题栏对比图/_开关组合_标题栏.png)

从上到下：

| 配置 | 标题栏里剩下什么 |
| --- | --- |
| 默认 | 圆点 + `<>` + 灰色语言名 |
| `dots: false` | `<>` + 灰色语言名（圆点让出的位置自动补上，整体左移） |
| `langIcon: false` | 圆点 + 灰色语言名 |
| `langPill: true` | 圆点 + `<>` + 彩色胶囊 |
| `langLabel: false` | 圆点 + `<>`（没有语言名） |
| 两个都关 | 圆点 + `<>` |
| 四样全关 | 只剩右边的复制 / 收起按钮 |
| 暗色 + `langPill` + `dots: false` | `<>` + 暗色版的彩色胶囊 |

**位置不用你管**：关掉圆点，后面的图标就补到最左边；再关掉图标，语言名继续往左补。
这是主题表里用 CSS 变量算出来的（`--code-block-dots-w` / `--code-block-icon-w`），不是插件在排。

---

## 二、文件清单

| 文件 | 作用 | 是否必需 |
| --- | --- | --- |
| `docsify-code-header.js` | 插件本体（只做一件事：把配置翻成 `<html>` 上的类名） | 必需 |
| 主题表 `vue.css` / `vue-dark.css` | 四样装饰的样子和位置都在主题表里，插件只负责开关 | 必需 |

插件是单文件、零依赖、零网络请求，ES5 写法。

---

## 三、三步接入

### 第一步：放文件

把 `docsify-code-header.js` 复制到站点里（通常放 `_plugs/` 目录）。

### 第二步：加配置

在 `index.html` 的 `window.$docsify` 里加一段：

```js
window.$docsify = {
    // ……你原本的其它配置都留着

    codeHeader: {
        dots: true,        // 左上角三颗窗口圆点
        langIcon: true,    // 语言名前面那枚 `<>` 图标
        langPill: false,   // 语言名用彩色胶囊（按语言上色）
        langLabel: true    // 语言名用灰色文字
    }
};
```

### 第三步：引脚本

放在复制、收起那两个插件后面即可（它不依赖它们，只是顺序清楚）：

```html
<script src="_plugs/docsify-copy-code-v2.js"></script>
<script src="_plugs/docsify-code-collapse.js"></script>
<script src="_plugs/docsify-code-header.js"></script>
```

刷新页面，标题栏就会按你写的配置来。

---

## 四、几个常见写法

```js
// 只想要 ctfplus 那种干净的样子：留图标和灰字，把圆点关掉
codeHeader: { dots: false }

// 语言名用上一轮做的彩色胶囊（39 支语言色），不要灰字
codeHeader: { langPill: true }

// 想要彩色胶囊 + 不要 `<>` 图标
codeHeader: { langPill: true, langIcon: false }

// 标题栏上只留右边的复制 / 收起，左边什么都不要
codeHeader: { dots: false, langIcon: false, langLabel: false }

// 等同于不写配置
codeHeader: { dots: true, langIcon: true, langPill: false, langLabel: true }
```

---

## 五、`langPill` 和 `langLabel` 的关系

这两个是**同一句话（语言名）的两种样式**：

| `langPill` | `langLabel` | 结果 |
| --- | --- | --- |
| `true` | 随便 | 语言名走**彩色胶囊**（胶囊优先，灰字让位） |
| `false` | `true` | 语言名走**灰色文字** |
| `false` | `false` | **不显示语言名**（标题栏上只剩圆点 / 图标 / 按钮） |

为什么两个都开时是"胶囊优先"而不是显示两遍：语言名只有一句，
显示两遍（一枚胶囊 + 一行灰字）看着就是重复。所以这里做了取舍，并把它写死在这个表里。

---

## 六、它和主题表是怎么分工的

插件只做一件事：**把配置翻成 `<html>` 上的四个类名**。

| 类名 | 什么时候挂上 |
| --- | --- |
| `code-header-no-dots` | `dots: false` |
| `code-header-no-icon` | `langIcon: false` |
| `code-header-no-lang` | `langLabel: false` |
| `code-header-pill` | `langPill: true` |

主题表里照着这些类名写规则：

```css
/* 关圆点：把三支圆点色改成透明（标题栏底色、分界线都不动），
   同时把"圆点占的宽度"改成 0，后面的图标和语言名自动左移补位 */
.code-header-no-dots { --code-block-dots-w: 0px; }
.code-header-no-dots .markdown-section pre {
    --code-block-dot-1: transparent;
    --code-block-dot-2: transparent;
    --code-block-dot-3: transparent;
}

/* 关图标 */
.code-header-no-icon { --code-block-icon-w: 0px; }
.code-header-no-icon .markdown-section pre[data-lang]:not([data-lang='']) code:before { display: none; }

/* 关灰色语言名 */
.code-header-no-lang .markdown-section pre[data-lang]:not([data-lang='']):after { content: none; }
```

这样分的好处：**换主题不用改插件，改开关不用碰 CSS**。
换个主题时，只要那份主题表认这四个类名（或者干脆不认，那就四样一直显示），插件都不用动。

---

## 七、想改成别的样子

装饰的颜色、大小、位置全在主题表的 `:root` 里：

| 想改什么 | 改哪支变量 |
| --- | --- |
| 三颗圆点的大小 / 间距 / 起点 | `--code-block-dot-size`、`--code-block-dot-gap`、`--code-block-dot-left` |
| 语言名（灰字）的颜色 | `--code-block-lang-color` |
| 灰色语言名的字号 | 主题表里 `pre[data-lang]:not([data-lang='']):after` 那条的 `font-size` |
| `<>` 图标的大小 / 描边色 | 主题表里 `code:before` 那条（图标是一段内联 SVG，描边色写在 `stroke` / `stroke-opacity` 里，亮暗各一份） |
| 彩色胶囊的底色 / 字色 | 一组 `--lang-pill-*` + 每个语言的 `--lang-pill-color` / `--lang-pill-bg`（39 支，看 `语言药丸配色表.md`） |
| 标题栏高度（四样都跟着变） | `--code-block-header-height` |

改完记得把代码区上内边距也一起调（行号列是靠它对齐的），
经验值写在主题表 `pre>code` 那条的注释里。

---

## 八、怎么试各种组合

不用来回改配置，项目里有个自检页能当试验台：

```
主题样式改造/_自检_标题栏.html
```

它在地址栏上收这四个参数，可以叠加：

| 参数 | 效果 |
| --- | --- |
| `?dark` | 换暗色主题 |
| `?dots=0` | 关掉三颗圆点 |
| `?icon=0` | 关掉 `<>` 图标 |
| `?pill=1` | 语言名改用彩色胶囊 |
| `?label=0` | 关掉灰色语言名 |

比如 `_自检_标题栏.html?dots=0&icon=0&pill=1` 就是"没圆点、没图标、语言名用胶囊"。
这一页不只是看，它还会按你选的组合自动逐条比对（53 条，组合不同条数略有增减），**全绿才算过**。

同目录下 `预览_标题栏_亮色.html` / `_暗色.html` 也认这几个参数，想看整页效果就用它们。

---

## 九、在控制台里临时改

```js
// 把圆点关掉，立刻生效，不用刷新
window.DocsifyCodeHeader.set({ dots: false });

// 语言名换回彩色胶囊
window.DocsifyCodeHeader.set({ langPill: true });

// 按当前 $docsify.codeHeader 重新应用一遍
window.DocsifyCodeHeader.refresh();

window.DocsifyCodeHeader.version;   // 版本号
```

---

## 十、兼容性与卸载

- 插件只用「读 `window.$docsify`、往 `<html>` 上加减类名」，没有任何 DOM 遍历、没有钩子、没有网络请求；
- ES5 写法（`var` / `function`），老浏览器一样跑；
- 不起作用时先看 `<html>` 上有没有那几个 `code-header-*` 类名：
  有类名但样子没变 = 主题表里缺对应规则（换主题了？）；没有类名 = 配置没读到（脚本引了没有、名字拼对没有）。

不想要了：

1. 删掉 `index.html` 里那行 `<script src="_plugs/docsify-code-header.js"></script>` 和 `codeHeader` 配置段；
2. 删掉插件文件。

标题栏会回到"圆点 + `<>` 图标 + 灰色语言名"的默认样子，插件不在页面里留任何别的东西
（那几个类名挂在 `<html>` 上，脚本一撤就没了）。
