new Test().add([
        testWebWorker,
    ]).run(function(err, test) {
//      if (1) {
//          err || test.worker(function(err, test) {
                if (!err && typeof WebWorker_ !== "undefined") {
                    var name = Test.swap(WebWorker, WebWorker_);

                    new Test(test).run(function(err, test) {
                        Test.undo(name);
                    });
                }
//          });
//      }
    });

function testWebWorker(next) {
    var task = new Task(4, function(err) {
            if (!err) {
                console.log("testWebWorker ok");
                next && next.pass();
            } else {
                console.error("testWebWorker ng");
                next && next.miss();
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

    var worker2 = new WebWorker({ script: script, source: "./worker.js", id: 1000, verbose: true }, function(err, event) {
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

