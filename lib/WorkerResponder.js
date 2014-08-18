(function(global) {
"use strict";

function WorkerResponder(defaultCallback) { // @arg Function - defaultCallback(event:Event, body:Object, head:Object):void
    this._defaultCallback = defaultCallback || null;
    this._handleWorkerEvent = _handleWorkerEvent.bind(this);
    this._routing = {}; // { command: callback }
    this._workerID = 0;
    this._requestID = 0;

    global.addEventListener("message", this._handleWorkerEvent);
}
WorkerResponder["prototype"]["on"]       = WorkerResponder_on;       // WorkerResponder#on(command:String, callback:Function):this
WorkerResponder["prototype"]["off"]      = WorkerResponder_off;      // WorkerResponder#off(command:String):this
WorkerResponder["prototype"]["error"]    = WorkerResponder_error;    // WorkerResponder#error(err:Error, callstack:String):this
WorkerResponder["prototype"]["response"] = WorkerResponder_response; // WorkerResponder#response(data:Object, transferableObjects:Array = null):this

// --- implement -------------------------------------------
function WorkerResponder_on(command,    // @arg String
                            callback) { // @arg Function - callback(event:Event, body:Object, head:Object):void
                                        // @ret this
    this._routing[command] = callback;
    return this;
}

function WorkerResponder_off(command) { // @arg String
                                        // @ret this
    delete this._routing[command];
    return this;
}

function _handleWorkerEvent(event) {
    if (event.type === "message") {
        var that = this;
        var body = event["data"]["body"];
        var head = event["data"]["head"];
        var command = head["COMMAND"] || "";

        that._requestID = head["REQUEST_ID"];

        if (head["INIT"]) {
            // [!] export WorkerGlobal.origin
            global["origin"] = head["ORIGIN"] || "";

            that._workerID = head["WORKER_ID"];
            var script = head["SCRIPT"];

            for (var i = 0, iz = script.length; i < iz; ++i) {
                try {
                    importScripts(script[i]);
                } catch (o_O) {
                    this.error(o_O, "in importScripts(" + script[i] + ")");
                }
            }
        }
        if (command && command in that._routing) {
            try {
                that._routing[command](event, body, head); // commandCallback(event, body, head)
            } catch (o_O) {
                this.error(o_O, "in " + that._routing[command]);
            }
        } else if (that._defaultCallback) {
            try {
                that._defaultCallback(event, body, head);  // defaultCallback(event, body, head)
            } catch (o_O) {
                this.error(o_O, "in defaultCallback");
            }
        }
    }
}

function WorkerResponder_error(err,         // @arg Error
                               callstack) { // @arg String
                                            // @ret this
    var response = {
        "body": null,
        "head": {
            "WORKER_ID":    this._workerID,
            "REQUEST_ID":   this._requestID,
            "ERROR_TYPE":   err.constructor.name,
            "ERROR_MESSAGE":(err.stack || err.message) + callstack
        }
    };
    global["postMessage"](response);
    return this;
}

function WorkerResponder_response(data,                  // @arg Object - response data
                                  transferableObjects) { // @arg Array = null - Transferable Objects.
                                                         // @ret this
    var response = {
        "body": data,
        "head": {
            "WORKER_ID":    this._workerID,
            "REQUEST_ID":   this._requestID
        }
    };

    if (transferableObjects) {
        global["postMessage"](response, transferableObjects);
    } else {
        global["postMessage"](response);
    }
    return this;
}

// --- export ----------------------------------------------
global["WorkerResponder"] = WorkerResponder;

})(self);

