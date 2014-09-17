# WebWorker.js [![Build Status](https://travis-ci.org/uupaa/WebWorker.js.png)](http://travis-ci.org/uupaa/WebWorker.js)

[![npm](https://nodei.co/npm/uupaa.webworker.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.webworker.js/)

WebWorkers wrapper.

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

new WebWorker("./worker.js", function(err, body, param) {
    console.log(body);
}).request();

</script>
```

### WebWorkers

```js
importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(function(body, param) {
    worker.response();
});
```
