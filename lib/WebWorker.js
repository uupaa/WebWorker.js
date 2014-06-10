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
var _pageURL = (global["location"] ? global["location"]["href"] : "");
var _BLOB    = global["Blob"]  || global["webkitBlob"] || null;
var _URL     = global["URL"]   || global["webkitURL"] ||
/*{@xbrowser*/ global["msURL"] || global["mozURL"] ||
/*}@xbrowser*/ null;

// --- define ----------------------------------------------
// --- interface -------------------------------------------
function WebWorker(initParam,         // @arg Object - { origin, inline, source, script, count, verbose }
                                      // @initParam.origin  String = location.href - location.href
                                      // @initParam.inline  Boolean = false        - inline worker.
                                      // @initParam.source  String                 - new Worker(source) or inline worker source
                                      // @initParam.script  URLStringArray = []    - importScripts(...) files.
                                      // @initParam.count   Integer = 0            - start count.
                                      // @initParam.verbose Boolean = false        - verbose mode.
                   defaultCallback) { // @arg Function = null - defaultCallback(err:Error|null, event:EventObject):void
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

    this._origin  = initParam["origin"]  || _pageURL;
    this._inline  = initParam["inline"]  || false;
    this._source  = initParam["source"]  || null;
    this._script  = initParam["script"]  || [];
    this._verbose = initParam["verbose"] || false;
    this._defaultCallback = defaultCallback || null;
    this._callbacks = { length: 0 }; // { key: callback, ... }

    if (this._inline) {
        var blob = new _BLOB([ this._source ], { type: "application/javascript" });

        this._source = _URL.createObjectURL(blob);
    }

    this._worker = null;
    this._workerID = ++_workerID;
    this._count = 0;
    if (initParam["count"]) {
        this._count = initParam["count"];
        this._count--;
    }

    this._handleWorkerEvent      = _handleWorkerEvent.bind(this);
    this._handleWorkerErrorEvent = _handleWorkerErrorEvent.bind(this);
}

WebWorker["repository"] = "https://github.com/uupaa/WebWorker.js";

WebWorker["baseDir"]                  = WebWorker_baseDir; // WebWorker.baseDir(pageURL:URLString = location.href):PathString
WebWorker["prototype"]["post"]        = WebWorker_post;    // WebWorker#post(requestParam:Object, transferableObjects:Array = null, callback:Function = null):this
WebWorker["prototype"]["postMessage"] = WebWorker_post;    // WebWorker#postMessage(requestParam:Object, transferableObjects:Array = null, callback:Function = null):this
WebWorker["prototype"]["close"]       = WebWorker_close;   // WebWorker#close():void

// --- implement -------------------------------------------
function _createKey(workerID, // @arg Integer
                    count) {  // @arg Integer
                              // @ret String - "{workerID}_{count}"
                              // @desc create hash key.
    return workerID + "_" + count;
}

function WebWorker_baseDir(pageURL) { // @arg URLString = location.href
                                      // @ret PathString
    return (pageURL || _pageURL).split("/").slice(0, -1).join("/") + "/";
}

function WebWorker_post(requestParam,        // @arg Object       - request object. { ... }
                        transferableObjects, // @arg Array = null - Transferable Objects.
                        callback) {          // @arg Function = null - callback(err:Error, event:EventObject):void
                                             // @ret this
//{@dev
    $valid($type(requestParam,        "Object"),        WebWorker_post, "requestParam");
    $valid($type(transferableObjects, "Array|omit"),    WebWorker_post, "transferableObjects");
    $valid($type(callback,            "Function|omit"), WebWorker_post, "callback");
//}@dev

    var that = this;
    var count = ++that._count;
    var key = _createKey(that._workerID, count);

    requestParam["WORKER_ID"]  = that._workerID;
    requestParam["REQUEST_ID"] = count;

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

    // 引数 callback が指定されている場合は、
    // this._callbacks[key] = callback; の形で登録し
    // _handleWorkerEvent で受けたイベントを callback(err, event) の形でコールバックする
    if (callback) {
        that._callbacks.length++;
        that._callbacks[key] = callback;
    }

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("->  WebWorker#post(" + key + ")");
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
    var key = _createKey(that._workerID, that._count);

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("x   WebWorker#close(" + key + ")");
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
    that._defaultCallback        = null;
    that._handleWorkerEvent      = null;
    that._handleWorkerErrorEvent = null;
}

function _handleWorkerEvent(event) {
    var that = this;
    var workerID  = event.data["WORKER_ID"]  || 0;
    var requestID = event.data["REQUEST_ID"] || 0;

    if (workerID === that._workerID) {
        var key = _createKey(workerID, requestID);

//{@verbose
        if (that._verbose && global["console"]) {
            console.log("<-  WebWorker#post(" + key + ")");
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

function _handleWorkerErrorEvent(event) {
    event.preventDefault();  // error event is cancelable.
    event.stopPropagation();

    var that = this;

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("err WebWorker#post(" + Object.keys(that._callbacks).join(",") + ")");
    }
//}@verbose

    if (that._defaultCallback) {
        var key = _createKey(that._workerID, 0);

        that._defaultCallback(new Error("WebWorker#post(" + key + ")"), event);
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

