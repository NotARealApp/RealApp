// Loads the real app.js inside a Node vm with a stubbed DOM, so tests exercise
// the shipped pure functions (route math, formatters, colors) without copying
// logic. Top-level `function` declarations become properties of the context.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function fakeEl() {
  const el = {
    classList: { toggle() {}, add() {}, remove() {} },
    style: {},
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    addEventListener() {},
    querySelector() { return fakeEl(); },
    querySelectorAll() { return []; },
    textContent: "", innerHTML: "", onclick: null,
  };
  return el;
}

const sandbox = {
  console,
  Date, Math, JSON, Promise, Object, Array, parseInt, parseFloat, encodeURIComponent, isNaN, URLSearchParams,
  setInterval: () => 0,
  setTimeout: () => 0,
  fetch: () => new Promise(() => {}), // never resolves — loadAll() just suspends
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: {}, // no serviceWorker -> registration block skipped
  window: { addEventListener() {}, location: { reload() {} } },
  document: {
    getElementById: () => fakeEl(),
    documentElement: { setAttribute() {}, getAttribute: () => "dark" },
    addEventListener() {},
  },
};
sandbox.globalThis = sandbox;

const code = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: "app.js" });

module.exports = sandbox;
