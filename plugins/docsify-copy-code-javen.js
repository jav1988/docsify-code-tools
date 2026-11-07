!(function () {
    'use strict'
    // 类型检测函数
    function getType(obj) {
        return (getType =
            'function' === typeof Symbol && 'symbol' === typeof Symbol.iterator
                ? function (obj) {
                      return typeof obj
                  }
                : function (obj) {
                      return obj && 'function' === typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? 'symbol' : typeof obj
                  })(obj)
    }
    // 插入CSS样式
    !(function (cssArray, options) {
        void 0 === options && (options = {})
        var insertPosition = options.insertAt
        if (cssArray && 'undefined' !== typeof document) {
            var headElement = document.head || document.getElementsByTagName('head')[0]
            var styleElement = document.createElement('style')
            styleElement.type = 'text/css'
            if ('top' === insertPosition && headElement.firstChild) {
                headElement.insertBefore(styleElement, headElement.firstChild)
            } else {
                headElement.appendChild(styleElement)
            }
            var cssContent = cssArray.join('')
            if (styleElement.styleSheet) {
                styleElement.styleSheet.cssText = cssContent
            } else {
                styleElement.appendChild(document.createTextNode(cssContent))
            }
        }
    })(
        [
            '.docsify-copy-code-button,',
            '.docsify-copy-code-button span{',
            'cursor:pointer;',
            'transition:all .25s ease;',
            '}',
            '.docsify-copy-code-button{',
            'position:absolute;',
            'z-index:1;',
            'top:0;',
            'right:0;',
            'overflow:visible;',
            'padding:.65em .8em;',
            'border:0;',
            'border-radius:0;',
            'outline:0;',
            'font-size:0.8em;',
            'background:grey;',
            'background:var(--theme-color,grey);',
            'color:#fff;',
            'opacity:0;',
            '}',
            '.docsify-copy-code-button span{',
            'border-radius:3px;',
            'background:inherit;',
            'pointer-events:none;',
            '}',
            '.docsify-copy-code-button .error,',
            '.docsify-copy-code-button .success{',
            'position:absolute;',
            'z-index:-100;',
            'top:50%;',
            'right:0;',
            'padding:.5em .65em;',
            'font-size:.825em;',
            'opacity:0;',
            '-webkit-transform:translateY(-50%);',
            'transform:translateY(-50%);',
            '}',
            '.docsify-copy-code-button.error .error,',
            '.docsify-copy-code-button.success .success{',
            'right:100%;',
            'opacity:1;',
            '-webkit-transform:translate(-20%,-50%);',
            'transform:translate(-20%,-50%);',
            '}',
            '.docsify-copy-code-button:focus,',
            'pre:hover .docsify-copy-code-button{',
            'opacity:1;',
            '}',
        ],
        {}
    )
    // 检查是否有旧的样式表链接
    document.querySelector('link[href*="docsify-copy-code"]') && console.warn('[Deprecation] Link to external docsify-copy-code stylesheet is no longer necessary.')
    // 定义插件
    window.DocsifyCopyCodePlugin = {
        init: function () {
            return function (docsifyInstance, config) {
                docsifyInstance.ready(function () {
                    console.warn('[Deprecation] Manually initializing docsify-copy-code using window.DocsifyCopyCodePlugin.init() is no longer necessary.')
                })
            }
        },
    }
    // 初始化插件
    window.$docsify = window.$docsify || {}
    window.$docsify.plugins = [
        function (docsifyInstance, vm) {
            let config = vm.config
            docsifyInstance.doneEach(function () {
                // 获取所有代码块
                var codeBlocks = Array.apply(null, document.querySelectorAll('pre[data-lang]'))
                // 按钮配置
                var buttonConfig = {
                    buttonText: 'Copy to clipboard',
                    errorText: 'Error',
                    successText: 'Copied',
                }
                // 应用用户配置
                if (config.copyCode) {
                    Object.keys(buttonConfig).forEach(function (key) {
                        var userValue = config.copyCode[key]
                        if ('string' === typeof userValue) {
                            buttonConfig[key] = userValue
                        } else if ('object' === getType(userValue)) {
                            Object.keys(userValue).some(function (path) {
                                var isMatch = -1 < location.href.indexOf(path)
                                buttonConfig[key] = isMatch ? userValue[path] : buttonConfig[key]
                                return isMatch
                            })
                        }
                    })
                }

                // 生成按钮HTML
                var buttonHTML = ['<button class="docsify-copy-code-button">', '<span class="label">' + buttonConfig.buttonText + '</span>', '<span class="error">' + buttonConfig.errorText + '</span>', '<span class="success">' + buttonConfig.successText + '</span>', '</button>'].join('')
                // 为每个代码块添加按钮
                codeBlocks.forEach(function (preElement) {
                    preElement.insertAdjacentHTML('beforeend', buttonHTML)
                })
            })
            // 监听点击事件
            docsifyInstance.mounted(function () {
                document.querySelector('.content').addEventListener('click', function (event) {
                    if (event.target.classList.contains('docsify-copy-code-button')) {
                        var button = 'BUTTON' === event.target.tagName ? event.target : event.target.parentNode
                        var range = document.createRange()
                        var codeElement = button.parentNode.querySelector('code')
                        var selection = window.getSelection()
                        range.selectNodeContents(codeElement)
                        // range.selectNode(codeElement)
                        selection.removeAllRanges()
                        selection.addRange(range)
                        try {
                            document.execCommand('copy') &&
                                (button.classList.add('success'),
                                setTimeout(function () {
                                    button.classList.remove('success')
                                }, 1000))
                        } catch (error) {
                            console.error('docsify-copy-code: ' + error)
                            button.classList.add('error')
                            setTimeout(function () {
                                button.classList.remove('error')
                            }, 1000)
                        }
                        // 清除选中范围
                        if ('function' === typeof selection.removeRange) {
                            selection.removeRange(range)
                        } else if ('function' === typeof selection.removeAllRanges) {
                            selection.removeAllRanges()
                        }
                    }
                })
            })
        },
    ].concat(window.$docsify.plugins || [])
})()
