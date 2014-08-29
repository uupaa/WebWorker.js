var ModuleTestWebWorker = (function(global) {

var _BLOB = global["Blob"]|| global["webkitBlob"] || null;
var _URL  = global["URL"] || global["webkitURL"] || null;

var _inNode    = "process"        in global;
var _inWorker  = "WorkerLocation" in global;
var _inBrowser = "document"       in global;

var spec = new Spec();
var test = new Test("WebWorker", {
        disable:    false,
        browser:    true,
        worker:     false,
        node:       true,
        button:     true,
        both:       true,
    });

if (!global["Worker"]) {
    alert("WebWorkers not impl.");
}
if (!_BLOB) {
    alert("Blob not impl.");
}
if (!_URL) {
    alert("Blob URL not impl.");
}

test.add([
    testWebWorkerSetOrigin,
    testWebWorkerImportScripts,
    testWebWorkerManyWorkers,

    testWebWorkerCanReuse,

    testWebWorkerWithMethod,
    testWebWorkerOneThreadCallThreeTimes,
    testWebWorkerCancel,

    testMessageOverWorkerThread,

    testWebWorkerThrowOuter,
    testWebWorkerThrowInner,
    testWebWorkerThrowInnerWithMethod,

]);

if (!spec.isMobileDevice()) {
    test.add([
        testWebWorkerInlineWorker,
        testWebWorkerInlineWorkerWithOriginAndImportScripts,
    ]);
}

if (spec.BROWSER_NAME === "Chrome") {
    test.add([
        testWebWorkerThrowOuterWithTryCatch,
    ]);
}

test.add([
    testWebWorkerDownloadBlobResource,
]);



return test.run().clone();


function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}


function testWebWorkerSetOrigin(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    //var origin = location.href.split("/").slice(0, -1).join("/") + "/";
    var origin = "http://example.com/";

    var worker = new WebWorker("./worker.origin.js", function(err, body, param) {
            if (err) {
                ;
            } else {
                if (body["self.origin"] === origin) {

                    task.pass();
                    return;
                }
            }
            task.miss();
        }, { origin: origin, verbose: true });

    worker.request();
}

function testWebWorkerImportScripts(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var scripts = [
                "../node_modules/uupaa.valid.js/lib/Valid.js",
                "../node_modules/uupaa.task.js/lib/Task.js"
            ];

    var worker = new WebWorker("./worker.import.js", function(err, body, param) {
            if (err) {
                ;
            } else {
                if (body.result === "OK") {

                    task.pass();
                    return;
                }
            }
            task.miss();
        }, { "import": scripts, verbose: true });

    worker.request();
}

function testWebWorkerManyWorkers(test, pass, miss) {

    var threads = 16;

    var task = new Task(threads, function(err) {
            if (!err) {
                if (spec.isMobileDevice() ){
                    alert( threads );
                }
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var scripts = [
                "../node_modules/uupaa.valid.js/lib/Valid.js",
                "../node_modules/uupaa.task.js/lib/Task.js"
            ];

    var delay = 1000;

    function callback(err, body, param) {
        console.log(param.ticket, body.elapsed - delay)
        if (!err) {
            if (body.elapsed - delay <= 100) { // margin 0-100ms
                console.log(param.ticket, "OK");

                task.pass();
                return;
            }
        }
        console.log(param.ticket, "NG");
        task.miss();
    }
    var options = { "import": scripts, verbose: true };

    for (var i = 0; i < threads; ++i) {
        new WebWorker("./worker.many.js", callback, options).request({ delay: delay });
    }
}

function testWebWorkerThrowOuter(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
            if (console.groupEnd) {
                console.groupEnd();
            }
        });

    var worker = new WebWorker("./worker.throw.outer.js",
                               function(err, body, param) {
            if (err && /worker.throw.outer.js/.test(err.message)) {
                task.pass();
            } else {
                task.miss();
            }
        }, { verbose: true });

    worker.request();
}

function testWebWorkerThrowOuterWithTryCatch(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
            if (console.groupEnd) {
                console.groupEnd();
            }
        });

    var worker = new WebWorker("./worker.throw.outer.with.try.catch.js",
                               function(err, body, param) {
/*
            if (spec.BROWSER_NAME === "Safari") {
                // MobileSafari は WorkerGlobalScope で例外が発生すると、
                // try 〜 catch を無視して ErrorEvent が発生する
                task.pass();
            } else {
                task.miss();
            }
 */
            task.miss();
        }, { verbose: true });

    worker.request();

    setTimeout(function() {
        task.pass();
    }, 1000);
}

function testWebWorkerThrowInner(test, pass, miss) {
    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
            if (console.groupEnd) {
                console.groupEnd();
            }
        });

    var worker = new WebWorker("./worker.throw.inner.js",
                               function(err, body, param) {
            if (err && /worker.throw.inner.js/.test(err.message)) {
                task.pass();
            } else {
                task.miss();
            }
        }, {  verbose: true });

    worker.request();
}

function testWebWorkerThrowInnerWithMethod(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
            if (console.groupEnd) {
                console.groupEnd();
            }
        });

    var worker = new WebWorker("./worker.throw.inner.with.method.js",
                               function(err, body, param) {
            if (err && /worker.throw.inner.with.method.js/.test(err.message)) {
                task.pass();
            } else {
                task.miss();
            }
        }, {  verbose: true });

    worker.request(null, { method: "inbox" });
}



function testWebWorkerInlineWorker(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

var inlineWorkerSource = _multiline(function() {/*

onmessage = function(event) {
    //debugger;
    // event.data = { init, origin, import, ticket, method, cancel, body }
    event.data.result = "OK";
    self.postMessage(event.data);
};

*/});

    var worker = new WebWorker(inlineWorkerSource,
                               function(err, body, param) {
            if (!err) {
                if (event.data.result === "OK") {
                    task.pass();
                    return;
                }
            }
            task.miss();
        }, { inline: true, verbose: true });

    worker.request();
}

function testWebWorkerInlineWorkerWithOriginAndImportScripts(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

var origin = "http://localhost:8585/";

var inlineWorkerSource = _multiline(function() {/*

//debugger;
importScripts("__ORIGIN__lib/WorkerThread.js");

var worker = new WorkerThread(function(event, method, body) {
        //debugger;
        worker.response({ origin: self.origin });
    });

*/}).replace("__ORIGIN__", origin);

    var scripts = [
            "__ORIGIN__node_modules/uupaa.valid.js/lib/Valid.js".replace("__ORIGIN__", origin),
            "__ORIGIN__node_modules/uupaa.task.js/lib/Task.js".replace("__ORIGIN__", origin),
        ];

    var worker = new WebWorker(inlineWorkerSource,
                               function(err, body, param) {
            if (!err) {
                if (body.origin === origin) {
                    task.pass();
                    return;
                }
            }
            task.miss();
        }, { origin: origin, inline: true, verbose: true, "import": scripts });

    worker.request();
}







function testWebWorkerCanReuse(test, pass, miss) {

    var task = new Task(2, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var worker = new WebWorker("./worker.can.reuse.js",
                               function(err, body, param) {
            if (err) {
                task.miss();
                return;
            }
            switch (body.count) {
            case 1:
                task.pass();
                worker.close();
                worker.request({ count: 2 }); // reuse
                break;
            case 2:
                task.pass();
                worker.close();
            }
        }, { verbose: true });

    worker.request({ count: 1 });
}



function testWebWorkerWithMethod(test, pass, miss) {

    var task = new Task(3, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });


    function callback(err, body, param) {
        switch (param.method) {
        case "methodA": task.pass(); break;
        case "methodB": task.pass(); break;
        case "methodC": task.pass(); break;
        default: task.miss();
        }
    }

    var worker1 = new WebWorker("./worker.with.method.js", callback, { verbose: true });
    var worker2 = new WebWorker("./worker.with.method.js", callback, { verbose: true });

    worker1.on("methodA", callback);
    worker1.on("methodB", callback);
    worker2.on("methodC", callback);
    worker1.request(null, { method: "method1" });
    worker1.request(null, { method: "method2" });
    worker2.request(null, { method: "method3" });
}

function testWebWorkerOneThreadCallThreeTimes(test, pass, miss) {

    var task = new Task(3, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });


    function callback(err, body, param) {
        switch (param.method) {
        case "methodA":
            if (body === 1) {
                task.pass();
            } else {
                task.miss();
            }
            break;
        case "methodB":
            if (body === 3) {
                task.pass();
            } else {
                task.miss();
            }
            break;
        case "methodC":
            if (body === 7) {
                task.pass();
            } else {
                task.miss();
            }
            break;
        default:
            task.miss();
        }
    }

    var worker = new WebWorker("./worker.call.three.times.js", callback, { verbose: true });

    worker.on("methodA", callback);
    worker.on("methodB", callback);
    worker.on("methodC", callback);
    worker.request(1, { method: "method1" });
    worker.request(2, { method: "method2" });
    worker.request(4, { method: "method3" });
}


function testWebWorkerCancel(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });


    function callback(err, body, param) {
        if (err) {
            task.miss();
        } else {
            console.log(body);
            //alert(body);
            task.pass();
        }
    }

    var worker = new WebWorker("./worker.cancel.js", callback, { verbose: true });

    var ticket = worker.request(0, { method: "loopStart" });

    setTimeout(function() {
        worker.cancel(ticket);
    }, 1000);
}


function testMessageOverWorkerThread(test, pass, miss) {

    function Yo() {
    }
    Yo.prototype.inbox = function(task, body, id) {
        task.set("Yo", body + " Yo!").pass();
    };

    var worker = new WebWorker("message.over.worker.js", null, { verbose: true });
    var msg = new Message({ Yo: new Yo(), Worker: worker });

    msg.post("Hello", function(err, buffer) {
        if (buffer.Yo     === "Hello Yo!" &&
            buffer.Worker === "Hello Worker!") {

            test.done(pass());
        } else {
            test.done(miss());
        }
    });
}


function testWebWorkerDownloadBlobResource(test, pass, miss) {

    var scripts = [
            "../node_modules/uupaa.wmurl.js/lib/WMURL.js",
            "../node_modules/uupaa.xhrproxy.js/node_modules/uupaa.eventlistener.js/lib/EventListener.js",
            "../node_modules/uupaa.xhrproxy.js/node_modules/uupaa.datatype.js/lib/DataType.js",
            "../node_modules/uupaa.xhrproxy.js/lib/XHRProxy.js",
            "../node_modules/uupaa.task.js/lib/Task.js",
        ];
    var resources = [
            // http://www.ito51.net/list/index.html (c) 伊藤製作所
            "./img/1.png",
            "./img/2.png",
            "./img/3.png",
            "./img/4.png",
            "./img/5.png",
            "./img/6.png",
            "./img/7.png",
            "./img/8.png",
        ];

    document.body.innerHTML += '<a href="chrome://blob-internals/">Blob URLs</a><br />';
    document.body.innerHTML += '<a href="http://www.ito51.net/list/index.html">戦うTシャツ屋 伊藤製作所</a><br />';

    var worker = new WebWorker("./worker.download.blob.resource.js",
                               function(err, body, param) {
//debugger;
        var obj = body; // { url: blobURL }


        for (var url in obj) {
            var blobURL = obj[url];
            var img = document.createElement("img");

            img.src = blobURL;

            document.body.appendChild(img);
        }
        // chrome://blob-internals/

        //_URL["revokeObjectURL"](blobURL);

        if (err) {
            test.done(miss());
        } else {
            test.done(pass());
        }
    }, { verbose: true, "import": scripts });

    worker.request(resources);
}

})((this || 0).self || global);

