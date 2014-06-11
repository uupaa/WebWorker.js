// Worker

importScripts("../lib/WorkerResponder.js");

var worker = new WorkerResponder(defaultCallback);

worker.on("concat", handleConcatCommand); // command = "concat" に反応するコールバックを登録します

function handleConcatCommand(event, that) {
    var result = event.data.message.join("!"); // "hello!worker"

    that.response({ "result": result }); // event.data.result = "hello!worker"
}

function defaultCallback(event, that) { // 宛先が不明な command はこのコールバックに渡されます
    that.response({ "result": "unknown command" });
}

