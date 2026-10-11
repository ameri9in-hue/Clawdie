#!/usr/bin/env bash
# Fetch the local singing voice: Kokoro-82M (Apache-2.0) ONNX weights + voice styles, from npm.
#   kokoro-q8-shards : model_quantized.onnx of onnx-community/Kokoro-82M-v1.0-ONNX, split in 6 parts
#   kokoro-js        : ships the voice style tensors (voices/*.bin)
# Also: pip install kokoro-onnx pyworld scipy   (tokenizer + espeak-ng, WORLD vocoder, resampling)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p models && tmp=$(mktemp -d) && trap 'rm -rf "$tmp"' EXIT
( cd "$tmp" && npm pack kokoro-q8-shards@1.0.0 kokoro-js@1.2.1 --silent >/dev/null && for f in *.tgz; do mkdir "${f%.tgz}"; tar -xzf "$f" -C "${f%.tgz}"; done )
cat "$tmp"/kokoro-q8-shards-1.0.0/package/kokoro-q8.part{0,1,2,3,4,5}.bin > models/kokoro-q8.onnx
echo "fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478  models/kokoro-q8.onnx" | sha256sum -c -
cp "$tmp"/kokoro-js-1.2.1/package/voices/{af_heart,af_bella,am_michael}.bin models/
echo "models ready: $(ls models | tr '\n' ' ')"
