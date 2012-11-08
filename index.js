var captcha = require("./captcha"),
    fetch = require("fetch"),
    config = require("./config.json"),
    fetchUrl = fetch.fetchUrl;

module.exports = getData;

function getData(rkood, callback){
    var cookies = new fetch.CookieJar();
    getSession(cookies, function(err, sessId){
        if(err){
            return callback(err);
        }

        getCompanyId(rkood, sessId, cookies, function(err, companyId){
            if(err){
                return callback(err);
            }
            getPage(rkood, sessId, companyId, cookies, function(err, page){
                if(err){
                    return callback(err);
                }

                page = page.replace(/\r?\n/g, "\u0000").
                    replace(/.*?['"]registrikaart['"]/, "<div id=\"registrikaart\"").
                    replace(/Väljatrüki lõpp.*?$/i, "Väljatrüki lõpp</div></div>").
                    replace(/\s*style=['"][^'"]+['"]/gi, "").
                    replace(/<br\b[^>]*>/gi, " ").
                    replace(/[ \t]+/g, " ").
                    replace(/\s*\u0000\s*/g, "\u0000").
                    replace(/\u0000+/g, "\u0000").
                    replace(/\u0000/g, "\n").trim();

                callback(null, page);
            });
        });
    });
}

function getPage(rkood, sessId, companyId, cookies, callback){
    var i = 5;
    function loadPage(){
        if(i--<=0){
            return callback(new Error("Could not open data page"));
        }

        var rnd = Math.random();

        captcha("https://ariregister.rik.ee/ettevotja.py/img_chk?sess="+sessId+"&ev_id="+companyId+"&rnd="+makeRandomNr(5), cookies, function(err, code){
            if(err || !code){
                process.nextTick(loadPage);
            }
            
            fetchPage(rkood, sessId, companyId, code, cookies, function(err, page){
                if(err || !page.match(/"registrikaart"/)){
                    process.nextTick(loadPage);
                }
                return callback(null, page);
            });
        });

    }
    loadPage();
}

function fetchPage(rkood, sessId, companyId, code, cookies, callback){
    var curHeaders = JSON.parse(JSON.stringify(config.headers)),
        payload = {
            chk: code,
            id: companyId,
            item_id: "",
            lang: "est",
            nimi: "",
            rkood: rkood,
            search: "1",
            sess: sessId,
            show: "11",
            show_lang:"est",
            source: "lihtparing"
        };

    curHeaders['Content-Type'] = "application/x-www-form-urlencoded";
    payload = Object.keys(payload).map(function(key){
        return encodeURIComponent(key)+"="+encodeURIComponent(payload[key]);
    }).join("&");

    fetchUrl("https://ariregister.rik.ee/ettevotja.py", {method: "POST", cookieJar: cookies, headers: curHeaders, payload: payload}, function(err, meta, body){
        if(err){
            return callback(err);
        }
        if(meta.status != 200){
            return callback(new Error("Invalid HTTP response status "+meta.status));
        }

        body = (body || "").toString();

        return callback(null, body);
    });
}

function getSession(cookies, callback){
    //return callback(null, "3582256138438478464616845736346123339134703479567958438243002412");
    fetchUrl("https://ariregister.rik.ee/", {cookieJar: cookies, headers: config.headers}, function(err, meta, body){
        if(err){
            return callback(err);
        }
        if(meta.status != 200){
            return callback(new Error("Invalid HTTP response status "+meta.status));
        }

        body = (body || "").toString();

        var inputList = [].concat(body.match(/<input[^>]*>/gi) || []),
            value = "";

        for(var i=0, len=inputList.length; i<len; i++){
            if(inputList[i].match(/\bname\s*=\s*"sess"/)){
                value = inputList[i].match(/\bvalue\s*=\s*"([^"]+)"/);
                return callback(null, value && value[1] || false);
            }
        }

        return callback(new Error("Could not generate new session"));
    });
}

function getCompanyId(rkood, sessId, cookies, callback){
    var curHeaders = JSON.parse(JSON.stringify(config.headers)),
        payload = {
            lang: "est",
            nimi: "",
            rkood: rkood,
            search: "1",
            sess: sessId
        };

    curHeaders['Content-Type'] = "application/x-www-form-urlencoded";
    payload = Object.keys(payload).map(function(key){
        return encodeURIComponent(key)+"="+encodeURIComponent(payload[key]);
    }).join("&");

    fetchUrl("https://ariregister.rik.ee/lihtparing.py", {method: "POST", cookieJar: cookies, headers: curHeaders, payload: payload}, function(err, meta, body){
        if(err){
            return callback(err);
        }
        if(meta.status != 200){
            return callback(new Error("Invalid HTTP response status "+meta.status));
        }

        body = (body || "").toString();

        var inputList = [].concat(body.match(/navigate2([^)]*)/gi) || []),
            value = "";

        for(var i=0, len=inputList.length; i<len; i++){
            if((value = inputList[i].match(/\b(\d{5,})\b/))){
                return callback(null, value && value[1] || false);
            }
        }
        return callback(new Error("Could not detect company Id"));
    });
}

function makeRandomNr(len){
    var text = "",
        charlist = "0123456789";

    for(var i=0; i<len; i++)
        text += charlist.charAt(Math.floor(Math.random() * charlist.length));

    return text;
}