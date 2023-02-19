#!/usr/bin/env node
require('dotenv').config()

const OSS = require('ali-oss')
const glob = require('glob')
const ora = require('ora')

const normalize = require('normalize-path')
const relative = require('relative')

if (process.env.OSS_ACCESS_KEY_ID == null) {
  ora().fail('[upload-oss] No .env file found, uploading canceled!\nSee: https://www.npmjs.com/package/@jarvisniu/upload-oss#usage')
  process.exit(1)
}

const client = new OSS({
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  region: process.env.OSS_REGION,
  bucket: process.env.OSS_BUCKET,
})

const args = require('minimist')(process.argv.slice(2))
const OUTPUT_DIR = args['output-dir'] || process.env['output-dir'] || 'dist'
const OSS_BASE_DIR = args['oss-base-dir'] || '/'
const CLEAN = args.clean || false

// Stop if unknown args were provided
const allowedArgs = ['_', 'output-dir', 'oss-base-dir', 'clean']
Object.keys(args).forEach(arg => {
  if (!allowedArgs.includes(arg)) {
    ora().fail(`[upload-oss] Unknown arg "${arg}" provided, program stopped!`)
    process.exit(1)
  }
})

// '[====>-------] [ 2/18] Message'
function progressMsg (index, count, msg) {
  const BAR_LEN = 10
  const num = String(index)
  const len = String(count).length
  const doneLen = Math.floor((index / count) * BAR_LEN)
  const restLen = BAR_LEN - doneLen
  const barMsg = '='.repeat(doneLen) + '>' + '-'.repeat(restLen)
  const numMsg = num.padStart(len) + '/' + count
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
  // Sort 'index.html' to the last, then site will not crash during upload
  localFiles.sort((a, b) => {
    if (a.relativePath === 'index.html') return 1
    else if (b.relativePath === 'index.html') return -1
  })
  if (localFiles.length === 0) {
    ora().fail('[upload-oss] No local files found, uploading canceled!')
    process.exit(1)
  }

  await uploadOss(localFiles)
  if (CLEAN) await cleanOss(localFiles)
}

async function uploadOss (localFiles) {
  console.log(`[upload-oss] Uploading files from local directory ${ OUTPUT_DIR }/ to target directory ${ OSS_BASE_DIR }/`)
  const spinner = ora().start()
  for (let i = 0, len = localFiles.length; i < len; i++) {
    const file = localFiles[i]
    try {
      const ossPath = normalize(OSS_BASE_DIR + '/' + file.relativePath)
      spinner.text = progressMsg(i, len, `Uploading ${ file.relativePath }`)
      await client.put(ossPath, file.localPath)
    } catch (err) {
      spinner.fail(progressMsg(i, len, `Upload ${ file.relativePath } failed.`))
      ora().fail(`[upload-oss] Error: ${err.message} Uploading canceled!`)
      process.exit(1)
    }
  }
  spinner.succeed(progressMsg(localFiles.length, localFiles.length, `Upload completed!`))
}

async function cleanOss (localFiles) {
  if (/\/?^$/.test(OSS_BASE_DIR)) {
    console.log(`[upload-oss] oss-base-dir not set, clean is canceled.`)
    return
  }
  const relativeLocalPaths = localFiles.map(item => item.relativePath)
  const listResp = await client.list({
    'prefix': normalize(OSS_BASE_DIR) + '/',
    'max-keys': 1000,
  })
  const ossFilePaths = listResp.objects.map(item => item.name)

  // get redundant files
  const redundantOssFilePaths = ossFilePaths.filter(ossFilePath => {
    const relativeOssFilePath = relative.toBase(OSS_BASE_DIR, ossFilePath)
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
    const spinner = ora().start(`Cleaning OSS path ${ OSS_BASE_DIR }/`)
    await client.deleteMulti(redundantOssFilePaths)
    spinner.succeed(`Cleaning OSS completed`)
  }
}

if (require.main === module) {
  main()
}
