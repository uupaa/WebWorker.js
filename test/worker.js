var _workerOrigin = "";

onmessage = function(event) {
    // event.data has {
    //      WORKER_ID:  Integer,
    //      REQUEST_ID: Integer,
    //      INIT:       Boolean,
    //      ORIGIN:     String,
    //      SCRIPT:     ScriptURLStringArray
    // }

    var request = event.data;
    var workerID = request["WORKER_ID"];
    var requestID = request["REQUEST_ID"];

    if (request["INIT"]) {
        _workerOrigin = request["ORIGIN"] || "";
        importScripts.apply(self, request["SCRIPT"]);
    }

    _do(request);

    function _do(request) {
        var result = request.param[0]
                   + request.param[1];

        self.postMessage({
            "WORKER_ID":    workerID,
            "REQUEST_ID":   requestID,
            "keys":         "result",
            "result":       result
        });
    }
};

