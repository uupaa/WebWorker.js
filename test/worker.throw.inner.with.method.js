importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread();

worker.on("inbox", function(body, param) {
    throw new Error("worker.throw.inner.with.method.js");
});

