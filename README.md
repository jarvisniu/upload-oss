# upload-oss

Upload build files to aliyun oss

## Usage

First set oss config env variables in `.env`:

``` env
OSS_ACCESS_KEY_ID = 'my-oss-access-key-id'
OSS_ACCESS_KEY_SECRET = 'my-oss-access-key-secret'
OSS_REGION = 'my-oss-region'
OSS_BUCKET = 'my-bucket-name'
```

Then in cli:

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

## TODO

- [ ] Add cli options upload-oss --outputDir dist --ossBaseDir my-app
- [ ] Prompt env vars not found

## Licence

MIT
