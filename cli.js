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

const OSS_BASE_DIR = args.ossBaseDir || ''
const OUTPUT_DIR = args.outputDir || process.env.outputDir || 'dist'

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

glob(normalize(OUTPUT_DIR + '/**/*'), { nodir: true }, async (err, files) => {
  if (err) throw err

  console.log(`Uploading OSS from path ${ OUTPUT_DIR }/ to path ${ OSS_BASE_DIR }/`)
  let spinner = ora().start()
  for (let i = 0, len = files.length; i < len; i++) {
    let file = files[i]
    let filename = relative.toBase(OUTPUT_DIR, file)
    try {
      let targetPath = normalize(OSS_BASE_DIR + '/' + filename)
      spinner.text = progressMsg(i, len, `Uploading ${ filename }`)
      await client.put(targetPath, file)
    } catch (err) {
      spinner.fail(progressMsg(i, len, `Upload ${ filename } failed.`))
      throw err
    }
  }
  spinner.succeed(progressMsg(files.length, files.length, `Upload completed!`))
})
