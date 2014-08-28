importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread();

worker.on("inbox", function(body,    // @arg Any
                            param) { // @arg Object - { event, method, ticket, reply }
    worker.response(body + " Worker!", param); // 第二引数に param をそのまま渡します
});
