/**

 @Name：tablePlug 表格拓展插件
 @Author：岁月小偷
 @License：MIT

 */

layui.define(['table'], function (exports) {
  "use strict";

  var $ = layui.$
    , laytpl = layui.laytpl
    , laypage = layui.laypage
    , layer = layui.layer
    , form = layui.form
    , util = layui.util
    , table = layui.table
    , hint = layui.hint()
    , device = layui.device()
    , tabelIns = {}
    , CHECK_TYPE_ADDITIONAL = 'additional'  // 新增的
    , CHECK_TYPE_REMOVED = 'removed'  // 删除的
    , CHECK_TYPE_ORIGINAL = 'original' // 原有的
    , CHECK_TYPE_DISABLED = 'disabled' // 原有的
    , NONE = 'layui-none'
    , HIDE = 'layui-hide'
    , LOADING = 'layui-tablePlug-loading-p'
    , ELEM_HEADER = '.layui-table-header'
    , COLGROUP = 'colGroup' // 定义一个变量，方便后面如果table内部有变化可以对应的修改一下即可
    , tableSpacialColType = ['numbers', 'checkbox', 'radio'] // 表格的特殊类型字段

    // 检测是否满足智能重载的条件
    , checkSmartReloadCodition = (function () {
      return !!(table.thisTable && table.Class);
    })()
    , getIns = function (id) {
      if (checkSmartReloadCodition) {
        return table.thisTable.that[id];
      }
      hint.error('getIns方法需要在对layui的table进行一定必要的改造才能使用！请到 https://fly.layui.com/jie/43423/ 里面的查看相关内容将table.js进行一个非常小的改造，之后再试试看。');
      return {};
    }

    , tableCheck = function () {
      var checked = {};
      return {
        // 检验是否可用，是否初始化过
        check: function (tableId) {
          return !!checked[tableId];
        },
        reset: function (tableId) {
          if (!checked[tableId]) {
            checked[tableId] = {};
            checked[tableId][CHECK_TYPE_ORIGINAL] = [];
            checked[tableId][CHECK_TYPE_ADDITIONAL] = [];
            checked[tableId][CHECK_TYPE_REMOVED] = [];
            checked[tableId][CHECK_TYPE_DISABLED] = [];
          } else {
            this.set(tableId, CHECK_TYPE_ADDITIONAL, []);    // 新增的
            this.set(tableId, CHECK_TYPE_REMOVED, []);       // 删除的
          }
        },
        init: function (tableId, data) {
          this.reset(tableId);
          this.set(tableId, CHECK_TYPE_ORIGINAL, data);
        },
        // 设置部分记录不可选
        disabled: function (tableId, data) {
          if (!checked[tableId]) {
            this.reset(tableId);
          }
          this.set(tableId, CHECK_TYPE_DISABLED, data);
        },
        checkDisabled: function (tableId, value) {
          return this.get(tableId, CHECK_TYPE_DISABLED).indexOf(value) !== -1;
        },
        // 获得当前选中的，不区分状态
        getChecked: function (tableId) {
          var delArr = this.get(tableId, CHECK_TYPE_REMOVED);

          var retTemp = this.get(tableId, CHECK_TYPE_ORIGINAL).concat(this.get(tableId, CHECK_TYPE_ADDITIONAL));
          var ret = [];
          layui.each(retTemp, function (index, data) {
            if (delArr.indexOf(data) === -1 && ret.indexOf(data) === -1) {
              ret.push(data);
            }
          });
          return ret;
        },
        get: function (tableId, type) {
          if (type === CHECK_TYPE_ADDITIONAL
            || type === CHECK_TYPE_REMOVED
            || type === CHECK_TYPE_ORIGINAL
            || type === CHECK_TYPE_DISABLED) {
            return checked[tableId] ? (checked[tableId][type] || []) : [];
          } else {
            return checked[tableId];
          }
        },
        set: function (tableId, type, data) {
          if (type !== CHECK_TYPE_ORIGINAL
            && type !== CHECK_TYPE_ADDITIONAL
            && type !== CHECK_TYPE_REMOVED
            && type !== CHECK_TYPE_DISABLED) {
            return;
          }
          checked[tableId][type] = (!data || !isArray(data)) ? [] : data;
        },
        update: function (tableId, id, checkedStatus) {
          var _original = checked[tableId][CHECK_TYPE_ORIGINAL];
          var _additional = checked[tableId][CHECK_TYPE_ADDITIONAL];
          var _removed = checked[tableId][CHECK_TYPE_REMOVED];
          if (checkedStatus) {
            // 勾选
            // if (_additional.indexOf(id) !== -1) {
            //     // 已经存在，
            // }
            if (_original.indexOf(id) === -1) {
              // 不在原来的集合中
              if (_additional.indexOf(id) === -1) {
                _additional.push(id);
              } else {
                // 多余的，但是应该是避免这从情况的
              }
            } else {
              // 在原来的集合中，意味着之前有去掉勾选的操作
              if (_removed.indexOf(id) !== -1) {
                _removed.splice(_removed.indexOf(id), 1);
              }
            }
          } else {
            // 取消勾选
            if (_original.indexOf(id) === -1) {
              // 不在原来的集合中，意味着以前曾经添加过
              if (_additional.indexOf(id) !== -1) {
                _additional.splice(_additional.indexOf(id), 1);
              }
            } else {
              // 在原来的集合中
              if (_removed.indexOf(id) === -1) {
                _removed.push(id);
              }
            }
          }
        }
      }
    }()

    , isArray = function (obj) {
      // 判断一个变量是不是数组
      return Object.prototype.toString.call(obj) === '[object Array]';
    }

    // 针对表格中是否选中的数据处理
    , dataRenderChecked = function (data, tableId, checkName) {
      if (!data || !tableId) {
        return;
      }
      var arrAdd = tableCheck.get(tableId, CHECK_TYPE_ADDITIONAL) || [],
        arrOld = tableCheck.get(tableId, CHECK_TYPE_ORIGINAL) || [],
        arrDel = tableCheck.get(tableId, CHECK_TYPE_REMOVED) || [],
        tableCheckStatus = arrAdd.concat(arrOld.filter(function (_data, _index) {
          return arrDel.indexOf(_data) === -1;
        }));
      for (var i = 0; i < data.length; i++) {
        if (tableCheckStatus.indexOf(data[i].id) !== -1) {
          data[i][checkName || table.config.checkName] = true;
        }
      }
    };

  var sortTemp = table.Class.prototype.sort;
  table.Class.prototype.sort = function () {
    var that = this;
    var params = [];
    layui.each(arguments, function (index, param) {
      params.push(param);
    });
    sortTemp.apply(that, params);
  };

  var loading = table.Class.prototype.loading;
  table.Class.prototype.loading = function (hide) {
    var that = this;
    loading.call(that, hide);
    if (!hide && that.layInit) {
      that.layInit.remove();
      // 添加一个动画
      that.layInit.addClass('layui-anim layui-anim-rotate layui-anim-loop');
      if (!that.layMain.height()) {
        // 如果当前没有内容，添加一个空的div让它有显示的地方
        that.layBox.append($('<div class="' + LOADING + '" style="height: 56px;"></div>'));
      }
      var offsetHeight = 0;
      if (that.layMain.height() - that.layMain.prop('clientHeight') > 0) {
        // 如果出现滚动条，要减去滚动条的宽度
        offsetHeight = that.getScrollWidth();
      }
      that.layInit.height(that.layBox.height() - that.layHeader.height() - offsetHeight).css('marginTop', that.layHeader.height() + 'px');
      that.layBox.append(that.layInit);
    }
  };

  //数据渲染
  table.Class.prototype.renderData = function (res, curr, count, sort) {
    var that = this
      , options = that.config
      , data = res[options.response.dataName] || []
      , trs = []
      , trs_fixed = []
      , trs_fixed_r = []

      //渲染视图
      , render = function () { //后续性能提升的重点
        var thisCheckedRowIndex;
        if (!sort && that.sortKey) {
          return that.sort(that.sortKey.field, that.sortKey.sort, true);
        }
        layui.each(data, function (i1, item1) {
          var tds = [], tds_fixed = [], tds_fixed_r = []
            , numbers = i1 + options.limit * (curr - 1) + 1; //序号

          if (item1.length === 0) return;
          if (!sort) {
            item1[table.config.indexName] = i1;
          }

          that.eachCols(function (i3, item3) {
            var field = item3.field || i3
              , key = options.index + '-' + item3.key
              , content = item1[field];

            if (content === undefined || content === null) content = '';
            if (item3.colGroup) return;

            //td内容
            var td = ['<td data-field="' + field + '" data-key="' + key + '" ' + function () { //追加各种属性
              var attr = [];
              if (item3.edit) attr.push('data-edit="' + item3.edit + '"'); //是否允许单元格编辑
              if (item3.align) attr.push('align="' + item3.align + '"'); //对齐方式
              if (item3.templet) attr.push('data-content="' + content + '"'); //自定义模板
              if (item3.toolbar) attr.push('data-off="true"'); //行工具列关闭单元格事件
              if (item3.event) attr.push('lay-event="' + item3.event + '"'); //自定义事件
              if (item3.style) attr.push('style="' + item3.style + '"'); //自定义样式
              if (item3.minWidth) attr.push('data-minwidth="' + item3.minWidth + '"'); //单元格最小宽度
              return attr.join(' ');
            }() + ' class="' + function () { //追加样式
              var classNames = [];
              if (item3.hide) classNames.push(HIDE); //插入隐藏列样式
              if (!item3.field) classNames.push('layui-table-col-special'); //插入特殊列样式
              return classNames.join(' ');
            }() + '">'
              , '<div class="layui-table-cell laytable-cell-' + function () { //返回对应的CSS类标识
                return item3.type === 'normal' ? key
                  : (key + ' laytable-cell-' + item3.type);
              }() + '">' + function () {
                var tplData = $.extend(true, {
                  LAY_INDEX: numbers
                }, item1)
                  , checkName = table.config.checkName;

                //渲染不同风格的列
                switch (item3.type) {
                  case 'checkbox':
                    return '<input type="checkbox" name="layTableCheckbox" lay-skin="primary" ' + function () {
                      //如果是全选
                      if (item3[checkName]) {
                        item1[checkName] = item3[checkName];
                        return item3[checkName] ? 'checked' : '';
                      }
                      return tplData[checkName] ? 'checked' : '';
                    }() + '>';
                    break;
                  case 'radio':
                    if (tplData[checkName]) {
                      thisCheckedRowIndex = i1;
                    }
                    return '<input type="radio" name="layTableRadio_' + options.index + '" '
                      + (tplData[checkName] ? 'checked' : '') + ' lay-type="layTableRadio">';
                    break;
                  case 'numbers':
                    return numbers;
                    break;
                }
                ;

                //解析工具列模板
                if (item3.toolbar) {
                  return laytpl($(item3.toolbar).html() || '').render(tplData);
                }
                return item3.templet ? function () {
                  return typeof item3.templet === 'function'
                    ? item3.templet(tplData)
                    : laytpl($(item3.templet).html() || String(content)).render(tplData)
                }() : content;
              }()
              , '</div></td>'].join('');

            tds.push(td);
            if (item3.fixed && item3.fixed !== 'right') tds_fixed.push(td);
            if (item3.fixed === 'right') tds_fixed_r.push(td);
          });

          trs.push('<tr data-index="' + i1 + '">' + tds.join('') + '</tr>');
          trs_fixed.push('<tr data-index="' + i1 + '">' + tds_fixed.join('') + '</tr>');
          trs_fixed_r.push('<tr data-index="' + i1 + '">' + tds_fixed_r.join('') + '</tr>');
        });

        that.layBody.scrollTop(0);
        // 如果没有数据才需要删除NONE
        !data.length || that.layMain.find('.' + NONE).remove();
        that.layMain.find('tbody').html(trs.join(''));
        that.layFixLeft.find('tbody').html(trs_fixed.join(''));
        that.layFixRight.find('tbody').html(trs_fixed_r.join(''));

        that.renderForm();
        typeof thisCheckedRowIndex === 'number' && that.setThisRowChecked(thisCheckedRowIndex);
        that.syncCheckAll();

        //滚动条补丁
        that.haveInit ? that.scrollPatch() : setTimeout(function () {
          that.scrollPatch();
        }, 50);
        that.haveInit = true;

        layer.close(that.tipsIndex);

        //同步表头父列的相关值
        options.HAS_SET_COLS_PATCH || that.setColsPatch();
        options.HAS_SET_COLS_PATCH = true;
      };

    that.key = options.id || options.index;
    table.cache[that.key] = data; //记录数据

    //显示隐藏分页栏
    that.layPage[(count == 0 || (data.length === 0 && curr == 1)) ? 'addClass' : 'removeClass'](HIDE);

    //排序
    if (sort) {
      return render();
    }

    if (data.length === 0) {
      that.renderForm();
      // that.layFixed.remove(); 智能reload的话不应该直接remove掉，直接hide掉就可以了
      that.layFixed.addClass(HIDE);
      that.layMain.find('tbody').html('');
      that.layMain.find('.' + NONE).remove();
      return that.layMain.append('<div class="' + NONE + '">' + options.text.none + '</div>');
    }

    render(); //渲染数据
    that.renderTotal(data); //数据合计

    //同步分页状态
    if (options.page) {
      options.page = $.extend({
        elem: 'layui-table-page' + options.index
        , count: count
        , limit: options.limit
        , limits: options.limits || [10, 20, 30, 40, 50, 60, 70, 80, 90]
        , groups: 3
        , layout: ['prev', 'page', 'next', 'skip', 'count', 'limit']
        , prev: '<i class="layui-icon">&#xe603;</i>'
        , next: '<i class="layui-icon">&#xe602;</i>'
        , jump: function (obj, first) {
          if (!first) {
            //分页本身并非需要做以下更新，下面参数的同步，主要是因为其它处理统一用到了它们
            //而并非用的是 options.page 中的参数（以确保分页未开启的情况仍能正常使用）
            that.page = obj.curr; //更新页码
            options.limit = obj.limit; //更新每页条数

            that.loading();
            that.pullData(obj.curr);
          }
        }
      }, options.page);
      options.page.count = count; //更新总条数
      laypage.render(options.page);
    }
  };

  // 同步表格不可点击的checkbox
  var disabledCheck = function (tableId, syncConfig) {
    // syncConfig是否需要同步config
    var insTemp = getIns(tableId);
    if (insTemp) {
      var config = insTemp.config;

      if (syncConfig) {
        config.checkDisabled = config.checkDisabled || {};
        config.checkDisabled.enabled = config.checkDisabled.enabled || true;
        config.checkDisabled.primaryKey = config.checkDisabled.primaryKey || 'id';
        config.checkDisabled.data = tableCheck.get(tableId, CHECK_TYPE_DISABLED) || [];
      }
      if (config.checkDisabled.enabled) {
        layui.each(table.cache[tableId], function (index, data) {
          insTemp.elem.find('.layui-table-body')
            .find('tr[data-index="' + index + '"]')
            .find('input[name="layTableCheckbox"]')
            .prop('disabled', tableCheck.checkDisabled(tableId, data[config.checkDisabled.primaryKey]));
        });
      } else {
        tableCheck.set(tableId, CHECK_TYPE_DISABLED, []);
      }

      insTemp.layBox.find('input[lay-filter="layTableAllChoose"]').prop('checked', table.checkStatus(tableId).isAll);
      insTemp.renderForm('checkbox');
    }
  };

  var setColsWidth = table.Class.prototype.setColsWidth;
  table.Class.prototype.setColsWidth = function () {
    var that = this;
    that.layBox.find('.' + LOADING).remove();
    setColsWidth.call(that);

    var options = that.config;
    var tableId = options.id;
    var tableView = that.elem;

    //如果多级表头，重新填补填补表头高度
    if (options.cols.length > 1) {
      //补全高度
      var th = that.layFixed.find(ELEM_HEADER).find('th');
      // 只有有头部的高度的时候计算才有意义
      var heightTemp = that.layHeader.height();
      heightTemp = heightTemp / options.cols.length; // 每一个原子tr的高度
      th.each(function (index, trCurr) {
        trCurr = $(trCurr);
        trCurr.height(heightTemp * (parseInt(trCurr.attr('rowspan') || 1))
          - 1 - parseFloat(trCurr.css('padding-top')) - parseFloat(trCurr.css('padding-bottom')));
      });
    }

    // 如果有部分不可选的行
    if (tableCheck.get(options.id, CHECK_TYPE_DISABLED).length) {
      disabledCheck(tableId);
    }

    // 看看是否需要打智能reload的补丁
    if (tableView.data('patch') !== true) {
      return;
    }

    // 调整过了之后也把状态重置一下
    tableView.data('patch', null);

    // 打补丁
    var noneElem = tableView.find('.' + NONE);
    if (noneElem.length) {
      // 出现异常
      that.layFixed.find('tbody').html('');
      that.layFixed.addClass(HIDE);

      var laymain = ['<table cellspacing="0" cellpadding="0" border="0" class="layui-table"><tbody></tbody></table>'];

      var prevElem = noneElem.prev();
      if (!prevElem || !prevElem.length) {
        $(laymain.join('')).insertBefore(noneElem);
      }
      that.layTotal.addClass(HIDE);
      that.layPage.addClass(HIDE);
    } else {
      // var layPreELem = that.layFixed.prevObject;
      // if (!layPreELem.find(that.layFixed.selector).length) {
      //   // 做了一些调整重写了renderdata在没有数据的时候也不会直接干掉fixed的节点，不然即使后面补充回来，里面原先被委托的一些事件也over了
      //   // 数据为空的时候会remove掉固定列的dom，正常了要加回来
      //   that.layBox.append(that.layFixed);
      //   // that.layBody = tableView.find('.layui-table-body');
      // }
      // 出现异常的时候隐藏了，正常就显示回来
      that.layFixLeft.removeClass(HIDE);
      that.layTotal.removeClass(HIDE);
      that.layBody.scrollTop(0);
      // that.layPage.removeClass(HIDE);
    }

    that.renderForm('checkbox');
    // that.events(); //事件
  };

  //初始化一些参数
  table.Class.prototype.setInit = function (type) {
    var that = this
      , options = that.config;

    options.clientWidth = options.width || function () { //获取容器宽度
      //如果父元素宽度为0（一般为隐藏元素），则继续查找上层元素，直到找到真实宽度为止
      var getWidth = function (parent) {
        var width, isNone;
        parent = parent || options.elem.parent();
        width = parent.width();
        try {
          isNone = parent.css('display') === 'none';
        } catch (e) {
        }
        if (parent[0] && (!width || isNone)) return getWidth(parent.parent());
        return width;
      };
      return getWidth();
    }();

    if (type === 'width') return options.clientWidth;

    //初始化列参数
    layui.each(options.cols, function (i1, item1) {
      layui.each(item1, function (i2, item2) {

        //如果列参数为空，则移除
        if (!item2) {
          item1.splice(i2, 1);
          return;
        }

        item2.key = i1 + '-' + i2;
        item2.hide = item2.hide || false;

        //设置列的父列索引
        //如果是组合列，则捕获对应的子列
        if (item2.colGroup || item2.colspan > 1) {
          var childIndex = 0;
          layui.each(options.cols[i1 + (parseInt(item2.rowspan) || 1)], function (i22, item22) {
            //如果子列已经被标注为{HAS_PARENT}，或者子列累计 colspan 数等于父列定义的 colspan，则跳出当前子列循环
            if (item22.HAS_PARENT || (childIndex > 1 && childIndex == item2.colspan)) return;

            item22.HAS_PARENT = true;
            item22.parentKey = i1 + '-' + i2;

            childIndex = childIndex + parseInt(item22.colspan > 1 ? item22.colspan : 1);
          });
          item2.colGroup = true; //标注是组合列
        }

        //根据列类型，定制化参数
        that.initOpts(item2);
      });
    });
  };

  var tableInsReload = table.Class.prototype.reload;
  //表格完整重载
  table.Class.prototype.reload = function (options) {
    var that = this;
    table.reload(that.config.id, options, true);
  };

  //遍历表头
  table.eachCols = function (id, callback, cols) {
    var that = this;
    var config = that.thisTable.config[id] || {}
      , arrs = [], index = 0;

    cols = $.extend(true, [], cols || config.cols);

    //重新整理表头结构
    layui.each(cols, function (i1, item1) {
      layui.each(item1, function (i2, item2) {

        //如果是组合列，则捕获对应的子列
        if (item2.colGroup) {
          var childIndex = 0;
          index++
          item2.CHILD_COLS = [];

          // 找到它的子列
          // layui.each(cols[i1 + 1], function(i22, item22){
          layui.each(cols[i1 + (parseInt(item2.rowspan) || 1)], function (i22, item22) {
            //如果子列已经被标注为{PARENT_COL_INDEX}，或者子列累计 colspan 数等于父列定义的 colspan，则跳出当前子列循环
            if (item22.PARENT_COL_INDEX || (childIndex > 1 && childIndex == item2.colspan)) return;

            item22.PARENT_COL_INDEX = index;

            item2.CHILD_COLS.push(item22);
            childIndex = childIndex + parseInt(item22.colspan > 1 ? item22.colspan : 1);
          });
        }

        if (item2.PARENT_COL_INDEX) return; //如果是子列，则不进行追加，因为已经存储在父列中
        arrs.push(item2)
      });
    });

    //重新遍历列，如果有子列，则进入递归
    var eachArrs = function (obj) {
      layui.each(obj || arrs, function (i, item) {
        if (item.CHILD_COLS) return eachArrs(item.CHILD_COLS);
        typeof callback === 'function' && callback(i, item);
      });
    };

    eachArrs();
  };


  // 改造table.render和reload记录返回的对象
  var tableRender = table.render;
  table.render = function (config) {
    var that = this;
    var settingTemp = $.extend(true, {}, table.config, config);
    // table一般要给定id而且这个id就是当前table的实例的id
    var tableId = settingTemp.id || $(settingTemp.elem).attr('id');

    if (settingTemp.checkStatus && !tableCheck.check(tableId)) {
      // 如果render的时候设置了checkStatus或者全局设置了默认跨页保存那么重置选中状态
      tableCheck.init(tableId, settingTemp.checkStatus.default);
    }

    if (settingTemp.checkDisabled && isArray(settingTemp.checkDisabled.data) && settingTemp.checkDisabled.data.length) {
      tableCheck.disabled(tableId, isArray(settingTemp.checkDisabled.data) ? settingTemp.checkDisabled.data : []);
    }

    var parseData = settingTemp.parseData;
    if (!parseData || !parseData.plugFlag) {
      config.parseData = function (ret) {
        ret = typeof parseData === 'function' ? (parseData.call(that, ret) || ret) : ret;
        var dataName = settingTemp.response ? (settingTemp.response.dataName || 'data') : 'data';
        dataRenderChecked(ret[dataName], tableId);
        return ret;
      };
      config.parseData.plugFlag = true;
    }

    // 如果配置了字段筛选的记忆需要更新字段的hide设置
    if (settingTemp.colFilterRecord) {
      var record = colFilterRecord.get(tableId, config.colFilterRecord);
      $.each(config.cols, function (i, item1) {
        $.each(item1, function (j, item2) {
          // item2.hide = !!record[i + '-' + j]
          item2.hide = !!record[item2.field];
        });
      });
    } else {
      colFilterRecord.clear(tableId);
    }

    // 处理复杂表头的单列和并列的问题
    if (config.cols.length > 1) {
      layui.each(config.cols, function (i1, item1) {
        layui.each(item1, function (i2, item2) {
          if (!item2.field && !item2.toolbar && (!item2.colspan || item2.colspan === 1) && (tableSpacialColType.indexOf(item2.type) === -1)) {
            item2[COLGROUP] = true;
          } else if (item2[COLGROUP] && !(item2.colspan > 1)) {
            // 如果有乱用colGroup的，明明是一个字段列还给它添加上这个属性的会在这里KO掉，叫我表格小卫士^_^
            item2[COLGROUP] = false;
          }
        });
      });
    }

    var insTemp = tableRender.call(that, config);
    var tableView = insTemp.config.elem.next();
    // 如果table的视图上的lay-id不等于当前表格实例的id强制修改,这个是个非常实用的配置。
    tableView.attr('lay-id') !== insTemp.config.id && tableView.attr('lay-id', insTemp.config.id);

    var insObj = getIns(insTemp.config.id); // 获得当前的table的实例，对实例内部的方法进行改造

    if (insObj && insObj.index) { // 只有经过table源码修改了才能继续进一步的改造
      // 在render的时候就调整一下宽度，不要不显示或者拧成一团
      insObj.setColsWidth();

      // 补充被初始化的时候设置宽度时候被关掉的loading，如果是data模式的实际不会走异步的，所以不需要重新显示loading
      insObj.config.url && insObj.loading();
    }

    return tabelIns[insTemp.config.id] = insTemp;
  };

  // 改造table reload
  var tableReload = table.reload;
  var queryParams = (function () {
    // 查询模式的白名单
    var params = ['url', 'method', 'where', 'contentType', 'headers', 'parseData', 'request', 'response', 'data', 'page', 'initSort', 'autoSort'];
    return {
      // 获得查询的属性
      getParams: function () {
        return params;
      },
      // 注册查询的属性，方便后面自己有扩展新的功能的时候，有一些配置可以注册成不重载的属性
      registParams: function () {
        var that = this;
        layui.each(arguments, function (i, value) {
          if (isArray(value)) {
            that.registParams.apply(that, value);
          } else {
            if (typeof value === 'string' && params.indexOf(value) === -1) {
              params.push(value);
            }
          }
        });
      },
      check: function () {

      }
    }
  })();

  // 是否弃用只能重载模式
  var smartReload = (function () {
    var enable = false;
    return {
      enable: function () {
        if (arguments.length) {
          var isEnable = arguments[0];
          if (typeof isEnable !== "boolean") {
            hint.error('如果要开启或者关闭全局的表格智能重载模式，请传入一个true/false为参数');
          } else {
            enable = isEnable;
          }
        } else {
          return enable;
        }
      }
    }
  })();

  // 添加两个目前tablePlug扩展的属性到查询模式白名单中
  queryParams.registParams('colFilterRecord', 'checkStatus', 'smartReloadModel', 'checkDisabled');

  table.reload = function (tableId, config, shallowCopy) {
    var that = this;

    var configOld = getConfig(tableId);
    var configTemp = $.extend(true, {}, getConfig(tableId), config);
    if (smartReload.enable() && configTemp.smartReloadModel) {

      // 如果开启了智能重载模式
      // 是否为重载模式
      var reloadModel = false;
      if (!!configTemp.page !== !!configOld.page) {
        // 如果是否分页发生了改变
        reloadModel = true;
      }
      if (!reloadModel) {
        var dataParamsTemp = $.extend(true, [], queryParams.getParams());

        layui.each(config, function (_key, _value) {
          var indexTemp = dataParamsTemp.indexOf(_key);
          if (indexTemp === -1) {
            return reloadModel = true;
          } else {
            // 如果匹配到去掉这个临时的属性，下次查找的时候减少一个属性
            dataParamsTemp.splice(indexTemp, 1);
          }
        });
      }

      if (!reloadModel) {
        if (!checkSmartReloadCodition) {
          hint.error('您开启了智能重载模式，但是未检测到一个必要的前提，另参考帖子 https://fly.layui.com/jie/43423/ 里面的相关内容将table.js进行一个非常小的改造，之后再试试看。')
        } else {
          var insTemp = getIns(tableId);
          if (typeof config.page === 'object') {
            config.page.curr && (insTemp.page = config.page.curr);
            delete config.elem;
            delete config.jump;
          }
          // insTemp.config = (shallowCopy ? $.extend({}, insTemp.config, config):$.extend(true, {}, insTemp.config, config));
          shallowCopy ? $.extend(insTemp.config, config) : $.extend(true, insTemp.config, config);
          if (!insTemp.config.page) {
            insTemp.page = 1;
          }
          // 记录一下需要打补丁
          insTemp.elem.data('patch', true);
          insTemp.loading();
          insTemp.pullData(insTemp.page);
          return table.thisTable.call(insTemp);
        }
      }
    }

    // 如果是重载
    if (shallowCopy) {
      tableInsReload.call(getIns(tableId), config);
      tabelIns[tableId].config = getIns(tableId).config;
    } else {
      var insTemp = tableReload.call(that, tableId, config);
      return tabelIns[tableId] = insTemp;
    }
  };

  // 获得table的config
  var getConfig = function (tableId) {
    return tabelIns[tableId] && tabelIns[tableId].config;
  };

  // 原始的
  var checkStatus = table.checkStatus;
  // 重写table的checkStatus方法
  table.checkStatus = function (tableId) {
    var that = this;
    var insTemp = getIns(tableId);
    var config = insTemp.config;
    var statusTemp = checkStatus.call(that, tableId);
    if (config && config.checkStatus) {
      // 状态记忆
      statusTemp.status = tableCheck.get(tableId);
    }
    if (config.checkDisabled) {
      var checkDisabledTemp = config.checkDisabled;
      if (typeof checkDisabledTemp === 'object' && checkDisabledTemp.enabled !== false) {
        var num1 = 0; //可选的数量
        var num2 = 0; //最终选中的数量
        var primaryKey = checkDisabledTemp.primaryKey;
        var disabledTemp = tableCheck.get(tableId, CHECK_TYPE_DISABLED);
        layui.each(table.cache[tableId], function (index, data) {
          var primaryValue = data[primaryKey];
          if (disabledTemp.indexOf(primaryValue) === -1) {
            num1++;
            if (data[table.config.checkName]) {
              num2++;
            }
          }
        });
        statusTemp.isAll = (num2 > 0 && num1 === num2);
      }
    }
    return statusTemp;
  };

  // 更新复选框的状态
  var updateCheckStatus = function (tableId, value, checked) {
    if (!tableCheck.checkDisabled(tableId, value)) {
      tableCheck.update(tableId, value, checked);
    } else {
      // 操作了不可选的
      return false;
    }
  };

  // 监听所有的表格中的type:'checkbox'注意不要在自己的代码里面也写这个同名的监听，不然会被覆盖，
  table.on('checkbox', function (obj) {

    var tableView = $(this).closest('.layui-table-view');
    // lay-id是2.4.4版本新增的绑定到节点上的当前table实例的id,经过plug的改造render将旧版本把这个id也绑定到视图的div上了。
    var tableId = tableView.attr('lay-id');
    var config = getConfig(tableId);
    if (config.page && config.checkStatus && tableCheck.check(tableId)) {
      var _checked = obj.checked;
      var _data = obj.data;
      var _type = obj.type;

      var primaryKey = config.checkStatus.primaryKey || 'id';

      if (_type === 'one') {
        updateCheckStatus(tableId, _data[primaryKey], _checked);
      } else if (_type === 'all') {
        // 全选或者取消全不选
        var renderFlag = false;
        layui.each(layui.table.cache[tableId], function (index, data) {
          var disableFlag = updateCheckStatus(tableId, data[primaryKey], _checked);
          if (disableFlag === false) {
            renderFlag = true;
            // 因为原始的table操作了不可选的复选框需要纠正一下状态
            var checkedTemp = tableCheck.getChecked(tableId).indexOf(data[primaryKey]) !== -1;
            tableView.find('.layui-table-body')
              .find('tr[data-index="' + index + '"]')
              .find('input[name="layTableCheckbox"]').prop('checked', checkedTemp);
            data[table.config.checkName] = checkedTemp;
          }
        });
        renderFlag && getIns(tableId).renderForm('checkbox');
      }
    }
  });

  // 让被美化的复选框支持原始节点的change事件
  form.on('checkbox', function (data) {
    $(data.elem).change();
  });

  // 表格筛选列的状态记录的封装
  var colFilterRecord = (function () {
    var recodeStoreName = 'tablePlug_col_filter_record';
    var getStoreType = function (recordType) {
      return recordType === 'local' ? 'data' : 'sessionData';
    };
    return {
      // 记录
      set: function (tableId, key, checked, recordType) {
        if (!tableId || !key) {
          return;
        }
        // 默认用sessionStore
        var storeType = getStoreType(recordType);
        // var dataTemp = layui[storeType](recodeStoreName)[tableId] || {};
        var dataTemp = this.get(tableId, recordType);
        dataTemp[key] = !checked;
        layui[storeType](recodeStoreName, {
          key: tableId,
          value: dataTemp
        })
      },
      get: function (tableId, recordType) {
        return layui[getStoreType(recordType)](recodeStoreName)[tableId] || {};
      },
      clear: function (tableId) {
        $.each(['data', 'sessionData'], function (index, type) {
          layui[type](recodeStoreName, {
            key: tableId,
            remove: true
          });
        });
      }
    };
  })();

  // 监听表格筛选的点
  $(document).on('change', 'input[lay-filter="LAY_TABLE_TOOL_COLS"]', function (event) {
    var elem = $(this);
    // var key = elem.data('key');
    var key = elem.attr('name');
    var tableView = elem.closest('.layui-table-view');
    var tableId = tableView.attr('lay-id');
    var config = getConfig(tableId);
    var filterRecord = config.colFilterRecord;
    if (filterRecord) {
      colFilterRecord.set(tableId, key, this.checked, filterRecord);
    } else {
      colFilterRecord.clear(tableId)
    }
  });

  //外部接口
  var tablePlug = {
    CHECK_TYPE_ADDITIONAL: CHECK_TYPE_ADDITIONAL
    , CHECK_TYPE_REMOVED: CHECK_TYPE_REMOVED
    , CHECK_TYPE_ORIGINAL: CHECK_TYPE_ORIGINAL
    , tableCheck: tableCheck
    , colFilterRecord: colFilterRecord  // 表格字段筛选记忆功能的封装
    , getConfig: getConfig  // 表格复选列的方法封装
    , getIns: function (tableId) { // 获得某个表格render返回的实例的封装
      return tabelIns[tableId];
    }
    , disabledCheck: function (tableId, data) {  // 同步表格中的某些不可点击的节点
      var that = this;
      tableCheck.disabled(tableId, data || []);
      disabledCheck.call(that, tableId, true);
    }
    // , getObj: getIns  // 得到当前table的实际的实例
    , queryParams: queryParams // 表格查询模式的配置封装
    , smartReload: smartReload // 全局设置一个是否开启智能重载模式

  };

  exports('tablePlug', tablePlug);
});

 
