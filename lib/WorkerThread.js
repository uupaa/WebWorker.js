(function(global) {
"use strict";

function WorkerThread(callback) { // @arg Function = null - callback(body:Any, param:Object):void
    this._callback = callback || null;
    this._on       = {}; // { method: callback, ... }
    this._ticket   = ""; // "{{WORKER_ID}}.{{REQUEST_ID}}"

    global.addEventListener("message", this); // this.handleEvent
}

WorkerThread["prototype"]["on"]       = WorkerThread_on;       // WorkerThread#on(method:MethodNameString, callback:Function):this
WorkerThread["prototype"]["off"]      = WorkerThread_off;      // WorkerThread#off(method:MethodNameString):this
WorkerThread["prototype"]["response"] = WorkerThread_response; // WorkerThread#response(data:Error|Any, options:Object = {}):this
WorkerThread["prototype"]["handleEvent"] = WorkerThread_handleEvent;

// --- implement -------------------------------------------
function WorkerThread_on(method,     // @arg MethodNameString
                         callback) { // @arg Function - callback(body:Any, param:Object):void
                                     // @ret this
    this._on[method] = callback;
    return this;
}

function WorkerThread_off(method) { // @arg MethodNameString
                                    // @ret this
    delete this._on[method];
    return this;
}

function WorkerThread_response(body,      // @arg Error|Any - response data
                               options) { // @arg Object = {} - { transfer, ticket, method, error, reply }
                                          // @options.transfer Array = null - Transferable Objects.
                                          // @options.ticket TicketString = ""
                                          // @options.method MethodNameString = ""
                                          // @options.error ErrorObject = null
                                          // @options.reply MethodNameString = ""
                                          // @ret TicketString
    options = options || {};

    var transfer = options["transfer"] || null;
    var ticket   = options["ticket"]   || this._ticket;
    var method   = options["reply"]    || // [!] The reply take precedence over method.
                   options["method"]   || "";
    var error    = options["error"]    || null;

    var responseStructure = {
          //"init":     0,
          //"origin":   "",
          //"import":   "",
            "error":    error ? error.message : "",
            "ticket":   ticket,
            "method":   method,
          //"reply":    "",
          //"cancel":   0,
            "body":     body
        };

    if (transfer && !error) {
        global["postMessage"](responseStructure, transfer);
    } else {
        global["postMessage"](responseStructure);
    }
    return ticket;
}

function WorkerThread_handleEvent(event) {
    if (event.type !== "message") {
        return;
    }
    // even.data: { init, origin, import, ticket, method, reply, cancel, body } as requestStructure

    var that = this;
    var data = event["data"];
    var body = data["body"];
    var method = data["cancel"] ? "cancel" : data["method"];
    var ticket = data["ticket"];
    var reply  = data["reply"];

    this._ticket = data["ticket"];

    if (data["init"]) {
        global["origin"] = data["origin"] || ""; // [!] export WorkerGlobal.origin
        try {
            _importScripts( (data["import"] || "").split(",") ); // "./a.js,./b.js,..."
        } catch (o_O) {
            that["response"](null, { "error": o_O, "ticket": ticket,
                                     "method": method, "reply": reply });
        }
    }
    if (method && method in that._on) {
        try {
            // WorkerThread.on(method, function callback(body, param){...})
            that._on[method](body, { "event": event, "ticket": ticket,
                                     "method": method, "reply": reply });
        } catch (o_O) {
            that["response"](null, { "error": o_O, "ticket": ticket,
                                     "method": method, "reply": reply });
        }
    } else if (that._callback) {
        try {
            // WorkerThread(function callback(body, param){...})
            that._callback(body, { "event": event, "ticket": ticket,
                                    "method": method, "reply": reply });
        } catch (o_O) {
            that["response"](null, { "error": o_O, "ticket": ticket,
                                     "method": method, "reply": reply });
        }
    }
}

function _importScripts(scripts) {
    for (var i = 0, iz = scripts.length; i < iz; ++i) {
        if (scripts[i]) {
            importScripts(scripts[i]);
        }
    }
}

// --- export ----------------------------------------------
global["WorkerThread"] = WorkerThread;

})(self);

