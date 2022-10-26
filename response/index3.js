let activeEffect;
let bucket = new WeakMap()
// 此处我们使用weakMap的原因其实也非常简单，就是说，如果我们的这个对象被收集了，那么我们就希望直接将其连带的副作用给收集了

const cleanUp = (effectFn) => {
  effectFn.deps.forEach(dep => {
    dep.delete(effectFn)
  })
  effectFn.deps.length = 0
}

const effect = (fn) => {
  const effectFn = () => {
    // 在每次 调用effect的时候，我们会去先清理该effect的依赖，
    cleanUp(effectFn)
    activeEffect = effectFn
    // 然后进行重新构建
    fn()
  }
  effectFn.deps = []
  effectFn()
}
const data = {
  ok: true,
  text: "some"
}

const track = (target, key) => {
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
  activeEffect.deps.push(deps)
}
const trigger = (target, key, newVal) => {
  target[key] = newVal
  const depsMap = bucket.get(target)
  if (!depsMap) return true
  const effects = depsMap.get(key)
  const newSet = new Set(effects)
  effects && newSet.forEach(fn => {
    fn()
  });
}

const obj = new Proxy(data, {
  get(target, key) {
    track(target, key)
    return target[key]
  },
  set(target, key, newVal) {
    trigger(target, key, newVal)
    return true
  }
})
effect(() => {
  console.log("effect!!")
  document.body.innerHTML = obj.ok ? obj.text : "not"
})

setTimeout(() => {
  obj.ok = false
  console.log(bucket)
  // 这个时候 {"text" => Set(0)}
  // 这个时候 {"ok" => Set(1)}
}, 1000)




setTimeout(() => {
  obj.notExit = "hello vue3"
  // 这个地方就不会加进去了
}, 2000)

// 这样的话，就可以存在一个
// weakMap =====
// target 
//       --- key
//               --- Set(fn1 fn2 fn3)