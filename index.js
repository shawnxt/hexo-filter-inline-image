
hexo.config.inline_image = Object.assign({
  enabled: true,
  compress: true,
  remote: false,
  limit: 2048,
  logabled:false
}, hexo.config.inline_image);

hexo.extend.filter.register('after_post_render', require('./lib/imageInline'))
