/*!
 * docsify-code-collapse - 代码块一键收起 / 展开
 * ------------------------------------------------------------
 * 在代码块标题栏右侧加一枚小箭头，点一下把代码收起来（只剩标题栏），再点一下展开。
 *
 * 功能说明：
 * - 每个代码块标题栏右侧一枚箭头按钮，图标按钮，不占地方
 * - 收起时若代码块带行号（docsify-code-line-numbers 那列），行号一起收掉
 * - 支持全局开关、只给指定语言加（include）、排除指定语言（exclude）
 * - 代码行数少于设定值时自动跳过，三五行的短块没必要收
 * - 可以配置成"默认就收起"（collapsedByDefault），长文档一眼扫得过去
 * - 记住每一页哪些块被收起了（persistence），翻到别的页再翻回来还是原样
 * - 按钮位置默认在代码块右上角；站点主题若把它按进标题栏里，它会跟着走
 *
 * @author  马小战
 * @version 1.0.0
 * @date    2026-10-12
 * @license MIT
 */
(function (win, doc) {
    'use strict';

    var VERSION = '1.0.0';

    /* 默认配置：不写配置就是"所有代码块都能收起、默认不收起、记住状态" */
    var DEFAULTS = {
        enable: true,
        include: [],
        exclude: [],
        minLines: 0,
        collapsedByDefault: false,
        persistence: true,
        labelCollapse: '收起',
        labelExpand: '展开'
    };

    var STYLE_ID = 'docsify-code-collapse-style';
    var BTN_CLASS = 'code-collapse-button';
    var COLLAPSED_CLASS = 'is-collapsed';
    var STORE_PREFIX = 'docsify-code-collapse:';
    /* 收起 / 展开的高度过渡时长（毫秒）。
       250ms 上下是这类"折叠一层"的舒服区间：再快就看不出是过渡，再慢就显得拖 */
    var DURATION = 260;

    /* 图标：内联 SVG，描边风格，不依赖字体也不发额外请求。
       画的是"向上折"的箭头——按钮表示的是**点击后会做什么**：
       展开状态下点它就是收起，所以箭头朝上；收起后靠 CSS 转 180° 变成朝下 */
    var ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.8 10.4 8 6.2l4.2 4.2"/></svg>';

    /* 按钮样式。
       位置默认在代码块右上角（复制按钮旁边），主题可以把它挪进标题栏。
       宽度写死 26px：它是图标按钮，宽度固定，旁边的复制按钮才能靠一个固定值让开位置。
       收起状态本身的三条规则放在最后：把 <code> 和行号列一起隐藏，
       并把 pre 压到"标题栏 + 分界线 + 上下 1px 外框"的高度。
       高度用主题变量 --code-block-header-height（缺省 36px），
       这样主题调标题栏高度时，收起后的高度自动跟着变。
       为什么是 +4px：主题里 * { box-sizing: border-box }，height 把边框也算在内。
       收起后的高度取主题变量 --code-collapse-height（主题里 = 标题栏 + 上下各 1px 外框），
       主题没定义时退回"标题栏 + 4px"，随便哪个主题都不会收成一条线。
       收起时**不删代码，只裁掉**：整块压到标题栏那一档高度 + overflow: hidden。
       为什么不 display: none——那样收起是"啪"地一下，做不了高度过渡；
       留着代码元素，行号列、横向滚动位置也不会被重置（而且行号列在标题栏下面，
       高度一压自然就被裁掉了，不需要插件去跨插件地隐藏它）。 */
    var CSS_TEXT = [
        '.markdown-section pre > .' + BTN_CLASS + ' {',
        '    position: absolute;',
        '    top: 5px;',
        '    right: 12px;',
        '    z-index: 2;',
        '    display: inline-flex;',
        '    align-items: center;',
        '    justify-content: center;',
        '    width: 26px;',
        '    height: 20px;',
        '    padding: 0;',
        '    border: 0;',
        '    border-radius: 6px;',
        '    background-color: rgba(127, 127, 127, 0.16);',
        '    color: #7f7f7f;',
        '    font-family: inherit;',
        '    font-size: 0.72rem;',
        '    line-height: 1;',
        '    cursor: pointer;',
        '    opacity: var(--collapse-opacity-idle, 0.72);',
        '    transition: opacity 0.18s ease, background-color 0.18s ease, transform 0.12s ease;',
        '    -webkit-appearance: none;',
        '    appearance: none;',
        '}',
        /* 鼠标进了代码块：变清晰一档，提示这里有东西可以点 */
        '.markdown-section pre:hover > .' + BTN_CLASS + ' {',
        '    opacity: var(--collapse-opacity-code, 0.9);',
        '}',
        /* 鼠标落在按钮上：最清楚，底色也加深 */
        '.markdown-section pre > .' + BTN_CLASS + ':hover,',
        '.markdown-section pre > .' + BTN_CLASS + ':focus {',
        '    opacity: var(--collapse-opacity-button, 1);',
        '    background-color: rgba(127, 127, 127, 0.26);',
        '}',
        /* 按下去缩一下，像真的按到了东西 */
        '.markdown-section pre > .' + BTN_CLASS + ':active {',
        '    transform: scale(0.94);',
        '}',
        '.markdown-section pre > .' + BTN_CLASS + ' svg {',
        '    display: block;',
        '    width: 12px;',
        '    height: 12px;',
        '    fill: none;',
        '    stroke: currentColor;',
        '    stroke-width: 1.8;',
        '    stroke-linecap: round;',
        '    stroke-linejoin: round;',
        '    transition: transform 0.22s ease;',
        '}',
        /* 收起后箭头翻过来朝下：这一下翻转就是"现在能展开"的提示 */
        '.markdown-section pre.' + COLLAPSED_CLASS + ' > .' + BTN_CLASS + ' svg {',
        '    transform: rotate(180deg);',
        '}',
        /* 收起：整块压到"标题栏那一档"高度，超出的一律裁掉。
           代码元素还在（只是被裁了），所以收起过程中代码不会先消失再缩盒子 */
        '.markdown-section pre.' + COLLAPSED_CLASS + ' {',
        '    height: var(--code-collapse-height, calc(var(--code-block-header-height, 36px) + 4px));',
        '    overflow: hidden;',
        '}',
        /* 触摸设备没有悬停这回事，让按钮一直清晰，否则手机上看着发灰 */
        '@media (hover: none) {',
        '    .markdown-section pre > .' + BTN_CLASS + ' {',
        '        opacity: var(--collapse-opacity-button, 1);',
        '    }',
        '}',
        /* 打印：按钮藏掉，被收起的块一律摊开——打印出来看不见的代码等于没印 */
        '@media print {',
        '    .markdown-section pre > .' + BTN_CLASS + ' {',
        '        display: none;',
        '    }',
        '    .markdown-section pre.' + COLLAPSED_CLASS + ' {',
        '        height: auto;',
        '        overflow: visible;',
        '    }',
        '}'
    ].join('\n');

    var config = null;

    /**
     * 把用户写在 window.$docsify.codeCollapse 里的配置与默认值合并。
     * 为什么：默认值集中一处，调用方只覆盖关心的字段，缺项不会变成 undefined 让后面的判断出错。
     *
     * Merge user options from window.$docsify.codeCollapse with the built-in defaults.
     * Why: keeping defaults in one place means callers only override what they care about,
     * and a missing key can never leak through as undefined and break later checks.
     */
    function getConfig() {
        var user = (win.$docsify && win.$docsify.codeCollapse) || {};
        var out = {};
        for (var key in DEFAULTS) {
            if (DEFAULTS.hasOwnProperty(key)) {
                out[key] = (user[key] === undefined || user[key] === null) ? DEFAULTS[key] : user[key];
            }
        }
        return out;
    }

    /**
     * 把按钮样式注入 head，只注入一次。
     * 为什么：插件要单文件可用，样式不能依赖用户再引一个 CSS 文件，重复执行也要幂等。
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
     * 为什么：展开时要把收起标记类摘干净，否则样式还留着一条固定高度。
     *
     * Remove a class name from an element.
     * Why: expanding must clear the marker class, otherwise the fixed height rule stays behind.
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
     * 判断某个代码块按配置该不该加收起按钮。
     * 为什么：include 与 exclude 同时存在时，先满足 include 再排除 exclude，
     * 规则单向清晰，使用者不必猜两者谁优先。
     *
     * Decide whether one code block should get the collapse button.
     * Why: when include and exclude coexist, include is satisfied first and exclude then removes
     * from that set, giving one clear direction instead of leaving the user to guess which wins.
     */
    function shouldCollapse(cfg, lang) {
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
     * 为什么：短块（三五行的示例）收起来反而更麻烦，所以要按 minLines 拦一道。
     *
     * Count how many lines a code block has.
     * Why: collapsing a three-line snippet helps nobody, so minLines needs a real count.
     */
    function countLines(code) {
        var text = (code.textContent || '').replace(/\n+$/, '');
        return text ? text.split('\n').length : 0;
    }

    /**
     * 取当前页面（docsify 的一页）用来存状态的 key。
     * 为什么：状态要按页分开存，A 页收起的块不该影响 B 页；
     * hash 里可能带 ?id=xxx 这类查询串，那部分是页内锚点，不参与区分。
     *
     * Build the storage key for the current docsify page.
     * Why: state is per page, so collapsing something on one page must not affect another;
     * any ?id=... query in the hash is an in-page anchor and does not belong in the key.
     */
    function storageKey() {
        var path = win.location.hash || '#/';
        path = path.split('?')[0];
        return STORE_PREFIX + path;
    }

    /* 读写 localStorage：禁用、隐私模式、配额满都可能抛异常，一律吞掉当作"没记住" */
    function readState() {
        if (!config || !config.persistence) {
            return '';
        }
        try {
            return win.localStorage.getItem(storageKey()) || '';
        } catch (e) {
            return '';
        }
    }

    function writeState(value) {
        if (!config || !config.persistence) {
            return;
        }
        try {
            win.localStorage.setItem(storageKey(), value);
        } catch (e) {
            /* 存不下就算了，不影响本次收起 / 展开 */
        }
    }

    /**
     * 记下第 index 个代码块的收起状态。
     * 为什么：存成"定长 0/1 串"（如 "010"）而不是"收起过的下标列表"，
     * 是因为默认值可能是收起（collapsedByDefault），
     * 只有逐块记下 0 和 1 才能区分"用户手动展开的"和"从来没动过的"。
     *
     * Remember the collapsed state of the block at one index.
     * Why: a fixed-length 0/1 string (e.g. "010") is used instead of a list of collapsed
     * indices because the default may itself be collapsed (collapsedByDefault), and only
     * per-block zeros and ones can tell "the user expanded this one" from "never touched".
     */
    function setStateAt(index, collapsed) {
        if (index < 0) {
            return;
        }
        var current = readState();
        while (current.length <= index) {
            current += config.collapsedByDefault ? '1' : '0';
        }
        current = current.substring(0, index) + (collapsed ? '1' : '0') + current.substring(index + 1);
        writeState(current);
    }

    /**
     * 找出某个代码块是这一页里的第几个。
     * 为什么：状态是按序号存的，序号必须和"读取时"用的是同一套数法，
     * 所以两边都用 .markdown-section 下所有 pre 的顺序，中间的块有没有按钮都一样数。
     *
     * Find the index of one code block within the current page.
     * Why: state is stored by index, so the numbering has to match the one used when reading;
     * both sides therefore count every pre under .markdown-section, button or not.
     */
    function blockIndex(pre) {
        var pres = doc.querySelectorAll('.markdown-section pre');
        for (var i = 0; i < pres.length; i++) {
            if (pres[i] === pre) {
                return i;
            }
        }
        return -1;
    }

    /**
     * 造一个收起按钮。
     * 为什么：按钮只有图标，所以 title / aria-label 必须写清楚它当前是什么动作，
     * 否则不认得箭头的人、以及读屏用户都无从判断。
     *
     * Build one collapse button.
     * Why: the button is icon-only, so title and aria-label have to state the current action,
     * or people who do not read the chevron, and screen readers, are left guessing.
     */
    function buildButton(cfg, collapsed) {
        var btn = doc.createElement('button');
        btn.type = 'button';
        btn.className = BTN_CLASS;
        var label = collapsed ? cfg.labelExpand : cfg.labelCollapse;
        btn.setAttribute('title', label);
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        // 内容是写死的图标字符串，不含任何外部输入，所以这里用 innerHTML 是安全的
        btn.innerHTML = ICON;
        return btn;
    }

    /**
     * 把某个代码块设成收起 / 展开，并把按钮的提示文字同步过去。
     * 为什么：状态是加在 pre 上的一个类名——视觉、行号、按钮箭头全都由它派发，
     * 所以切换只改这一处，不存在"改了三处漏了一处"的可能。
     *
     * animate = true 时额外做一次高度过渡。为什么不用纯 CSS 过渡：
     * 展开态的高度是 auto，而 CSS 过渡不了 auto。这里用 FLIP 那套——
     * 先量出切换前的真实高度（from），把类名切过去、再量出切换后的自然高度（to，
     * 收起态由主题变量给出，展开态是内容自然撑开的高度），
     * 然后把高度钉回 from、强制一次回流、开过渡、改到 to，过渡结束再把内联高度还回去。
     * 全程只读一次布局、写一次布局，中间不会画出"跳到终点又跳回来"的画面。
     *
     * 另外：开启"减少动态效果"（prefers-reduced-motion）时直接跳变，不做过渡。
     *
     * Set one code block to collapsed or expanded, keeping the button label in step.
     * Why: the state is a single class on the pre, and the visuals, the line-number column and the
     * arrow direction all derive from it, so one switch point leaves nothing to fall out of sync.
     * With animate = true the height is transitioned FLIP-style, because the expanded height is
     * auto and CSS cannot transition auto. Reduced-motion users get an instant switch.
     */
    function setCollapsed(pre, collapsed, cfg, animate) {
        var btn = pre.querySelector('.' + BTN_CLASS);

        if (btn) {
            var label = collapsed ? cfg.labelExpand : cfg.labelCollapse;
            btn.setAttribute('title', label);
            btn.setAttribute('aria-label', label);
            btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        }

        // 上一次过渡还没走完就又点了一次：先把它的定时器清掉，接着按新状态重来
        if (pre.__collapseTimer) {
            win.clearTimeout(pre.__collapseTimer);
            pre.__collapseTimer = null;
        }

        if (!animate || prefersReducedMotion()) {
            pre.style.transition = '';
            pre.style.height = '';
            if (collapsed) {
                addClass(pre, COLLAPSED_CLASS);
            } else {
                removeClass(pre, COLLAPSED_CLASS);
            }
            return;
        }

        var from = pre.getBoundingClientRect().height;

        if (collapsed) {
            addClass(pre, COLLAPSED_CLASS);
        } else {
            removeClass(pre, COLLAPSED_CLASS);
        }

        var to = pre.getBoundingClientRect().height;

        // 高度相差不到 1px 就没必要动：省一次过渡，也避免极短块抖一下
        if (Math.abs(from - to) < 1) {
            pre.style.transition = '';
            pre.style.height = '';
            return;
        }

        pre.style.transition = 'none';
        pre.style.height = from + 'px';
        // 读一次布局，让"起点高度"先落地；不然浏览器会把两次改高度合并成一次，过渡就不见了
        void pre.offsetHeight;
        pre.style.transition = 'height ' + DURATION + 'ms cubic-bezier(0.22, 0.61, 0.36, 1)';
        pre.style.height = to + 'px';

        pre.__collapseTimer = win.setTimeout(function () {
            pre.__collapseTimer = null;
            pre.style.transition = '';
            pre.style.height = '';
        }, DURATION + 30);
    }

    /**
     * 用户是不是开了"减少动态效果"。
     * 为什么：系统里开了这个开关的人明确表示过不想要动画，这里必须让路。
     *
     * Whether the user asked for reduced motion.
     * Why: that setting is an explicit request for no animation, so it has to win.
     */
    function prefersReducedMotion() {
        try {
            return !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch (e) {
            return false;
        }
    }

    /**
     * 扫描正文里所有代码块：该加按钮的加上，并按记住的状态摆好。
     * 为什么：每次路由切换后正文都是新渲染的，必须整体过一遍才能覆盖到新增的代码块；
     * 已经加过按钮的块也要重摆一次状态，因为 docsify 有可能复用同一批节点。
     *
     * Scan every code block: add the button where it belongs and restore the remembered state.
     * Why: the article is re-rendered on every route change, so a full pass is required to reach
     * fresh blocks; blocks that already carry a button still need their state re-applied because
     * docsify may reuse the same nodes.
     */
    function process(cfg) {
        var pres = doc.querySelectorAll('.markdown-section pre');
        var saved = readState();

        for (var i = 0; i < pres.length; i++) {
            var pre = pres[i];
            var code = pre.querySelector('code');
            var lang = pre.getAttribute('data-lang') || '';

            if (!code || !shouldCollapse(cfg, lang) || countLines(code) < cfg.minLines) {
                // 不合条件的块：把上一轮可能留下的按钮和收起状态都清掉
                var stale = pre.querySelector('.' + BTN_CLASS);
                if (stale && stale.parentNode) {
                    stale.parentNode.removeChild(stale);
                }
                removeClass(pre, COLLAPSED_CLASS);
                continue;
            }

            if (!pre.querySelector('.' + BTN_CLASS)) {
                pre.appendChild(buildButton(cfg, false));
            }

            /* 这一块该不该收起：先看记住的 0/1，没有记录才用 collapsedByDefault */
            var flag = saved.charAt(i);
            var collapsed = flag === '1' ? true : (flag === '0' ? false : !!cfg.collapsedByDefault);
            setCollapsed(pre, collapsed, cfg);
        }
    }

    /**
     * 判断一个元素是不是收起按钮。
     * 为什么：用 getAttribute 取 class 而不是 el.className，因为 SVG 元素上的 className
     * 是对象而不是字符串，直接拿字符串方法去处理它会报错。
     *
     * Tell whether an element is the collapse button.
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
     * 从被点到的元素往上找收起按钮，找到了就切换它所在代码块的状态。
     * 为什么：手写向上查找而不用 closest，是为了在更老的浏览器上也成立；
     * 点按钮时鼠标的焦点留在按钮上（不像复制按钮要主动 blur），
     * 因为键盘用户靠焦点找位置，而这里 :focus 只是把按钮变清楚一点，不会失真。
     *
     * Walk up from the clicked element to find the collapse button, then toggle the state of the
     * code block it belongs to.
     * Why: the upward walk is written by hand instead of using closest so it holds on older
     * browsers; focus is deliberately left on the button, since keyboard users navigate by it and
     * :focus here only makes the button a little clearer.
     */
    function handleClick(event) {
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
        if (!pre || !pre.querySelector || !pre.querySelector('code')) {
            return;
        }

        var collapsed = !hasClass(pre, COLLAPSED_CLASS);
        setCollapsed(pre, collapsed, config, true);
        setStateAt(blockIndex(pre), collapsed);
    }

    /**
     * 插件入口：读配置、注入样式、挂上渲染钩子与一次全局点击委托。
     * 为什么：按钮要在正文渲染完之后才加得上（那时才知道有几个代码块、各多少行），
     * 所以挂在 doneEach 上；点击委托绑在 document 上，页面结构怎么变都不会漏。
     *
     * Plugin entry: read config, inject styles, register the render hook and one delegated click.
     * Why: buttons can only be added after the article is rendered, when the number of blocks and
     * their line counts are known, so the work belongs on doneEach; delegating on document means
     * no page structure change can make the button unclickable.
     */
    function boot() {
        config = getConfig();
        injectStyle();

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

        if (doc.addEventListener) {
            doc.addEventListener('click', handleClick, false);
        }
    }

    /* 运行时可调，方便在控制台里临时开关 */
    win.DocsifyCodeCollapse = {
        version: VERSION,
        refresh: function () {
            process(config || getConfig());
        },
        expandAll: function () {
            var pres = doc.querySelectorAll('.markdown-section pre');
            for (var i = 0; i < pres.length; i++) {
                setCollapsed(pres[i], false, config || getConfig(), true);
            }
        },
        collapseAll: function () {
            var pres = doc.querySelectorAll('.markdown-section pre');
            for (var i = 0; i < pres.length; i++) {
                var pre = pres[i];
                if (pre.querySelector('.' + BTN_CLASS)) {
                    setCollapsed(pre, true, config || getConfig(), true);
                }
            }
        }
    };

    boot();
})(window, document);
