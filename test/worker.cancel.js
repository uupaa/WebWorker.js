importScripts("../lib/WorkerThread.js");
importScripts("../node_modules/uupaa.task.js/lib/Task.js");

var worker = new WorkerThread();
var _counter = 0;
var _task = new Task(1, function(err) {
            worker.response(_counter);
        });
var _timerID = 0;


worker.on("loopStart", function(body, param) {
    if (!_timerID) {
        _counter = body;

        _timerID = setInterval(function() {
            ++_counter;
        },0);
    }
});

function loopEnd(body, param) {
    if (_timerID) {
        clearInterval(_timerID);
        _timerID = 0;
        _task.pass();
    }
}

worker.on("loop-end", loopEnd);
worker.on("cancel", loopEnd);


