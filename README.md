=========
WebWorker.js
=========

![](https://travis-ci.org/uupaa/WebWorker.js.png)

WebWorker wrapper.

# Document

- [WebModule](https://github.com/uupaa/WebModule) ([Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html))
- [Development](https://github.com/uupaa/WebModule/wiki/Development)
- [WebWorker.js wiki](https://github.com/uupaa/WebWorker.js/wiki/WebWorker)


# How to use

```js
<script src="lib/WebWorker.js">
<script>


var worker = new WebWorker({ source: "./worker.js" }, function(err, event) {
                    console.log(event.data.result);
                }).post({});
</script>
```
