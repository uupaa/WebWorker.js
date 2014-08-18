var ModuleTestWebWorker = (function(global) {

var _inNode    = "process"        in global;
var _inWorker  = "WorkerLocation" in global;
var _inBrowser = "document"       in global;

var test = new Test("WebWorker", {
        disable:    false,
        browser:    true,
        worker:     false,
        node:       true,
        button:     true,
        both:       true,
    });

if (_inBrowser) {
    test.add([
        testWebWorker1,
        testWebWorker2,
        testWebWorkerThrowInner,
        testWebWorkerThrowOuter,
        testWebWorkerInline,
        testWebWorkerCloseAfterCanReuse,
        testWebWorkerHookCallback,
        testWebWorkerCommand,
        testMessageOverWorkerThread,
    ]);
}

return test.run().clone();


function testWebWorker1(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var origin = location.href.split("/").slice(0, -1).join("/") + "/";

    var worker1 = new WebWorker({ origin: origin,
                                  source: "./worker.js",
                                  verbose: true }, function(err, event, body) {
            if (err) {
                ;
            } else {
                if (body.result === "helloworker") {

                    task.pass();
                    return;
                }
            }
            task.miss();
        });

    worker1.request({ param: ["hello", "worker"] }); // workerID=1,requestID=1
}

function testWebWorker2(test, pass, miss) {

    var task = new Task(4, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var script = [
                "../node_modules/uupaa.valid.js/lib/Valid.js",
                "../node_modules/uupaa.task.js/lib/Task.js"
            ];

    var worker1 = new WebWorker({ script: script, source: "./worker.js", verbose: true }, function(err, event, body) {
            if (err) {
                ;
            } else {
                if (body.result === "helloworker" ||
                    body.result === "foobar") {

                    task.pass();
                    return;
                }
            }
            task.miss();
        });

    var worker2 = new WebWorker({ script: script, source: "./worker.js", count: 1000, verbose: true }, function(err, event, body) {
            if (err) {
                ;
            } else {
                if (body.result === "helloworker" ||
                    body.result === "foobar") {

                    task.pass();
                    return;
                }
            }
            task.miss();
        });


    worker1.request({ param: ["hello", "worker"] }); // workerID=1,requestID=1
    worker1.request({ param: ["foo",   "bar"]    }); // workerID=1,requestID=2
    worker2.request({ param: ["hello", "worker"] }); // workerID=2,requestID=1000
    worker2.request({ param: ["foo",   "bar"]    }); // workerID=2,requestID=1001
}


function testWebWorkerThrowInner(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var worker1 = new WebWorker({ source: "./worker.throw.inner.js", verbose: true }, function(err, event) {
            if (err) {
                task.pass();
            } else {
                task.miss();
            }
        });


    worker1.request({}, null, null, "inbox");
}

function testWebWorkerThrowOuter(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var worker1 = new WebWorker({ source: "./worker.throw.outer.js", verbose: true }, function(err, event) {
            if (err) {
                task.pass();
            } else {
                task.miss();
            }
        });


    worker1.request({}); // workerID=1,requestID=1
}


function testWebWorkerInline(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

var inlineWorkerSource = _multiline(function() {/*

onmessage = function(event) {
    event.data.result = "OK";
    self.postMessage(event.data);
};

*/});

    var worker1 = new WebWorker({ inline: true,
                                  source: inlineWorkerSource,
                                  verbose: true },
                                function(err, event, body) {
            if (!err) {
              //if (body.result === "OK")
                if (event.data.result === "OK") {
                    task.pass();
                    return;
                }
            }
            task.miss();
        });

    worker1.request({}); // workerID=1,requestID=1
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}


function testWebWorkerCloseAfterCanReuse(test, pass, miss) {

    var task = new Task(2, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var worker1 = new WebWorker({ source: "./worker.js", verbose: true }, function(err, event) {
            if (!err) {
                task.pass();

                worker1.close(); // -> closed

                try {
                    // reuse
                    worker1.request({ param: ["hello", "worker"] }); // workerID=1,requestID=2
                    task.pass();
                    worker1.close();
                } catch (o_o) {
                    task.miss();
                }

            } else {
                task.miss();
            }
        });

    worker1.request({ param: ["hello", "worker"] }); // workerID=1,requestID=1

}

function testWebWorkerHookCallback(test, pass, miss) {

    var task = new Task(3, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var script = [
                "../node_modules/uupaa.valid.js/lib/Valid.js",
                "../node_modules/uupaa.task.js/lib/Task.js"
            ];

    var worker1 = new WebWorker({ script: script, source: "./worker.js", verbose: true });
    var worker2 = new WebWorker({ script: script, source: "./worker.js", count: 1000, verbose: true });

    // workerID=1,requestID=1
    worker1.request({ param: ["hello", "worker"], sleep: 1000 }, null, function(err, event, body) {
            if (err) {
                ;
            } else {
                if (body.result === "helloworker") {
                    task.pass();
                    return;
                }
            }
            task.miss();
    });
    // workerID=1,requestID=2
    worker1.request({ param: ["foo", "bar"], sleep: 1000 }, null, function(err, event, body) {
            if (err) {
                ;
            } else {
                if (body.result === "foobar") {
                    task.pass();
                    return;
                }
            }
            task.miss();
    });


    // workerID=2,requestID=1000
    worker2.request({ param: ["hello", "worker"], sleep: 1000 }, null, function(err, event, body) {
            if (err) {
                ;
            } else {
                if (body.result === "helloworker") {
                    task.pass();
                    return;
                }
            }
            task.miss();
    });
}





function testWebWorkerCommand(test, pass, miss) {

    var worker = new WebWorker({ source: "./worker.command.routing.js", verbose: true });
    var data = { message: ["hello", "worker"] };

    worker.request(data, null, function(err, event, body) {
        if (err || body.result !== "hello!worker") {
            test.done(miss());
        } else {
            test.done(pass());
        }
    }, "concat");
}
/*
// worker.command.routing.js

importScripts("../lib/WorkerResponder.js");

var worker = new WorkerResponder(defaultCallback);

worker.on("concat", handleConcatCommand); // command = "concat" に反応するコールバックを登録します

function handleConcatCommand(event, body) {
    var result = body.message.join("!"); // "hello!worker"

    worker.response({ "result": result }); // body.result = "hello!worker"
}

function defaultCallback(event, body) { // 宛先が不明な command はこのコールバックに渡されます
    worker.response({ "result": "unknown command" });
}

 */




function testMessageOverWorkerThread(test, pass, miss) {

    var worker = new WebWorker({ source: "message.over.worker.js", verbose: true });
    var msg = new Message({ worker: worker });

    msg.post({ message: ["hello", "worker"] }, function(err, buffer) {
        if (buffer.worker === "hello!worker") {
            test.done(pass());
        } else {
            test.done(miss());
        }
    });
}


})((this || 0).self || global);

