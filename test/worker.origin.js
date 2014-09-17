importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(function(body, param) {
    worker.response({ "self.origin": self.origin }); // "http://example.com/"
    //worker.response({ "self.origin": navigator.webkitTemporaryStorage + "" }); // "http://example.com/"
});

