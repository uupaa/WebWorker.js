importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(function(body, param) {

    var now = Date.now();

    setTimeout(function() {
        var time = Date.now() - now;

        worker.response({ elapsed: time });
    }, 1000);
});

