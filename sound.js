/* ============================================================
   Sipru. — sound
   Every sound is synthesised on the spot with Web Audio — no audio
   files to ship, nothing to download, and the whole set weighs a
   few kilobytes. They are deliberately small: soft sine and triangle
   tones with a quick attack and a rounded decay, a touch of echo on
   the bigger ones, and a level well under a notification chime.

   Nothing sounds until the first tap or key (browsers and the Android
   WebView refuse to start audio before one). The context is created
   then and kept.
   ============================================================ */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, send = null, noiseBuf = null;

  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      try { ctx = new AC({ latencyHint: "interactive" }); }
      catch (e) { try { ctx = new AC(); } catch (e2) { return null; } }
      master = ctx.createGain();
      master.gain.value = 0.9;
      /* a limiter so two sounds landing together never clip */
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 6;
      comp.attack.value = 0.003; comp.release.value = 0.18;
      master.connect(comp); comp.connect(ctx.destination);

      /* a short, dark echo bus — "air" around the longer sounds */
      send = ctx.createGain();
      send.gain.value = 1;
      var delay = ctx.createDelay(0.5); delay.delayTime.value = 0.13;
      var fb = ctx.createGain(); fb.gain.value = 0.32;
      var tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2600;
      var wet = ctx.createGain(); wet.gain.value = 0.55;
      send.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay);
      tone.connect(wet); wet.connect(master);
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  function noise() {
    if (noiseBuf) return noiseBuf;
    var len = Math.floor(ctx.sampleRate * 0.4);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /* one pitched voice: o = { type, f, to, at, dur, gain, attack, echo } */
  function tone(o) {
    var t0 = ctx.currentTime + (o.at || 0);
    var dur = o.dur || 0.12;
    var osc = ctx.createOscillator();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    var g = ctx.createGain();
    var peak = o.gain || 0.1, a = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    if (o.echo) { var s = ctx.createGain(); s.gain.value = o.echo; g.connect(s); s.connect(send); }
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /* a burst of filtered noise: paper, air, a soft thud's body */
  function hiss(o) {
    var t0 = ctx.currentTime + (o.at || 0);
    var dur = o.dur || 0.08;
    var src = ctx.createBufferSource(); src.buffer = noise();
    var f = ctx.createBiquadFilter();
    f.type = o.filter || "bandpass";
    f.frequency.setValueAtTime(o.f, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    f.Q.value = o.q || 0.9;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.05, t0 + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  /* Note frequencies, so the chords below read as music rather than numbers */
  var N = { C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, B5: 987.77,
    C6: 1046.5, E6: 1318.5, G6: 1568.0 };

  var VOICES = {
    /* ordinary button: a barely-there wooden tick */
    tap: function () { tone({ f: 760, to: 560, dur: 0.05, gain: 0.07 }); },
    /* list pick, segmented control: lighter and higher */
    select: function () { tone({ type: "triangle", f: 1180, to: 1020, dur: 0.035, gain: 0.05 }); },
    /* primary action: a rounder press */
    press: function () {
      tone({ f: 540, to: 380, dur: 0.09, gain: 0.12 });
      tone({ type: "triangle", f: 1080, to: 760, dur: 0.05, gain: 0.04 });
    },
    on: function () {
      tone({ f: N.G5 * 0.84, dur: 0.1, gain: 0.09 });
      tone({ f: N.C6 * 0.96, at: 0.055, dur: 0.14, gain: 0.1, echo: 0.2 });
    },
    off: function () {
      tone({ f: N.C6 * 0.96, dur: 0.08, gain: 0.08 });
      tone({ f: N.G5 * 0.78, at: 0.055, dur: 0.12, gain: 0.07 });
    },
    /* done: a bright major arpeggio */
    success: function () {
      tone({ f: N.C5, dur: 0.22, gain: 0.1, echo: 0.3 });
      tone({ type: "triangle", f: N.E5, at: 0.07, dur: 0.22, gain: 0.08, echo: 0.3 });
      tone({ f: N.G5, at: 0.14, dur: 0.38, gain: 0.1, echo: 0.4 });
    },
    save: function () {
      tone({ f: N.G5, dur: 0.14, gain: 0.09, echo: 0.2 });
      tone({ f: N.C6, at: 0.085, dur: 0.3, gain: 0.1, echo: 0.35 });
    },
    /* something new appears: a soft pop with a sparkle on top */
    create: function () {
      tone({ f: 320, to: 760, dur: 0.075, gain: 0.13 });
      tone({ type: "triangle", f: N.E6, at: 0.06, dur: 0.2, gain: 0.05, echo: 0.35 });
    },
    /* gone: a low, short thud with a breath of air */
    remove: function () {
      tone({ f: 200, to: 72, dur: 0.17, gain: 0.2 });
      hiss({ f: 520, dur: 0.07, gain: 0.05, filter: "lowpass", q: 0.6 });
    },
    error: function () {
      tone({ type: "triangle", f: 330, dur: 0.12, gain: 0.13 });
      tone({ type: "triangle", f: 247, at: 0.1, dur: 0.22, gain: 0.14 });
    },
    warn: function () {
      tone({ type: "triangle", f: 440, dur: 0.08, gain: 0.1 });
      tone({ type: "triangle", f: 440, at: 0.11, dur: 0.1, gain: 0.1 });
    },
    /* a file leaves: a quick climbing run */
    exported: function () {
      [N.C5, N.E5, N.G5, N.C6, N.E6].forEach(function (f, i) {
        tone({ f: f, at: i * 0.055, dur: 0.2 + i * 0.03, gain: 0.07 + i * 0.006, echo: 0.35 });
      });
    },
    /* the interface falls away / comes back */
    focusIn: function () {
      tone({ f: 220, to: 440, dur: 0.3, gain: 0.08, attack: 0.06, echo: 0.3 });
      hiss({ f: 500, to: 2200, dur: 0.3, gain: 0.025, attack: 0.1, q: 0.7 });
    },
    focusOut: function () {
      tone({ f: 440, to: 220, dur: 0.26, gain: 0.07, attack: 0.03, echo: 0.2 });
      hiss({ f: 2200, to: 500, dur: 0.24, gain: 0.02, attack: 0.04, q: 0.7 });
    },
    undo: function () { tone({ f: 640, to: 470, dur: 0.07, gain: 0.07 }); },
    redo: function () { tone({ f: 470, to: 640, dur: 0.07, gain: 0.07 }); },
    /* turning to another page, chapter or screen: paper */
    page: function () { hiss({ f: 1500, to: 2600, dur: 0.1, gain: 0.045, attack: 0.02, q: 1.1 }); }
  };

  var last = {};
  function play(name) {
    var v = VOICES[name];
    if (!v) return false;
    if (document.hidden) return false;
    /* the same sound twice inside a frame or two is one sound */
    var now = Date.now();
    if (now - (last[name] || 0) < 45) return false;
    last[name] = now;
    if (!ensure()) return false;
    try { v(); return true; } catch (e) { return false; }
  }

  /* browsers start audio only from a gesture — arm the context on the first */
  function unlock() { ensure(); }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, unlock, { once: true, capture: true, passive: true });
  });

  window.SipruSound = { play: play, names: Object.keys(VOICES), supported: !!AC };
})();
