import { makeTheServerVeryNiceAndFancy } from '../support/proletariat-server'

const { on, publish } = makeTheServerVeryNiceAndFancy('veonim:extension-host')

setInterval(() => {
  console.log('publish bagguette')
  publish.eatBread('white french bagguette')
}, 2e3)

on.getBread((breadKind: string) => {
  console.log('pls get me bread:', breadKind)
})

on.bakeBread(async (amount: number) => {
  console.log('bake bread:', amount)
  await new Promise(f => setTimeout(f, 900))
  return amount + 2
})
