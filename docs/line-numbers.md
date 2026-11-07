# docsify 代码块行号插件 使用说明

适用插件版本：**v1.0.0**

给 docsify 的代码块左侧加上行号。可以全局开、全局关，也可以按语言挑着加，短代码块还能自动跳过。零依赖、零网络请求、兼容 Chrome 49 及以上。

---

## 一、它长什么样

加上之后，每个符合条件的代码块左侧会多出一列数字，与代码逐行对齐：

```
┌──────────────────────────────────┐
│ 1 │ function applyTheme(theme) {  │
│ 2 │     var isDark = theme === 'dark'; │
│ 3 │     return isDark ? 1 : 0;    │
│ 4 │ }                             │
└──────────────────────────────────┘
```

数字的颜色跟着主题走：亮色下是中灰，暗色下更深一档。数字不可选中、不可点击，鼠标划过或框选代码都不会把它带走。

---

## 二、文件清单

| 文件 | 作用 | 是否必需 |
| --- | --- | --- |
| `docsify-code-line-numbers.js` | 插件本体，行号样式已经内嵌在里面 | 必需 |
| 两张主题表 `vue.css` / `vue-dark.css` | 提供行号的颜色变量 | 推荐（不配也有兜底色） |

插件是单文件，样式自动注入，不需要额外引 CSS。

---

## 三、三步接入

### 第一步：放文件

把 `docsify-code-line-numbers.js` 复制到站点里（通常放 `_plugs/` 目录）。

### 第二步：加配置

在 `index.html` 的 `window.$docsify` 里加一段：

```js
window.$docsify = {
    // ……你原本的其它配置都留着

    codeLineNumbers: {
        enable: true,
        exclude: ['bash']
    }
};
```

### 第三步：引脚本

在 `index.html` 的脚本区加一行，和其他插件脚本并列即可：

```html
<script src="_plugs/docsify-code-line-numbers.js"></script>
```

刷新页面，代码块左侧就出现行号了。

---

## 四、配置项详解

全部可选，不写就用默认值。

| 配置项 | 默认值 | 作用 |
| --- | --- | --- |
| `enable` | `true` | 总开关。`false` 表示所有代码块都不要行号 |
| `include` | `[]` | 只给这些语言加行号，留空表示不限语言 |
| `exclude` | `[]` | 这些语言不加行号 |
| `minLines` | `0` | 代码行数少于这个值就不编号 |
| `startFrom` | `1` | 起始行号，从几开始数 |
| `fontSize` | `0.75em` | 行号字号，默认比代码小一档；想改就写这里 |

### 4.1 include 和 exclude 的先后

`include` 先筛出允许的语言，`exclude` 再从中剔除。只写 `exclude` 时等于"除了这些都要"，只写 `include` 时等于"只有这些要"。

语言名不区分大小写，`js` 和 `JS` 算同一种。判断用的值来自代码块渲染出来的 `data-lang` 属性。

### 4.2 minLines 怎么用

它算的是代码块的实际行数（末尾的换行不算新行）。写 `minLines: 5` 就意味着四行以内的小片段不编号，页面上看着干净些，长代码块才需要行号来对照。

### 4.3 几种常见写法

```js
// 所有代码块都带行号（等同于不写配置）
codeLineNumbers: { enable: true }

// 完全不要行号
codeLineNumbers: { enable: false }

// 只给 js 和 python 加
codeLineNumbers: { include: ['js', 'python'] }

// 除了 bash 和纯文本都加
codeLineNumbers: { exclude: ['bash', 'text'] }

// 少于 5 行的短代码不编号
codeLineNumbers: { minLines: 5 }

// 行号从 0 开始数
codeLineNumbers: { startFrom: 0 }

// 行号字号：默认 0.75em（比代码小一档），想让行号更静一些就再降
codeLineNumbers: { fontSize: '0.7em' }
```

---

## 五、行号和分隔线的颜色怎么改

行号的颜色，以及它与代码之间那条分隔线的颜色，各由一个 CSS 变量决定，两张主题表里各有一份：

```css
/* vue.css 里 */
--code-line-number-color: #9aa0a6;
--code-line-number-border: rgba(0, 0, 0, 0.09);

/* vue-dark.css 里 */
--code-line-number-color: #5c6370;
--code-line-number-border: rgba(255, 255, 255, 0.11);
```

分隔线用的是半透明色而不是实色，这样它会自然融进背景、显得轻：亮色下是 9% 的黑，暗色下是 11% 的白。

想换颜色，改这两个变量就行，行号会跟着主题切换。用别的主题时，在自己的 CSS 里补一句也可以：

```css
:root {
    --code-line-number-color: #888;
    --code-line-number-border: rgba(0, 0, 0, 0.12);
}
```

不想耍那条分隔线，把它覆盖成透明即可：

```css
:root {
    --code-line-number-border: transparent;
}
```

什么都不配时插件里有兜底值（行号 `#999`，分隔线 9% 的黑），不至于看不见，但不一定和主题搭。

---

## 六、它是怎么工作的

**行号不是插进代码里的。** 这一点值得说清楚。

代码块渲染完之后，里面的内容是 Prism 生成的 `<span class="token">` 标签，如果逐行插进去切分，很容易把标签切开，高亮就坏了。所以这个插件的做法是：

1. 在代码块内**单独放一列**行号，绝对定位在左侧，代码块本身通过左内边距给它让出位置。
2. 行号列的 `line-height` 用 `inherit`，从 `pre` 继承。因为行高一致，数字和代码天然逐行对齐，不需要换算像素。
3. 行号列的顶部偏移是**读代码块自己的上内边距**得来的，所以无论主题把 `pre`、`code` 的 padding 调成多少，都不会错行。
4. 每次渲染都先清掉旧行号再重画，所以来回切换页面不会重复叠加。

代价是：行号列在代码块内部，得靠主题给它让出左边距（本主题里是 `padding-left: 3.6em`）。

**关于横向滚动**（2026-10-12 更正）：这一节原来写的是"代码横向滚动时行号会跟着一起滚"，
实测下来**不是这样，行号是固定不动的**。原因是主题里 `pre>code` 的 `overflow` 是 `inherit`，
继承了 `pre` 的 `auto`，于是真正横向滚动的容器是里面的 `<code>`，
而行号列是插在 `pre` 下、与 `<code>` 平级的兄弟节点——滚的是里面那层，
外面的行号列自然不动。用 `主题样式改造/_核对横向滚动.py` 量过：
把每个 code 滚 200px 后，两张截图只在代码文字那一段有差异（12197 个像素），
行号列所在的横向位置（截图 x 630~726）一个像素都没变。

---

## 七、常见问题

**行号完全没出现**

按顺序检查这几处：

1. 脚本引了没有：`<script src="_plugs/docsify-code-line-numbers.js"></script>`
2. 配置里 `enable` 是不是被写成了 `false`
3. `minLines` 是不是设得比代码块的实际行数还大
4. `include` 里写的语言名，和代码块渲染出来的 `data-lang` 一致吗（大小写不敏感，但拼写要一致）
5. `exclude` 里是不是把这个语言排除了

**某个语言加了行号，另一个没有**

多半是 `include` / `exclude` 里的写法问题。在开发者工具里选中那个代码块，看它的 `data-lang` 属性值是什么，按那个值来写配置。

**行号和代码错行**

正常情况不会，因为行号行高是从 `pre` 继承的，顶部位置是从 `code` 的上内边距读的。如果真错行了，通常是主题里给 `code` 用了**独立于 `pre` 的行高**，或者代码块结构不是标准的 `pre > code`。把主题名和代码块外层结构告诉我，我对着调。

**横向滚动时行号跟着走**

本主题里不会。行号列是 `pre` 的直接子元素、和 `<code>` 平级，而真正横向滚动的容器是 `<code>`，
所以行号固定不动（实测见第六节末尾）。如果换成别的主题后出现"行号跟着滚"，
那是那个主题让 `pre` 自己成了滚动容器（比如把 `pre>code` 的 `overflow` 改成了 `visible`），
这时可以把行号的 `position` 从当前写法换成吸附式，或者直接照本主题的写法：
让 `<code>` 承担 `overflow`，`pre` 只当外框。

**mermaid 图表会不会被加上行号**

不会。你站点里 mermaid 代码块会被渲染成 `<div class="mermaid">` 而不是 `<pre>`，插件只处理 `pre`，所以图表不受影响。

**行号能选中复制吗**

不能，行号列设了 `user-select: none` 和 `pointer-events: none`，框选代码时不会带上数字。

---

## 八、进阶用法

### 8.1 在控制台里临时开关

```js
window.DocsifyCodeLineNumbers.setEnable(false);  // 临时关掉所有行号
window.DocsifyCodeLineNumbers.setEnable(true);   // 再打开
window.DocsifyCodeLineNumbers.refresh();         // 按当前配置重算一遍
window.DocsifyCodeLineNumbers.version;           // 版本号
```

改完之后不需要刷新页面，代码块会立即重画。

### 8.2 想单独控制某一块

比如写 ` ```js:nolines ` 让这一个代码块不显示行号，需要在你 `index.html` 的自定义 renderer 里把标记转成属性，插件再读那个属性。这一步会碰到你自己的 renderer，所以没有默认开启。需要的话说一声，两边一起改。

### 8.3 和主题切换插件一起用

行号颜色是走 CSS 变量的，所以和主题切换插件是天然配合的：切到暗色，行号自动换成暗色表里那个值，不需要额外配置。

---

## 九、兼容性

- Chrome 49 及以上。用到的 `getComputedStyle`、CSS 变量、`position: absolute`，都是 Chrome 49 就支持的
- JavaScript 是 ES5 写法，没有箭头函数、模板字符串、`let` / `const`
- 行号列带 `aria-hidden="true"`，屏幕阅读器不会念出一串数字
- 打印时行号会一起打印出来，如果不想打印，在主题里加一条 `@media print { .doc-line-numbers { display: none; } }`

---

## 十、不想要了怎么办

1. 删掉 `index.html` 里的 `<script src="_plugs/docsify-code-line-numbers.js"></script>`
2. 删掉 `window.$docsify` 里的 `codeLineNumbers` 整段配置
3. 删除插件文件本身

代码块会恢复成原来的样子，插件不会在页面里留下别的东西。
