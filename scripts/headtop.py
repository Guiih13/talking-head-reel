#!/usr/bin/env python3
"""Measure where the speaker's head sits in the frame, so the captions can
be placed above it or below it instead of on it.

    headtop.py <public/talk/ig1080.mp4> <src/talk/reel-face.json> [--samples 12]

Samples frames evenly across the recording, runs Apple's Vision person
segmentation on each (macOS, through PyObjC in the project .venv:
`.venv/bin/pip install pyobjc-framework-Vision pyobjc-framework-Quartz`)
and finds the first row, scanning down the middle 40 percent of the width,
where the person starts. That ignores raised hands and chairs at the edges.

Writes {"headTop": y, "samples": [...]} in 1080x1920 frame pixels. headTop
is the 10th percentile of the samples (the head when it is held high), so a
lean forward or a nod does not push it into the captions.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

try:
    import Quartz
    import Vision
except ImportError:
    sys.exit("needs PyObjC: .venv/bin/pip install pyobjc-framework-Vision pyobjc-framework-Quartz")


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(out.strip())


def head_top(png):
    url = Quartz.CFURLCreateFromFileSystemRepresentation(None, png.encode(), len(png.encode()), False)
    src = Quartz.CGImageSourceCreateWithURL(url, None)
    img = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    img_h = Quartz.CGImageGetHeight(img)
    req = Vision.VNGeneratePersonSegmentationRequest.alloc().initWithCompletionHandler_(None)
    req.setQualityLevel_(Vision.VNGeneratePersonSegmentationRequestQualityLevelAccurate)
    req.setOutputPixelFormat_(1278226488)  # kCVPixelFormatType_OneComponent8 ('L008')
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(img, None)
    ok, _ = handler.performRequests_error_([req], None)
    if not ok or not req.results():
        return None
    buf = req.results()[0].pixelBuffer()
    Quartz.CVPixelBufferLockBaseAddress(buf, 1)
    try:
        w, h = Quartz.CVPixelBufferGetWidth(buf), Quartz.CVPixelBufferGetHeight(buf)
        stride = Quartz.CVPixelBufferGetBytesPerRow(buf)
        data = Quartz.CVPixelBufferGetBaseAddress(buf).as_buffer(stride * h)
        x0, x1 = int(w * 0.3), int(w * 0.7)
        need = max(3, (x1 - x0) // 25)  # 4 percent of the band is person
        for y in range(h):
            row = data[y * stride + x0 : y * stride + x1]
            if sum(1 for v in row if v > 127) >= need:
                return round(y / h * img_h)
    finally:
        Quartz.CVPixelBufferUnlockBaseAddress(buf, 1)
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--samples", type=int, default=12)
    a = ap.parse_args()
    d = duration(a.video)
    tops = []
    with tempfile.TemporaryDirectory() as tmp:
        for i in range(a.samples):
            t = d * (i + 0.5) / a.samples
            png = os.path.join(tmp, f"s{i}.png")
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", a.video, "-frames:v", "1",
                 "-vf", "scale=1080:1920", png],
                check=True,
            )
            y = head_top(png)
            print(f"  {t:7.1f}s  head top y={y}")
            if y is not None:
                tops.append(y)
    if not tops:
        sys.exit("no person found in any sample; set STYLE.captions.position by hand")
    tops.sort()
    top = tops[int((len(tops) - 1) * 0.1)]
    json.dump({"headTop": top, "samples": tops}, open(a.out, "w"), indent=2)
    print(f"headTop {top} (samples {tops[0]}..{tops[-1]}) -> {a.out}")


if __name__ == "__main__":
    main()
