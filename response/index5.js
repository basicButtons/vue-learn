let activeEffect;
let bucket = new WeakMap()
// 此处我们使用weakMap的原因其实也非常简单，就是说，如果我们的这个对象被收集了，那么我们就希望直接将其连带的副作用给收集了
let temp1
let temp2
const effectsStack = []
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
    effectsStack.push(activeEffect)
    // 然后进行重新构建
    fn()
    effectsStack.pop()
    activeEffect = effectsStack[effectsStack.length - 1]
  }
  effectFn.deps = []
  effectFn()
}
const data = {
  bar: 1,
  foo: 1
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
  const newSet = new Set()
  effects && effects.forEach(fn => {
    // 这个地方为了避免循环递归
    if (fn !== activeEffect) {
      newSet.add(fn)
    }
  });
  newSet.forEach(fn => fn())
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
  obj.foo++
})
obj.foo++;

console.log(obj.foo) //4

// 这样的话，就可以存在一个
// weakMap =====
// target 
//       --- key
//               --- Set(fn1 fn2 fn3)