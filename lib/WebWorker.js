(function(global) {
//"use strict";

// --- dependency module -----------------------------------
//{@dev
//  This code block will be removed in `$ npm run build-release`. http://git.io/Minify
//var Valid = global["Valid"] || require("uupaa.valid.js"); // http://git.io/Valid
//}@dev

// --- local variable --------------------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

var _workerID = 0;
var _BLOB    = global["Blob"]  || global["webkitBlob"] || null;
var _URL     = global["URL"]   || global["webkitURL"] ||
/*{@xbrowser*/ global["msURL"] || global["mozURL"] ||
/*}@xbrowser*/ null;

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function WebWorker(initParam,         // @arg Object - { origin, inline, source, script, count, verbose }
                                      // @initParam.origin  String = location.href - location.href
                                      // @initParam.inline  Boolean = false        - inline worker.
                                      // @initParam.source  String = ""            - new Worker(source) or inline worker source
                                      // @initParam.script  URLStringArray = []    - importScripts(...) files.
                                      // @initParam.count   Integer = 0            - count initial value.
                                      // @initParam.verbose Boolean = false        - verbose mode.
                   defaultCallback) { // @arg Function = null - defaultCallback(err:Error|null, event:EventObject):void
                                      // @desc init Worker session.
//{@dev
    $valid($type(initParam,        "Object"),       WebWorker, "initParam");
    $valid($keys(initParam,        "origin|inline|source|script|count|verbose"),
                                                    WebWorker, "initParam");
    $valid($type(initParam.origin, "String|omit"),  WebWorker, "origin");
    $valid($type(initParam.inline, "Boolean|omit"), WebWorker, "inline");
    $valid($type(initParam.source, "String"),       WebWorker, "source");
    $valid($type(initParam.script, "Array|omit"),   WebWorker, "script");
    $valid($type(initParam.count,  "Integer|omit"), WebWorker, "count");
    $valid($type(initParam.verbose,"Boolean|omit"), WebWorker, "verbose");
    $valid($type(defaultCallback,  "Function|omit"),WebWorker, "defaultCallback");
//}@dev

    this._origin  = initParam["origin"]  || location.href;
    this._inline  = initParam["inline"]  || false;
    this._source  = initParam["source"]  || null;
    this._script  = initParam["script"]  || [];
    this._verbose = initParam["verbose"] || false;

    this._defaultCallback = defaultCallback || null;
    this._callbacks = { length: 0 }; // { key: callback, ... }
    this._blobSource = "";
    this._worker = null;
    this._workerID = ++_workerID;
    this._count = 0;

    if (initParam["count"]) {
        this._count = initParam["count"];
        this._count--;
    }

    this._handleResponse   = _handleResponse.bind(this);
    this._handleErrorEvent = _handleErrorEvent.bind(this);
}

WebWorker["repository"] = "https://github.com/uupaa/WebWorker.js";
WebWorker["prototype"]["request"] = WebWorker_request; // WebWorker#request(requestParam:Object, transferableObjects:Array = null, callback:Function = null):this
WebWorker["prototype"]["close"]   = WebWorker_close;   // WebWorker#close():this

// --- implement -------------------------------------------
function _createKey(workerID, // @arg Integer
                    count) {  // @arg Integer
                              // @ret String - "{workerID}_{count}"
                              // @desc create hash key.
    return workerID + "_" + count;
}

function WebWorker_request(data,                // @arg Object       - request data.
                           transferableObjects, // @arg Array = null - Transferable Objects.
                           callback) {          // @arg Function = null - callback(err:Error, event:EventObject):void
                                                // @ret this
                                                // @desc open and request Worker session.
//{@dev
    $valid($type(data,                "Object"),        WebWorker_request, "data");
    $valid($type(transferableObjects, "Array|omit"),    WebWorker_request, "transferableObjects");
    $valid($type(callback,            "Function|omit"), WebWorker_request, "callback");
//}@dev

    var that = this;
    var count = ++that._count;
    var key = _createKey(that._workerID, count);

    data["__REQUEST__"] = { "WORKER_ID": that._workerID, "REQUEST_ID": count };

    if (!that._worker) {
        data["__REQUEST__"]["INIT"] = true;
        data["__REQUEST__"]["ORIGIN"] = that._origin;
        data["__REQUEST__"]["SCRIPT"] = that._script;
        data["__REQUEST__"]["BASE_DIR"] = that._origin.split("/").slice(0, -1).join("/") + "/";

        _createWorkerResource(that);
    }

    // 引数 callback が指定されている場合は、
    // this._callbacks[key] = callback; の形で登録し
    // _handleResponse で受けたイベントを callback(err, event) の形でコールバックする
    if (callback) {
        that._callbacks.length++;
        that._callbacks[key] = callback;
    }

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("->  WebWorker#request(" + key + ")");
    }
//}@verbose

    if (transferableObjects) {
        that._worker.postMessage(data, transferableObjects);
    } else {
        that._worker.postMessage(data);
    }
    return this;
}

function WebWorker_close() { // @ret this
                             // @desc close Worker session
    var that = this;
    var key = _createKey(that._workerID, that._count);

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("x   WebWorker#close(" + key + ")");
    }
//}@verbose

    _releaseWorkeResource(that);
    that._callbacks = { length: 0 };
    return that;
}

function _createWorkerResource(that) {
    if (that._inline) {
        that._blobSource = _URL.createObjectURL(
                new _BLOB([ that._source ], { type: "application/javascript" }));
    }
    that._worker = new Worker(that._blobSource ? that._blobSource
                                               : that._source);
    that._worker.addEventListener("message", that._handleResponse);
    that._worker.addEventListener("error",   that._handleErrorEvent);
}

function _releaseWorkeResource(that) {
    that._worker.removeEventListener("message", that._handleResponse);
    that._worker.removeEventListener("error",   that._handleErrorEvent);
    that._worker.terminate();
    that._worker = null; // [!][GC]

    if (that._inline) {
        _URL.revokeObjectURL(that._blobSource); // [!] GC
        that._blobSource = "";
    }
}

function _handleResponse(event) {
    var that = this;
    var response = event["data"]["__RESPONSE__"] ||
                   event["data"]["__REQUEST__"]  || {};
    var workerID  = response["WORKER_ID"]  || 0;
    var requestID = response["REQUEST_ID"] || 0;

    if (workerID === that._workerID) {
        var key = _createKey(workerID, requestID);

//{@verbose
        if (that._verbose && global["console"]) {
            console.log("<-  WebWorker#request(" + key + ")");
        }
//}@verbose

        // key に一致する callback が登録されている場合は、
        // this._defaultCallback の代わりにそちらをコールバックする
        var callback = that._callbacks[key] || null;

        if (callback) {
            if (--that._callbacks.length <= 0) {
                // GC による速度低下を予防するために、length による要素数の管理を行う
                // length が 0 以下なら callbacks を再作成する
                that._callbacks = { length: 0 };
            } else {
              //delete that._callbacks[key]; // possibility of GC -> maybe slowly
                that._callbacks[key] = null; // remove without GC -> maybe quickly
            }
            callback(null, event);
        } else if (that._defaultCallback) {
            that._defaultCallback(null, event);
        }
    }
}

function _handleErrorEvent(event) {
    event.preventDefault();  // error event is cancelable.
    event.stopPropagation();

    var that = this;

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("err WebWorker#request(" + Object.keys(that._callbacks).join(",") + ")");
    }
//}@verbose

    if (that._defaultCallback) {
        var key = _createKey(that._workerID, 0);

        that._defaultCallback(new Error("WebWorker#request(" + key + ")"), event);
    }
}

//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
//}@dev

// --- export ----------------------------------------------
if ("process" in global) {
    module["exports"] = WebWorker;
}
global["WebWorker" in global ? "WebWorker_" : "WebWorker"] = WebWorker; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

