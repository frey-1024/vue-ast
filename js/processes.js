import {
  getAndRemoveAttr,
  getBindingAttr,
  addHandler,
  addDirective
} from "./helpers";

export const onRE = /^@|^v-on:/;
export const dirRE = /^v-|^@|^:/;
export const forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/;
export const forIteratorRE = /\((\{[^}]*\}|[^,]*),([^,]*)(?:,([^,]*))?\)/;

const argRE = /:(.*)$/;
const bindRE = /^:|^v-bind:/;
const modifierRE = /\.[^.]+/g;

/**
 * 解析v-for属性
 * @param el
 */
export function processFor(el) {
  const exp = getAndRemoveAttr(el, 'v-for');
  if (exp) {
    const inMatch = exp.match(forAliasRE);
    if (!inMatch) {
      return;
    }
    el.for = inMatch[2].trim();
    // in | of 左边的项
    const alias = inMatch[1].trim();
    const iteratorMatch = alias.match(forIteratorRE);
    // 匹配是否（item, index）这种写法
    if (iteratorMatch) {
      el.alias = iteratorMatch[1].trim();
      el.iterator1 = iteratorMatch[2].trim();
      if (iteratorMatch[3]) {
        el.iterator2 = iteratorMatch[3].trim();
      }
    } else {
      el.alias = alias;
    }
  }
}

/**
 * 解析v-if属性
 * @param el
 */
export function processIf(el) {
  const exp = getAndRemoveAttr(el, 'v-if');
  if (exp) {
    el.if = exp;
    addIfCondition(el, {
      exp: exp,
      block: el
    });
  } else {
    if (getAndRemoveAttr(el, 'v-else') != null) {
      el.else = true;
    }
    const elseif = getAndRemoveAttr(el, 'v-else-if');
    if (elseif) {
      el.elseif = elseif
    }
  }
}

/**
 * 解析 v-once 属性
 * @param el
 */
export function processOnce(el) {
  const once = getAndRemoveAttr(el, 'v-once');
  if (once != null) {
    el.once = true
  }
}

export function processElement(el) {
  processKey(el);
  // 去掉属性后，确定这是一个普通元素。
  el.plain = !el.key && !el.attrsList.length;
  processRef(el);
  processSlot(el);
  processComponent(el);
  processAttrs(el);
}

/**
 * 当元素有兄弟节点，并且这个兄弟节点在当前元素上面和兄弟节点带有v-if属性，
 * 就添加到ifConditions数组中
 * @param el
 * @param parent
 */
export function processIfConditions (el, parent) {
  const prev = findPrevElement(parent.children);
  if (prev && prev.if) {
    addIfCondition(prev, {
      exp: el.elseif, // v-else-if 的属性值
      block: el,
    });
  }
}

/**
 * 添加到ifConditions数组中
 * @param el
 * @param condition
 */
export function addIfCondition (el, condition) {
  if (!el.ifConditions) {
    el.ifConditions = [];
  }
  el.ifConditions.push(condition);
}

/**
 * 存储元素普通或者处理后的属性
 * @param el
 * @param name
 * @param value
 */
export function addAttr (el, name, value) {
  (el.attrs || (el.attrs = [])).push({ name, value });
}

/**
 * 处理元素的唯一标识key
 * @param el
 */
function processKey(el) {
  const exp = getBindingAttr(el, 'key');
  if (exp) {
    el.key = exp;
  }
}

/**
 * 处理ref
 * @param el
 */
function processRef(el) {
  const ref = getBindingAttr(el, 'ref');
  if (ref) {
    el.ref = ref;
    // 检测该元素是否存在一个for循环中，将会沿着parent元素一级一级向上便利寻找是否处于一个for循环中
    el.refInFor = checkInFor(el);
  }
}

/**
 * 处理
 * <slot name="slotName"></slot>
 * 和
 * <div slot="slotName"></div>
 * 两种情况
 * @param el
 */
function processSlot(el) {
  if (el.tag === 'slot') {
    el.slotName = getBindingAttr(el, 'name');
  } else {
    const slotTarget = getBindingAttr(el, 'slot');
    if (slotTarget) {
      // slot没有target值，就是default
      el.slotTarget = slotTarget === '""' ? '"default"' : slotTarget;
      if (el.tag !== 'template') {
        // 添加到属性数组中
        addAttr(el, 'slot', slotTarget);
      }
    }
  }
}

/**
 * :is 动态引入模板的功能，其实我们用vue-cli 脚手架搭的环境用template更好
 * @param el
 */
function processComponent(el) {
  let binding;
  if ((binding = getBindingAttr(el, 'is'))) {
    el.component = binding;
  }
  if (getAndRemoveAttr(el, 'inline-template') != null) {
    el.inlineTemplate = true;
  }
}

/**
 * 处理上面处理剩下的attrsList里面的属性，
 * 根据正则判断不同类型进行不同处理
 * @param el
 */
function processAttrs(el) {
  const list = el.attrsList;
  let i, l, name, rawName, value, modifiers, isProp;
  for (i = 0, l = list.length; i < l; i++) {
    // rawName缓存未处理的name
    name = rawName = list[i].name;
    value = list[i].value;
    // 匹配v-、@以及:
    if (dirRE.test(name)) {
      el.hasBinding = true;
      // v-bind :
      if (bindRE.test(name)) {
        name = name.replace(bindRE, '');
        addAttr(el, name, value);
        // 这里忽略modifiers（修饰符）
      } else if (onRE.test(name)) { // v-on: @
        name = name.replace(onRE, '');
        // 添加事件， 当该元素多个相同事件就保存成数组；
        addHandler(el, name, value)
      } else { // 普通指令
        name = name.replace(dirRE, '');
        addDirective(el, name, rawName, value)
      }
    } else { // 普通属性
      addAttr(el, name, JSON.stringify(value));
    }
  }
}

/**
 * 寻找children中是标签元素的最后一项
 * @param children
 * @returns {*}
 */
function findPrevElement(children) {
  let i = children.length;
  while (i--) {
    if (children[i].type === 1) {
      return children[i];
    } else {
      // 如果最后一项不是标签元素，就清除它
      children.pop();
    }
  }
}

/**
 * 判断父级是否有v-for
 * @param el
 * @returns {boolean}
 */
function checkInFor(el) {
  let parent = el;
  while (parent) {
    if (parent.for !== undefined) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}