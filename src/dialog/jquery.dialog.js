/**
 *
 */

define(['jquery', 'popup'], function($, Popup) {

    var defaultOptions = {

        /* -----已注释的配置继承自 popup.js，仍可以再这里重新定义它----- */

        // 对齐方式
        //align: 'bottom left',

        // 是否固定定位
        //fixed: false,

        // 对话框叠加高度值(重要：此值不能超过浏览器最大限制)
        //zIndex: 1024,

        // 设置遮罩背景颜色
        backdropBackground: '#000',

        // 设置遮罩透明度
        backdropOpacity: 0.4,

        // 消息内容
        content: '<span class="ui-dialog-loading">Loading..</span>',

        // 标题
        title: '',

        // 自定义按钮
        button: null,

        // 确定按钮回调函数
        ok: null,

        // 取消按钮回调函数
        cancel: null,

        // 确定按钮文本
        okValue: 'ok',

        // 取消按钮文本
        cancelValue: 'cancel',

        cancelDisplay: true,

        // 内容宽度
        width: '',

        // 内容高度
        height: '',

        // 内容与边界填充距离
        padding: '',

        // 对话框自定义 className
        skin: '',

        // 是否支持快捷关闭（点击遮罩层自动关闭）
        quickClose: false,

        // 是否使用遮罩
        modal: false,

        // 模板（使用 table 解决 IE7 宽度自适应的 BUG）
        // js 使用 i="***" 属性识别结构，其余的均可自定义
        innerHTML: 
            '<div i="dialog" class="ui-dialog">'
            +       '<i class="ui-dialog-arrow-a"></i>'
            +       '<i class="ui-dialog-arrow-b"></i>'
            +       '<table class="ui-dialog-grid">'
            +           '<tr>'
            +               '<td i="header" class="ui-dialog-header">'
            +                   '<button i="close" class="ui-dialog-close">&#215;</button>'
            +                   '<div i="title" class="ui-dialog-title"></div>'
            +               '</td>'
            +           '</tr>'
            +           '<tr>'
            +               '<td i="body" class="ui-dialog-body">'
            +                   '<div i="content" class="ui-dialog-content"></div>'
            +               '</td>'
            +           '</tr>'
            +           '<tr>'
            +               '<td i="footer" class="ui-dialog-footer">'
            +                   '<div i="button" class="ui-dialog-button"></div>'
            +               '</td>'
            +           '</tr>'
            +       '</table>'
            +'</div>'
    };

    var _count = 0;
    var _expando = new Date() - 0; // Date.now()
    var _isIE6 = !('minWidth' in $('html')[0].style);
    var _isMobile = 'createTouch' in document && !('onmousemove' in document) || /(iPhone|iPad|iPod)/i.test(navigator.userAgent);
    var _isFixed = !_isIE6 && !_isMobile;

    var dialog = function(options) {

        options = options || {};

        options = $.extend(true, {}, dialog.defaultOptions, options);

        var id = options.id = options.id || _expando + _count;

        var api = dialog.get(id);

        // 如果存在同名的对话框对象，则直接返回
        if (api) {
            return api.focus();
        }

        // 目前主流移动设备对fixed支持不好，禁用此特性
        if (!_isFixed) {
            options.fixed = false;
        }

        // 快捷关闭支持：点击对话框外快速关闭对话框
        if (options.quickClose) {
            options.modal = true;
        }

        // 按钮组
        if (!$.isArray(options.button)) {
            options.button = [];
        }

        if (options.ok) {
            options.button.push({
                id: 'ok',
                value: options.okValue,
                callback: options.ok,
                autofocus: true
            });
        }

        if (options.cancel) {
            options.button.push({
                id: 'cancel',
                value: options.cancelValue,
                callback: options.cancel,
                display: options.cancelDisplay
            });
        }

        return dialog.list[id] = new dialog.create(options);

    };

    dialog.create = function(options) {

        var that = this;

        $.extend(this, new Popup());

        var $popup = $(this.node).html(options.innerHTML);
        var $backdrop = $(this.backdrop);

        this.options = options;
        this._popup = $popup;

        $.each(options, function (name, value) {
            if (typeof that[name] === 'function') {
                that[name](value);
            } else {
                that[name] = value;
            }
        });

        // 添加视觉参数
        this._$('dialog').addClass(this.skin);
        this._$('body').css('padding', this.padding);

        // 更新 zIndex 全局配置
        if (options.zIndex) {
            Popup.zIndex = options.zIndex;
        }

        // 关闭按钮
        this._$('close')
            .css('display', this.cancel === false ? 'none' : '')
            .attr('title', this.cancelValue)
            .on('click', function(event) {
                that._trigger('cancel');
                event.preventDefault();
            });

        // 设置 ARIA 信息
        $popup.attr({
            'aria-labelledby': this._$('title')
                .attr('id', 'title:' + this.id).attr('id'),
            'aria-describedby': this._$('content')
                .attr('id', 'content:' + this.id).attr('id')
        });

        // ESC 快捷键关闭对话框
        this._esc = function(event) {
            var target = event.target;
            var nodeName = target.nodeName;
            var rinput = /^input|textarea$/i;
            var isTop = Popup.current === that;
            var keyCode = event.keyCode;

            // 避免输入状态中 ESC 误操作关闭
            if (!isTop || rinput.test(nodeName) && target.type !== 'button') {
                return;
            }

            if (keyCode === 27) {
                that._trigger('cancel');
            }
        };

        // 点击任意空白处关闭对话框
        if (options.quickClose) {
            $backdrop
                .on(
                    'onmousedown' in document ? 'mousedown' : 'click',
                    function() {
                        that._trigger('cancel');
                        return false; // 阻止抢夺焦点
                    });

            $(document).on('keydown', this._esc);
            this.addEventListener('remove', function() {
                $(document).off('keydown', this._esc);
                delete dialog.list[this.id];
            });
        }

        // 遮罩设置
        this.addEventListener('show', function() {
            $backdrop.css({
                opacity: 0,
                background: options.backdropBackground
            }).animate({
                opacity: options.backdropOpacity
            }, 150);
        });

        _count++;

        dialog.oncreate(this);

        return this;

    };

    var prototype = dialog.create.prototype;

    $.extend(prototype, {

        constructor: dialog.create,

        /**
         * 设置内容
         * @param    {String, HTMLElement}   内容
         */
        content: function(html) {

            var $content = this._$('content');

            // HTMLElement
            if (typeof html === 'object') {
                html = $(html);
                $content.empty('').append(html.show());
                this.addEventListener('beforeremove', function() {
                    $('body').append(html.hide());
                });
                // String
            } else {
                $content.html(html);
            }

            return this.reset();
        },

        /**
         * 设置标题
         * @param    {String}   标题内容
         */
        title: function(text) {
            this._$('title').text(text);
            this._$('header')[text ? 'show' : 'hide']();
            return this;
        },


        /** 设置宽度 */
        width: function(value) {
            this._$('content').css('width', value);
            return this.reset();
        },


        /** 设置高度 */
        height: function(value) {
            this._$('content').css('height', value);
            return this.reset();
        },

        /**
         * 设置按钮组
         * @param   {Array, String}
         * Options: value, callback, autofocus, disabled
         */
        button: function(args) {
            args = args || [];
            var that = this;
            var html = '';
            var number = 0;
            this.callbacks = {};


            if (typeof args === 'string') {
                html = args;
                number++;
            } else {
                $.each(args, function(i, val) {

                    var id = val.id = val.id || val.value;
                    var style = '';
                    that.callbacks[id] = val.callback;


                    if (val.display === false) {
                        style = ' style="display:none"';
                    } else {
                        number++;
                    }

                    html +=
                        '<button type="button" i-id="' + id + '"' + style + (val.disabled ? ' disabled' : '') + (val.autofocus ? ' autofocus class="ui-dialog-autofocus"' : '') + '>' + val.value + '</button>';

                    that._$('button')
                        .on('click', '[i-id=' + id + ']', function(event) {
                            var $this = $(this);
                            if (!$this.attr('disabled')) { // IE BUG
                                that._trigger(id);
                            }

                            event.preventDefault();
                        });

                });
            }

            this._$('button').html(html);
            this._$('footer')[number ? 'show' : 'hide']();

            return this;
        },

        _$: function(i) {
            return this._popup.find('[i=' + i + ']');
        },
        // 触发按钮回调函数
        _trigger: function(id) {
            var fn = this.callbacks[id];

            return typeof fn !== 'function' || fn.call(this) !== false ?
                this.close().remove() : this;
        }
    });


    dialog.oncreate = $.noop;


    /** 获取最顶层的对话框API */
    dialog.getCurrent = function() {
        return Popup.current;
    };

    /**
     * 根据 ID 获取某对话框 API
     * @param    {String}    对话框 ID
     * @return   {Object}    对话框 API (实例)
     */
    dialog.get = function(id) {
        return id === undefined ? dialog.list : dialog.list[id];
    };

    dialog.list = {};

    dialog.defaultOptions = defaultOptions;

    // Alias
    $.extend(dialog, {
        /** 模拟鼠标经过hover态的tooltips */
        tooltips: function (anchor, options) {

            if ($(anchor).length === 0) return this;

            return new dialog.tooltips.create(anchor, options);

        },
        notice: function (options) {

            var className = 'ui-dialog-tips ui-dialog-tips-' + options.type;
            var padding   = options.padding || '20px 30px';
            var timeout   = options.timeout || 1500;

            var d = dialog({
                skin: className,
                content: options.content,
                padding: padding,
            }).show();

            setTimeout(function() {
                d._$('dialog').css({
                    opacity: 0,
                    transform: 'scale(0)'
                });
                setTimeout(function () {
                    d.close().remove();
                }, 150);
            }, timeout);

            return d;
        }
    });

    dialog.tooltips.create = function (anchor, options) {

        var that = this;
        var defaultOptions = this.defaultOptions;

        $anchor = this.$anchor = $(anchor);
        this.options = $.extend({}, defaultOptions, options || {});
        this.id = new Date - 0;

        $.each($anchor, function (index, elem) {
            that._createOptions(elem)
        });

        var triggerType = this.triggerType = 'onmousedown' in document ? 'hover' : 'click';

        if (triggerType === 'hover') {

            $('body').on('mouseenter.' + this.id, anchor, function () {
                var data = that._getOptions(this);
                that.dialog = dialog({
                    content: data.content,
                    align: data.align,
                    quickClose: false,
                    modal: false,
                    skin: 'ui-dialog-tooltips' + (data.type ? ' ui-dialog-tooltips-' + data.type : '')
                }).show(this);
            });

            $('body').on('mouseleave.' + this.id, anchor, function () {
                that.dialog.close().remove();
            });

        } else {
            $('body').on(triggerType + '.' + this.id, anchor, function () {
                var data = that._getOptions(this);
                that.dialog = dialog({
                    content: data.content,
                    align: data.align,
                    quickClose: true,
                    backdropOpacity: 0,
                    skin: 'ui-dialog-tooltips' + (data.type ? ' ui-dialog-tooltips-' + data.type : '')
                }).show(this);
            });
        }

        return this;
    };

    $.extend(dialog.tooltips.create.prototype, {
        defaultOptions: {
            align: 'bottom left',
            content: 'null',
            type: ''
        },
        _createOptions: function (elem) {
            var $elem = $(elem);
            var singleOptions = $elem.attr('data-tooltips');
            var opts = $.extend({}, this.options);

            if (singleOptions) {
                var optsArr = singleOptions.split('|');
                $.each(optsArr, function (i, opt) {
                    var opt = opt.split(':');
                    opts[opt[0]] = opt[1];
                });
            }

            $elem.data('tooltips', opts);

            return opts
        },
        _getOptions: function (elem) {
            var data = $(elem).data('tooltips');
            return typeof data === 'string' ? this._createOptions(elem) : data
        },
        remove: function () {
            var triggerType = this.triggerType;

            if (triggerType === 'hover') {

                $('body').off('mouseenter.' + this.id);
                $('body').off('mouseleave.' + this.id);

            } else {
                $('body').on(triggerType + '.' + this.id);
            }

            for (var i in this) {
                delete this[i];
            }

            return this;
        }
    });

    return dialog;

});
