let activeEffect;
let bucket = new WeakMap()
// 此处我们使用weakMap的原因其实也非常简单，就是说，如果我们的这个对象被收集了，那么我们就希望直接将其连带的副作用给收集了
const effect = (fn) => {
  activeEffect = fn
  fn()
}
const data = {
  text: "some"
}

const obj = new Proxy(data, {
  get(target, key) {
    if (!activeEffect) return
    let depsMap = bucket.get(target)
    if (!depsMap) {
      bucket.set(target, depsMap = new Map())
    }
    let deps = depsMap.get(key)
    if (!deps) {
      depsMap.set(key, deps = new Set())
    }
    deps.add(activeEffect)
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    const depsMap = bucket.get(target)
    if (!depsMap) return true
    const effects = depsMap.get(key)
    effects && effects.forEach(fn => {
      fn()
    });
    return true
  }
})
effect(() => {
  document.body.innerHTML = obj.text
})

obj.text = "12312"


setTimeout(() => {
  obj.notExit = "hello vue3"
  // 这个地方就不会加进去了
}, 2000)

// 这样的话，就可以存在一个
// weakMap =====
// target 
//       --- key
//               --- Set(fn1 fn2 fn3)