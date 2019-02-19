# upload-oss

Upload build files to aliyun oss

## Usage

Install `npm install -D @jarvisniu/upload-oss`

Set oss config env variables in `.env`:

``` env
OSS_ACCESS_KEY_ID = 'my-oss-access-key-id'
OSS_ACCESS_KEY_SECRET = 'my-oss-access-key-secret'
OSS_REGION = 'my-oss-region'
OSS_BUCKET = 'my-bucket-name'
```

Run in cli:

``` bash
npx upload-oss
```

Or in npm scripts:

``` json
{
  "scripts": {
    "upload": "upload-oss"
  }
}
```

## CLI Args

`npx upload-oss --outputDir=dist --ossBaseDir=my-app`

## TODO

- [ ] Prompt env vars not found

## Licence

MIT
