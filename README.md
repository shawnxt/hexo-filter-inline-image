# hexo-filter-inline-image
hexo-filter-inline-image
## Installation



## Usage

The filter is enabled by default with the configuration:

```
inline_image:  
    enabled: true
    compress: true
    remote: false
    limit: 2048
```

### Images

if inline_image.enabled is true, Any local images in `source\_posts` directory are inlined with base64 code if their file size is smaller than the `limit`
defined in the configuration.

if inline_image.remote is true, Any remote images start with http or https are inlined with base64 code if their file size is smaller than the `limit`
defined in the configuration.

if inline_image.compress is true, compressed the inline image;