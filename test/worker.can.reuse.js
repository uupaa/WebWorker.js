importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(function(body, param) {

    worker.response({ count: body.count });
});

