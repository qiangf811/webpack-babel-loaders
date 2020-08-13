const compiler = require('./compiler')
test('await-catch-loader', async () => {
  const stats = await compiler('example-await.js', {
    identifier: 'err'
  }, '../src/index.js')
  const output = stats.toJson({ source: true }).modules[0].source
  expect(output).toBe(`async function func() {
  try {
    await new Promise((resolve, reject) => {
      reject('抛出错误');
    });
  } catch (err) {
    console.error(err);
  }
}`)
})
