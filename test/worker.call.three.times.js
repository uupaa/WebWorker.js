importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(callback);
var total = 0;

function callback(body, param) {
    switch (param.method) {
    case "method1":
        total += body;
        worker.response(total, { ticket: param.ticket, method: "methodA" }); break;
    case "method2":
        total += body;
        worker.response(total, { ticket: param.ticket, method: "methodB" }); break;
    case "method3":
        total += body;
        worker.response(total, { ticket: param.ticket, method: "methodC" }); break;
    default:
        worker.response(new Error("unknown method"));
    }
}

worker.on("method1", callback);
worker.on("method2", callback);
worker.on("method3", callback);

