/**
 * selectbox
 * base on https://github.com/aui/popupjs
 */

define(['jquery', 'popup'], function($, Popup) {

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
            $(popup.backdrop)
                .css('opacity', 0)
                .on(this._clickType, $.proxy(this.close, this));


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

            popup.showModal(selectbox[0]);
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

        // remove: function() {
        //     this.close();
        //     this._selectbox.remove();
        // },

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

})
