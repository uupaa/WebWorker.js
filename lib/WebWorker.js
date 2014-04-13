// @name: WebWorker.js
// @require: Valid.js
// @cutoff: @assert @node @xbrowser @verbose

(function(global) {
//"use strict";

// --- variable --------------------------------------------
//{@assert
var Valid = global["Valid"] || require("uupaa.valid.js");
//}@assert

var _inNode = "process" in global;
//var _inWorker = "WorkerLocation" in global;
//var _inBrowser = "self" in global;

var _workerID = 0;
var _pageURL = (global["location"] ? global["location"]["href"] : "");
var _BLOB    = global["Blob"]  || global["webkitBlob"] || null;
var _URL     = global["URL"]   || global["webkitURL"] ||
/*{@xbrowser*/ global["msURL"] || global["mozURL"] ||
/*}@xbrowser*/ null;

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function WebWorker(param,      // @arg Object: { origin, inline, source, script, id, verbose }
                               //     origin  - String(= location.href): location.href
                               //     inline  - Boolean(= false): inline worker.
                               //     source  - String: new Worker(source) or inline worker source
                               //     script  - URLStringArray(= []): importScripts(...) files.
                               //     id      - Integer(= 0): request id.
                               //     verbose - Boolean(= false): verbose mode.
                   callback) { // @arg Function: callback(err:Error/null, event:EventObject):void
                               // @help: WebWorker
//{@assert
    _if(!Valid.type(param,        "Object",        "origin,inline,source,script,id,verbose"), "WebWorker(param)");
    _if(!Valid.type(param.origin, "String/omit"),  "WebWorker(param.origin)");
    _if(!Valid.type(param.inline, "Boolean/omit"), "WebWorker(param.inline)");
    _if(!Valid.type(param.source, "String"),       "WebWorker(param.source)");
    _if(!Valid.type(param.script, "Array/omit"),   "WebWorker(param.script)");
    _if(!Valid.type(param.id,     "Integer/omit"), "WebWorker(param.id)");
    _if(!Valid.type(param.verbose,"Boolean/omit"), "WebWorker(param.verbose)");
    _if(!Valid.type(callback,     "Function"),     "WebWorker(,callback)");
//}@assert

    this._origin  = param["origin"]  || _pageURL;
    this._inline  = param["inline"]  || false;
    this._source  = param["source"]  || null;
    this._script  = param["script"]  || [];
    this._verbose = param["verbose"] || false;
    this._callback = callback;

    if (this._inline) {
        var blob = new _BLOB([ this._source ], { type: "application/javascript" });

        this._source = _URL.createObjectURL(blob);
    }

    this._worker = null;
    this._workerID = ++_workerID;
    this._requestID = 0;
    if (param["id"]) {
        this._requestID = param["id"];
        this._requestID--;
    }

    this._handleWorkerEvent      = _handleWorkerEvent.bind(this);
    this._handleWorkerErrorEvent = _handleWorkerErrorEvent.bind(this);
}

WebWorker["repository"] = "https://github.com/uupaa/WebWorker.js";

WebWorker["baseDir"]                  = WebWorker_baseDir; // WebWorker.baseDir(pageURL:URLString):PathString
WebWorker["prototype"]["post"]        = WebWorker_post;    // WebWorker#post(requestParam:Object, transferableObjects:Array/null, callback:Function):void
WebWorker["prototype"]["postMessage"] = WebWorker_post;    // WebWorker#postMessage(requestParam:Object, transferableObjects:Array/null, callback:Function):void
WebWorker["prototype"]["close"]       = WebWorker_close;   // WebWorker#close():void

// --- implement -------------------------------------------
function WebWorker_baseDir(pageURL) { // @arg URLString(= location.href):
                                      // @ret PathString:
                                      // @help: WebWorker.baseDir
    return (pageURL || _pageURL).split("/").slice(0, -1).join("/") + "/";
}

function WebWorker_post(requestParam,          // @arg Object: request object. { ... }
                        transferableObjects) { // @arg Array(= null): Transferable Objects.
                                               // @help: WebWorker#post
//{@assert
    _if(!Valid.type(requestParam,        "Object"),     "WebWorker#post(requestParam)");
    _if(!Valid.type(transferableObjects, "Array/omit"), "WebWorker#post(,transferableObjects)");
//}@assert

    var that = this;
    var requestID = ++that._requestID;

    requestParam["WORKER_ID"]  = that._workerID;
    requestParam["REQUEST_ID"] = requestID;

    if (!that._worker) {
        requestParam["INIT"]   = true;
        requestParam["ORIGIN"] = that._origin;
        requestParam["SCRIPT"] = that._script;

        that._worker = new Worker(that._source);
        that._worker.addEventListener("message", that._handleWorkerEvent);
        that._worker.addEventListener("error",   that._handleWorkerErrorEvent);

        if ( /^blob:/.test(that._source) ) { // src is blob url?
            _URL.revokeObjectURL(that._source); // [!] GC
        }
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
}

function WebWorker_close() { // @help: WebWorker#close
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

//{@assert
function _if(value, msg) {
    if (value) {
        console.error(Valid.stack(msg));
        throw new Error(msg);
    }
}
//}@assert

// --- export ----------------------------------------------
//{@node
if (_inNode) {
    module["exports"] = WebWorker;
}
//}@node
if (global["WebWorker"]) {
    global["WebWorker_"] = WebWorker; // already exsists
} else {
    global["WebWorker"]  = WebWorker;
}

})((this || 0).self || global);

