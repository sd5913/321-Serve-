'use strict';

const ServeAudio = (() => {
  function eventTime(event, now, timeOrigin) {
    let timestamp = event?.timeStamp;
    // Older browsers may report an epoch timestamp rather than a performance timestamp.
    if (timestamp >= 1e12) timestamp -= timeOrigin;
    return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now ? timestamp : now;
  }

  function outputTime(audio, now, at = now) {
    const renderTime = audio.currentTime;
    const pair = audio.getOutputTimestamp?.();
    const elapsed = pair ? (now - pair.performanceTime) / 1000 : NaN;
    const estimated = pair ? pair.contextTime + elapsed : NaN;

    // Startup can return 0/0, and an interrupted output can leave a stale pair.
    if (pair?.performanceTime > 0 && pair.contextTime >= 0 &&
        elapsed >= -.02 && elapsed <= .5 && estimated <= renderTime + .02) {
      return Math.min(renderTime, estimated) + (at - now) / 1000;
    }

    // These browser estimates apply only when there is no usable output-clock sample.
    const latency = value => Number.isFinite(value) && value > 0 ? value : 0;
    return renderTime - latency(audio.baseLatency) - latency(audio.outputLatency) + (at - now) / 1000;
  }

  function mediaTime(media, now, at = now) {
    const current = media.currentTime;
    if (media.paused || media.seeking || media.readyState < 3) return current;
    return Math.max(0, current + (at - now) * media.playbackRate / 1000);
  }

  return { eventTime, outputTime, mediaTime };
})();

if (typeof module !== 'undefined') module.exports = ServeAudio;
