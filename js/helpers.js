/**
 * 获取属性值，并删除attrsList 中的属性
 * @param el
 * @param name
 * @param removeFromMap
 * @returns {*}
 */
export function getAndRemoveAttr(el, name, removeFromMap) {
  let val;
  // 取出attrsMap对象上唯一的属性值
  if ((val = el.attrsMap[name]) != null) {
    const list = el.attrsList;
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        // 清除attrsList中属性
        list.splice(i, 1);
        break;
      }
    }
  }
  if (removeFromMap) {
    delete el.attrsMap[name];
  }
  return val;
}

/**
 * 获取自定义的属性值，这种属性以 ':' 或者 'v-bind:' 开头
 * @param el
 * @param name
 * @returns {string}
 */
export function getBindingAttr(el, name) {
  const dynamicValue = getAndRemoveAttr(el, ':' + name) || getAndRemoveAttr(el, 'v-bind:' + name);
  if (dynamicValue != null) {
    return dynamicValue.trim();
  }
}

/**
 * 保存事件到events对象中，
 * 当事件多次出现，保存成数组，如果只有一个就保存成一个，
 * @param el
 * @param name
 * @param value
 */
export function addHandler(el, name, value) {
  let events = el.events || (el.events = {});
  const newHandler = { value };
  const handlers = events[name];
  if (Array.isArray(handlers)) {
    handlers.push(newHandler);
  } else if (handlers) {
    events[name] = [ handlers, newHandler ];
  } else {
    events[name] = newHandler;
  }
}

/**
 * 添加指令
 * @param el
 * @param name
 * @param rawName
 * @param value
 */
export function addDirective (el, name, rawName, value) {
  (el.directives || (el.directives = [])).push({ name, rawName, value });
}
