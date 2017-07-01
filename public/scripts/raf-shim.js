// Cross browser, backward compatible solution
(function (window, Date) {
// feature testing
  const raf = window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            window.oRequestAnimationFrame

  window.animLoop = (render) => {
    let running
    let lastFrame = Date.now()
    function loop (now) {
      if (running !== false) {
        raf ? raf(loop) : setTimeout(loop, 1000)
            // Make sure to use a valid time, since:
            // - Chrome 10 doesn't return it at all
            // - setTimeout returns the actual timeout
        now = now && now > 1E4 ? now : Date.now()
        const deltaT = now - lastFrame
            // do not render frame when deltaT is too high
        if (deltaT < 160) {
          running = render(deltaT, now)
        }
        lastFrame = now
      }
    }
    loop()
    return raf
  }
})(window, Date)
