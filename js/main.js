import { compileToFunctions } from './compileToFunctions';

// Vue 对象
function Vue(options) {
  // 获取模板
  const selected = document.querySelector(options.el);
  this.$mount(selected);
}

// mount 模板
Vue.prototype.$mount = function (el) {
  const html = el.outerHTML;
  compileToFunctions(html, {});
};

export default Vue;