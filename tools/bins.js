'use strict'
process.on('unhandledRejection', e => console.error(e))

const zlib = require('zlib')
const { readFileSync: loadConfig } = require('jsonfile')
const { createWriteStream: write } = require('fs')
const axios = require('axios')
const releases = repo => `http://api.github.com/repos/${repo}/releases`
const release = (repo, id) => `http://api.github.com/repos/${repo}/releases/${id}`
const get = axios.get

const getVersions = async (repo) => {
  const { data } = await get(releases(repo))
  return data
    .filter(m => !m.draft && !m.prerelease)
    .map(m => ({ id: m.id, name: m.name, version: m.tag_name, created: m.created_at }))
}

const listVersions = async (repo) => {
  const vs = await getVersions(repo)
  console.log(`-- ${repo} --`)
  vs.slice(0, 5).forEach(({ version, name, created }) => console.log(`${version} -- "${name}" (${created})`))
  console.log()
}

const getAssets = async (repo, id) => {
  const { data } = await get(release(repo, id))
  if (!data.assets) return []
  return data.assets.map(a => ({ name: a.name, url: a.browser_download_url }))
}

const getVersionAssets = async (repo, version) => {
  const versions = await getVersions(repo)
  if (!versions) return console.log(`no versions found for ${repo}`)
  const { id } = versions.find(v => v.version.includes(version))
  if (!id) return console.log(`version ${version} not found in ${repo} releases`)
  return await getAssets(repo, id)
}

const dlAssets = async ({ repo, version }) => {
  console.log(`getting assets for ${repo} v${version}`)
  const assets = await getVersionAssets(repo, version)

  assets.forEach(({ name, url }) => axios({ url, method: 'get', responseType: 'stream' }).then(res => {
    console.log(`downloading ${name}`)
    // TODO: mkdir bin
    res.data.pipe(write('../bin/' + name))
    // TODO: incorrect header check
    //const unzip = zlib.createGunzip()
    //res.data.pipe(unzip).pipe(write(name)).on('end', () => {
  }))
}

const { binDependencies: config } = loadConfig('../package.json')
const listOnly = process.argv.slice(2).includes('--list')

config.forEach(c => listOnly ? listVersions(c.repo) : dlAssets(c))
