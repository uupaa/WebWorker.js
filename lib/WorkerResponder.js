(function(global) {
"use strict";

function WorkerResponder(defaultCallback) { // @arg Function - defaultCallback:Function(event:Event, response:Function)
    this._defaultCallback = defaultCallback || null;
    this._handleWorkerEvent = _handleWorkerEvent.bind(this);
    this._routing = {}; // { command: callback }

    global.addEventListener("message", this._handleWorkerEvent);
}
WorkerResponder["prototype"]["on"]       = WorkerResponder_on;       // WorkerResponder#on(command:String, callback:Function):this
WorkerResponder["prototype"]["off"]      = WorkerResponder_off;      // WorkerResponder#off(command:String, callback:Function):this
WorkerResponder["prototype"]["response"] = WorkerResponder_response; // WorkerResponder#response(data:Object, transferableObjects:Array = null):this

// --- implement -------------------------------------------
function WorkerResponder_on(command,    // @arg CommandString
                            callback) { // @arg Function - callback(event:Event, that:WorkerResponder):void
                                        // @ret this
    this._routing[command] = callback;
    return this;
}

function WorkerResponder_off(command,    // @arg CommandString
                             callback) { // @arg Function - callback(event:Event, that:WorkerResponder):void
                                         // @ret this
    delete this._routing[command];
    return this;
}

function _handleWorkerEvent(event) {
    if (event.type === "message") {
        var that = this;
        var requestHeader = event["data"]["__REQUEST__"];

        if (requestHeader["INIT"]) {
            that._origin    = requestHeader["ORIGIN"];
            that._script    = requestHeader["SCRIPT"];
            that._workerID  = requestHeader["WORKER_ID"];
            that._baseDir   = requestHeader["BASE_DIR"];
            importScripts.apply(global, that._script);
        }
        that._requestID = requestHeader["REQUEST_ID"];

        // hide event.data.__REQUEST__
        Object.defineProperty(event.data, "__REQUEST__", {
            configurable: true,
            enumerable: false,
            writable: false
        });

        var command = event["data"]["command"] || "";

        if (command && command in that._routing) {
            that._routing[command](event, that);
        } else if (that._defaultCallback) {
            that._defaultCallback(event, that);
        }
    }
}

function WorkerResponder_response(data,                  // @arg Object - response data
                                  transferableObjects) { // @arg Array = null - Transferable Objects.
                                                         // @ret this
    data["__RESPONSE__"] = {
        "WORKER_ID":    this._workerID,
        "REQUEST_ID":   this._requestID
    };

    if (transferableObjects) {
        global["postMessage"](data, transferableObjects);
    } else {
        global["postMessage"](data);
    }
    return this;
}

// --- export ----------------------------------------------
global["WorkerResponder"] = WorkerResponder;

})(self);

