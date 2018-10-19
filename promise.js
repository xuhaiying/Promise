const PENDING = 'pending';// 等待态
const RESOLVED = 'resolved';// 成功态
const REJECTED = 'rejected';// 失败态

function Promise (executor){
    let self = this;
    self.status = PENDING;// 默认未等待态
    self.value = undefined;// 存放成功后的返回值
    self.reason = undefined;// 失败的原因
    self.onReasolvedCallbacks = [];// 存放成功后的回调函数
    self.onRejectedCallbacks = []; // 存放失败后的回调函数
    function resolve(value){
        // 只有等待态才能转为成功态或失败态
        if(self.status === PENDING){
            self.value = value;
            self.status = RESOLVED; // 将状态改为成功态
            self.onReasolvedCallbacks.forEach(function(fn){ // 执行所有成功的回调函数
                fn();
            })
        }
    }
    function reject(reason){
        if (self.status === PENDING){
            self.reason = reason;
            self.status = REJECTED;
            self.onRejectedCallbacks.forEach(function (fn){// 执行所有失败的回调函数
                fn();
            })
        }
    }
    // executor 执行过程中可以会出现异常，如果出现异常，直接执行错误处理函数
    try{
        executor(resolve,reject);
    } catch(e) {
        reject(e)
    }  
}
function resolvePromise (promise2,x,resolve,reject){
    let called;
    // 如果返回的x和promise2是用一个函数，需要抛出TypeErr，否则将处于死锁状态，互相等待
    if (promise2 === x){
        return reject(new TypeError('循环引用'));
    }
    // 如果x是一个函数或者x是一个对象 就有可能x是一个promise
    if (x != null && (typeof x === 'function'|| typeof x === 'object')){
        try {
            let then = x.then;
            if (typeof then === 'function'){ // 是promise
                then.call(x,function (y){ // 执行then方法将this指向x
                    if (!called){ // 不让用户调用成功又调用失败
                        called = true;
                        // y可能还是一个promise 递归执行resolvePromise直至y是一个普通值
                        resolvePromise(promise2,y,resolve,reject);
                    }
                },function (r){
                    if (!called){
                        called = true;
                        reject(r);
                    } 
                });
            } else { // 是一个类似于{then:123} 的普通对象
                if (!called){
                    called = true;
                    resolve(x);
                } 
            }
        } catch(e){
            if (!called){
                called = true;
                reject(e);
            } 
        }
    } else { // 如果是普通值，直接成功
        resolve(x);
    }
}
// onFulfiled,onRejected 是可选参数
Promise.prototype.then = function (onFulfilled,onRejected){
    // 如果onFulFiled不是一个函数给他赋一个默认的函数 将value返回即可
    onFulfilled = typeof onFulfilled === 'function'? onFulfilled: function (value){ return value };
    // 如果onRejected不是一个函数给他赋一个默认函数 抛出一个异常
    onRejected = typeof onRejected === 'function'? onRejected: function (err){ throw err };
    // 缓存this
    let self = this;
    // 返回一个promise函数
    let promise2 = new Promise(function (resolve,reject){
        if (self.status === RESOLVED){
            setTimeout(function (){
                try {
                    // 把then中成功或者失败后函数执行的结果获取到
                    let x = onFulfilled(self.value);
                    // 看一看是不是promise 如果是promise就让promise执行,取到最终这个promise的执行结果，让返回的promise成功或者失败
                    resolvePromise(promise2,x,resolve,reject);
                } catch(e){
                    reject(e);
                }
            },0);
        }
        if (self.status === REJECTED){
            setTimeout(function (){
                try {
                    let x = onRejected(self.reason);
                    resolvePromise(promise2,x,resolve,reject);
                } catch(e){
                    reject(e);
                }
            },0);
        }
        // 如果是等待态则将回调函数存放到响应的数组中
        if (self.status === PENDING){
            self.onReasolvedCallbacks.push(function (){
                setTimeout(function (){
                    try {
                        // 把then中成功或者失败后函数执行的结果获取到
                        let x = onFulfilled(self.value);
                        // 看一看是不是promise 如果是promise就让promise执行,取到最终这个promise的执行结果，让返回的promise成功或者失败
                        resolvePromise(promise2,x,resolve,reject);
                    } catch(e){
                        reject(e);
                    }
                },0);
            });
            self.onRejectedCallbacks.push(function (){
                setTimeout(function (){
                    try {
                        let x = onRejected(self.reason);
                        resolvePromise(promise2,x,resolve,reject);
                    } catch(e){
                        reject(e);
                    }
                },0);
            })
        }
    });
    return promise2;
}
Promise.prototype.catch = function (errFn){
    // catch就是特殊的then方法
    return this.then(null,errFn);
}
Promise.resolve = function(value){
    return new Promise(function (resolve,reject){
        resolve(value);
    })
}
Promise.reject = function (reason){
    return new Promise(function (resolve,reject){
        reject(reason);
    })
}
// ES9的草案，原生的Promise也还不支持
Promise.prototype.finnally = function (cb){
    // finnally中传递的回调函数必须会执行
    return this.then(function (data){
        // 返回一个Promise，将上一次的状态继续传递下去
        return Promise.resolve(cb()).then(function (){
            return data;
        });
    },function (reason){
        return Promise.resolve(cb()).then(function (){
            throw reason;
        });
    })
}
Promise.defer = Promise.deferred = function (){
    let dfd = {};
    dfd.promise = new Promise((resolve,reject)=>{
        dfd.resolve = resolve;
        dfd.reject = reject;
    })
    return dfd;
}
module.exports = Promise;