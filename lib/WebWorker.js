(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

var _workerID = 0;
var _BLOB    = global["Blob"]  || global["webkitBlob"] || null;
var _URL     = global["URL"]   || global["webkitURL"] ||
/*{@xbrowser*/ global["msURL"] || global["mozURL"] ||
/*}@xbrowser*/ null;

// --- class / interfaces ----------------------------------
function WebWorker(initParam,         // @arg Object - { origin, inline, source, script, count, verbose }
                                      // @initParam.origin  String = ""            - origin.
                                      // @initParam.inline  Boolean = false        - inline worker.
                                      // @initParam.source  String                 - new Worker(source) or inline worker source
                                      // @initParam.script  URLStringArray = []    - importScripts(...) files.
                                      // @initParam.count   Integer = 0            - count initial value.
                                      // @initParam.verbose Boolean = false        - verbose mode.
                   defaultCallback) { // @arg Function = null - defaultCallback(err:Error|null, event:EventObject, body:Object, head:Object):void
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

    this._origin  = initParam["origin"]  || "";
    this._inline  = initParam["inline"]  || false;
    this._source  = initParam["source"]  || null;
    this._script  = initParam["script"]  || [];
    this._verbose = initParam["verbose"] || false;

    this._defaultCallback = defaultCallback || null;
    this._callbacks = { length: 0 }; // { id: callback, ... }
    this._blobURL = ""; // blob url for inline worker
    this._worker = null;
    this._workerID = ++_workerID;
    this._count = 0;

    if (initParam["count"]) {
        this._count = initParam["count"];
        this._count--;
    }

    this._handleResponse   = _handleResponse["bind"](this);
    this._handleErrorEvent = _handleErrorEvent["bind"](this);
}

//{@dev
WebWorker["repository"] = "https://github.com/uupaa/WebWorker.js";
//}@dev

WebWorker["prototype"]["inbox"]   = WebWorker_inbox;   // WebWorker#inbox(task:Task, name:String, data:Object):void
WebWorker["prototype"]["request"] = WebWorker_request; // WebWorker#request(requestParam:Object, transferableObjects:Array = null, callback:Function = null):this
WebWorker["prototype"]["close"]   = WebWorker_close;   // WebWorker#close():this

// --- implements ------------------------------------------
function _createCallbackID(workerID, // @arg Integer
                           count) {  // @arg Integer
                                     // @ret String - "{workerID}_{count}"
                                     // @desc create callback id.
    return workerID + "_" + count;
}

function WebWorker_inbox(task,   // @arg Task
                         name,   // @arg String - Object ID
                         data) { // @arg Object - request data
                                 // @desc Message.js over WebWorker.js
//{@dev
    $valid($type(task, "Task"),   WebWorker_inbox, "task");
    $valid($type(name, "String"), WebWorker_inbox, "name");
    $valid($type(data, "Object"), WebWorker_inbox, "data");
//}@dev

    _request(this, data, null, function(err, event, body) {
        if (!err) {
            task["set"](name, body["result"] || "");
        }
        task["done"](err);
    }, "inbox");
}

function WebWorker_request(data,                // @arg Object       - request data.
                           transferableObjects, // @arg Array = null - Transferable Objects.
                           callback,            // @arg Function = null - response after callback(err:Error, event:EventObject, body:Object, head:Object):void
                           command) {           // @arg String = "" - command routing
                                                // @ret this
                                                // @desc open and request Worker session.
//{@dev
    $valid($type(data,                "Object"),        WebWorker_request, "data");
    $valid($type(transferableObjects, "Array|omit"),    WebWorker_request, "transferableObjects");
    $valid($type(callback,            "Function|omit"), WebWorker_request, "callback");
    $valid($type(command,             "String|omit"),   WebWorker_request, "command");
//}@dev

    _request(this, data, transferableObjects || null, callback || null, command || "");
    return this;
}

function _request(that, data, transferableObjects, callback, command) {
    ++that._count;

    var request = null; // { body, head }

    if (that._worker) { // already
        request = {
            "body": data,
            "head": {
                "WORKER_ID":    that._workerID,
                "REQUEST_ID":   that._count,
                "COMMAND":      command
            }
        };
    } else { // init worker
        _createWorker(that);
        _bindWorkerHandler(that);
        request = {
            "body": data,
            "head": {
                "INIT":         true,
                "ORIGIN":       that._origin,
                "SCRIPT":       that._script,
                "WORKER_ID":    that._workerID,
                "REQUEST_ID":   that._count,
                "COMMAND":      command
            }
        };
    }

    var id = _createCallbackID(that._workerID, that._count);

    // 引数 callback が指定されている場合は、
    // that._callbacks[id] = callback; の形で登録し
    // _handleResponse で受けたイベントを callback(err, event) の形でコールバックする
    if (callback) {
        that._callbacks.length++;
        that._callbacks[id] = callback;
    }

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("->  WebWorker#request(" + id + ")");
    }
//}@verbose

    if (transferableObjects) {
        that._worker["postMessage"](request, transferableObjects);
    } else {
        that._worker["postMessage"](request);
    }
}

function WebWorker_close() { // @ret this
                             // @desc close Worker session
    var that = this;
    var id = _createCallbackID(that._workerID, that._count);

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("x   WebWorker#close(" + id + ")");
    }
//}@verbose

    _unbindWorkerHandler(that);
    _releaseWorker(that);
    that._callbacks = { length: 0 };
    return that;
}

function _createWorker(that) { // @arg this
                               // @desc create Worker or InlineWorker
    if (that._inline) {
        // 1. create blob resource
        var blob = new _BLOB([that._source], { "type": "application/javascript" });

        that._blobURL = _URL["createObjectURL"](blob); // blob://...

        // 2. create inline worker
        that._worker = new Worker(that._blobURL);
    } else {
        that._worker = new Worker(that._source);
    }
}

function _releaseWorker(that) {
    that._worker["terminate"]();
    that._worker = null; // [!][GC]

    if (that._inline) {
        _URL["revokeObjectURL"](that._blobURL); // [!] GC
        that._blobURL = "";
    }
}

function _bindWorkerHandler(that) {
    that._worker.addEventListener("message", that._handleResponse);
    that._worker.addEventListener("error",   that._handleErrorEvent);
}

function _unbindWorkerHandler(that) {
    that._worker.removeEventListener("message", that._handleResponse);
    that._worker.removeEventListener("error",   that._handleErrorEvent);
}

function _rebuildErrorObject(head) {
    // postMessage では ErrorObjectは渡せないため、
    // エラータイプとエラーメッセージをevent.data.head で受け取り、
    // 現在のコンテキストでErrorObject を再構築する
    var type = head["ERROR_TYPE"];
    var msg  = head["ERROR_MESSAGE"];

    if (type && msg) {
        return new global[type](msg);
    }
    return null;
}

function _handleResponse(event) { // @arg EventObject - { data: { body, head }, ... }
    //  var worker = new WorkerResponder(function(event, body) {
    //      worker.response({ result: result }); -> call _handleResponse
    //  });

    var that = this;
    var body = event["data"]["body"] || {};
    var head = event["data"]["head"] || {};
    var workerID  = head["WORKER_ID"]  || 0;
    var requestID = head["REQUEST_ID"] || 0;

    // event.data.head.workerID と that._workerID が同じ場合は
    // このインスタンスが生成したワーカーからのレスポンスなので処理する。
    // (一致しない場合は他のインスタンスが生成したワーカーからのレスポンス)
    if (workerID === that._workerID) {
        var id = _createCallbackID(workerID, requestID);
        var err = _rebuildErrorObject(head);

//{@verbose
        if (that._verbose && global["console"]) {
            if (err) {
                console.log("<-  WebWorker#request(" + id + ")\n" + err.message);
            } else {
                console.log("<-  WebWorker#request(" + id + ")");
            }
        }
//}@verbose

        // id に一致する callback が登録されている場合は、
        // this._defaultCallback の代わりにそちらをコールバックする
        var callback = that._callbacks[id] || null;

        if (callback) {
            if (--that._callbacks.length <= 0) {
                // GC による速度低下を予防するために、length による要素数の管理を行う
                // length が 0 以下なら callbacks を再作成する
                that._callbacks = { length: 0 };
            } else {
              //delete that._callbacks[id]; // possibility of GC -> maybe slowly
                that._callbacks[id] = null; // remove without GC -> maybe quickly
            }
            callback(err, event, body, head);
        } else if (that._defaultCallback) {
            that._defaultCallback(err, event, body, head);
        }
    }
}

function _handleErrorEvent(event) {
    // ここに来るのは、importScript("WorkerResponder.js") か、
    // WorkerResponder の外側でエラーが発生した場合に限定される
    // test/worker/throw.outer.js のケースが該当する

    event.preventDefault();  // error event is cancelable.
    event.stopPropagation();

    var that = this;

//{@verbose
    if (that._verbose && global["console"]) {
        console.log("err WebWorker#request(" + Object.keys(that._callbacks).join(",") + ")");
    }
//}@verbose

    if (that._defaultCallback) {
        var id = _createCallbackID(that._workerID, 0);

        that._defaultCallback(new Error("WebWorker#request(" + id + ")"), event);
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

