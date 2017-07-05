(function () {
  const ws = initWS()

  // SocketModel is the websocket model
  const Model = {
    state: {
      ids: ['prev', 'next', 'start', 'current', 'executing', 'running', 'version', 'counter', 'name', 'spec', 'progress', 'status', 'start-exec', 'end-exec', 'info-exec'],
      isClosed: false,
      counter: 0,
      throttleDuration: 500
    },
    set (key, value) {
      this.state[key] = value
    },
    get (key) {
      return this.state[key]
    },
    update (obj) {
      this.state = Object.assign({}, this.state, obj)
    },
    computed () {
      return {
        isThrottled: () => {
          return this.get('counter') - this.get('throttle')
        },
        increment: () => {
          return this.get('counter') < this.get('throttle')
        },
        getProgressPercentage: () => {
          const prev = this.get('prev_execution')
          const next = this.get('next_execution')
          if (!prev || !next) {
            return '0%'
          }
          const prevExecutionTime = this.formatTime(prev)

          if (prevExecutionTime.trim() === '08:00:00 am') {
            return '0%'
          }
          const a = new Date(prev).getTime()
          const b = new Date(next).getTime()
          const c = Date.now()
          return this.toPercentage(Math.ceil((c - a) / (b - a) * 100))
        },
        getJobDuration: () => {
          const start = this.get('job_start_time')
          const end = this.get('job_end_time')

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
        }
      }
    },
    // ids: ['prev', 'next', 'start', 'current', 'executing', 'running', 'version', 'counter', 'name', 'spec', 'progress', 'status', 'start-exec', 'end-exec', 'info-exec'],
    // isClosed: false, // Bool to check if the socket is closed
    // counter: 0, // Int that records the time
    // throttle: 500, // Int in milliseconds the time to debounce the request animation frame
    // isThrottled () {
    //   return this.counter < this.throttle
    // },
    // increment (value) {
    //   this.counter += value
    // },
    reset () {
      // this.counter = 0
      // this.data.job_start_time = null
      // this.data.job_end_time = null
      // this.data.prev_execution = null
      // this.data.next_execution = null
      this.set('counter', 0)
      this.set('job_start_time', null)
      this.set('job_end_time', null)
      this.set('prev_execution', null)
      this.set('next_execution', null)
    },
    // data: {},
    // getProgressPercentage () {
    //   if (!this.data.prev_execution || !this.data.prev_execution) {
    //     return '0%'
    //   }
    //   const prevExecutionTime = this.formatTime(this.data.prev_execution)

    //   if (prevExecutionTime.trim() === '08:00:00 am') {
    //     return '0%'
    //   }
    //   const a = new Date(this.data.prev_execution).getTime()
    //   const b = new Date(this.data.next_execution).getTime()
    //   const c = Date.now()
    //   return this.toPercentage(Math.ceil((c - a) / (b - a) * 100))
    // },
    // getJobDuration () {
    //   const start = this.data.job_start_time
    //   const end = this.data.job_end_time

    //   const seconds = (new Date(end).getTime() - new Date(start).getTime()) / 1000
    //   if (!seconds) {
    //     return 'N/A'
    //   }
    //   // Can I convert it to minutes?
    //   const minutes = Math.floor(seconds / 60)
    //   if (minutes > 1) {
    //     return `${minutes}min ${seconds}s`
    //   }
    //   const hours = Math.floor(seconds / (60 * 60))
    //   if (hours > 1) {
    //     return `${hours}hr ${minutes}min ${seconds}s`
    //   }
    //   return `${seconds}s`
    // },
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
        if (model.computed().isThrottled()) {
          model.computed().increment(delta)
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
        model.get('ids').forEach((id) => {
          view.findId(id, id)
        })

        this.bindEvents()
      },
      setData (data) {
        // model.data = data
        model.update(data)
      },

      updateProgressView () {
        const progress = model.computed().getProgressPercentage()
        this.setView('progress', progress)
        view.query('progress-bar').style.width = progress
        view.query('progress-label').style.left = progress
      },
      updateTimerView () {
        const prevExecutionTime = model.formatTime(model.get('prev_execution'))

        if (prevExecutionTime.trim() === '08:00:00 am') {
          this.setView('prev', 'N/A')
        } else {
          this.setView('prev', prevExecutionTime)
        }
        this.setView('next', model.formatTime(model.get('next_execution')))
        this.setView('start', model.formatTime(model.get('start_time')))
      },
      updateClockView () {
        this.setView('current', model.formatTime(new Date()))
      },
      updateCronStatusView () {
        const stop = view.query('bullet-stop')
        const start = view.query('bullet-start')
        stop.classList.remove('is-active')
        start.classList.remove('is-active')

        if (model.get('is_executing')) {
          start.classList.add('is-active')
        } else {
          stop.classList.add('is-active')
        }

        this.setView('info-exec', model.computed().getJobDuration())
        this.setView('start-exec', model.formatTime(model.get('job_start_time')))
        this.setView('end-exec', model.formatTime(model.get('job_end_time')))
      },
      bindEvents () {
        view.query('toggle').addEventListener('click', (evt) => {
          const target = evt.currentTarget
          model.set('enabled', !target.classList.contains('is-active'))
          target.classList.toggle('is-active')

          const targetUrl = model.get('enabled') ? '/crons/start' : '/crons/stop'
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
      },
      updateEmptyInfoView () {
        this.setData({})
        this.updateTimerView()
        this.updateProgressView()
        this.updateCronStatusView()
      },
      updateInfoView (data) {
        this.setData(data)
        this.updateTimerView()
        this.updateProgressView()
        this.updateCronStatusView()
      }
    }
  }

  const controller = Controller(Model, View)
  controller.init()

  // Usage
  let loop = null
  loop = window.animLoop(function (delta, now) {
    if (Model.get('isClosed')) {
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
        controller.updateEmptyInfoView()
        return
      }
      controller.updateInfoView(data)
    }
    socket.onclose = function () {
      Model.set('isClosed', true)
      // Reset everything and set status to disconnected
      console.info('Socket closed')

      View.setStatus('Disconnected')
      Model.reset()
      controller.updateEmptyInfoView()
    }
    return socket
  }
})()
