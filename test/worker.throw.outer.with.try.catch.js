try {
    importScripts("../lib/WorkerThread.js");

    console.log("worker.throw.outer.with.try.catch.js, throw exception");
    throw new Error("worker.throw.outer.with.try.catch.js");
} catch (o_o) {
    debugger;
    console.log("worker.throw.outer.with.try.catch.js, ignore exception");
}


