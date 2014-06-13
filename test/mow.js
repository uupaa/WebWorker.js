// mow.js // Message over WorkerThread

importScripts("../lib/WorkerResponder.js");

var worker = new WorkerResponder(defaultCallback);

worker.on("inbox", handleInBoxCommand); // command = "inbox" に反応するコールバックを登録します

function handleInBoxCommand(event, that) {
    var result = event.data.message.join("!"); // "hello!worker"

    that.response({ "result": result }); // event.data.result = "hello!worker"
}

function defaultCallback(event, that) { // 宛先が不明な command はこのコールバックに渡されます
    that.response({ "result": "unknown command" });
}

