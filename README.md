# Get information about Estonian companies

## Install

    npm install ariregister

## Requirements

  * **tesseract** 3.0 ([instructions here](http://code.google.com/p/tesseract-ocr/))
  * **imagemagick**

## Usage

Use the following command to load company data

    ariregister(regCode, callback);

Where

  * **regCode** is the registration code of an Estonian company
  * **callback** *(error, html)* is the callback function to run once the data has been resolved

The `html` returned by the resolver includes company B-card in the HTML format

Example:

    var ariregister = require("ariregister");
    ariregister("123456", function(err, html){
        console.log(err || html);
    });

## Issues

Currently only company captchas (the small ones) are resolved but not the system wide "big" captchas that are tied to the user session. When such issues occur ("Could not generate new session" error), then you can generate a valid session by yourself in the browser and copy the session value to index.js:102

**NB!** If you are using this module, you are not complying with Äriregister terms of service, so I must declare that this module must not be used by anyone and it is created for testing purposes only.

## License

**MIT** - copy and modify as you will