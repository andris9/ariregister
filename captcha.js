var exec = require("child_process").exec,
    fetchUrl = require("fetch").fetchUrl,
    config = require("./config.json"),
    crypto = require("crypto"),
    pathlib = require("path"),
    fs = require("fs");

module.exports = function (url, cookies, callback){
    var i = 10,
        runResolver = function(){
            if(i--<=0){
                return callback(null, false);
            }
            captchaResolver(url, cookies, function(err, result){
                if(err){
                    return callback(err);
                }
                if(result){
                    return callback(null, result);
                }
                process.nextTick(runResolver);
            });
        }

    runResolver();
}

function captchaResolver(url, cookies, callback){
    fetchUrl(url, {cookieJar: cookies, headers: config.headers}, function(err, meta, body){
        if(err){
            return callback(err);
        }
        if(meta.status != 200){
            return callback(new Error("Invalid HTTP response status "+meta.status));
        }

        var extension = (meta.responseHeaders['content-type'] || "jpg").toString().trim().match(/[a-z]*$/)[0],
            fileName = crypto.randomBytes(20).toString("hex")+"."+extension,
            imageFile = pathlib.join(config.tmp, fileName);
        
        fs.writeFile(imageFile, body, function(err){
            if(err){
                return callback(err);
            }

            resolveCaptcha(imageFile, callback);
        });
    });
}


function resolveCaptcha(imageFile, callback){
    var textBase = pathlib.join(config.tmp, crypto.randomBytes(20).toString("hex")),
        env = {
            IMGOUT: imageFile,
            TXTBASE: textBase
        }
    exec("convert $IMGOUT -colorspace Gray -depth 8 -resample 200x200 $IMGOUT && convert $IMGOUT -virtual-pixel Black  -interpolate NearestNeighbor $IMGOUT && tesseract $IMGOUT $TXTBASE -psm 9 && cat $TXTBASE.txt && rm -rf $TXTBASE.txt && rm -rf $IMGOUT", {env: env}, function(err, stdout, stderr){
        if(err){
            return callback(err);
        }

        var data = (stdout || "").toString().trim().match(/^\s*(\d+)\s*$/m);
        return callback(null, data && data[0] || false);
    });
}
