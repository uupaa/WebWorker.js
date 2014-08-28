importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(function(body, param) {

    new Task(1, function(err) {

        worker.response({ "result": "OK" });

    }).pass();
});

