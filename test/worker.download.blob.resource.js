(function(global) {
"use strict";

// --- dependency modules ----------------------------------
importScripts("../lib/WorkerThread.js");

// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;
var _BLOB = global["Blob"]|| global["webkitBlob"] || null;
var _URL  = global["URL"] || global["webkitURL"] || null;

// --- class / interfaces ----------------------------------
// --- implements ------------------------------------------
var worker = new WorkerThread(function(body, param) {

    var task = new Task(body.length, function(err, buffer) {

debugger;
        worker.response( Task.objectize(buffer) );
    });

    var resources = body;

    resources.forEach(function(url) {
        var xhr = new XHRProxy();

        xhr.open("GET", url);
        xhr.responseType = "blob";
        xhr.on("load", function(event) {
            //var blob = new _BLOB([xhr.response], { "type": "image/png" });
            //var blobURL = _URL["createObjectURL"](blob); // [1] blob://...
            var blob = xhr.response;
            var blobURL = _URL["createObjectURL"](blob); // [1] blob://...

            task.set(url, blobURL).pass();
        });
        xhr.send();
    });
});

// --- validate / assertions -------------------------------
// --- exports ---------------------------------------------

})((this || 0).self || global);
