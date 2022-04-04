const path = require("path")
const fs = require('fs');
const mime = require('mime');
const http = require('http');
const https = require('https');
const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');

const httpRegex = /http(s)?:\/\/([\w-]+\.)+[\w-]+(\/[\w- .\/?%&=]*)?/;
const imageRegex = /<img\s[^>]*?src(\s+)?=[\s"]+?([^>\s"]+)[^>]*>([^<]*<\/img>)?/gi;

async function imageInline(post) {

    const hexo = this;
    const config = hexo.config.inline_image;
    const log = hexo.log || console;

    if (!config.enabled) {
        log.warn("hexo-filter-inline-image is disabled");
        return;
    }

    let match;
    let str = post.content;
    let matchGroups = [];
    while ((match = imageRegex.exec(str)) !== null) {
        matchGroups.push(match);
    }

    for (let i = 0; i < matchGroups.length; i++) {
        const matches = matchGroups[i];
        const src = matches[2];
        const dir = post.slug.substring(0, post.slug.lastIndexOf('/'));

        if (!/^data/.test(src)) {

            let imgSrc = src;
            let imgBuf = null;
            let imgType = null;
            let remote = false;
            if (isRemoteURL(imgSrc)) {
                remote = true;
                if (!config.remote) {
                    continue;
                }
            } else {
                remote = false;
                if (isAbsolutePath(src)) {
                    imgSrc = `${src}`;
                } else {
                    imgSrc = path.join(`${hexo.source_dir}_posts`, `${dir}`, `${src}`);
                }
            }

            imgType = mime.getType(imgSrc);
            if (imgType != null) {
                if (remote) {
                    imgBuf = await getRemoteData(imgType, imgSrc);
                } else {
                    imgBuf = getLocalDataSync(imgType, imgSrc);
                }

                if (imgBuf != null) {
                    if (config.compress) {
                        imgBuf = await imgCompress(imgType, imgBuf);
                    }
                    const base64 = imgBuf.toString('base64');
                    if (base64.length < config.limit * 1000) {
                        const newSrc = matches[0].replace(/(src(\s+)?=[(\s+)"]?)[^>\s"]+/, `$1data:${imgType};base64,${base64}$2`);
                        str = str.replace(matches[0], newSrc);
                    } else {
                        log.warn(`Image size exceed limit: ${imgSrc} size large than ${config.limit * 1000} byte`);
                    }
                } else {
                    log.warn(`Image file data error: ${src}`);
                }
            } else {
                log.warn(`Unknown file type: ${imgSrc}`);
            }


        }
    }
    post.content = str;
    return post;
}

function imgCompress(imgType, buffer) {
    if (imgType.indexOf("jpg") > 0 || imgType.indexOf("jpeg") > 0) {
        buffer = imagemin.buffer(buffer, {
            plugins: [imageminJpegtran({
                quality: [0.6, 0.8]
            })],
        });
    }
    if (imgType.indexOf("png") > 0) {
        buffer = imagemin.buffer(buffer, {
            plugins: [imageminPngquant({
                quality: [0.6, 0.8]
            })],
        });
    }
    return buffer;
}

function isRemoteURL(src) {
    return httpRegex.test(src);
}

function isAbsolutePath(src) {
    return src.indexOf(0) == '/';
}

function getLocalDataSync(type, src) {
    if (fs.existsSync(src)) {
        return fs.readFileSync(src);
    } else {
        console.warn(`Image not found: ${src}`);
    }
}

function getRemoteData(type, src) {
    try {
        return new Promise((resolve, reject) => {
            let url = new URL(src);
            let client = url.protocol === "https:" ? https : http;
            let req = client.get(src, function (req, res) {
                let bufferList = [];
                let bufferLength = 0;
                req.on('error', (error) => {
                    console.log(error);
                });
                req.on('data', function (data) {
                    bufferList.push(data);
                    bufferLength += data.length;
                });
                req.on('end', function (data) {
                    let imgBuffer = new Buffer(bufferLength);
                    let pos = 0;
                    for (let buffer of bufferList) {
                        buffer.copy(imgBuffer, pos);
                        pos += buffer.length;
                    }
                    resolve(imgBuffer);
                });
            });
            req.end();
        });

    } catch (err) {
        console.warn(`Image not found: ${src}`, err);
    }
}
module.exports = imageInline;
