let activeEffect;
let bucket = new WeakMap()
// 此处我们使用weakMap的原因其实也非常简单，就是说，如果我们的这个对象被收集了，那么我们就希望直接将其连带的副作用给收集了
const effectsStack = []
const cleanUp = (effectFn) => {
  effectFn?.deps?.forEach(dep => {
    dep.delete(effectFn)
  })
  effectFn.deps.length = 0
}

const effect = (fn, options = {}) => {
  const effectFn = () => {
    // 在每次 调用effect的时候，我们会去先清理该effect的依赖，
    cleanUp(effectFn)
    activeEffect = effectFn
    effectsStack.push(activeEffect)
    // 然后进行重新构建
    const res = fn()
    effectsStack.pop()
    activeEffect = effectsStack[effectsStack.length - 1]
    return res
  }
  effectFn.options = options
  effectFn.deps = []
  if (!options.lazy) {
    effectFn()
  }
  return effectFn
}
const data = {
  foo: 1,
  bar: 2
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
  newSet.forEach(fn => {
    if (fn.options.scheduler) {
      fn.options.scheduler(fn)
    } else {
      fn()
    }
  })
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

function computed(getter) {
  let value;
  let dirty = true
  const effectFn = effect(getter, {
    lazy: true, scheduler() {
      if (!dirty) {
        dirty = true
        trigger(tempObj, "value")
      }
    }
  })
  const tempObj = {
    get value() {
      track(tempObj, "value")
      if (dirty) {
        dirty = false
        return value = effectFn()
      } else {
        return value
      }
    }
  }
  return tempObj
}

const resSum = computed(() => obj.foo + obj.bar)
/**
 * 
 * 
====1          
calculate!!!    
3               
====2           
3               
====3           
====4          
calculate!!!    
4

只有第一次的时候进行了计算还有最后修改那一次，别的都没进行计算。
 */

effect(() => { console.log(resSum.value) })
obj.bar++
// 但是这个地方只有重新去调用的时候，我们才会发现他的 dirty 是 true的时候，我们才会去
// console.log(resSum.value)
// console.log(bucket)