#!/usr/bin/env python3
"""
Generates the two Focus Mode beds that ship with the app.

Why generated instead of "a public URL": a study app that embeds a random
Internet Archive / SoundCloud file has a broken player the day that file moves,
and most "lofi" uploads are copyrighted. Both tracks here are synthesised from
scratch, so they are original, royalty-free, offline-capable and small enough to
ship in `public/audio/`.

  focus-hindi-lofi.mp3   Track 1 — Hindi film-style lofi: a 1-6-4-5 loop in a
                         Carnatic-ish raga-flavoured scale on a warm pad, tabla
                         bol pattern, and a whistle-like lead motif.
  focus-english-study.mp3 Track 2 — calm English study instrumental: soft piano
                         arpeggios over a slow pad with a gentle kick/hat.

Run:  python3 scripts/make-focus-audio.py
"""
import math
import random
import wave
from pathlib import Path

SR = 44_100
OUT = Path(__file__).resolve().parent.parent / "public" / "audio"


# --------------------------------------------------------------------------- #
# tiny DSP helpers
# --------------------------------------------------------------------------- #
def note_hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


def adsr(n: int, a: float, d: float, s: float, r: float, sr: int = SR):
    """Envelope as a plain list of floats (attack, decay, sustain, release)."""
    out = [0.0] * n
    ai, di, ri = int(a * sr), int(d * sr), int(r * sr)
    si = max(0, n - ai - di - ri)
    i = 0
    for _ in range(ai):
        if i >= n:
            break
        out[i] = i / max(1, ai)
        i += 1
    for k in range(di):
        if i >= n:
            break
        out[i] = 1.0 - (1.0 - s) * (k / max(1, di))
        i += 1
    for _ in range(si):
        if i >= n:
            break
        out[i] = s
        i += 1
    for k in range(ri):
        if i >= n:
            break
        out[i] = s * (1.0 - k / max(1, ri))
        i += 1
    return out


def lowpass(samples, cutoff: float, sr: int = SR):
    """One-pole low-pass — takes the fizz off synthesised oscillators."""
    a = math.exp(-2.0 * math.pi * cutoff / sr)
    out = [0.0] * len(samples)
    prev = 0.0
    for i, x in enumerate(samples):
        prev = (1.0 - a) * x + a * prev
        out[i] = prev
    return out


def highpass(samples, cutoff: float, sr: int = SR):
    a = math.exp(-2.0 * math.pi * cutoff / sr)
    out = [0.0] * len(samples)
    prev_in = 0.0
    prev_out = 0.0
    for i, x in enumerate(samples):
        prev_out = a * (prev_out + x - prev_in)
        prev_in = x
        out[i] = prev_out
    return out


def mix_into(buf, chunk, at: int, gain: float = 1.0):
    end = min(len(buf), at + len(chunk))
    for i in range(at, end):
        buf[i] += chunk[i - at] * gain


# --------------------------------------------------------------------------- #
# instruments
# --------------------------------------------------------------------------- #
def pad(freq: float, seconds: float, detune: float = 0.006, kind: str = "saw"):
    """Warm detuned pad with a slow, breathing filter — the lofi bed."""
    n = int(seconds * SR)
    out = [0.0] * n
    voices = (-detune, 0.0, detune)
    for v in voices:
        f = freq * (1.0 + v)
        phase = random.random() * math.tau
        lfo_phase = random.random() * math.tau
        for i in range(n):
            t = i / SR
            # slow vibrato keeps a long pad from sounding like a test tone
            mod = 1.0 + 0.0018 * math.sin(lfo_phase + 0.45 * t)
            phase += math.tau * f * mod / SR
            if kind == "tri":
                out[i] += 2.0 * abs(2.0 * ((phase / math.tau) % 1.0) - 1.0) - 1.0
            else:
                out[i] += 2.0 * ((phase / math.tau) % 1.0) - 1.0
    env = adsr(n, 0.9, 1.6, 0.55, 1.4)
    peak = max(1e-9, max(abs(x) for x in out))
    return [out[i] / peak * env[i] for i in range(n)]


def pluck(freq: float, seconds: float, bright: float = 0.5):
    """Karplus-Strong-ish plucked string: noise burst through a delay line."""
    n = int(seconds * SR)
    period = max(2, int(SR / freq))
    delay = [random.uniform(-1.0, 1.0) for _ in range(period)]
    out = [0.0] * n
    idx = 0
    damp = 0.5 + 0.35 * (1.0 - bright)
    for i in range(n):
        cur = delay[idx]
        nxt = delay[(idx + 1) % period]
        delay[idx] = damp * 0.5 * (cur + nxt)
        out[i] = cur
        idx = (idx + 1) % period
    env = adsr(n, 0.004, 0.25, 0.32, min(0.6, seconds * 0.4))
    peak = max(1e-9, max(abs(x) for x in out))
    return [out[i] / peak * env[i] for i in range(n)]


def piano(freq: float, seconds: float):
    """Additive piano-ish tone: fundamental + a couple of fast-decaying partials."""
    n = int(seconds * SR)
    out = [0.0] * n
    partials = ((1.0, 1.0, 1.0), (2.0, 0.42, 1.9), (3.0, 0.2, 2.6), (4.01, 0.12, 3.4), (5.02, 0.06, 4.2))
    for mult, amp, decay in partials:
        f = freq * mult
        if f > SR / 2 - 500:
            continue
        phase = random.random() * math.tau
        k = math.exp(-decay / max(0.2, seconds))
        g = amp
        for i in range(n):
            phase += math.tau * f / SR
            out[i] += g * math.sin(phase)
            if i % 32 == 0:
                g *= k ** (32 / SR)
    env = adsr(n, 0.006, 0.2, 0.45, min(0.9, seconds * 0.5))
    peak = max(1e-9, max(abs(x) for x in out))
    return [out[i] / peak * env[i] for i in range(n)]


def tabla(seconds: float, kind: str = "dha"):
    """Tabla bol: a tuned membrane 'thump' plus a short noisy 'na' crack."""
    n = int(seconds * SR)
    out = [0.0] * n
    f0 = 196.0 if kind == "dha" else 294.0
    phase = 0.0
    for i in range(n):
        t = i / SR
        # pitch slides down — that is the bayan glide that makes a tabla sound tabla
        f = f0 * (1.0 + 0.45 * math.exp(-t * 24))
        phase += math.tau * f / SR
        body = math.sin(phase) * math.exp(-t * 9.5)
        crack = 0.0
        if t < 0.03:
            crack = random.uniform(-1, 1) * (1 - t / 0.03) * 0.45
        out[i] = body + crack
    if kind != "dha":
        out = highpass(out, 240)
    return out


def kick(seconds: float = 0.45):
    n = int(seconds * SR)
    out = [0.0] * n
    phase = 0.0
    for i in range(n):
        t = i / SR
        f = 52 * (1.0 + 2.4 * math.exp(-t * 30))
        phase += math.tau * f / SR
        out[i] = math.sin(phase) * math.exp(-t * 11)
    return out


def hat(seconds: float = 0.09):
    n = int(seconds * SR)
    noise = [random.uniform(-1, 1) for _ in range(n)]
    return [x * math.exp(-(i / SR) * 55) for i, x in enumerate(highpass(noise, 7000))]


def room_reverb(buf, mix: float = 0.24, decay: float = 0.55):
    """Cheap feedback-delay reverb: two taps, exponentially quieter."""
    out = list(buf)
    for tap_s, gain in ((0.083, 0.5), (0.137, 0.34), (0.211, 0.22)):
        d = int(tap_s * SR)
        for i in range(d, len(buf)):
            out[i] += buf[i - d] * gain * mix
    # gentle overall fade so the tail does not click
    fade = int(0.4 * SR)
    for i in range(max(0, len(out) - fade), len(out)):
        out[i] *= (len(out) - i) / fade
    # slow amplitude breathing — the "tape wow" that says lofi
    n = len(out)
    for i in range(n):
        t = i / SR
        out[i] *= 0.94 + 0.06 * math.sin(0.31 * t) * math.sin(0.13 * t + 1.1)
    return out


def write_mp3ish_wav(samples, path: Path, peak: float = 0.82):
    """Write a 16-bit mono WAV. (No encoder in the toolchain — WAV is honest.)"""
    top = max(1e-9, max(abs(x) for x in samples))
    scale = peak / top
    pcm = bytearray()
    for x in samples:
        v = int(max(-1.0, min(1.0, x * scale)) * 32767)
        pcm += v.to_bytes(2, "little", signed=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(bytes(pcm))
    print(f"  {path.name}: {path.stat().st_size / 1024:.0f} kB, {len(samples)/SR:.1f}s")


# --------------------------------------------------------------------------- #
# Track 1 — Hindi lofi (1-6-4-5 in A minor-ish, tabla + whistle motif)
# --------------------------------------------------------------------------- #
def track_hindi(path: Path):
    bpm = 74
    beat = 60.0 / bpm
    bar = beat * 4
    bars = 12
    total = int(bar * bars * SR)
    buf = [0.0] * total

    # A minor pentatonic-ish, but with the raised 6th that gives it the film feel
    roots = [57, 53, 50, 52]  # A3, F3, D3, E3
    chords = [(0, 3, 7, 10), (0, 4, 7, 11), (0, 3, 7, 10), (0, 4, 7, 9)]

    for b in range(bars):
        chord_i = b % 4
        root = roots[chord_i]
        start = int(b * bar * SR)
        for interval in chords[chord_i]:
            tone = pad(note_hz(root + interval), bar * 1.02)
            mix_into(buf, tone, start, 0.16)
        # soft bass on beats 1 and 3
        for beat_i in (0, 2):
            bass = pad(note_hz(root - 12), beat * 0.95, detune=0.003, kind="tri")
            mix_into(buf, bass, start + int(beat_i * beat * SR), 0.22)

        # tabla: dha on 1, na on 2/3, tin on 4 (keherwa-ish)
        pattern = [(0.0, "dha"), (1.0, "na"), (2.0, "na"), (3.0, "tin"), (2.5, "na")]
        for offset, kind in pattern:
            mix_into(buf, tabla(0.5, kind), start + int(offset * beat * SR), 0.5 if kind == "dha" else 0.3)

        # plucked sitar-ish arpeggio, eighth notes, swung slightly
        scale = [0, 3, 5, 7, 10, 12, 10, 7]
        for step in range(8):
            deg = scale[(step + chord_i) % len(scale)]
            at = start + int((step * beat / 2 + (0.02 if step % 2 else 0)) * SR)
            mix_into(buf, pluck(note_hz(root + 12 + deg), beat * 1.4, bright=0.6), at, 0.24)

    # whistle/flute lead motif over bars 4-11 (the "song" part of the lofi)
    motif = [
        (4, 0.0, 72, 1.0), (4, 1.0, 74, 1.0), (4, 2.0, 76, 1.5),
        (5, 0.0, 72, 0.5), (5, 0.5, 69, 1.5), (5, 2.5, 67, 1.0),
        (6, 0.0, 69, 1.0), (6, 1.0, 72, 1.0), (6, 2.5, 76, 1.5),
        (7, 0.5, 74, 0.5), (7, 3.0, 72, 1.0),
        (8, 0.0, 76, 1.0), (8, 1.5, 79, 1.0), (8, 2.5, 81, 1.5),
        (9, 0.5, 79, 0.5), (9, 1.0, 76, 1.5), (9, 3.0, 72, 1.0),
        (10, 0.0, 74, 1.5), (10, 2.0, 72, 1.0),
        (11, 0.0, 69, 2.0), (11, 2.5, 67, 1.5),
    ]
    for bar_i, beat_off, midi, length in motif:
        tone = pad(note_hz(midi), max(0.25, length * beat), detune=0.0015, kind="tri")
        mix_into(buf, tone, int((bar_i * bar + beat_off * beat) * SR), 0.17)

    buf = lowpass(buf, 7200)
    buf = room_reverb(buf, mix=0.3)
    write_mp3ish_wav(buf, path, peak=0.8)


# --------------------------------------------------------------------------- #
# Track 2 — calm English study instrumental (piano arpeggios, pad, soft beat)
# --------------------------------------------------------------------------- #
def track_english(path: Path):
    bpm = 62
    beat = 60.0 / bpm
    bar = beat * 4
    bars = 10
    total = int(bar * bars * SR)
    buf = [0.0] * total

    # C - G/B - Am7 - Fmaj7, the "study playlist" progression
    progression = [
        (60, (0, 4, 7, 12)),
        (59, (0, 4, 7, 11)),
        (57, (0, 3, 7, 10)),
        (53, (0, 4, 7, 11)),
    ]

    for b in range(bars):
        root, chord = progression[b % 4]
        start = int(b * bar * SR)
        for interval in chord:
            mix_into(buf, pad(note_hz(root + interval), bar * 1.05), start, 0.13)

        # slow piano arpeggio in eighths with a little humanising delay
        order = [0, 1, 2, 3, 2, 1, 2, 3]
        for step in range(8):
            midi = root + 12 + chord[order[step] if order[step] < len(chord) else 0]
            at = start + int((step * beat / 2 + random.uniform(-0.012, 0.012)) * SR)
            mix_into(buf, piano(note_hz(midi), beat * 2.2), at, 0.3)

        # sparse melody every other bar
        if b % 2 == 1:
            for beat_off, midi, length in ((0.0, root + 24, 1.5), (2.0, root + 19, 1.0)):
                mix_into(
                    buf,
                    piano(note_hz(midi), beat * length * 1.6),
                    start + int(beat_off * beat * SR),
                    0.22,
                )

        # kick on 1 and 3, brushed hat on the off-beats — felt, not heard
        mix_into(buf, kick(), start, 0.35)
        mix_into(buf, kick(0.4), start + int(2 * beat * SR), 0.28)
        for off in (0.5, 1.5, 2.5, 3.5):
            mix_into(buf, hat(), start + int(off * beat * SR), 0.1)

    buf = lowpass(buf, 9000)
    buf = room_reverb(buf, mix=0.34)
    write_mp3ish_wav(buf, path, peak=0.78)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    random.seed(20261108)
    print("writing focus beds…")
    track_hindi(OUT / "focus-hindi-lofi.wav")
    random.seed(7)
    track_english(OUT / "focus-english-study.wav")


if __name__ == "__main__":
    main()
