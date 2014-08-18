# WebWorker.js [![Build Status](https://travis-ci.org/uupaa/WebWorker.js.png)](http://travis-ci.org/uupaa/WebWorker.js)

[![npm](https://nodei.co/npm/uupaa.webworker.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.webworker.js/)

WebWorker wrapper.

## Document

- [WebWorker.js wiki](https://github.com/uupaa/WebWorker.js/wiki/WebWorker)
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)

## How to use

### Browser

```js
<script src="lib/WebWorker.js"></script>
<script>

new WebWorker({ source: "./worker.js" }, function(err, event) {
    console.log(event.data.result);
}).request({});

</script>
```

### WebWorkers

```js
importScripts("lib/WorkerResponder.js");

var worker = new WorkerResponder(function(event, body) {
    var result = body.param[0] + body.param[1];

    worker.response({ "result": result });
});
```
