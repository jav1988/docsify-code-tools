/*!
 * docsify-code-line-numbers.js
 * ------------------------------------------------------------
 * 给 docsify 的代码块加上行号，可以全局开关，也可以按语言挑着加。
 *
 * 功能说明：
 * - 代码块左侧显示行号，与代码逐行对齐
 * - 支持全局开启 / 关闭行号
 * - 支持只给指定语言加（include），或排除指定语言（exclude）
 * - 代码行数少于设定值时自动跳过，短代码块不必编号
 * - 支持自定义起始行号
 * - 行号颜色取自主题表的 CSS 变量 --code-line-number-color，两张主题表各写一份
 *
 * @author  马小战
 * @version 1.1.0
 * @date    2026-09-25
 * @license MIT
 */
(function (win, doc) {
    'use strict';

    var VERSION = '1.1.0';

    /* 默认配置：不写配置就是“所有代码块都带行号”，字号比代码小一档 */
    var DEFAULTS = {
        enable: true,
        include: [],
        exclude: [],
        minLines: 0,
        startFrom: 1,
        fontSize: '0.75em'
    };

    var STYLE_ID = 'docsify-code-line-numbers-style';
    var PRE_CLASS = 'has-line-numbers';
    var LIST_CLASS = 'doc-line-numbers';

    /* 行号的排版：绝对定位在代码块左侧，行高继承 pre，保证与代码逐行对齐 */
    var CSS_TEXT = [
        '.markdown-section pre.' + PRE_CLASS + ' {',
        '    padding-left: 3.6em;',
        '}',
        '.markdown-section pre.' + PRE_CLASS + ' > .' + LIST_CLASS + ' {',
        '    position: absolute;',
        '    left: 0;',
        '    width: 3rem;',  /* 48px，用 rem 固定，不随行号字号变大变小 */
        '    padding-right: 0.6rem;',  /* 同理，不随字号变 */
        '    text-align: right;',
        '    font-size: var(--code-line-number-size, 0.75em);',  /* 比代码小一档，可用配置改 */
        '    line-height: inherit;',  /* 行高跟着代码走，字号再小也逐行对齐 */
        '    white-space: pre;',
        '    overflow: hidden;',
        '    color: var(--code-line-number-color, #999);',
        '    border-right: 1px solid var(--code-line-number-border, rgba(0, 0, 0, 0.09));',
        '    user-select: none;',
        '    -webkit-user-select: none;',
        '    pointer-events: none;',
        '}'
    ].join('\n');

    var config = null;

    /**
     * 把用户写在 window.$docsify.codeLineNumbers 里的配置与默认值合并。
     * 为什么：默认值集中一处，调用方只覆盖关心的字段，缺项不会变成 undefined 让后面的判断出错。
     *
     * Merge user options from window.$docsify.codeLineNumbers with the built-in defaults.
     * Why: keeping defaults in one place means callers only override what they care about,
     * and a missing key can never leak through as undefined and break later checks.
     */
    function getConfig() {
        var user = (win.$docsify && win.$docsify.codeLineNumbers) || {};
        var out = {};
        for (var key in DEFAULTS) {
            if (DEFAULTS.hasOwnProperty(key)) {
                out[key] = (user[key] === undefined || user[key] === null) ? DEFAULTS[key] : user[key];
            }
        }
        return out;
    }

    /**
     * 把行号样式注入 head，只注入一次。
     * 为什么：插件要单文件可用，样式不能依赖用户再引一个 CSS 文件，重复执行也要幂等。
     *
     * Inject the line-number stylesheet into head exactly once.
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
     * 判断元素是否带某个类名。
     * 为什么：用 className 字符串判断而不是 classList，老环境里行为一致。
     *
     * Check whether an element carries a given class name.
     * Why: className string checks behave the same even in very old environments.
     */
    function hasClass(el, name) {
        return (' ' + el.className + ' ').indexOf(' ' + name + ' ') !== -1;
    }

    /**
     * 给元素添加类名，已存在就不重复添加。
     * 为什么：每次渲染都会重新处理代码块，盲加会让 className 无限增长。
     *
     * Add a class name unless it is already present.
     * Why: every render re-processes the code blocks, and blind appending would grow
     * className without bound.
     */
    function addClass(el, name) {
        if (!hasClass(el, name)) {
            el.className = el.className ? el.className + ' ' + name : name;
        }
    }

    /**
     * 移除元素上的某个类名。
     * 为什么：关掉行号时要把标记类一并摘掉，否则样式还留着一条左内边距。
     *
     * Remove a class name from an element.
     * Why: turning line numbers off must also drop the marker class, otherwise the reserved
     * left padding stays behind.
     */
    function removeClass(el, name) {
        el.className = (' ' + el.className + ' ').split(' ' + name + ' ').join(' ').replace(/^\s+|\s+$/g, '');
    }

    /**
     * 判断某个值是否在配置的列表里，忽略大小写。
     * 为什么：语言名在不同地方写法不一，js 与 JS 应该被当成同一种。
     *
     * Tell whether a value is present in a configured list, ignoring case.
     * Why: language names are written inconsistently across documents, so js and JS have to
     * count as the same thing.
     */
    function inList(list, value) {
        var target = String(value).toLowerCase();
        for (var i = 0; i < list.length; i++) {
            if (String(list[i]).toLowerCase() === target) {
                return true;
            }
        }
        return false;
    }

    /**
     * 判断某个代码块按配置该不该带行号。
     * 为什么：include 和 exclude 同时存在时，先满足 include 再排除 exclude，规则单向清晰，
     * 使用者不必猜两者谁优先。
     *
     * Decide whether one code block should carry line numbers.
     * Why: when include and exclude coexist, include is satisfied first and exclude then
     * removes from that set, giving one clear direction instead of leaving the user to guess
     * which one wins.
     */
    function shouldNumber(cfg, lang) {
        if (!cfg.enable) {
            return false;
        }
        if (cfg.include && cfg.include.length && !inList(cfg.include, lang)) {
            return false;
        }
        if (cfg.exclude && cfg.exclude.length && inList(cfg.exclude, lang)) {
            return false;
        }
        return true;
    }

    /**
     * 数一个代码块有多少行。
     * 为什么：行号要一次性生成整列，必须先知道总数；末尾的换行不算新行，否则会多出一号。
     *
     * Count how many lines a code block has.
     * Why: the whole column is generated at once so the total is needed up front, and a
     * trailing newline must not be counted or the last number would be one too many.
     */
    function countLines(code) {
        var text = (code.textContent || '').replace(/\n+$/, '');
        return text ? text.split('\n').length : 0;
    }

    /**
     * 清掉某个代码块已有的行号与标记类。
     * 为什么：docsify 每次渲染都会重新处理一遍，先清后画才能保证结果稳定、不叠加。
     *
     * Clear the line numbers and marker class of one code block.
     * Why: docsify re-processes everything on each render, and clearing before drawing is
     * what keeps the result stable instead of accumulating.
     */
    function clearLineNumbers(pre) {
        var old = pre.querySelector('.' + LIST_CLASS);
        if (old && old.parentNode) {
            old.parentNode.removeChild(old);
        }
        removeClass(pre, PRE_CLASS);
    }

    /**
     * 给一个代码块画出整列行号。
     * 为什么：行号不是逐行插到代码里（那会破坏语法高亮生成的标签），而是单独一列靠左对齐；
     * 顶部位置读代码块自己的上内边距，这样无论主题怎么调 padding 都不会错行。
     *
     * Draw the whole column of line numbers for one code block.
     * Why: numbers are not injected per line, which would break the tags produced by syntax
     * highlighting, but drawn as a separate right-aligned column. Its top offset is read from
     * the code element's own padding, so changing the theme padding can never misalign it.
     */
    function drawLineNumbers(pre, code, total, startFrom) {
        clearLineNumbers(pre);

        var buf = [];
        for (var i = 0; i < total; i++) {
            buf.push(String(startFrom + i));
        }

        var box = doc.createElement('span');
        box.className = LIST_CLASS;
        box.setAttribute('aria-hidden', 'true');
        box.textContent = buf.join('\n');

        try {
            box.style.top = win.getComputedStyle(code).paddingTop;
        } catch (e) {
            /* 取不到就算了，样式里有兜底 */
        }

        pre.insertBefore(box, pre.firstChild);
        addClass(pre, PRE_CLASS);
    }

    /**
     * 处理一个代码块：该加的加，不该加的清掉。
     * 为什么：把判断和绘制收在同一个入口，无论配置怎么变，每个代码块的状态都能被纠正回来。
     *
     * Handle a single code block: add numbers when it qualifies, clear them when it does not.
     * Why: keeping the decision and the drawing behind one entry point means every block can be
     * corrected no matter how the configuration changes.
     */
    function handleBlock(pre, cfg) {
        var code = pre.querySelector('code');
        var lang = pre.getAttribute('data-lang') || '';

        if (!code || !shouldNumber(cfg, lang)) {
            clearLineNumbers(pre);
            return;
        }

        var total = countLines(code);
        if (total === 0 || total < cfg.minLines) {
            clearLineNumbers(pre);
            return;
        }

        drawLineNumbers(pre, code, total, cfg.startFrom);
    }

    /**
     * 扫描正文里所有代码块并逐个处理。
     * 为什么：每次路由切换后正文都是新渲染的，必须整体过一遍才能覆盖到新增的代码块。
     *
     * Scan every code block in the article and handle each one.
     * Why: the article is re-rendered on every route change, so a full pass is required to
     * reach the freshly added blocks.
     */
    function process(cfg) {
        var pres = doc.querySelectorAll('.markdown-section pre');
        for (var i = 0; i < pres.length; i++) {
            handleBlock(pres[i], cfg);
        }
    }

    /**
     * 把行号字号写到根元素的 CSS 变量上。
     * 为什么：字号是个入口级的选择，写在配置里比让使用者去翻 CSS 方便；
     * 写到根元素变量上而不是行内样式，是为了让主题表或自定义 CSS 也能覆盖同一个变量，
     * 两条路都能改，谁也不挡谁。
     *
     * Publish the line-number font size to a CSS variable on the root element.
     * Why: font size is a top-level preference, easier to state in the config than to hunt for
     * in CSS; writing it to a root variable rather than an inline style keeps the same variable
     * overridable from a theme sheet or custom CSS, so both routes stay open.
     */
    function applyOptions(cfg) {
        if (cfg.fontSize) {
            doc.documentElement.style.setProperty('--code-line-number-size', cfg.fontSize);
        }
    }

    /**
     * 插件入口：读配置、注入样式、挂上 docsify 的渲染钩子。
     * 为什么：行号必须在正文渲染完成之后才算得清行数，所以挂在 doneEach 上而不是更早的时机。
     *
     * Plugin entry: read config, inject styles, register the docsify render hook.
     * Why: line counts are only reliable after the article is rendered, so the work belongs on
     * doneEach rather than any earlier moment.
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
            function run() {
                process(config);
            }
            if (hook && hook.doneEach) {
                hook.doneEach(run);
            }
            if (hook && hook.ready) {
                hook.ready(run);
            }
        }]);
    }

    /* 运行时可调，方便在控制台里临时开关 */
    win.DocsifyCodeLineNumbers = {
        version: VERSION,
        refresh: function () {
            process(config || getConfig());
        },
        setEnable: function (on) {
            var c = config || getConfig();
            c.enable = !!on;
            process(c);
        }
    };

    boot();
})(window, document);
