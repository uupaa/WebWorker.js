(function(global) {
//"use strict";

// --- dependency module -----------------------------------
//{@dev
//  This code block will be removed in `$ npm run build-release`. http://git.io/Minify
var Valid = global["Valid"] || require("uupaa.valid.js"); // http://git.io/Valid
//}@dev

// --- local variable --------------------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

var _workerID = 0;
var _pageURL = (global["location"] ? global["location"]["href"] : "");
var _BLOB    = global["Blob"]  || global["webkitBlob"] || null;
var _URL     = global["URL"]   || global["webkitURL"] ||
/*{@xbrowser*/ global["msURL"] || global["mozURL"] ||
/*}@xbrowser*/ null;

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function WebWorker(initParam,  // @arg Object - { origin, inline, source, script, id, verbose }
                               // @initParam.origin  String = location.href - location.href
                               // @initParam.inline  Boolean = false        - inline worker.
                               // @initParam.source  String                 - new Worker(source) or inline worker source
                               // @initParam.script  URLStringArray = []    - importScripts(...) files.
                               // @initParam.id      Integer = 0            - request id.
                               // @initParam.verbose Boolean = false        - verbose mode.
                   callback) { // @arg Function - callback(err:Error|null, event:EventObject):void
//{@dev
    Valid(Valid.type(initParam,        "Object"),       WebWorker, "initParam");
    Valid(Valid.keys(initParam,        "origin|inline|source|script|id|verbose"),
                                                        WebWorker, "initParam");
    Valid(Valid.type(initParam.origin, "String|omit"),  WebWorker, "origin");
    Valid(Valid.type(initParam.inline, "Boolean|omit"), WebWorker, "inline");
    Valid(Valid.type(initParam.source, "String"),       WebWorker, "source");
    Valid(Valid.type(initParam.script, "Array|omit"),   WebWorker, "script");
    Valid(Valid.type(initParam.id,     "Integer|omit"), WebWorker, "id");
    Valid(Valid.type(initParam.verbose,"Boolean|omit"), WebWorker, "verbose");
    Valid(Valid.type(callback,         "Function"),     WebWorker, "callback");
//}@dev

    this._origin  = initParam["origin"]  || _pageURL;
    this._inline  = initParam["inline"]  || false;
    this._source  = initParam["source"]  || null;
    this._script  = initParam["script"]  || [];
    this._verbose = initParam["verbose"] || false;
    this._callback = callback;

    if (this._inline) {
        var blob = new _BLOB([ this._source ], { type: "application/javascript" });

        this._source = _URL.createObjectURL(blob);
    }

    this._worker = null;
    this._workerID = ++_workerID;
    this._requestID = 0;
    if (initParam["id"]) {
        this._requestID = initParam["id"];
        this._requestID--;
    }

    this._handleWorkerEvent      = _handleWorkerEvent.bind(this);
    this._handleWorkerErrorEvent = _handleWorkerErrorEvent.bind(this);
}

WebWorker["repository"] = "https://github.com/uupaa/WebWorker.js";

WebWorker["baseDir"]                  = WebWorker_baseDir; // WebWorker.baseDir(pageURL:URLString = location.href):PathString
WebWorker["prototype"]["post"]        = WebWorker_post;    // WebWorker#post(requestParam:Object, transferableObjects:Array = null):this
WebWorker["prototype"]["postMessage"] = WebWorker_post;    // WebWorker#postMessage(requestParam:Object, transferableObjects:Array = null):this
WebWorker["prototype"]["close"]       = WebWorker_close;   // WebWorker#close():void

// --- implement -------------------------------------------
function WebWorker_baseDir(pageURL) { // @arg URLString = location.href
                                      // @ret PathString
    return (pageURL || _pageURL).split("/").slice(0, -1).join("/") + "/";
}

function WebWorker_post(requestParam,          // @arg Object       - request object. { ... }
                        transferableObjects) { // @arg Array = null - Transferable Objects.
                                               // @ret this
//{@dev
    Valid(Valid.type(requestParam,        "Object"),     WebWorker_post, "requestParam");
    Valid(Valid.type(transferableObjects, "Array|omit"), WebWorker_post, "transferableObjects");
//}@dev

    var that = this;
    var requestID = ++that._requestID;

    requestParam["WORKER_ID"]  = that._workerID;
    requestParam["REQUEST_ID"] = requestID;

    if (!that._worker) {
        requestParam["INIT"]   = true;
        requestParam["ORIGIN"] = that._origin;
        requestParam["SCRIPT"] = that._script;
        requestParam["BASE_DIR"] = WebWorker_baseDir(that._origin);

        if (!that._source) {
            throw new Error("Worker#post");
        }
        that._worker = new Worker(that._source);
        that._worker.addEventListener("message", that._handleWorkerEvent);
        that._worker.addEventListener("error",   that._handleWorkerErrorEvent);
    }

//{@verbose
    if (that._verbose) {
        if (global["console"]) {
            console.log("-> WebWorker@" + that._workerID + "#post id: " + that._requestID);
        }
    }
//}@verbose

    if (transferableObjects) {
        that._worker.postMessage(requestParam, transferableObjects);
    } else {
        that._worker.postMessage(requestParam);
    }
    return this;
}

function WebWorker_close() {
    var that = this;

//{@verbose
    if (that._verbose) {
        if (global["console"]) {
            console.log("WebWorker@" + that._workerID + "#close");
        }
    }
//}@verbose

    that._worker.removeEventListener("message", that._handleWorkerEvent);
    that._worker.removeEventListener("error",   that._handleWorkerErrorEvent);
    that._worker.terminate();
    that._worker = null; // [!][GC]

    if ( /^blob:/.test(that._source) ) { // src is blob url?
        _URL.revokeObjectURL(that._source); // [!] GC
    }
    that._source = "";
    that._callback = null;
    that._handleWorkerEvent      = null;
    that._handleWorkerErrorEvent = null;
}

function _handleWorkerEvent(event) {
    var that = this;

    if (event.data["WORKER_ID"] === that._workerID) {

//{@verbose
        if (that._verbose) {
            var workerID  = event.data["WORKER_ID"]  || "UNKNOWN";
            var requestID = event.data["REQUEST_ID"] || "UNKNOWN";

            if (global["console"]) {
                console.log("<- WebWorker@" + workerID + "#post id: " + requestID);
            }
        }
//}@verbose

        if (that._callback) {
            that._callback(null, event);
        }
    }
}

function _handleWorkerErrorEvent(event) {
    event.preventDefault();  // error event is cancelable.
    event.stopPropagation();

    var that = this;

//{@verbose
    if (that._verbose) {
        if (global["console"]) {
            console.log("WebWorker@" + that._workerID + "#error");
        }
    }
//}@verbose

    if (that._callback) {
        that._callback(new Error("WebWorker@" + that._workerID), event);
    }
}

// --- export ----------------------------------------------
if ("process" in global) {
    module["exports"] = WebWorker;
}
global["WebWorker" in global ? "WebWorker_" : "WebWorker"] = WebWorker; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

