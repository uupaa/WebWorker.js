importScripts("../lib/WorkerThread.js");

var worker = new WorkerThread(callback);

worker.on("inbox", callback);
worker.on("cancel", callback);
worker.on("your-method-1", callback);
worker.on("your-method-2", callback);

function callback(body,    // @arg Any
                  param) { // @arg Object - { event, method, ticket }

    var result = body[0] + body[1];
//  var responseBody = { "result": result };
//  var responseOptions = { transfer, ticket, method, error };
//  worker.response();

    worker.response(result);

}


/*
function testWebWorkerCancel(test, pass, miss) {

    function callback(err, body, param) {
        if (err) {
            task.miss();
        } else {
            console.log(body);
            //alert(body);
            task.pass();
        }
    }

    var worker = new WebWorker("./worker.js", callback, { verbose: true });

    var ticket = worker.request(0, { method: "your-method-1" });

    setTimeout(function() {
        worker.cancel(ticket);
    }, 1000);
}
 */
