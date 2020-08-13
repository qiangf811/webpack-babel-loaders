const compiler = require('./compiler')
test('promise-catch-loader', async () => {
  const stats = await compiler('example-promise.js', {
    identifier: 'err'
  }, '../src/index2.js')
  const output = stats.toJson({ source: true }).modules[0].source
  // console.log(output)
  expect(output).toBe(`const p = new Promise((resolve, reject) => {
  resolve();
});
p.then().catch(err => {
  console.error(err);
});`
  )
})
