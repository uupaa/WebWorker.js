importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(function(body, param) {
//debugger;
    throw new Error("worker.throw.inner.js");
});

