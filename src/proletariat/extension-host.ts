import { makeTheServerVeryNiceAndFancy } from '../support/proletariat-server'

const { on, publish } = makeTheServerVeryNiceAndFancy('veonim:extension-host')

setInterval(() => {
  publish.eatBread('white french bagguette')
}, 2e3)

on.getBread((breadKind: string) => {
  console.log('pls get me bread:', breadKind)
})
