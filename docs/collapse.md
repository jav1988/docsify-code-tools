# docsify 代码块收起插件 使用说明

适用插件版本：**v1.0.0**

在代码块右上角加一枚小箭头，点一下把代码收起来（只剩下标题栏那一行），再点一下展开。零依赖、零网络请求、ES5 写法。

---

## 一、它长什么样

展开时（箭头朝上，意思是"点它就把代码折起来"）：

```
┌──────────────────────────────────────────────┐
│ ● ● ●  <> javascript                 [复制] [^] │
├──────────────────────────────────────────────┤
│ 1 │ const pill = 'js';                        │
│ 2 │ console.log(pill);                        │
└──────────────────────────────────────────────┘
```

收起后（箭头翻过来朝下，意思是"点它展开"）：

```
┌──────────────────────────────────────────────┐
│ ● ● ●  <> javascript                 [复制] [v] │
└──────────────────────────────────────────────┘
```

收起时：

- 代码和行号列一起**被裁掉**（元素还在 DOM 里，只是整块压到标题栏那一档高度 + `overflow: hidden`）；
- 整块只剩标题栏那一条，四周就是外框本身，底边干干净净一条线；
- **高度过渡 260ms**，不是"啪"地一下（展开、收起都带动画，键盘操作也一样）；
- 语言标记、复制按钮都还在，**收起状态下也能复制**（复制按钮读的是代码文本，和显示与否无关）；
- 箭头会翻 180°，一眼能看出现在点它会发生什么；
- 按钮上的 `title`、`aria-label` 在"收起 / 展开"之间同步切换，读屏用户也知道当前是什么动作。

---

## 二、文件清单

| 文件 | 作用 | 是否必需 |
| --- | --- | --- |
| `docsify-code-collapse.js` | 插件本体，按钮样式已经内嵌在里面 | 必需 |
| 主题表 `vue.css` / `vue-dark.css` | 把按钮按进标题栏里（只管位置） | 可选（不配也能用，按钮就待在右上角） |

插件是单文件，样式自动注入，不需要额外引 CSS。

---

## 三、三步接入

### 第一步：放文件

把 `docsify-code-collapse.js` 复制到站点里（通常放 `_plugs/` 目录）。

### 第二步：加配置

在 `index.html` 的 `window.$docsify` 里加一段：

```js
window.$docsify = {
    // ……你原本的其它配置都留着

    codeCollapse: {
        enable: true,
        minLines: 8
    }
};
```

### 第三步：引脚本

在 `index.html` 的脚本区加一行。**建议紧跟在复制插件后面**，这样两个按钮在 DOM 里的先后顺序和视觉上的左右顺序一致（复制在左、收在右），键盘 Tab 的顺序也就顺了：

```html
<script src="_plugs/docsify-copy-code-v2.js"></script>
<script src="_plugs/docsify-code-collapse.js"></script>
```

刷新页面，代码块右上角就多出一枚箭头。

---

## 四、配置项详解

全部可选，不写就用默认值。

| 配置项 | 默认值 | 作用 |
| --- | --- | --- |
| `enable` | `true` | 总开关。`false` 表示所有代码块都不要收起按钮 |
| `include` | `[]` | 只给这些语言加按钮，留空表示不限语言 |
| `exclude` | `[]` | 这些语言不加按钮 |
| `minLines` | `0` | 代码行数少于这个值就不加按钮 |
| `collapsedByDefault` | `false` | `true` = 页面一渲染出来就是收起的 |
| `persistence` | `true` | 记住每一页哪些块被收起了，翻页回来还是原样 |
| `labelCollapse` | `收起` | 展开状态下按钮的提示文字 |
| `labelExpand` | `展开` | 收起状态下按钮的提示文字 |

### 4.1 include 和 exclude 的先后

`include` 先筛出允许的语言，`exclude` 再从中剔除。只写 `exclude` 时等于"除了这些都要"，只写 `include` 时等于"只有这些要"。

语言名不区分大小写，`js` 和 `JS` 算同一种。判断用的值来自代码块渲染出来的 `data-lang` 属性。

### 4.2 minLines 怎么用

它算的是代码块的实际行数（末尾的换行不算新行）。`minLines: 8` 就意味着八行以内的短片段不给收起按钮——三五行的示例收起来反而多一次点击。

### 4.3 collapsedByDefault 与 persistence 的配合

- 只开 `collapsedByDefault`：每次渲染都按"默认收起"来，用户手动展开的块翻页回来又会变回收起；
- 两个都开（默认就是都开 `persistence`）：进来默认收起，**用户手动展开过的块会记住**，翻页回来还是展开的；
- 只想默认收起、不想记住：写 `collapsedByDefault: true, persistence: false`。

状态按"页 + 块序号"存，所以 A 页收起的块不会影响 B 页。存的是定长的 `0/1` 串（比如 `010` 表示第 2 块收起），这样"用户手动展开的"和"从来没动过的"能分开记。

### 4.4 几种常见写法

```js
// 所有代码块都能收起（等同于不写配置）
codeCollapse: { enable: true }

// 完全不要这个按钮
codeCollapse: { enable: false }

// 只给 js 和 python 加
codeCollapse: { include: ['js', 'python'] }

// 除了 bash 都加
codeCollapse: { exclude: ['bash'] }

// 少于 8 行的短代码不给按钮
codeCollapse: { minLines: 8 }

// 进来就全部收起（适合长文档，一眼能扫到有几个代码块）
codeCollapse: { collapsedByDefault: true }

// 默认收起，但不记住用户的手动展开
codeCollapse: { collapsedByDefault: true, persistence: false }
```

---

## 五、按钮的位置和样子怎么改

按钮的样式由插件自己注入，位置默认在代码块**右上角**（`top: 5px; right: 12px`）。站点主题里可以覆盖它，把它按进标题栏：

```css
/* 主题里这一条的选情要压过插件的（插件注入的样式在后面、特异性一样，
   所以这里多写一个元素名 button，把特异性提到 0,2,2） */
.markdown-section pre > button.code-collapse-button {
    top: 8px;
    right: 10px;
    left: auto;
}
```

`vue.css` / `vue-dark.css` 里已经写好了这一条，并且让复制按钮退到 `right: 44px`（10 + 26 + 8 的间距），两个按钮并排在标题栏右侧：

```
… 标题栏 …                                    [复制] [^]
                                                  ↑ right: 10px
                                        ↑ right: 44px
```

**收起按钮的宽度写死 26px**，就是为了让旁边的复制按钮能用一个固定值让开位置；复制按钮的宽度会随文案变（"已复制(╹ڡ╹ )"很长），所以它只能定右边、不能定左边。

想改按钮颜色、透明度，覆盖这几支变量即可（插件读取时都带兜底值）：

```css
:root {
    --collapse-opacity-idle: 0.72;   /* 鼠标不在代码块里时的透明度 */
    --collapse-opacity-code: 0.9;    /* 鼠标在代码块里时 */
    --collapse-opacity-button: 1;    /* 鼠标落在按钮上时 */
}
```

---

## 六、它是怎么工作的

1. 每次正文渲染完（`doneEach`）扫一遍 `.markdown-section pre`，符合条件的块塞一个 `<button>` 进去，已经有的跳过。
2. 点按钮时切换 `pre` 上的一个类名 `is-collapsed`。**收起状态只有这一个来源**：整块高度、`overflow`、箭头翻转都由这个类名派发。
3. 收起后的高度取主题变量 `--code-collapse-height`（主题里 = 标题栏高度 + 上下各 1px 外框），
   主题没定义时退回"标题栏高度 + 4px"。所以主题调标题栏高度时，收起高度自动跟着变。
4. **收起是"裁掉"不是"删掉"**：只压高度 + `overflow: hidden`，`<code>` 和行号列都还在 DOM 里。
   这样做有两个好处：收起时能做高度过渡（`display: none` 做不了）；
   行号列在标题栏下面，高度一压自然被裁掉，插件不需要跨插件去隐藏别人的元素。
5. **高度过渡是 JS 做的（FLIP）**，不是 CSS 过渡：展开态的高度是 `auto`，CSS 过渡不了 `auto`。
   做法是"量出切换前后的自然高度 → 把高度钉回起点 → 强制一次回流 → 开过渡 → 改到终点 →
   过渡结束把内联高度还回去"，全程只读一次、写一次布局，不会闪。
   系统里开了"减少动态效果"（`prefers-reduced-motion: reduce`）时直接跳变，不做过渡。
6. 点击用的是绑在 `document` 上的事件委托，页面结构怎么变都不会漏；按钮是真 `<button>`，回车、空格都能按。
7. 打印时按钮自动隐藏，并且**被收起的块一律摊开**——打印出来看不见的代码等于没印。

---

## 七、常见问题

**按钮没出现**

按顺序检查：

1. 脚本引了没有：`<script src="_plugs/docsify-code-collapse.js"></script>`
2. `enable` 是不是被写成了 `false`
3. `minLines` 是不是设得比代码块的实际行数还大
4. `include` / `exclude` 是不是把它排除了

**按钮出现了，但位置不对（压在语言标记上、跑到代码里头）**

多半是站点主题把它按到了别处，或者主题里没有针对它的定位规则。默认位置是右上角，如果你的主题里代码块右上角还有语言标记，就照第五节的写法把它挪开。

**收起之后整块不见了（只剩下一条边框）**

说明主题里没有定义标题栏变量，插件退回的收起高度是 36px（`--code-block-header-height` 的兜底值），
如果你把 `--code-collapse-height` 或 `--code-block-header-height` 覆盖成了 `0`，就会压成一条线。
改成想要的高度即可；`--code-collapse-height` 是收起后的总高度（含 1px 外框）。

**收起之后刷新页面，怎么又展开了**

看 `persistence`：`false` 就是不记状态，刷新必然恢复默认。是 `true` 还不记住的话，检查浏览器是不是禁用了 localStorage（隐私模式下可能写不进去），插件遇到写不进去会安静地跳过，不影响收起本身。

**行号会不会被一起收掉**

会被裁掉（元素还在，只是被压在标题栏下面看不见了）。插件压的是整块 `pre` 的高度并加 `overflow: hidden`，
所以里面的 `<code>`、行号列、任何别的东西都一起被裁掉，不需要插件去逐个隐藏。

**复制按钮在收起状态下还能用吗**

能。复制读的是代码元素的文本，和它显示与否无关。

---

## 八、进阶用法

### 8.1 在控制台里临时操作

```js
window.DocsifyCodeCollapse.collapseAll();  // 全部收起
window.DocsifyCodeCollapse.expandAll();    // 全部展开
window.DocsifyCodeCollapse.refresh();      // 按当前配置重扫一遍
window.DocsifyCodeCollapse.version;        // 版本号
```

### 8.2 和主题切换插件一起用

按钮样式全走当前主题表和 CSS 变量，切主题时按钮颜色跟着走，不需要额外配置。

### 8.3 想清掉记住的状态

状态存在 localStorage 里，键名是 `docsify-code-collapse:` + 当前页的 hash。想清空，在控制台执行：

```js
Object.keys(localStorage)
    .filter(function (k) { return k.indexOf('docsify-code-collapse:') === 0; })
    .forEach(function (k) { localStorage.removeItem(k); });
```

---

## 九、兼容性

- Chrome 49 及以上：用到的都是 CSS 变量、属性选择器、`classList` 的等价写法
- JavaScript 是 ES5 写法，没有箭头函数、模板字符串、`let` / `const`
- 高度过渡用的是"设内联高度 + CSS transition"，`transition` 本身 Chrome 26+ 就支持
- 尊重系统的"减少动态效果"：`prefers-reduced-motion: reduce` 时不做过渡，直接跳变
- `localStorage` 的读写都包在 `try / catch` 里：隐私模式、配额满、被策略禁用时只是"记不住"，不会报错
- 按钮带 `aria-label` / `aria-expanded`，可以用键盘操作
- 打印时按钮隐藏、被收起的块展开

---

## 十、不想要了怎么办

1. 删掉 `index.html` 里的 `<script src="_plugs/docsify-code-collapse.js"></script>`
2. 删掉 `window.$docsify` 里的 `codeCollapse` 整段配置
3. （可选）删掉主题里 `.markdown-section pre > button.code-collapse-button` 那一条定位规则，
   并把复制按钮的 `right` 改回 `10px`（没有收起按钮了，它就该待在最右边）
4. 删除插件文件本身

代码块会恢复成原来的样子，插件不在页面里留别的东西（除了 localStorage 里那串状态，按 8.3 清掉即可）。
