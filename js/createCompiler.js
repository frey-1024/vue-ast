import { parse } from "./parse";

function createCompileToFunctionFn(compile) {
  return function compileToFunctions(template, options) {
    const compiled = compile(template, options)
  }
}

function createCompilerCreator(baseCompile) {
  return function createCompiler() {
    function compile(template, options) {
      const compiled = baseCompile(template, options)
    }
    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
// js柯里化是逐步传参，逐步缩小函数的适用范围，逐步求解的过程。
export const createCompiler = createCompilerCreator(function(template, options) {
  console.log('这是要处理的template字符串 -->', template);
  const ast = parse(template.trim(), options);
  console.log('这是处理后的ast(抽象语法树)字符串 -->', ast);
});