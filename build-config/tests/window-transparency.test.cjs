const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')
const html = readFileSync('src/renderer/index.html', 'utf8')
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1]
for (const [query, transparent] of [
  ['os=linux&dt=false', false],
  ['os=linux&dt=true', false],
  ['os=linux&dt=false&transparent=false', false],
  ['os=windows&dt=false', true],
  ['os=windows&dt=true', false],
  ['os=windows&dt=false&transparent=false', false],
  ['os=mac&dt=false&transparent=true', true],
]) {
  const classes = new Set()
  const window = { location: { search: '?' + query } }
  const document = {
    documentElement: { classList: { add: c => classes.add(c) }, setAttribute() {} },
    createElement: () => ({}), body: { appendChild() {} },
  }
  vm.runInNewContext(source, { window, document, navigator: { language: 'zh-CN' }, URLSearchParams })
  assert.equal(window.isTransparent, transparent)
  assert(classes.has(transparent ? 'transparent' : 'disableTransparent'))
  assert(!classes.has(transparent ? 'disableTransparent' : 'transparent'))
  console.log('PASS window bootstrap ' + query)
}
