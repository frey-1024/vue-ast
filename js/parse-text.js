const tagRE = /\{\{((?:.|\n)+?)\}\}/g;

export function parseText(text) {
  if (!tagRE.test(text)) {
    return;
  }
  const tokens = [];
  let lastIndex = tagRE.lastIndex = 0;
  let match, index;
  // exec中不管是不是全局的匹配，只要没有子表达式，
  // 其返回的都只有一个元素，如果是全局匹配，可以利用lastIndex进行下一个匹配，
  // 匹配成功后lastIndex的值将会变为上次匹配的字符的最后一个位置的索引。
  // 在设置g属性后，虽然匹配结果不受g的影响，
  // 返回结果仍然是一个数组（第一个值是第一个匹配到的字符串，以后的为分组匹配内容），
  // 但是会改变index和 lastIndex等的值，将该对象的匹配的开始位置设置到紧接这匹配子串的字符位置，
  // 当第二次调用exec时，将从lastIndex所指示的字符位置 开始检索。
  while ((match = tagRE.exec(text))) {
    index = match.index;
    // 当文本标签中既有{{}} 在其左边又有普通文本时，
    // 如：<span>我是普通文本{{value}}</span>， 就会执行下面的方法，添加到tokens数组中。
    if (index > lastIndex) {
      tokens.push(JSON.stringify(text.slice(lastIndex, index)));
    }
    // 把匹配到{{}}中的tag 添加到tokens数组中
    const exp = match[1].trim();
    tokens.push(`_s(${exp})`);
    lastIndex = index + match[0].length
  }
  // 当文本标签中既有{{}} 在其右边又有普通文本时，
  // 如：<span>{{value}} 我是普通文本</span>， 就会执行下面的方法，添加到tokens数组中。
  if (lastIndex < text.length) {
    tokens.push(JSON.stringify(text.slice(lastIndex)));
  }
  return tokens.join('+');
}