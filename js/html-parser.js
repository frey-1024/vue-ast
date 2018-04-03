const ncname = '[a-zA-Z_][\\w\\-\\.]*';
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;
const startTagOpen = new RegExp(`^<${qnameCapture}`);
const startTagClose = /^\s*(\/?)>/;
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);
const attribute = /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;

const reCache = {};
// 特殊标签
const isPlainTextElement = (tag) => ('script,style,textarea').indexOf(tag) >= 0;

export function parseHTML(html, options) {
  const stack = [];
  let index = 0;
  let last, lastTag;
  // 循环html字符串
  while (html) {
    last = html;
    // 处理非script,style,textarea的元素
    if(!lastTag || !isPlainTextElement(lastTag)) {
      let textEnd = html.indexOf('<');
      if (textEnd === 0) {
        // 结束标签
        const endTagMatch = html.match(endTag);
        if (endTagMatch) {
          const curIndex = index;
          advance(endTagMatch[0].length);
          parseEndTag(endTagMatch[1], curIndex, index);
          continue;
        }
        // 开始标签
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          handleStartTag(startTagMatch);
          continue;
        }
      }
      let text;
      // 判断 '<' 首次出现的位置，如果大于等于0，截取这段，赋值给text, 并删除这段字符串
      // 这里有可能是空文本，如这种 ' '情况， 他将会在chars里面处理
      if (textEnd >= 0) {
        text = html.substring(0, textEnd);
        advance(textEnd);
      } else {
        text = html;
        html = '';
      }
      // 处理文本标签
      if (text) {
        options.chars(text);
      }
    } else {
      // 处理script,style,textarea的元素，
      // 这里我们只处理textarea元素, 其他的两种Vue 会警告，不提倡这么写
      let endTagLength = 0;
      const stackedTag = lastTag.toLowerCase();
      // 缓存匹配textarea 的正则表达式
      const reStackedTag = reCache[stackedTag] || (reCache[stackedTag] = new RegExp('([\\s\\S]*?)(</' + stackedTag + '[^>]*>)', 'i'));
      // 清除匹配项，处理text
      const rest = html.replace(reStackedTag, function(all, text, endTag) {
        endTagLength = endTag.length;
        options.chars(text);
        return ''
      });
      index += html.length - rest.length;
      html = rest;
      parseEndTag(stackedTag, index - endTagLength, index);
    }
  }

  /**
   * 处理解析后的属性，重新分割并保存到attrs数组中
   * @param match
   */
  function handleStartTag(match) {
    const tagName = match.tagName;
    const unary = isUnaryTag(tagName) || !!match.unarySlash;
    const l = match.attrs.length;
    const attrs = new Array(l);
    for (let i = 0; i < l; i += 1) {
      const args = match.attrs[i];
      attrs[i] = {
        name:args[1], // 属性名
        value: args[3] || args[4] || args[5] || '' // 属性值
      };
    }
    // 非单元素
    if (!unary) {
      // 因为我们的parse必定是深度优先遍历，
      // 所以我们可以用一个stack来保存还没闭合的标签的父子关系，
      // 并且标签结束时一个个pop出来就可以了
      stack.push({
        tag: tagName,
        lowerCasedTag: tagName.toLowerCase(),
        attrs,
      });
      // 缓存这次的开始标签
      lastTag = tagName;
    }
    options.start(tagName, attrs, unary, match.start, match.end);
  }

  /**
   * 匹配到元素的名字和属性，保存到match对象中并返回
   * @returns {{tagName: *, attrs: Array, start: number}}
   */
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      // 定义解析开始标签的存储格式
      const match = {
        tagName: start[1], // 标签名
        attrs: [], // 属性
        start: index, // 标签的开始位置
      };
      // 删除匹配到的字符串
      advance(start[0].length);
      // 没有匹配到结束 '>' ,但匹配到了属性
      let end, attr;
      while (!(end = html.match(startTagClose)) && (attr = html.match(attribute))) {
        advance(attr[0].length);
        // 把元素属性都取出，并添加到attrs中
        match.attrs.push(attr);
      }
      if (end) {
        match.unarySlash = end[1];
        advance(end[0].length);
        // start 到 end 这段长度就是这次执行，所处理的字符串长度
        match.end = index;
        return match;
      }
    }
  }

  /**
   * 解析关闭标签，
   * 查找我们之前保存到stack栈中的元素，
   * 如果找到了，也就代表这个标签的开始和结束都已经找到了，此时stack中保存的也就需要删除（pop）了
   * 并且缓存最近的标签lastTag
   * @param tagName
   * @param start
   * @param end
   */
  function parseEndTag(tagName, start, end) {
    const lowerCasedTag = tagName && tagName.toLowerCase();
    let pos = 0;
    if (lowerCasedTag) {
      for (pos = stack.length -1; pos >= 0; pos -= 1) {
        if (stack[pos].lowerCasedTag === lowerCasedTag) {
          break;
        }
      }
    }
    if (pos >= 0) {
      // 关闭 pos 以后的元素标签
      for (let i = stack.length - 1; i >= pos; i -= 1) {
        options.end(stack[i].tag, start, end);
      }
      // 更新stack数组
      stack.length = pos;
      // stack 取出数组存储的最后一个元素
      lastTag = pos && stack[pos - 1].tag;
    }
  }

  /**
   * 删除html 字符串
   * @param n 从哪里开始取字符串
   */
  function advance(n) {
    index += n;
    html = html.substring(n);
  }
}

/**
 * 判断是单元素标签，因为如img标签，
 * 在浏览器上是这个样子<img>， 并没有最后的那个‘/’,此时，正则表达式是无法处理的，必须用这个函数进行判断
 * @param tagName
 * @returns {boolean}
 */
function isUnaryTag(tagName) {
  const str = 'area,base,br,col,embed,frame,hr,img,input,isindex,keygen,' +
    'link,meta,param,source,track,wbr';
  const list = str.split(',');
  for (let i = 0, l = list.length; i < l; i++) {
    if (list[i] === tagName) {
      return true;
    }
  }
  return false;
}