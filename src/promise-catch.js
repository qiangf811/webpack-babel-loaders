const core = require('@babel/core')
const parser = require('@babel/parser')
const t = require('@babel/types')
const traverse = require('@babel/traverse').default

const DEFAULT_OPTIONS = {
  catchCode: identifier => `console.error(${identifier})`,
  identifier: 'e'
}

module.exports = function (source) {
  let options = {
    ...DEFAULT_OPTIONS,
    ...this.getOptions()
  }
  let ast = parser.parse(source, {
    sourceType: 'module' // 支持 es6 module
  })
  if (typeof options.catchCode === 'function') {
    options.catchCode = options.catchCode(options.identifier)
  }
  let catchNode = parser.parse(options.catchCode).program.body

  const promises = []

  traverse(ast, {
    NewExpression ({ node, parentPath }) {
      const isPromise = node.callee.name === 'Promise'
      if (isPromise) {
        promises.push(parentPath.node.id.name)
      }
    },
    CallExpression (path) {
      const { node, parentPath } = path
      const callee = node.callee
      // !t.isMemberExpression(parentPath.node)这一层判断是替换父节点之后，p.then()表达式再次进入
      if (!t.isMemberExpression(parentPath.node) && t.isMemberExpression(callee) && t.isIdentifier(callee.property) && t.isIdentifier(callee.object)) {
        const isThenIdentifier = callee.property.name === 'then'
        const isPromise = promises.includes(callee.object.name)
        if (isThenIdentifier && isPromise) { // 说明是一个promise调用then表达式
          if (node.property && node.property.name === 'catch') return // 如果已经有catch语法了则不需要处理了
          const params = t.arrowFunctionExpression([t.identifier(options.identifier)], t.blockStatement(catchNode))
          const expressionStatement = t.expressionStatement(
            t.callExpression(
              t.memberExpression(
                node,
                t.identifier('catch')
              ),
              [params]
            )
          )
          parentPath.replaceWith(expressionStatement)
        }
      }
    }
  })
  return core.transformFromAstSync(ast, null, {
    configFile: false
  }).code
}
