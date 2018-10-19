class Promise {
    constructor(executor){
        this.value = undefined;
        this.reason = undefined;
        this.status = 'pending';
        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];
        let resolve = (value)=>{
            if (this.status === 'pending'){
                this.value = value;
                this.status = 'resolved';
                this.onResolvedCallbacks.forEach(fn=>fn());
            }
        }
        let reject = (reason)=>{
            if (this.status === 'pending'){
                this.reason = reason;
                this.status = 'rejected';
                this.onRejectedCallbacks.forEach(fn=>fn());
            }
        }
        try{
            executor(resolve,reject);
        } catch (e){
            reject(e);
        }  
    }
    // onFulfiled,onRejected 是可选参数
    then(onFulfiled,onRejected){
        onFulfiled = typeof onFulfiled == 'function'?onFulfiled: (data)=>{return data};
        onRejected = typeof onRejected == 'function'?onRejected: (err)=>{throw err};
        let promise2 = new Promise((resolve,reject)=>{
            if (this.status === 'resolved'){
                setTimeout(()=>{
                    try{
                        let x = onFulfiled(this.value);
                        resolvePromise (promise2,x,resolve,reject);
                    } catch (e){
                        reject(e);
                    }
                },0)
            }
            if (this.status === 'rejected'){
                setTimeout(()=>{
                    try{
                        let x = onRejected(this.reason);
                        resolvePromise (promise2,x,resolve,reject);
                    } catch (e){
                        reject(e);
                    }
                },0)
            }
            if (this.status === 'pending'){
                this.onResolvedCallbacks.push(()=>{
                    try{
                        let x = onFulfiled(this.value);
                        resolvePromise (promise2,x,resolve,reject);
                    } catch (e){
                        reject(e);
                    }
                });
                this.onRejectedCallbacks.push(()=>{
                    try{
                        let x = onRejected(this.reason);
                        resolvePromise (promise2,x,resolve,reject);
                    } catch (e){
                        reject(e);
                    }
                })
            }
        })
        return promise2;
    }
}
let resolvePromise = (promise2,x,resolve,reject)=>{
    let called;
    if (promise2 === x) {
        return reject(new TypeError('循环引用'));
    }
    if (x != null && (typeof x === 'object' || typeof x === 'function')){
        try{
            let then = x.then;
            if (typeof then === 'function'){
                then.call(x,y=>{
                    if (!called){
                        called = true;
                        // y可能还是一个promise
                        resolvePromise(promise2,y,resolve,reject);
                    } 
                },r=>{
                    if (!called){
                        called = true;
                        reject(r);
                    }
                });
            } else {
                if (!called){
                    called = true;
                    resolve(x);
                }
            }
        } catch (e){
            if (!called){
                called = true;
                reject(r);
            }
        }
    } else {
        resolve(x);
    }
}

module.exports = Promise;