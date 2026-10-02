// Serialize whole provider operations without Durable Objects' 30-second input gate.
// Only waiting operations expire: releasing a running operation would let another
// request race an uncertain provider write. Its durable checkpoints remain authoritative.
export class ProjectOperations {
  constructor({ maxPending = 64, maxWaitMs = 30000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
    this.maxPending = maxPending; this.maxWaitMs = maxWaitMs;
    this.setTimer = setTimer; this.clearTimer = clearTimer;
    this.waiting = []; this.running = false;
  }
  run(callback) {
    if (this.waiting.length + Number(this.running) >= this.maxPending) return Promise.reject(this.busy());
    return new Promise((resolve, reject) => {
      const operation = { callback, resolve, reject };
      this.waiting.push(operation);
      if (this.running) operation.timer = this.setTimer(() => {
        this.waiting.splice(this.waiting.indexOf(operation), 1);
        reject(this.busy());
      }, this.maxWaitMs);
      this.next();
    });
  }
  busy() { return Object.assign(new Error('Hosted project busy; retry safe status'), { status: 503 }); }
  next() {
    if (this.running || !this.waiting.length) return;
    const operation = this.waiting.shift();
    if (operation.timer !== undefined) this.clearTimer(operation.timer);
    this.running = true;
    Promise.resolve().then(operation.callback).then(
      value => { this.running = false; operation.resolve(value); this.next(); },
      error => { this.running = false; operation.reject(error); this.next(); },
    );
  }
}
