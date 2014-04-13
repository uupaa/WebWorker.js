// @name: WebWorker.js
// @require: none
// @cutoff: @assert @node @xbrowser @verbose

(function(global) {
//"use strict";

// --- variable --------------------------------------------
//{@assert
//var Valid = global["Valid"] || require("uupaa.valid.js");
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
function WebWorker(initParam,  // @arg Object: { origin, inline, source, script, id, verbose }
                               //     origin  - String(= location.href): location.href
                               //     inline  - Boolean(= false): inline worker.
                               //     source  - String: new Worker(source) or inline worker source
                               //     script  - URLStringArray(= []): importScripts(...) files.
                               //     id      - Integer(= 0): request id.
                               //     verbose - Boolean(= false): verbose mode.
                   callback) { // @arg Function: callback(err:Error/null, event:EventObject):void
                               // @help: WebWorker
//{@assert
    _if(!Valid_type(initParam,        "Object",        "origin,inline,source,script,id,verbose"), "WebWorker(initParam)");
    _if(!Valid_type(initParam.origin, "String/omit"),  "WebWorker(initParam.origin)");
    _if(!Valid_type(initParam.inline, "Boolean/omit"), "WebWorker(initParam.inline)");
    _if(!Valid_type(initParam.source, "String"),       "WebWorker(initParam.source)");
    _if(!Valid_type(initParam.script, "Array/omit"),   "WebWorker(initParam.script)");
    _if(!Valid_type(initParam.id,     "Integer/omit"), "WebWorker(initParam.id)");
    _if(!Valid_type(initParam.verbose,"Boolean/omit"), "WebWorker(initParam.verbose)");
    _if(!Valid_type(callback,         "Function"),     "WebWorker(,callback)");
//}@assert

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
function WebWorker_baseDir(pageURL) { // @arg URLString(= location.href):
                                      // @ret PathString:
                                      // @help: WebWorker.baseDir
    return (pageURL || _pageURL).split("/").slice(0, -1).join("/") + "/";
}

function WebWorker_post(requestParam,          // @arg Object: request object. { ... }
                        transferableObjects) { // @arg Array(= null): Transferable Objects.
                                               // @ret this:
                                               // @help: WebWorker#post
//{@assert
    _if(!Valid_type(requestParam,        "Object"),     "WebWorker#post(requestParam)");
    _if(!Valid_type(transferableObjects, "Array/omit"), "WebWorker#post(,transferableObjects)");
//}@assert

    var that = this;
    var requestID = ++that._requestID;

    requestParam["WORKER_ID"]  = that._workerID;
    requestParam["REQUEST_ID"] = requestID;

    if (!that._worker) {
        requestParam["INIT"]   = true;
        requestParam["ORIGIN"] = that._origin;
        requestParam["SCRIPT"] = that._script;

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

//{@assert
function Valid_type(value,      // @arg Any:
                    types,      // @arg TypeString: eg: "Type1", "Type1/Type2/omit", "JSON"
                    validate) { // @arg String/SchemeJSON(= null):
                                // @ret Boolean:
                                // @help: Valid.type
    return types.split(/[\|\/]/).some(_judge);

    function _judge(type) {
        switch (type.toLowerCase()) {
        case "omit":    return value === undefined || value === null;
        case "null":    return value === null;
        case "undefined":return value === undefined;
        case "array":   return Array.isArray(value);
        case "integer": return typeof value === "number" && Math.ceil(value) === value;
//      case "json":    return Valid_json(value, validate);
        case "object":  // typeof null -> object
            return (value || 0).constructor !== ({}).constructor ? false
                 : typeof validate === "string" ? Valid_keys(value, validate)
                                                : true;
        }
        if (value !== undefined && value !== null) {
            if (Object.prototype.toString.call(value) === "[object " + type + "]") {
                return true;
            } else if (value.constructor.name === type) {
                return true;
            }
        }
        return false;
    }
}
//}@assert

//{@assert
function Valid_keys(value,  // @arg Object: { key1, key2 }
                    keys) { // @arg String: valid choices. "key1,key2,key3"
                            // @ret Boolean: false is invalid value.
                            // @help: Valid.keys
    var items = keys.split(",");

    return Object.keys(value).every(function(key) {
        return items.indexOf(key) >= 0;
    });
}
//}@assert

//{@assert
function _if(value, msg) {
    if (value) {
//      console.error(Valid.stack(msg));
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

