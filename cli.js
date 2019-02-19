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

let options = {} // TODO read args

let OSS_BASE_DIR = options.ossBaseDir || ''
let OUTPUT_DIR = options.outputDir || process.env.outputDir || 'dist'

glob(normalize(OUTPUT_DIR + '/**/*'), async (err, files) => {
  if (err) throw err

  for (let file of files) {
    let filename = relative.toBase(OUTPUT_DIR, file)
    let spinner = ora(`Uploading ${ file } ...`).start()
    try {
      let targetPath = normalize(OSS_BASE_DIR + '/' + filename)
      await client.put(targetPath, file)
      spinner.succeed(`Upload ${ filename } succeeded.`)
    } catch (err) {
      spinner.fail(`Upload ${ filename } failed.`)
      throw err
    }
  }
  ora().succeed('All files have been successfully uploaded!')
})
