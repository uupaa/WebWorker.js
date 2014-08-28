(function(global) {
"use strict";

// --- dependency modules ----------------------------------
//{@dev
var WMURL = global["WMURL"] || require("uupaa.wmurl.js");
//}@dev

// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

var _STATE_REQUEST  = 1;
var _STATE_CANCEL   = 2;
var _STATE_RESPONSE = 3;
var _STATE_CLOSED   = 4;

var _workerID = 0;
var _tickets  = {}; // { worker-name: { ticket: { state, begin, end, elapsed, method }, ... }, ... }
var _BLOB     = global["Blob"]  || global["webkitBlob"] || null;
var _URL      = global["URL"]   || global["webkitURL"] ||
/*{@xbrowser*/  global["msURL"] || global["mozURL"] ||
/*}@xbrowser*/  null;

// --- class / interfaces ----------------------------------
function WebWorker(source,    // @arg URLString|JavaScriptFragmentString - new Worker(source) or inline worker source
                   callback,  // @arg Function = null - callback(err:Error, body:Any, param:Object):void
                   options) { // @arg Object - { name, origin, import, inline, verbose }
                              // @options.name String = "" - Worker name.
                              // @options.origin URLString = "" - set WorkerGlobalScope.origin.
                              // @options.import URLStringArray = [] - importScripts(...) files.
                              // @options.inline Boolean = false - use inline WebWorker.
                              // @options.verbose Boolean = false - verbose mode.
                              // @desc init Worker session.
//{@dev
    $valid($type(source,         "String"),        WebWorker, "source");
    $valid($type(callback,       "Function|omit"), WebWorker, "callback");
    $valid($type(options,        "Object|null"),   WebWorker, "options");
    $valid($keys(options,        "name|origin|import|inline|verbose"),
                                                   WebWorker, "options");
    $valid($type(options.name,   "String|omit"),   WebWorker, "options.name");
    $valid($type(options.origin, "String|omit"),   WebWorker, "options.origin");
    $valid($type(options.import, "Array|omit"),    WebWorker, "options.import");
    $valid($type(options.inline, "Boolean|omit"),  WebWorker, "options.inline");
    $valid($type(options.verbose,"Boolean|omit"),  WebWorker, "options.verbose");
//}@dev

    this._source    = source;
    this._callback  = callback || null;
    this._name      = options["name"]    || "";
    this._origin    = options["origin"]  || "";
    this._import    = options["import"]  || [];
    this._inline    = options["inline"]  || "";
    this._verbose   = options["verbose"] || false;

//{@dev
    $valid(WMURL.isValid(this._origin), WebWorker, "options.origin");
    $valid(WMURL.isValid(this._import), WebWorker, "options.import");
//}@dev

    this._on        = {}; // { method: callback, ... }
    this._blobURL   = ""; // blob url for inline worker
    this._worker    = null; // new Worker(source) instance
    this._workerID  = ++_workerID;
    this._requestID = 0;
    this._name      = this._name || this._workerID;

    _tickets[this._name] = _tickets[this._name] || {};
}

//{@dev
WebWorker["repository"] = "https://github.com/uupaa/WebWorker.js";
//}@dev

WebWorker["prototype"]["on"]      = WebWorker_on;       // WebWorker#on(method:MethodNameString, callback:Function):this
WebWorker["prototype"]["off"]     = WebWorker_off;      // WebWorker#off(method:MethodNameString):this
WebWorker["prototype"]["inbox"]   = WebWorker_inbox;    // WebWorker#inbox(task:Task, body:Any, id:String):TicketString
WebWorker["prototype"]["request"] = WebWorker_request;  // WebWorker#request(body:Any, options:Object = {}):TicketString
WebWorker["prototype"]["cancel"]  = WebWorker_cancel;   // WebWorker#cancel(ticket:TicketString):Boolean
WebWorker["prototype"]["close"]   = WebWorker_close;    // WebWorker#close():void
WebWorker["prototype"]["handleEvent"] = WebWorker_handleEvent;
// --- debug ---
WebWorker["dump"]  = WebWorker_dump;  // WebWorker.dump():Object
WebWorker["clear"] = WebWorker_clear; // WebWorker.clear():void

// --- implements ------------------------------------------
function WebWorker_on(method,     // @arg MethodNameString
                      callback) { // @arg Function - callback(err:Error, body:Any, param:Object):void
                                  // @ret this
//{@dev
    $valid($type(method,   "MethodNameString"), WebWorker_on, "method");
    $valid($type(callback, "Function"),         WebWorker_on, "callback");
//}@dev

    this._on[method] = callback;
    return this;
}

function WebWorker_off(method) { // @arg MethodNameString
                                 // @ret this
//{@dev
    $valid($type(method, "MethodNameString"), WebWorker_off, "method");
//}@dev

    delete this._on[method];
    return this;
}

function WebWorker_inbox(task, // @arg Task
                         body, // @arg Any
                         id) { // @arg String - instance id
                               // @desc Message.js over WebWorker.js
//{@dev
    $valid($type(task, "Task"),   WebWorker_inbox, "task");
    $valid($type(id,   "String"), WebWorker_inbox, "id");
//}@dev

    var that   = this;
    var ticket = _makeTicket(that._workerID, ++that._requestID);
    var unique = "__REPLY__" + ticket; // make unique string

    that["on"](unique, function(err, body) {
        that["off"](unique);
        if (!err) {
            task["set"](id, body);
        }
        task["done"](err);
    });
    return that["request"](body, { "ticket": ticket,
                                   "method": "inbox", "reply": unique });
}

function WebWorker_request(body,      // @arg Any - request body.
                           options) { // @arg Object = {} - { transfer, ticket, method, reply }
                                      // @options.transfer Array = null - transferable object
                                      // @options.ticket TicketString = ""
                                      // @options.method MethodNameString = ""
                                      // @options.reply MethodNameString = ""
                                      // @ret TicketString
                                      // @desc open and request Worker session.
//{@dev
    $valid($type(options, "Object|omit"), WebWorker_request, "options");
    $valid($keys(options, "transfer|ticket|method|reply"), WebWorker_request, "options");
//}@dev

    options = options || {};

    var transfer = options["transfer"] || null;
    var ticket   = options["ticket"]   || _makeTicket(this._workerID, ++this._requestID); // {{WORKER_ID}}.{{REQUEST_ID}}
    var method   = options["method"]   || "";
    var reply    = options["reply"]    || "";

//{@dev
    $valid($type(options.transfer, "Array|omit"),  WebWorker_request, "options.transfer");
    $valid($type(options.ticket,   "String|omit"), WebWorker_request, "options.ticket");
    $valid($type(options.method,   "String|omit"), WebWorker_request, "options.method");
    $valid($type(options.reply,    "String|omit"), WebWorker_request, "options.reply");
//}@dev

    var initialized = !!this._worker;
    var requestStructure = {
            "init":     initialized ? 0  : 1, // false/true -> 0/1
            "origin":   initialized ? "" : this._origin,
            "import":   initialized ? "" : this._import.join(","), // ArrayString -> CommaJointString
          //"error":    "",
            "ticket":   ticket,
            "method":   method,
            "reply":    reply,
            "cancel":   0,
            "body":     body
        };

    if (!initialized) {
        _initWorker(this);
    }

    _updateTicketState(this._name, ticket, _STATE_REQUEST, method);

//{@verbose
    if (this._verbose && global["console"]) {
        var logMessage = "--\x3e WebWorker(" + this._name + ")#request(" + ticket + ", " + method + ", " + reply + ")";

        if (console.group) {
            console.group(logMessage);
        } else {
            console.log(logMessage);
        }
    }
//}@verbose

    // send request to worker
    if (transfer) {
        this._worker["postMessage"](requestStructure, transfer);
    } else {
        this._worker["postMessage"](requestStructure);
    }
    return ticket;
}

function _makeTicket(workerID,    // @arg Integer
                     requestID) { // @arg Integer
                                  // @ret String - "{{workerID}}.{{requestID}}", eg "0.0"
    return workerID + "." + requestID;
}

function _initWorker(that) { // @arg this
                             // @desc create and init Worker
    if (that._inline) {
        // [1]. create blob resource
        // [2]. create inline worker
        var blob = new _BLOB([that._source], { "type": "application/javascript" });

        that._blobURL = _URL["createObjectURL"](blob); // [1] blob://...
        that._worker = new Worker(that._blobURL);      // [2]
    } else {
//{@verbose
        if (that._verbose) {
            console.log("{ " + that._name + ": new WebWorker(" + that._source + ") }");
        }
//}@verbose
        that._worker = new Worker(that._source);
    }
    that._worker.addEventListener("message", that); // -> handleEvent
    that._worker.addEventListener("error",   that); // -> handleEvent
}

function WebWorker_handleEvent(event) { // @arg EventObject
    if (event.type === "message" && event["data"]) {
        var workerID = parseInt(event["data"]["ticket"] || "0");

        if (workerID === this._workerID) { // match
            event.preventDefault();
            event.stopPropagation();

            _handleMessage(this, event);
        }
    } else if (event.type === "error") { // catch outer error
        //  importScripts("WorkerThread.js"); -> raise outer Error
        //  var worker = new WorkerThread(function(event, method, body) { -> raise outer Error
        //      throw new Error(); -> raise inner Error
        //  });
        event.preventDefault();
        event.stopPropagation();

        var body = {
            "name":     this._name,
            "workerID": this._workerID,
            "filename": event["filename"] || "",
            "lineno":   event["lineno"]   || 0,
            "colno":    event["colno"]    || 0
        };
        var param = { "ticket": "", "method": "", "event": event };

//{@verbose
        if (this._verbose && global["console"]) {
            console.log("\x3c-x WorkerThread(" + this._name + ") catch exception: " + event.message);
            console.log(JSON.stringify(body, null, 2));

            if (console.groupEnd) {
                console.groupEnd()
            }
        }
//}@verbose

        if (this._callback) {
            this._callback(new Error(event.message), body, param);
        }
    }
}

function _handleMessage(that, event) {
    // even.data: { error, ticket, method, body } as responseStructure

    var data   = event["data"];
    var ticket = data["ticket"]; // as String
    var method = data["method"]; // as String
    var body   = data["body"];   // as Any
    var errorObject = data["error"] ? new Error(data["error"]) : null; // rebuild ErrorObject

    _updateTicketState(that._name, ticket, _STATE_RESPONSE, method);

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("\x3c-- WebWorker(" + that._name + ")#response(" + ticket + ", " + method + ")");
        if (console.groupEnd) {
            console.groupEnd()
        }
    }
//}@verbose

    if (method && method in that._on) {
        that._on[method](errorObject, body, { "ticket": ticket, "method": method, "event": event });
    } else if (that._callback) {
        that._callback(errorObject, body, { "ticket": ticket, "method": method, "event": event });
    }
}

function WebWorker_cancel(ticket) { // @arg TicketString
                                    // @ret Boolean
//{@dev
    $valid($type(ticket, "String"), WebWorker_cancel, "ticket");
//}@dev

    if (_tickets[this._name][ticket]["state"] === _STATE_REQUEST) {
        _updateTicketState(this._name, ticket, _STATE_CANCEL, "cancel");

//{@verbose
        if (this._verbose && global["console"]) {
            console.log("--\x3e WebWorker(" + this._name + ")#cancel(" + ticket + ")");
        }
//}@verbose

        var requestStructure = { "ticket": ticket, "cancel": 1 };

        this._worker["postMessage"](requestStructure);
        return true;
    }
    return false;
}

function WebWorker_close() { // @desc close all Workers session
    var that = this;

    that._worker.removeEventListener("message", that);
    that._worker.removeEventListener("error",   that);
    that._worker["terminate"]();
    that._worker = null; // [!][GC]

    _updateTicketState(that._name, 0, _STATE_CLOSED, "");

    if (that._inline) {
        _URL["revokeObjectURL"](that._blobURL); // [!] GC
        that._blobURL = "";
    }
}

function _updateTicketState(name, ticket, state, method) {
    var now = Date.now();
    var obj = null;

    switch (state) {
    case _STATE_REQUEST:
        _tickets[name][ticket] = {
            "state":    _STATE_REQUEST,
            "request":  now,
            "response": 0,
            "elapsed":  0,
            "cancel":   false,
            "method":   method
        };
        break;
    case _STATE_CANCEL:
        obj  = _tickets[name][ticket];

        _tickets[name][ticket]["state"] = _STATE_CANCEL;
        _tickets[name][ticket]["cancel"] = true;
        break;
    case _STATE_RESPONSE:
        obj  = _tickets[name][ticket];

        _tickets[name][ticket] = {
            "state":    _STATE_RESPONSE,
            "request":  obj["request"],
            "response": now,
            "elapsed":  now - obj["request"],
            "cancel":   false,
            "method":   obj["method"] + "," + method
        };
        break;
    case _STATE_CLOSED:
        for (var ticket in _tickets[name]) {
            _tickets[name][ticket]["state"] = _STATE_CLOSED;
        }
    }
}

function WebWorker_dump() { // @ret Object - { live, stub }
    return JSON.parse( JSON.stringify(_tickets) ); // dead copy
}

function WebWorker_clear() {
    for (var name in _tickets) {
        for (var ticket in _tickets[name]) {
            if (_tickets[name][ticket]["state"] === _STATE_CLOSED) {
                delete _tickets[name][ticket];
            }
        }
    }
}

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
if ("process" in global) {
    module["exports"] = WebWorker;
}
global["WebWorker" in global ? "WebWorker_" : "WebWorker"] = WebWorker; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

