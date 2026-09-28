const { contextBridge } = require('electron')

const portArgument = process.argv.find((argument) => argument.startsWith('--nodenav-api-port='))
const apiPort = portArgument?.slice('--nodenav-api-port='.length) || '3001'

contextBridge.exposeInMainWorld('nodeNavConfig', {
  apiBaseUrl: `http://localhost:${apiPort}/api`,
})
