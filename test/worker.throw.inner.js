// worker.throw.inner.js

importScripts("../lib/WorkerResponder.js");

var worker = new WorkerResponder(defaultCallback);

worker.on("inbox", handleInBoxCommand); // command = "inbox" に反応するコールバックを登録します

function handleInBoxCommand(event, body) {
    var result = body.message.join("!"); // "hello!worker"

that.unknown(); // throw syntax error

    worker.response({ "result": result }); // event.data.result = "hello!worker"
}

function defaultCallback(event, body) { // 宛先が不明な command はこのコールバックに渡されます
    worker.response({ "result": "unknown command" });
}

