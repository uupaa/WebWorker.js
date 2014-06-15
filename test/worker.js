importScripts("../lib/WorkerResponder.js");

var worker = new WorkerResponder(function(event, body) {
    var result = body.param[0] + body.param[1];

    worker.response({ "result": result });
});

