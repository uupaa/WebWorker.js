(function(global) {
"use strict";

function WorkerResponder(callback) { // @arg Function - callback(event:Event, response:Function)
    this._callback = callback;
    this._handleWorkerEvent = _handleWorkerEvent.bind(this);

    global.addEventListener("message", this._handleWorkerEvent);
}
WorkerResponder["prototype"]["response"] = WorkerResponder_response; // WorkerResponder#response(data:Object, transferableObjects:Array = null):void

// --- implement -------------------------------------------
function _handleWorkerEvent(event) {
    if (event.type === "message") {
        var that = this;
        var data = event["data"]["__REQUEST__"];

        if (data["INIT"]) {
            that._origin    = data["ORIGIN"];
            that._script    = data["SCRIPT"];
            that._workerID  = data["WORKER_ID"];
            that._baseDir   = data["BASE_DIR"];
            importScripts.apply(global, that._script);
        }
        that._requestID = data["REQUEST_ID"];

        Object.defineProperty(event.data, "__REQUEST__", {
            configurable: true,
            enumerable: false,
            writable: false
        });

        that._callback(event, that);
    }
}

function WorkerResponder_response(data,                  // @arg Object
                                  transferableObjects) { // @arg Array = null - Transferable Objects.
    data["__RESPONSE__"] = {
        "WORKER_ID":    this._workerID,
        "REQUEST_ID":   this._requestID
    };

    if (transferableObjects) {
        global["postMessage"](data, transferableObjects);
    } else {
        global["postMessage"](data);
    }
}

// --- export ----------------------------------------------
global["WorkerResponder"] = WorkerResponder;

})(self);

