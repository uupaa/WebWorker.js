=========
WebWorker.js
=========

WebWorker.js description.

# Document

- https://github.com/uupaa/WebWorker.js/wiki/WebWorker
- https://github.com/uupaa/WebModule ([Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html))
- https://github.com/uupaa/Help.js ([Slide](http://uupaa.github.io/Slide/slide/Help.js/index.html))

# How to use

```js
<script src="lib/WebWorker.js">
<script>


var worker = new WebWorker({ source: "./worker.js" }, function(err, event) {
                    console.log(event.data.result);
                }).post({});
</script>
```

# for Developers

1. Install development dependency tools

    ```sh
    $ brew install closure-compiler
    $ brew install node
    $ npm install -g plato
    ```

2. Clone Repository and Install

    ```sh
    $ git clone git@github.com:uupaa/WebWorker.js.git
    $ cd WebWorker.js
    $ npm install
    ```

3. Build and Minify

    `$ npm run build`

4. Test

    `$ npm run test`

5. Lint

    `$ npm run lint`

6. Perf

    http://jsperf.com/uupaa-webworker/

