#!/usr/bin/env node
require('dotenv').config()

let OSS = require('ali-oss')
let glob = require('glob')
let ora = require('ora')

let normalize = require('normalize-path')
let relative = require('relative')

let client = new OSS({
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  region: process.env.OSS_REGION,
  bucket: process.env.OSS_BUCKET,
})

let args = require('minimist')(process.argv.slice(2))

const OUTPUT_DIR = args.outputDir || process.env.outputDir || 'dist'
const OSS_BASE_DIR = args.ossBaseDir || ''
const CLEAN = args.clean || false

// '[====>-------] [ 2/18] Message'
function progressMsg (index, count, msg) {
  const BAR_LEN = 10
  let num = String(index)
  let len = String(count).length
  let doneLen = Math.floor((index / count) * BAR_LEN)
  let restLen = BAR_LEN - doneLen
  let barMsg = '='.repeat(doneLen) + '>' + '-'.repeat(restLen)
  let numMsg = num.padStart(len) + '/' + count
  return `[${ barMsg }] [${ numMsg }] ${ msg }`
}

function listLocalFiles () {
  return new Promise(function (resolve, reject) {
    glob(normalize(OUTPUT_DIR + '/**/*'), { nodir: true }, async (err, files) => {
      if (err) reject(err)

      resolve(files.map(file => ({
        localPath: file,
        relativePath: relative.toBase(OUTPUT_DIR, file),
      })))
    })
  })
}

async function main () {
  let localFiles = await listLocalFiles()
  if (localFiles.length === 0) {
    ora().fail('[upload-oss] No local files found, uploading stopped!')
    return
  }

  await uploadOss(localFiles)
  if (CLEAN) await cleanOss(localFiles)
}

async function uploadOss (localFiles) {
  console.log(`[upload-oss] Uploading files from local directory ${ OUTPUT_DIR }/ to target directory ${ OSS_BASE_DIR }/`)
  let spinner = ora().start()
  for (let i = 0, len = localFiles.length; i < len; i++) {
    let file = localFiles[i]
    try {
      let ossPath = normalize(OSS_BASE_DIR + '/' + file.relativePath)
      spinner.text = progressMsg(i, len, `Uploading ${ file.relativePath }`)
      await client.put(ossPath, file.localPath)
    } catch (err) {
      spinner.fail(progressMsg(i, len, `Upload ${ file.relativePath } failed.`))
      throw err
    }
  }
  spinner.succeed(progressMsg(localFiles.length, localFiles.length, `Upload completed!`))
}

async function cleanOss (localFiles) {
  let relativeLocalPaths = localFiles.map(item => item.relativePath)
  let listResp = await client.list({ prefix: OSS_BASE_DIR })
  let ossFilePaths = listResp.objects.map(item => item.name)

  // get redundant files
  let redundantOssFilePaths = ossFilePaths.filter(ossFilePath => {
    let relativeOssFilePath = relative.toBase(OUTPUT_DIR, ossFilePath)
    return !relativeLocalPaths.includes(relativeOssFilePath)
  })

  console.log([
    `Local files count: ${ localFiles.length },`,
    `OSS files count: ${ ossFilePaths.length },`,
    `redundant files count: ${ redundantOssFilePaths.length }`,
    `(${ Math.round(redundantOssFilePaths.length / ossFilePaths.length * 100) }%).`,
  ].join(' '))

  if (redundantOssFilePaths.length === 0) {
    console.log('There is no redundant files, skip cleaning.')
  } else {
    let spinner = ora().start(`Cleaning OSS path ${ OSS_BASE_DIR }/`)
    await client.deleteMulti(redundantOssFilePaths)
    spinner.succeed(`Cleaning OSS completed`)
  }
}

if (require.main === module) {
  main()
}
