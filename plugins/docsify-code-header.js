/*!
 * docsify-code-header - 代码块标题栏上的四样装饰，开哪个关哪个由配置说了算
 * ------------------------------------------------------------
 * 标题栏上的东西是主题表（vue.css / vue-dark.css）用 CSS 画的，这个插件只做一件事：
 * 把 window.$docsify.codeHeader 里的四个开关，翻译成 <html> 上的几个类名，
 * 主题表再按类名决定"画不画 / 从哪儿开始排"。
 *
 * 四个开关：
 * - dots       左上角三颗窗口圆点
 * - langIcon   语言名前面那枚 `<>` 图标
 * - langPill   语言名用"彩色胶囊"（按语言上色的圆角底板）
 * - langLabel  语言名用"灰色文字"
 *
 * 位置会自动跟着走：关掉圆点，图标就补到最左边；关掉图标，语言名再往左挪。
 * 这一条不是插件算的，而是主题表里那几个 CSS 变量（--code-block-dots-w /
 * --code-block-icon-w）由这几个类名改成 0，位置全是 calc() 算出来的。
 *
 * @author  马小战
 * @version 1.0.0
 * @date    2026-10-12
 * @license MIT
 */
(function (win, doc) {
    'use strict';

    var VERSION = '1.0.0';

    /* 默认四样都开，只有彩色胶囊是关的——不写配置时就是"三颗圆点 + `<>` 图标 + 灰色语言名"，
       也就是当前主题本来的样子，加了这个插件页面不会变样 */
    var DEFAULTS = {
        dots: true,
        langIcon: true,
        langPill: false,
        langLabel: true
    };

    /* 类名 → 配置项。类名挂在 <html> 上，主题表里照着它写规则 */
    var CLASSES = [
        ['code-header-no-dots', 'dots', true],
        ['code-header-no-icon', 'langIcon', true],
        ['code-header-pill', 'langPill', false],
        ['code-header-no-lang', 'langLabel', true]
    ];

    /**
     * 把用户写在 window.$docsify.codeHeader 里的配置与默认值合并。
     * 为什么：默认值集中一处，调用方只覆盖关心的字段，缺项不会变成 undefined。
     *
     * Merge window.$docsify.codeHeader with the built-in defaults.
     * Why: keeping defaults in one place means callers only override what they care about,
     * and a missing key can never leak through as undefined.
     */
    function getConfig() {
        var user = (win.$docsify && win.$docsify.codeHeader) || {};
        var out = {};
        for (var key in DEFAULTS) {
            if (DEFAULTS.hasOwnProperty(key)) {
                out[key] = (user[key] === undefined || user[key] === null) ? DEFAULTS[key] : !!user[key];
            }
        }
        return out;
    }

    /**
     * 按配置把类名挂到 <html> 上 / 摘下来。
     * 为什么挂在 <html> 而不是每个代码块：这几个开关是全局的，
     * 挂一处就能让整页的规则都生效；而且主题切换只换样式表，<html> 上的类名不动，
     * 切完主题开关依然是刚才那个状态。
     *
     * Put the switch classes on the root element.
     * Why the root and not every code block: the switches are global, so one place is enough, and
     * swapping the theme sheet (which the theme-toggle plugin does) does not touch the root
     * element, so the switches keep their state across a theme change.
     */
    function apply(cfg) {
        var root = doc.documentElement;
        if (!root || !root.className === undefined) {
            return;
        }
        for (var i = 0; i < CLASSES.length; i++) {
            var name = CLASSES[i][0];
            var on = cfg[CLASSES[i][1]];
            // 第三个值 true 表示"这个开关关掉时才挂类名"
            var shouldHave = CLASSES[i][2] ? !on : on;
            var has = (' ' + root.className + ' ').indexOf(' ' + name + ' ') !== -1;
            if (shouldHave && !has) {
                root.className = root.className ? root.className + ' ' + name : name;
            } else if (!shouldHave && has) {
                root.className = (' ' + root.className + ' ').split(' ' + name + ' ').join(' ')
                    .replace(/^\s+|\s+$/g, '');
            }
        }
    }

    var config = null;

    function boot() {
        config = getConfig();
        apply(config);
    }

    /* 运行时可调，方便在控制台里试：docsify 的配置是启动时读的，
       改完 $docsify.codeHeader 再调一次 refresh()，不用刷新页面 */
    win.DocsifyCodeHeader = {
        version: VERSION,
        refresh: function () {
            config = getConfig();
            apply(config);
        },
        set: function (options) {
            var user = (win.$docsify = win.$docsify || {}).codeHeader =
                win.$docsify.codeHeader || {};
            for (var key in options) {
                if (options.hasOwnProperty(key)) {
                    user[key] = options[key];
                }
            }
            win.DocsifyCodeHeader.refresh();
        }
    };

    boot();
})(window, document);
