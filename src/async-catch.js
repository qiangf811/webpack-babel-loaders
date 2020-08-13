const core = require('@babel/core')
const parser = require('@babel/parser')
const t = require('@babel/types')
const traverse = require('@babel/traverse').default

const DEFAULT_OPTIONS = {
  catchCode: identifier => `console.error(${identifier})`,
  identifier: 'e',
  finallyCode: null
}

const isAsyncFuncNode = node =>
  t.isArrowFunctionExpression(node, { // 箭头函数
    async: true
  }) ||
  t.isFunctionDeclaration(node, { // 普通函数
    async: true
  }) ||
  t.isFunctionExpression(node, { // 函数表达式
    async: true
  }) ||
  t.isObjectMethod(node, { // 对象方法
    async: true
  })

module.exports = function (source) {
  let options = {
    ...DEFAULT_OPTIONS,
    ...this.getOptions()
  }
  let ast = parser.parse(source, {
    sourceType: 'module', // 支持 es6 module
    plugins: ['dynamicImport'] // 支持动态 import
  })
  if (typeof options.catchCode === 'function') {
    options.catchCode = options.catchCode(options.identifier)
  }
  let catchNode = parser.parse(options.catchCode).program.body
  let finallyNode =
    options.finallyCode && parser.parse(options.finallyCode).program.body

  /**
   * 只给最外层的 async 函数包裹 try/catch
   */
  traverse(ast, {
    AwaitExpression (path) {
      // 递归向上找异步函数的 node 节点
      while (path && path.node) {
        let parentPath = path.parentPath
        if (
          // 找到 async Function
          t.isBlockStatement(path.node) &&
          isAsyncFuncNode(parentPath.node)
        ) {
          let tryCatchAst = t.tryStatement(
            path.node,
            t.catchClause(
              t.identifier(options.identifier),
              t.blockStatement(catchNode)
            ),
            finallyNode && t.blockStatement(finallyNode)
          )
          path.replaceWithMultiple([tryCatchAst])
          return
        } else if (
          // 已经包含 try 语句则直接退出
          t.isBlockStatement(path.node) &&
          t.isTryStatement(parentPath.node)
        ) {
          return
        }
        path = parentPath
      }
    }
  })
  return core.transformFromAstSync(ast, null, {
    configFile: false // 屏蔽 babel.config.js，否则会注入 polyfill 使得调试变得困难
  }).code
}
