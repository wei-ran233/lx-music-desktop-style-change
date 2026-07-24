import pkg from '../../../package.json'

export const getVersionInfo = async() => {
  return Promise.resolve({
    version: pkg.version,
    desc: '已是最新版本',
    history: [],
  })
}

// getVersionInfo().then(info => {
//   console.log(info)
// })
