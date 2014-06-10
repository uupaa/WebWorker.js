importScripts("../lib/WorkerResponder.js");

new WorkerResponder(function(event, that) {
    var result = event.data.param[0] + event.data.param[1];

    that.response({ "result": result });
});

/* or
onmessage = function(event) {
    event.data.result = "OK";
    self.postMessage(event.data);
};
 */

