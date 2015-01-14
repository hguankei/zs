/**
 * selectbox
 * base on http://aui.github.io/popupjs/doc/selectbox.html
 */

(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else {
        factory(jQuery);
    }
}(function($) {

    var Popup = function() {
        this.__popup = $('<div />')
            .css({
                display: 'none',
                position: 'absolute',
                outline: 0
            })
            .attr('tabindex', '-1')
            .html(this.innerHTML)
            .appendTo('body');


        this.__backdrop = $('<div />')
            .css({
                position: 'fixed',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                opacity: 0,
                background: '#fff',
                zIndex: this.zIndex || Popup.zIndex
            });

        this.node = this.__popup[0];
        this.backdrop = this.__backdrop[0];
    };

    /* 当前叠加层级 */
    Popup.zIndex = 1024;

    /** 当前浮层的实例 */
    Popup.current = null;

    $.extend(Popup.prototype, {
        constructor: Popup,


        /**
         * onshow
         */
        /**
         * onremove
         */

        className: 'ui-popup',
        /** 是否自动聚焦 */
        autofocus: true,
        /** 判断对话框是否显示 */
        open: false,

        show: function(anchor) {

            var that = this;
            var popup = this.__popup;
            var backdrop = this.__backdrop;

            this.__activeElement = this.__getActive();
            this.open = true;

            this.follow = anchor || this.follow;

            $(window).on('resize', $.proxy(this.reset, this));

            popup
                .addClass(this.className)
                .attr('role', 'dialog');

            backdrop
                .addClass(this.className + '-backdrop')
                .insertBefore(popup);

            if (!popup.html()) {
                popup.html(this.innerHTML);
            }

            popup
                .addClass(this.className + '-show')
                .show();

            this.reset().focus();

            backdrop.show();

            this.__dispatchEvent('show');
            return this
        },
        /** 重置位置 */
        reset: function() {

            var $elem = $(this.follow);

            if (!($elem[0].parentNode)) {
                // this.remove();
                return false;
            }


            var popup = this.__popup;

            if (this.__followSkin) {
                popup.removeClass(this.__followSkin);
            }

            var that = this;

            var $window = $(window);
            var $document = $(document);
            var winWidth = $window.width();
            var winHeight = $window.height();
            var docLeft = $document.scrollLeft();
            var docTop = $document.scrollTop();


            var popupWidth = popup.width();
            var popupHeight = popup.height();
            var width = $elem ? $elem.outerWidth() : 0;
            var height = $elem ? $elem.outerHeight() : 0;
            var offset = this.__offset(this.follow);
            var left = offset.left;
            var top = offset.top;

            var minLeft = docLeft;
            var minTop = docTop;
            var maxLeft = minLeft + winWidth - popupWidth;
            var maxTop = minTop + winHeight - popupHeight;

            var css = {};
            var align = ['bottom', 'left'];
            var className = this.className + '-';

            var reverse = {
                top: 'bottom',
                bottom: 'top',
                left: 'right',
                right: 'left'
            };
            var name = {
                top: 'top',
                bottom: 'top',
                left: 'left',
                right: 'left'
            };

            var temp = [{
                top: top - popupHeight,
                bottom: top + height,
                left: left - popupWidth,
                right: left + width
            }, {
                top: top,
                bottom: top - popupHeight + height,
                left: left,
                right: left - popupWidth + width
            }];


            var center = {
                left: left + width / 2 - popupWidth / 2,
                top: top + height / 2 - popupHeight / 2
            };


            var range = {
                left: [minLeft, maxLeft],
                top: [minTop, maxTop]
            };


            // 超出可视区域重新适应位置
            $.each(align, function(i, val) {

                // 超出右或下边界：使用左或者上边对齐
                if (temp[i][val] > range[name[val]][1]) {
                    val = align[i] = reverse[val];
                }

                // 超出左或右边界：使用右或者下边对齐
                if (temp[i][val] < range[name[val]][0]) {
                    align[i] = reverse[val];
                }

            });


            // 一个参数的情况
            if (!align[1]) {
                name[align[1]] = name[align[0]] === 'left' ? 'top' : 'left';
                temp[1][align[1]] = center[name[align[1]]];
            }


            //添加follow的css, 为了给css使用
            className += align.join('-') + ' ' + this.className + '-follow';

            that.__followSkin = className;


            if ($elem) {
                popup.addClass(className);
            }


            css[name[align[0]]] = parseInt(temp[0][align[0]]);
            css[name[align[1]]] = parseInt(temp[1][align[1]]);
            popup.css(css);


            return this;
        },
        /** 关闭浮层 */
        close: function() {

            if (this.open) {
                this.__popup.hide().removeClass(this.className + '-show');
                this.__backdrop.hide();
                this.open = false;
                this.blur(); // 恢复焦点，照顾键盘操作的用户
                this.__dispatchEvent('close');
            }
            return this;
        },
        /** 销毁浮层 */
        remove: function() {

            if (Popup.current === this) {
                Popup.current = null;
            }

            // 从 DOM 中移除节点
            this.__popup.remove();
            this.__backdrop.remove();

            $(window).off('resize', this.reset);

            this.__dispatchEvent('remove');

            for (var i in this) {
                delete this[i];
            }

            return this;
        },


        /** 让浮层获取焦点 */
        focus: function() {

            var node = this.node;
            var popup = this.__popup;
            var current = Popup.current;
            var index = this.zIndex = Popup.zIndex++;

            this.__focus(node);

            // 设置叠加高度
            popup.css('zIndex', index);

            Popup.current = this;
            popup.addClass(this.className + '-focus');

            this.__dispatchEvent('focus');

            return this;
        },

        /** 让浮层失去焦点。将焦点退还给之前的元素，照顾视力障碍用户 */
        blur: function() {

            var activeElement = this.__activeElement;

            this.__focus(activeElement);

            this.__popup.removeClass(this.className + '-focus');
            this.__dispatchEvent('blur');

            return this;
        },

        // 获取当前焦点的元素
        __getActive: function() {
            try { // try: ie8~9, iframe #26
                var activeElement = document.activeElement;
                var contentDocument = activeElement.contentDocument;
                var elem = contentDocument && contentDocument.activeElement || activeElement;
                return elem;
            } catch (e) {}
        },

        // 对元素安全聚焦
        __focus: function(elem) {
            // 防止 iframe 跨域无权限报错
            // 防止 IE 不可见元素报错
            try {
                // ie11 bug: iframe 页面点击会跳到顶部
                if (this.autofocus && !/^iframe$/i.test(elem.nodeName)) {
                    elem.focus();
                }
            } catch (e) {}
        },

        // 获取元素相对于页面的位置（包括iframe内的元素）
        // 暂时不支持两层以上的 iframe 套嵌
        __offset: function(anchor) {

            var offset = $(anchor).offset();

            var ownerDocument = anchor.ownerDocument;
            var defaultView = ownerDocument.defaultView || ownerDocument.parentWindow;

            if (defaultView == window) { // IE <= 8 只能使用两个等于号
                return offset;
            }

            // {Element: Ifarme}
            var frameElement = defaultView.frameElement;
            var $ownerDocument = $(ownerDocument);
            var docLeft = $ownerDocument.scrollLeft();
            var docTop = $ownerDocument.scrollTop();
            var frameOffset = $(frameElement).offset();
            var frameLeft = frameOffset.left;
            var frameTop = frameOffset.top;

            return {
                left: frameLeft + offset.left - docLeft,
                top: frameTop + offset.top - docTop
            }
        },

        // 派发事件
        __dispatchEvent: function(type) {
            if (this['on' + type]) {
                this['on' + type]();
            }
        }
    });




    var Select = function(elem, options) {
        $select = this.$select = $(elem);

        $.extend(this, options || {});

        var that = this;

        if ($select.is('[multiple]')) { //复选下拉
            return;
        }

        if ($select.data('selectbox')) { //更新selectbox
            $select.data('selectbox').remove();
        }

        var selectHtml = this._tpl(this.selectHtml, $.extend({
            textContent: this._getOption().html() || ''
        }, $select.data()));

        this._selectbox = $(selectHtml);
        this._value = this._selectbox.find('[data-value]');

        // selectbox 的事件绑定
        if (this.isShowDropdown && !$select.attr('disabled')) {
            this._globalKeydown = $.proxy(this._globalKeydown, this);

            this._selectbox.on(this._clickType + ' focus blur', function(event) {
                that[that._clickType === event.type ? 'click' : event.type]();
            });
        }


        this._selectbox.css({
            width: $select.outerWidth() + 'px'
        });


        $select
            .on('focus blur', function(event) {
                that[event.type]();
                event.preventDefault();
            }).on('change', function() {
                var text = that._getOption().html();
                that._value.html(text);
            });


        // 隐藏原生 select
        // 盲人仍然可以通过 tab 键访问到原生控件
        // iPad 与 iPhone 等设备点击仍然能够使用滚动操作 select
        $select.css({
            opacity: 0,
            position: 'absolute',
            left: 'auto',
            right: 'auto',
            top: 'auto',
            bottom: 'auto',
            zIndex: this.isShowDropdown ? -1 : 1
        }).data('selectbox', this);

        // 代替原生 select
        $select.after(this._selectbox);

    };

    $.extend(Select.prototype, {

        constructor: Select,

        selectHtml: '<div class="ui-select" tabindex="-1" aria-hidden><div class="ui-select-inner" data-value="">{{textContent}}</div><i class="ui-select-ico"></i></div>',
        dropdownHtml: '<dl class="ui-select-dropdown">{{options}}</dl>',
        optgroupHtml: '<dt class="ui-select-optgroup">{{label}}</dt>',
        optionHtml: '<dd class="ui-select-option {{className}}" data-option="{{index}}" tabindex="-1">{{textContent}}</dd>',

        selectedClass: 'ui-select-selected',
        disabledClass: 'ui-select-disabled',
        focusClass: 'ui-select-focus',
        openClass: 'ui-select-open',

        selectedIndex: 0,
        value: '',

        // 移动端不使用模拟下拉层
        isShowDropdown: !('createTouch' in document),
        _clickType: 'onmousedown' in document ? 'mousedown' : 'touchstart',

        close: function() {
            if (this._popup) {
                this._popup.close().remove();
                this.change();
            }
        },

        show: function() {
            var that = this;
            var $select = this.$select;
            var selectbox = that._selectbox;

            if (!$select[0].length) {
                this.close();
                return false;
            }

            var MARGIN = 20;
            var selectHeight = $select.outerHeight();
            var topHeight = $select.offset().top - $(document).scrollTop();
            var bottomHeight = $(window).height() - topHeight - selectHeight;
            var maxHeight = Math.max(topHeight, bottomHeight) - MARGIN;

            var popup = this._popup = new Popup();
            popup.node.innerHTML = this._dropdownHtml();

            this._dropdown = $(popup.node);


            $(popup.backdrop).on(this._clickType, $.proxy(this.close, this));


            var children = that._dropdown.children();
            children.css({
                minWidth: selectbox.outerWidth(),
                maxHeight: maxHeight,
                overflowY: 'auto',
                overflowX: 'hidden'
            });


            this._dropdown
                .on(this._clickType, '[data-option]', function(event) {
                    var index = $(this).data('option');

                    if (!that.disabled(index)) {
                        that.selected(index);
                    }
                    that.close();
                    event.preventDefault();
                });


            popup.onshow = function() {
                $(document).on('keydown', that._globalKeydown);
                selectbox.addClass(that.openClass);
                that.selectedIndex = $select[0].selectedIndex;
                that.selected(that.selectedIndex);
            };


            popup.onremove = function() {
                $(document).off('keydown', that._globalKeydown);
                selectbox.removeClass(that.openClass);
            };


            // 记录展开前的 value
            this._oldValue = this.$select.val();

            popup.show(selectbox[0]);
        },

        // 检查当前项是否被禁用
        disabled: function(index) {
            var r = false;
            if (this._getOption(index).attr('disabled')) {
                r = true;
            }
            return r;
        },

        selected: function(index) {
            var dropdown = this._dropdown;
            var option = this._dropdown.find('[data-option=' + index + ']');
            var value = this.$select[0].options[index].value;
            var oldIndex = this.$select[0].selectedIndex;
            var selectedClass = this.selectedClass;

            // 更新选中状态样式
            dropdown.find('[data-option=' + oldIndex + ']').removeClass(selectedClass);
            option.addClass(selectedClass);
            option.focus();

            // 更新模拟控件的显示值
            this._value.html(this._getOption(index).html());

            // 更新 Selectbox 对象属性
            this.value = value;
            this.selectedIndex = index;

            // 同步数据到原生 select
            this.$select[0].selectedIndex = this.selectedIndex;
            this.$select[0].value = this.value;
        },

        change: function() {
            if (this._oldValue !== this.value) {
                this.$select.triggerHandler('change');
            }
        },

        click: function() {
            this.$select.focus();
            if (this._popup && this._popup.open) {
                this.close();
            } else {
                this.show();
            }
        },

        focus: function() {
            this._selectbox.addClass(this.focusClass);
        },


        blur: function() {
            this._selectbox.removeClass(this.focusClass);
        },



        // 获取原生 select 的 option jquery 对象
        _getOption: function(index) {
            index = index === undefined ? this.$select[0].selectedIndex : index;
            return this.$select.find('option').eq(index);
        },

        // 简单模板替换
        _tpl: function(tpl, data) {
            return tpl.replace(/{{(.*?)}}/g, function($1, $2) {
                return data[$2];
            });
        },

        // 获取下拉内容的 HTML
        _dropdownHtml: function() {
            var options = '';
            var that = this;
            var $select = this.$select;
            var selectData = $select.data();
            var index = 0;


            var getOptionsData = function($options) {
                $options.each(function() {
                    var $this = $(this);
                    var className = '';

                    if (this.selected) {
                        className = that.selectedClass;
                    } else {
                        className = this.disabled ? that.disabledClass : '';
                    }

                    options += that._tpl(that.optionHtml, $.extend({
                        value: $this.val(),
                        // 如果内容类似： "&#60;s&#62;选项&#60;/s&#62;" 使用 .text() 会导致 XSS
                        // 另外，原生 option 不支持 html 文本
                        textContent: $this.html(),
                        index: index,
                        className: className
                    }, $this.data(), selectData));

                    index++;
                });
            };

            if ($select.find('optgroup').length) {

                $select.find('optgroup').each(function(index) {
                    options += that._tpl(that.optgroupHtml, $.extend({
                        index: index,
                        label: this.label
                    }, $(this).data(), selectData));
                    getOptionsData($(this).find('option'));
                });

            } else {
                getOptionsData($select.find('option'));
            }


            return this._tpl(this.dropdownHtml, {
                options: options
            });
        },

        // 上下移动
        _move: function(n) {
            var min = 0;
            var max = this.$select[0].length - 1;
            var index = this.$select[0].selectedIndex + n;

            if (index >= min && index <= max) {
                // 跳过带有 disabled 属性的选项
                if (this.disabled(index)) {
                    this._move(n + n);
                } else {
                    this.selected(index);
                }
            }
        },

        // 全局键盘监听
        _globalKeydown: function(event) {

            var p;

            switch (event.keyCode) {
                // backspace
                case 8:
                    p = true;
                    break;

                    // tab
                case 9:
                    // esc
                case 27:
                    // enter
                case 13:
                    this.close();
                    p = true;
                    break;

                    // up
                case 38:

                    this._move(-1);
                    p = true;
                    break;

                    // down
                case 40:

                    this._move(1);
                    p = true;
                    break;
            }

            if (p) {
                event.preventDefault();
            }
        }

    });

    return function(elem, options) {
        // 注意：不要返回 Select 更多接口给外部，只保持装饰用途
        // 保证模拟的下拉是原生控件的子集，这样可以随时在项目中撤销装饰
        if (elem.type === 'select') {
            new Select(elem, options);
        } else {
            $(elem).each(function() {
                new Select(this, options);
            });
        }
    };

}))
