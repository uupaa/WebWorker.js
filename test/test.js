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
        testWebWorker,
        testWebWorkerError,
        testWebWorkerInline,
        testWebWorkerCloseAfterCanNotReuse,
        testWebWorkerHookCallback,
    ]);
}

return test.run().clone();


function testWebWorker(test, pass, miss) {

    var task = new Task(4, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var baseDir = WebWorker.baseDir();
    var script = [
                baseDir + "../node_modules/uupaa.valid.js/lib/Valid.js",
                baseDir + "../node_modules/uupaa.task.js/lib/Task.js"
            ];

    var worker1 = new WebWorker({ script: script, source: "./worker.js", verbose: true }, function(err, event) {
            if (err) {
                ;
            } else {
                if (event.data.REQUEST_ID === 1) {
                    if (event.data.result === "helloworker") {
                        task.pass();
                        return;
                    }
                } else if (event.data.REQUEST_ID === 2) {
                    if (event.data.result === "foobar") {
                        task.pass();
                        return;
                    }
                }
            }
            task.miss();
        });

    var worker2 = new WebWorker({ script: script, source: "./worker.js", count: 1000, verbose: true }, function(err, event) {
            if (err) {
                ;
            } else {
                if (event.data.REQUEST_ID === 1000) {
                    if (event.data.result === "helloworker") {
                        task.pass();
                        return;
                    }
                } else if (event.data.REQUEST_ID === 1001) {
                    if (event.data.result === "foobar") {
                        task.pass();
                        return;
                    }
                }
            }
            task.miss();
        });


    worker1.post({ param: ["hello", "worker"] }); // workerID=1,requestID=1
    worker1.post({ param: ["foo",   "bar"]    }); // workerID=1,requestID=2
    worker2.post({ param: ["hello", "worker"] }); // workerID=2,requestID=1000
    worker2.post({ param: ["foo",   "bar"]    }); // workerID=2,requestID=1001
}


function testWebWorkerError(test, pass, miss) {

    var task = new Task(1, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var worker1 = new WebWorker({ source: "./error.js", verbose: true }, function(err, event) {
            if (err) {
                task.pass();
            } else {
                task.miss();
            }
        });


    worker1.post({}); // workerID=1,requestID=1
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

var _workerOrigin = "";

onmessage = function(event) {
    // event.data has {
    //      WORKER_ID:  Integer,
    //      REQUEST_ID: Integer,
    //      INIT:       Boolean,
    //      ORIGIN:     String,
    //      SCRIPT:     ScriptURLStringArray
    // }

    var request = event.data;
    var workerID = request["WORKER_ID"];
    var requestID = request["REQUEST_ID"];

    if (request["INIT"]) {
        _workerOrigin = request["ORIGIN"] || "";
        importScripts.apply(self, request["SCRIPT"]);
    }

    _do(request);

    function _do(request) {
        self.postMessage({
            "WORKER_ID":    workerID,
            "REQUEST_ID":   requestID,
            "keys":         "result",
            "result":       "OK"
        });
    }
};

*/});

    var worker1 = new WebWorker({ inline: true, source: inlineWorkerSource, verbose: true }, function(err, event) {
            if (!err) {
                if (event.data.result === "OK") {
                    task.pass();
                    return;
                }
            }
            task.miss();
        });

    worker1.post({}); // workerID=1,requestID=1
}
function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}


function testWebWorkerCloseAfterCanNotReuse(test, pass, miss) {

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

                worker1.close();
                try {
                    worker1.post({ param: ["hello", "worker"] }); // workerID=1,requestID=2
                    task.miss();
                } catch (o_o) {
                    task.pass();
                }

            } else {
                task.miss();
            }
        });

    worker1.post({ param: ["hello", "worker"] }); // workerID=1,requestID=1

}

function testWebWorkerHookCallback(test, pass, miss) {

    var task = new Task(3, function(err) {
            if (!err) {
                test.done(pass());
            } else {
                test.done(miss());
            }
        });

    var baseDir = WebWorker.baseDir();
    var script = [
                baseDir + "../node_modules/uupaa.valid.js/lib/Valid.js",
                baseDir + "../node_modules/uupaa.task.js/lib/Task.js"
            ];

    var worker1 = new WebWorker({ script: script, source: "./worker.js", verbose: true });
    var worker2 = new WebWorker({ script: script, source: "./worker.js", count: 1000, verbose: true });

    // workerID=1,requestID=1
    worker1.post({ param: ["hello", "worker"], sleep: 1000 }, null, function(err, event) {
            if (err) {
                ;
            } else {
                if (event.data.REQUEST_ID === 1) {
                    if (event.data.result === "helloworker") {
                        task.pass();
                        return;
                    }
                }
            }
            task.miss();
    });
    // workerID=1,requestID=2
    worker1.post({ param: ["foo", "bar"], sleep: 1000 }, null, function(err, event) {
            if (err) {
                ;
            } else {
                if (event.data.REQUEST_ID === 2) {
                    if (event.data.result === "foobar") {
                        task.pass();
                        return;
                    }
                }
            }
            task.miss();
    });


    // workerID=2,requestID=1000
    worker2.post({ param: ["hello", "worker"], sleep: 1000 }, null, function(err, event) {
            if (err) {
                ;
            } else {
                if (event.data.REQUEST_ID === 1000) {
                    if (event.data.result === "helloworker") {
                        task.pass();
                        return;
                    }
                }
            }
            task.miss();
    });
}

})((this || 0).self || global);

