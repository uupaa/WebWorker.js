// worker.command.routing.js

importScripts("../lib/WorkerResponder.js");

var worker = new WorkerResponder(defaultCallback);

worker.on("concat", handleConcatCommand); // command = "concat" に反応するコールバックを登録します

function handleConcatCommand(event, body) {
    var result = body.message.join("!"); // "hello!worker"

    worker.response({ "result": result }); // body.result = "hello!worker"
}

function defaultCallback(event, body) { // 宛先が不明な command はこのコールバックに渡されます
    worker.response({ "result": "unknown command" });
}

