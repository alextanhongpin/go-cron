(function () {
  const ws = initWS()

  // SocketModel is the websocket model
  const Model = {
    isClosed: false, // Bool to check if the socket is closed
    counter: 0, // Int that records the time
    throttle: 500, // Int in milliseconds the time to debounce the request animation frame
    isThrottled () {
      return this.counter < this.throttle
    },
    increment (value) {
      this.counter += value
    },
    reset () {
      this.counter = 0
    }
  }

  const View = {
    el: {},
    ids: ['prev', 'next', 'start', 'current', 'executing', 'running', 'version', 'counter', 'name', 'spec', 'progress', 'status', 'start-exec', 'end-exec', 'info-exec'],
    find () {
      this.ids.forEach((id) => {
        this.el[id] = document.getElementById(id)
      })
    },
    query (el, className) {
      this.el[el] = document.querySelector(className)
    },
    setStatus (message) {
      this.el.status.innerHTML = message
    }
  }

  View.find()

  View.query('progress-bar', '.progress-bar')
  View.query('progress-label', '.progress-label')

  // Usage

  const anim = window.animLoop(function (delta, now) {
    if (Model.isClosed) {
      window.cancelAnimationFrame(anim)
      return
    }
        // rendering code goes here
    View.el.current.innerHTML = moment().format('hh:mm:ss')
    if (Model.isThrottled()) {
      Model.increment(delta)
      return
    }
    Model.reset()
    ws.send(JSON.stringify({ event: 'tick' }))
  })

  function initWS () {
    if (!window.WebSocket) {
      window.alert('WebSocket is not supported on this browser.')
      return
    }
    const socket = new window.WebSocket('ws://localhost:8080/ws')
    socket.onopen = function () {
      View.setStatus('Connected')
    }
    socket.onmessage = function (evt) {
      const data = JSON.parse(evt.data)
      const {
        job_start_time,
        job_end_time
      } = data

      View.el.prev.innerHTML = moment(data.prev_execution).format('hh:mm:ss')
      View.el.next.innerHTML = moment(data.next_execution).format('hh:mm:ss')

      const t = new Date(data.next_execution).getTime()
      const p = new Date(data.prev_execution).getTime()
      const n = Date.now()
      const progressInPercent = (n - p) / (t - p) * 100

      const progressEl = View.el.progress

      View.el['progress-bar'].style.width = Math.ceil(progressInPercent) + '%'
      View.el['progress-label'].style.left = Math.ceil(progressInPercent) + '%'

      progressEl.innerHTML = Math.ceil(progressInPercent)
      console.log(progressInPercent)

      if (progressInPercent < 50) {
        progressEl.classList.remove('is-red')
        progressEl.classList.remove('is-green')
        progressEl.classList.remove('is-orange')
        progressEl.classList.add('is-green')
      } else if (progressInPercent < 75) {
        progressEl.classList.remove('is-red')
        progressEl.classList.remove('is-green')
        progressEl.classList.remove('is-orange')
        progressEl.classList.add('is-orange')
      } else {
        progressEl.classList.remove('is-red')
        progressEl.classList.remove('is-green')
        progressEl.classList.remove('is-orange')
        progressEl.classList.add('is-red')
      }

      View.el.start.innerHTML = data.start_time
      View.el.executing.innerHTML = data.is_executing
      console.log(data)
      if (data.is_running) {
        View.setStatus('Running')
        View.el.running.classList.add('is-running')
      } else {
        View.setStatus('Waiting')
        View.el.running.classList.remove('is-running')
      }
      if (data.is_executing) {
        View.setStatus('Executing')
        View.el.status.classList.add('is-pop')
      } else {
        View.el.status.classList.remove('is-pop')
      }

      const timeTakenForJob = new Date(job_end_time).getTime() - new Date(job_start_time).getTime()

      View.el['start-exec'].innerHTML = data.job_start_time
      View.el['end-exec'].innerHTML = data.job_end_time
      View.el['info-exec'].innerHTML = Math.floor(timeTakenForJob / 1000) + 's'
      View.el.version.innerHTML = data.version
      View.el.counter.innerHTML = data.counter
      View.el.name.innerHTML = data.job_name
      View.el.spec.innerHTML = data.spec
    }
    socket.onclose = function () {
      Model.isClosed = true
      // Reset everything and set status to disconnected
      console.info('Socket closed')

      View.setStatus('Disconnected')
    }
    return socket
  }
})()
