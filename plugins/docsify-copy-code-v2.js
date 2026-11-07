/*!
 * docsify-copy-code - 代码块一键复制
 * ------------------------------------------------------------
 * 在 docsify-copy-code 的基础上重写过一版：去掉过时写法，补上触摸设备和反馈体验。
 *
 * 与原来那份的关系：
 * - 配置项完全兼容，copyCode.buttonText / errorText / successText 照旧可用，
 *   也照样支持"按路径取不同文案"的写法
 * - 按钮位置从右上角挪到左上角，让开语言标签，两者不再打架
 * - 复制改走 navigator.clipboard，旧浏览器回退到临时 textarea，
 *   无论走哪条路都不会动到你在正文里的选中
 *
 * @author  马小战
 * @version 2.4.0
 * @date    2026-09-25
 * @license MIT
 */
(function (win, doc) {
    'use strict';

    var VERSION = '2.4.0';

    /* 默认配置：文案用文字，三个透明度用数字。
       透明度分三档：鼠标不在代码块里、在代码块里、停在按钮上。
       想要平时完全看不到就把第一档写 0；想让它一直明显就三档都写 1。 */
    var DEFAULTS = {
        buttonText: '复制',
        errorText: '复制失败',
        successText: '已复制',
        opacityIdle: 0.72,
        opacityInCode: 0.9,
        opacityOnButton: 1
    };

    var STYLE_ID = 'docsify-copy-code-style';
    var BTN_CLASS = 'copy-code-button';
    var DONE_CLASS = 'is-done';
    var FAIL_CLASS = 'is-fail';

    /* 图标：内联 SVG，描边风格，不依赖字体也不发额外请求 */
    var ICONS = {
        clipboard: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4.6" y="4.4" width="6.8" height="9.6" rx="1.6"/><path d="M6.6 4.4v-.9a1 1 0 0 1 1-1h.8a1 1 0 0 1 1 1v.9"/></svg>',
        check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.6 8.6l3 3 5.8-7"/></svg>',
        cross: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 5l6 6M11 5l-6 6"/></svg>'
    };

    /* 按钮样式。
       位置在左上角圆点右侧、代码块顶部的留白里，不压正文。
       图标和文字一起显示：认得图标的人看图标，不认得的看文字，两边都不落空。
       透明度分三档：鼠标不在代码块里时最淡，进了代码块变清晰一档，落在按钮上最清楚。
       手机上没有悬停这回事，所以一直是清楚的。
       成功时不只是变色：对勾会自己画出来，按钮还会轻轻弹一下。 */
    var CSS_TEXT = [
        '.markdown-section pre > .' + BTN_CLASS + ' {',
        '    position: absolute;',
        '    top: 5px;',
        '    left: 68px;',
        '    z-index: 2;',
        '    display: inline-flex;',
        '    align-items: center;',
        '    padding: 4px 9px;',
        '    border: 0;',
        '    border-radius: 6px;',
        '    background-color: rgba(127, 127, 127, 0.16);',
        '    color: #7f7f7f;',
        '    font-family: inherit;',
        '    font-size: 0.72rem;',
        '    font-weight: 500;',
        '    line-height: 1;',
        '    letter-spacing: 0.02em;',
        '    cursor: pointer;',
        '    opacity: var(--copy-opacity-idle, 0.72);',
        '    transition: opacity 0.18s ease, background-color 0.18s ease, transform 0.12s ease;',
        '    -webkit-appearance: none;',
        '    appearance: none;',
        '}',
        /* 鼠标进了代码块：变清晰一档，提示这里有东西可以点 */
        '.markdown-section pre:hover > .' + BTN_CLASS + ' {',
        '    opacity: var(--copy-opacity-code, 0.9);',
        '}',
        /* 鼠标落在按钮上：最清楚，底色也加深 */
        '.markdown-section pre > .' + BTN_CLASS + ':hover,',
        '.markdown-section pre > .' + BTN_CLASS + ':focus {',
        '    opacity: var(--copy-opacity-button, 1);',
        '    background-color: rgba(127, 127, 127, 0.26);',
        '}',
        /* 按下去缩一下，像真的按到了东西 */
        '.markdown-section pre > .' + BTN_CLASS + ':active {',
        '    transform: scale(0.94);',
        '}',
        /* 三个状态块，只显示当前那一个 */
        '.markdown-section pre > .' + BTN_CLASS + ' .copy-state {',
        '    display: none;',
        '    align-items: center;',
        '}',
        '.markdown-section pre > .' + BTN_CLASS + ' .copy-state-idle {',
        '    display: inline-flex;',
        '}',
        '.markdown-section pre > .' + BTN_CLASS + '.' + DONE_CLASS + ' .copy-state-idle,',
        '.markdown-section pre > .' + BTN_CLASS + '.' + FAIL_CLASS + ' .copy-state-idle {',
        '    display: none;',
        '}',
        '.markdown-section pre > .' + BTN_CLASS + '.' + DONE_CLASS + ' .copy-state-done,',
        '.markdown-section pre > .' + BTN_CLASS + '.' + FAIL_CLASS + ' .copy-state-fail {',
        '    display: inline-flex;',
        '}',
        /* 图标与文字 */
        '.markdown-section pre > .' + BTN_CLASS + ' .copy-icon {',
        '    display: flex;',
        '    margin-right: 4px;',
        '}',
        '.markdown-section pre > .' + BTN_CLASS + ' svg {',
        '    display: block;',
        '    width: 12px;',
        '    height: 12px;',
        '    fill: none;',
        '    stroke: currentColor;',
        '    stroke-width: 1.6;',
        '    stroke-linecap: round;',
        '    stroke-linejoin: round;',
        '}',
        '.markdown-section pre > .' + BTN_CLASS + ' .copy-text {',
        '    white-space: nowrap;',
        '}',
        /* 成功：淡绿底，对勾自己画出来，按钮轻轻弹一下 */
        '.markdown-section pre > .' + BTN_CLASS + '.' + DONE_CLASS + ' {',
        '    background-color: rgba(96, 170, 120, 0.2);',
        '    color: #4d8a63;',
        '    animation: copy-code-pop 0.3s ease;',
        '}',
        '.markdown-section pre > .' + BTN_CLASS + '.' + DONE_CLASS + ' .copy-state-done svg path {',
        '    stroke-dasharray: 14;',
        '    stroke-dashoffset: 14;',
        '    animation: copy-code-draw 0.36s ease 0.06s forwards;',
        '}',
        /* 失败：淡红底，叉是静态的，不需要庆祝 */
        '.markdown-section pre > .' + BTN_CLASS + '.' + FAIL_CLASS + ' {',
        '    background-color: rgba(200, 96, 96, 0.2);',
        '    color: #a35252;',
        '}',
        '@keyframes copy-code-draw {',
        '    to { stroke-dashoffset: 0; }',
        '}',
        '@keyframes copy-code-pop {',
        '    0% { transform: scale(1); }',
        '    45% { transform: scale(1.06); }',
        '    100% { transform: scale(1); }',
        '}',
        /* 触摸设备没有悬停这回事，让按钮一直清晰，否则手机上看着发灰 */
        '@media (hover: none) {',
        '    .markdown-section pre > .' + BTN_CLASS + ' {',
        '        opacity: var(--copy-opacity-button, 1);',
        '    }',
        '}',
        '@media print {',
        '    .markdown-section pre > .' + BTN_CLASS + ' {',
        '        display: none;',
        '    }',
        '}'
    ].join('\n');

    var config = null;

    /**
     * 把用户写在 window.$docsify.copyCode 里的配置与默认值合并。
     * 为什么：默认值集中在 DEFAULTS，调用方只覆盖关心的字段，缺项不会变成 undefined。
     *
     * Merge user options from window.$docsify.copyCode with the built-in defaults.
     * Why: keeping defaults in one place means callers only override what they care about,
     * and a missing key can never leak through as undefined.
     */
    function getConfig() {
        var user = (win.$docsify && win.$docsify.copyCode) || {};
        var out = {};
        for (var key in DEFAULTS) {
            if (!DEFAULTS.hasOwnProperty(key)) {
                continue;
            }
            var raw = user[key];
            if (raw === undefined || raw === null) {
                out[key] = DEFAULTS[key];
            } else if (typeof raw === 'number') {
                // 透明度这类数字直接采用，不能拿文案那套逻辑去处理，否则会被换成默认值
                out[key] = raw;
            } else {
                out[key] = pickText(raw, DEFAULTS[key]);
            }
        }
        return out;
    }

    /**
     * 解析一条文案配置：可以直接是字符串，也可以是按路径取值的映射。
     * 为什么：老配置里用过 { '/en/': 'Copied', '/': '已复制' } 这种写法，
     * 新版本必须认得它，否则升级会让别人的站点突然变成英文。
     *
     * Resolve one text option: either a plain string or a path-to-text map.
     * Why: the old configuration supported shapes like { '/en/': 'Copied', '/': '已复制' },
     * and the new version has to understand it, or upgrading would silently turn someone's
     * Chinese site into English.
     */
    function pickText(value, fallback) {
        if (typeof value === 'string') {
            return value;
        }
        if (value && typeof value === 'object') {
            var keys = [];
            for (var k in value) {
                if (value.hasOwnProperty(k)) {
                    keys.push(k);
                }
            }
            for (var i = 0; i < keys.length; i++) {
                if (win.location.href.indexOf(keys[i]) !== -1) {
                    return value[keys[i]];
                }
            }
        }
        return fallback;
    }

    /**
     * 把按钮样式注入 head，只注入一次。
     * 为什么：插件要单文件可用，样式不能依赖用户再引一份 CSS；重复执行也要幂等。
     *
     * Inject the button stylesheet into head exactly once.
     * Why: the plugin must work as a single file without an extra CSS include, and repeated
     * evaluation has to be idempotent.
     */
    function injectStyle() {
        if (doc.getElementById(STYLE_ID)) {
            return;
        }
        var head = doc.head || doc.getElementsByTagName('head')[0];
        if (!head) {
            return;
        }
        var style = doc.createElement('style');
        style.id = STYLE_ID;
        style.type = 'text/css';
        if (style.styleSheet) {
            style.styleSheet.cssText = CSS_TEXT;
        } else {
            style.appendChild(doc.createTextNode(CSS_TEXT));
        }
        head.appendChild(style);
    }

    /**
     * 把三档透明度写到根元素的 CSS 变量上。
     * 为什么：透明度是阅读口味问题，有人喜欢平时隐身、有人喜欢一直可见，
     * 写在配置里比让人去改注入的样式方便；写成根元素变量而不是行内样式，
     * 是为了让自定义 CSS 也能覆盖同一个变量，两条路都不堵死。
     *
     * Publish the three opacity steps to CSS variables on the root element.
     * Why: opacity is a matter of reading taste, some people want the button hidden by default
     * and others want it always visible, so stating it in the config beats asking people to edit
     * injected styles. Writing root variables rather than inline styles keeps the same variable
     * overridable from custom CSS, so neither route is blocked.
     */
    function applyOptions(cfg) {
        var root = doc.documentElement;
        if (!root || !root.style || !root.style.setProperty) {
            return;
        }
        var map = {
            '--copy-opacity-idle': cfg.opacityIdle,
            '--copy-opacity-code': cfg.opacityInCode,
            '--copy-opacity-button': cfg.opacityOnButton
        };
        for (var name in map) {
            if (map.hasOwnProperty(name) && map[name] !== undefined && map[name] !== null) {
                root.style.setProperty(name, String(map[name]));
            }
        }
    }

    /**
     * 造一个复制按钮：三个状态块，每块里面一个图标加一句话。
     * 为什么：只有图标的话，不熟悉的人未必认得那个小方块是干什么的；
     * 图标配文字，认得形状的人看图标，不认得的看文字，两边都不落空。
     * 三个块预先放好、靠类名切换，所以状态变化只改一个类，没有重排。
     *
     * Build one copy button holding three state blocks, each with an icon and a word.
     * Why: an icon alone leaves people who do not recognise the little square guessing;
     * pairing it with words serves both audiences, one reading the shape and the other the
     * text. All three blocks are placed up front and switched by class, so a state change
     * touches one class and never reflows.
     */
    function buildButton(cfg) {
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = BTN_CLASS;
        btn.setAttribute('title', cfg.buttonText);
        btn.setAttribute('aria-label', cfg.buttonText);

        var states = [
            ['copy-state-idle', ICONS.clipboard, cfg.buttonText],
            ['copy-state-done', ICONS.check, cfg.successText],
            ['copy-state-fail', ICONS.cross, cfg.errorText]
        ];
        for (var i = 0; i < states.length; i++) {
            var wrap = doc.createElement('span');
            wrap.className = 'copy-state ' + states[i][0];

            var icon = doc.createElement('span');
            icon.className = 'copy-icon';
            // 内容是写死的图标字符串，不含任何外部输入，所以这里用 innerHTML 是安全的
            icon.innerHTML = states[i][1];

            var label = doc.createElement('span');
            label.className = 'copy-text';
            label.textContent = states[i][2];

            wrap.appendChild(icon);
            wrap.appendChild(label);
            btn.appendChild(wrap);
        }
        return btn;
    }

    /**
     * 给正文里每个代码块挂上按钮，已有的先跳过。
     * 为什么：每次渲染后正文都是新的，必须扫一遍；而同一轮里重复调用也不该出现两个按钮。
     *
     * Attach the button to every code block in the article, skipping ones that already have it.
     * Why: the article is rebuilt after each render so a full scan is required, while a repeated
     * call inside the same pass must never leave two buttons behind.
     */
    function attachButtons(cfg) {
        var pres = doc.querySelectorAll('.markdown-section pre');
        for (var i = 0; i < pres.length; i++) {
            var pre = pres[i];
            if (pre.querySelector('.' + BTN_CLASS)) {
                continue;
            }
            pre.appendChild(buildButton(cfg));
        }
    }

    /**
     * 把文字放进剪贴板，成功与否通过回调告知。
     * 为什么：优先用 navigator.clipboard，它不碰页面选中、也不会让页面跳动；
     * 但它在非安全上下文（http 的非 localhost 地址）、权限被拒、老浏览器里都可能用不了。
     * 关键在于“存在”不等于“能用”，所以它一旦失败还得退回 textarea 那条老路，
     * 而不是直接把“复制失败”甩给用户。
     *
     * Put text on the clipboard, reporting the outcome through a callback.
     * Why: navigator.clipboard is preferred because it never touches the page selection and
     * therefore never makes the page jump; but it can be unusable in insecure contexts (plain
     * http beyond localhost), when permission is denied, or on old browsers. The crux is that
     * being present is not the same as being usable, so a failure here has to fall back to the
     * textarea route instead of handing the user a bare "failed".
     */
    function copyText(text, onDone) {
        var nav = win.navigator;
        if (nav && nav.clipboard && nav.clipboard.writeText) {
            var settled = false;
            var fallback = function () {
                // 用一次性闸门兜底：某些环境里 writeText 既不成功也不失败，回调永远不来
                if (settled) { return; }
                settled = true;
                onDone(copyViaTextarea(text));
            };
            try {
                nav.clipboard.writeText(text).then(function () {
                    if (settled) { return; }
                    settled = true;
                    onDone(true);
                }, fallback);
            } catch (e) {
                fallback();
            }
            return;
        }
        onDone(copyViaTextarea(text));
    }

    /**
     * 老办法：造一个藏在视口外的 textarea 承载文字，选中它，再执行复制命令。
     * 为什么：这个做法早于 clipboard API，因此能盖到最老的浏览器；textarea 用完立刻移除，
     * 不给页面留下任何东西。iOS 上 select() 不会真的选中，必须补一次 setSelectionRange；
     * readonly 是为了不让移动端弹出键盘；不用 opacity 隐藏是为了避开
     * “不可见元素无法被复制”那类限制。
     *
     * The old way: park an off-screen textarea holding the text, select it, then run the copy
     * command.
     * Why: this predates the clipboard API and therefore reaches the oldest browsers; the
     * textarea is removed right after so nothing is left behind. On iOS select() alone does not
     * really select, so setSelectionRange has to follow; readonly keeps the mobile keyboard
     * down; and hiding by opacity is avoided so as not to trip the "invisible elements cannot
     * be copied" kind of restriction.
     */
    function copyViaTextarea(text) {
        var area = doc.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', 'readonly');
        area.setAttribute('aria-hidden', 'true');
        area.style.position = 'fixed';
        area.style.top = '0';
        area.style.left = '-9999px';
        doc.body.appendChild(area);

        var ok = false;
        try {
            area.focus();
            area.select();
            if (area.setSelectionRange) {
                area.setSelectionRange(0, area.value.length);
            }
            ok = doc.execCommand('copy');
        } catch (e) {
            ok = false;
        }

        doc.body.removeChild(area);

        // 别把选中那段临时文字的状态留在页面上
        var sel = win.getSelection ? win.getSelection() : null;
        if (sel && sel.removeAllRanges) {
            sel.removeAllRanges();
        }
        return ok;
    }

    /**
     * 判断一个元素是不是复制按钮。
     * 为什么：用 getAttribute 取 class 而不是 el.className，因为 SVG 元素上的 className
     * 是对象而不是字符串，直接拿字符串方法去处理它会报错。
     *
     * Tell whether an element is the copy button.
     * Why: class is read through getAttribute rather than el.className because on SVG elements
     * className is an object instead of a string, and string methods would throw on it.
     */
    function isButtonNode(el) {
        if (!el || el.nodeType !== 1 || !el.getAttribute) {
            return false;
        }
        var cls = el.getAttribute('class') || '';
        return (' ' + cls + ' ').indexOf(' ' + BTN_CLASS + ' ') !== -1;
    }

    /**
     * 切换按钮的显示状态，一段时间后自动复原。
     * 为什么：反馈是给“刚才那一下”看的，不主动复原的话，第二个代码块的按钮就分不清
     * 自己到底复制成功了没有。另外每次都要先把对勾的动画重来一遍，
     * 否则连着点两次，第二次不会重放“画出来”那一下。
     *
     * Switch the button into a state and restore it after a while.
     * Why: the feedback belongs to that one click; without an automatic reset, the button on
     * the next code block could not tell whether its own copy succeeded. The check-mark
     * animation is also rewound every time, or clicking twice in a row would not replay it.
     */
    function flashState(btn, state, cfg) {
        var donePath = btn.querySelector('.copy-state-done svg path');
        if (donePath) {
            donePath.style.animation = 'none';
            // 读一次布局，强制浏览器认下“动画已撤销”，下一帧才能重新开始
            void donePath.offsetWidth;
            donePath.style.animation = '';
        }

        btn.className = BTN_CLASS + ' ' + state;
        var label = state === DONE_CLASS ? cfg.successText : cfg.errorText;
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);

        win.setTimeout(function () {
            btn.className = BTN_CLASS;
            btn.setAttribute('title', cfg.buttonText);
            btn.setAttribute('aria-label', cfg.buttonText);
        }, 1400);
    }

    /**
     * 从被点到的元素往上找复制按钮，找到了就照着它所在的代码块复制。
     * 为什么：手写向上查找而不用 closest，是为了在更老的浏览器上也成立；
     * 复制内容取 code 的 textContent，行号在 code 外面，天然不会被带上。
     *
     * Walk up from the clicked element to find the copy button, then copy from the code block
     * it belongs to.
     * Why: the upward walk is written by hand instead of using closest so it holds on older
     * browsers; the text comes from the code element's textContent, and since line numbers live
     * outside of code they are never swept into the clipboard.
     */
    function handleClick(event, cfg) {
        var node = event.target;
        while (node && node !== doc.body) {
            if (isButtonNode(node)) {
                break;
            }
            node = node.parentNode;
        }
        if (!node || node === doc.body) {
            return;
        }

        var btn = node;
        var pre = btn.parentNode;
        var code = pre ? pre.querySelector('code') : null;
        if (!code) {
            return;
        }

        if (event.preventDefault) {
            event.preventDefault();
        }

        // 鼠标点过之后让按钮失焦：它一旦留住焦点，:focus 那条样式会把它钉在全亮状态，
        // 非要去别处再点一下才松手。键盘触发的点击（Enter / 空格）detail 是 0，
        // 这里不动它，键盘用户依然能靠焦点看见按钮。
        if ((event.detail || 0) > 0 && btn.blur) {
            btn.blur();
        }

        copyText(code.textContent || '', function (ok) {
            flashState(btn, ok ? DONE_CLASS : FAIL_CLASS, cfg);
        });
    }

    /**
     * 插件入口：读配置、注入样式、挂上渲染钩子与一次全局点击委托。
     * 为什么：点击委托绑在 document 上而不是某个容器，页面结构怎么变都不会漏；
     * 绑一次就够，不需要跟着每次渲染重来。
     *
     * Plugin entry: read config, inject styles, register the render hook and one delegated click.
     * Why: delegating on document rather than on some container means no page structure change
     * can make the button unclickable, and it only has to be bound once.
     */
    function boot() {
        config = getConfig();
        injectStyle();
        applyOptions(config);

        var docsify = win.$docsify = win.$docsify || {};
        var plugins = docsify.plugins;
        if (!plugins || typeof plugins.length !== 'number') {
            plugins = [];
        }
        docsify.plugins = plugins.concat([function (hook) {
            if (hook && hook.doneEach) {
                hook.doneEach(function () {
                    attachButtons(config);
                });
            }
        }]);

        if (doc.addEventListener) {
            doc.addEventListener('click', function (event) {
                handleClick(event, config);
            }, false);
        }
    }

    win.DocsifyCopyCode = {
        version: VERSION,
        refresh: function () {
            attachButtons(config || getConfig());
        }
    };

    boot();
})(window, document);
