(function () {
  const ws = initWS()

  // SocketModel is the websocket model
  const Model = {
    ids: ['prev', 'next', 'start', 'current', 'executing', 'running', 'version', 'counter', 'name', 'spec', 'progress', 'status', 'start-exec', 'end-exec', 'info-exec'],
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
      this.data.job_start_time = null
      this.data.job_end_time = null
      this.data.prev_execution = null
      this.data.next_execution = null
    },
    data: {},
    getProgressPercentage () {
      if (!this.data.prev_execution || !this.data.prev_execution) {
        return '0%'
      }
      const prevExecutionTime = this.formatTime(this.data.prev_execution)

      if (prevExecutionTime.trim() === '08:00:00 am') {
        return '0%'
      }
      const a = new Date(this.data.prev_execution).getTime()
      const b = new Date(this.data.next_execution).getTime()
      const c = Date.now()
      return this.toPercentage(Math.ceil((c - a) / (b - a) * 100))
    },
    getJobDuration () {
      const start = this.data.job_start_time
      const end = this.data.job_end_time

      const seconds = (new Date(end).getTime() - new Date(start).getTime()) / 1000
      if (!seconds) {
        return 'N/A'
      }
      // Can I convert it to minutes?
      const minutes = Math.floor(seconds / 60)
      if (minutes > 1) {
        return `${minutes}min ${seconds}s`
      }
      const hours = Math.floor(seconds / (60 * 60))
      if (hours > 1) {
        return `${hours}hr ${minutes}min ${seconds}s`
      }
      return `${seconds}s`
    },
    formatTime (time) {
      if (!time) {
        return '-'
      }
      return moment(time).format('hh:mm:ss a')
    },
    toPercentage (value) {
      return `${value}%`
    }
  }

  const View = {
    el: {},
    findId (el, id) {
      this.el[el] = document.getElementById(id)
    },
    findClass (el, className) {
      this.el[el] = document.querySelector(className)
    },
    query (el) {
      return this.el[el]
    },
    setStatus (message) {
      this.el.status.innerHTML = message
    }
  }

  const Controller = (model, view) => {
    return {
      // Throttles the request animation frame
      throttle (delta) {
        if (model.isThrottled()) {
          model.increment(delta)
          return
        }
        model.reset()
      },
      setView (el, content) {
        view.el[el].innerHTML = content
      },
      init () {
        // Add existing class
        view.findClass('progress-bar', '.progress-bar')
        view.findClass('progress-label', '.progress-label')
        view.findClass('toggle', '.button-toggle-wrapper')
        view.findClass('bullet-start', '.bullet-row--start')
        view.findClass('bullet-stop', '.bullet-row--stop')

        // Search for all the id
        model.ids.forEach((id) => {
          view.findId(id, id)
        })

        this.bindEvents()
      },
      setData (data) {
        model.data = data
      },

      _setProgressLabelPosition () {
        view.query('progress-label').style.left = model.data.progressInPercent
      },
      _setProgressBarWidth () {
        view.query('progress-bar').style.width = model.data.progressInPercent
      },
      _setProgressCounter () {
        view.setView('progress', model.data.progressInPercent)
      },
      updateProgressView () {
        const progress = model.getProgressPercentage()
        this.setView('progress', progress)
        view.query('progress-bar').style.width = progress
        view.query('progress-label').style.left = progress
      },
      updateTimerView () {
        const prevExecutionTime = model.formatTime(model.data.prev_execution)

        if (prevExecutionTime.trim() === '08:00:00 am') {
          this.setView('prev', 'N/A')
        } else {
          this.setView('prev', prevExecutionTime)
        }
        this.setView('next', model.formatTime(model.data.next_execution))
        this.setView('start', model.formatTime(model.data.start_time))
      },
      updateClockView () {
        this.setView('current', model.formatTime(new Date()))
      },
      updateCronStatusView () {
        const stop = view.query('bullet-stop')
        const start = view.query('bullet-start')
        stop.classList.remove('is-active')
        start.classList.remove('is-active')

        if (model.data.is_executing) {
          start.classList.add('is-active')
        } else {
          stop.classList.add('is-active')
        }

        this.setView('info-exec', model.getJobDuration())
        this.setView('start-exec', model.formatTime(model.data.job_start_time))
        this.setView('end-exec', model.formatTime(model.data.job_end_time))
      },
      bindEvents () {
        view.query('toggle').addEventListener('click', (evt) => {
          const target = evt.currentTarget
          model.enabled = !target.classList.contains('is-active')
          target.classList.toggle('is-active')

          const targetUrl = model.enabled ? '/crons/start' : '/crons/stop'
          window.fetch(targetUrl, {
            method: 'post',
            body: JSON.stringify({
              username: 'john.doe',
              password: '123456'
            })
          }).then((body) => {
            return body.json()
          }).then((data) => {
            console.log(data)
          }).catch((error) => {
            console.log(error)
          })
        }, false)
      }
    }
  }

  const controller = Controller(Model, View)
  controller.init()

  // Usage
  let loop = null
  loop = window.animLoop(function (delta, now) {
    if (Model.isClosed) {
      return loop && window.cancelAnimationFrame(loop)
    }
        // rendering code goes here
    controller.throttle(delta)
    controller.updateClockView()
    ws.send(JSON.stringify({ event: 'tick' }))
  })

  function initWS () {
    if (!window.WebSocket) {
      window.alert('WebSocket is not supported on this browser.')
      return
    }
    const socket = new window.WebSocket('ws://localhost:8080/ws')
    socket.onopen = function () {
      controller.setView('status', 'Connected')
    }
    socket.onmessage = function (evt) {
      const data = JSON.parse(evt.data)

      if (!data.is_running) {
        controller.setData({})
        controller.updateTimerView()
        controller.updateProgressView()
        controller.updateCronStatusView()
        return
      }
      controller.setData(data)
      controller.updateTimerView()
      controller.updateProgressView()
      controller.updateCronStatusView()

      // if (data.is_running) {
      //   View.setStatus('Running')
      //   View.el.running.classList.add('is-running')
      // } else {
      //   View.setStatus('Waiting')
      //   View.el.running.classList.remove('is-running')
      // }
      // if (data.is_executing) {
      //   View.setStatus('Executing')
      //   View.el.status.classList.add('is-pop')
      // } else {
      //   View.el.status.classList.remove('is-pop')
      // }

      // const timeTakenForJob = new Date(job_end_time).getTime() - new Date(job_start_time).getTime()

      // View.el['start-exec'].innerHTML = data.job_start_time
      // View.el['end-exec'].innerHTML = data.job_end_time
      // View.el['info-exec'].innerHTML = Math.floor(timeTakenForJob / 1000) + 's'
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
      Model.reset()
      controller.setData({})
      controller.updateTimerView()
      controller.updateProgressView()
      controller.updateCronStatusView()
      // Reset Model
      // Model.data.
    }
    return socket
  }
})()
