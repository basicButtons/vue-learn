let activeEffect;
let bucket = new Set()
const effect = (fn) => {
  activeEffect = fn
  fn()
}
const data = {
  text: "some"
}
const obj = new Proxy(data, {
  get(target, key) {
    if (activeEffect) {
      bucket.add(activeEffect)
    }
    return target[key]
  },
  set(target, key, newVal) {
    target[key] = newVal
    bucket.forEach(fn => fn())
    return true
  }
})
effect(() => {
  document.body.innerHTML = obj.text
})

obj.text = "12312"


// 这个地方反应出来的问题就是对于一些不想要去收集的内容，我们也会被添加进去了。
setTimeout(() => {
  obj.notExit = "hello vue3"
}, 2000)