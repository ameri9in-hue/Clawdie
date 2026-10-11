#!/usr/bin/env bash
# Set up ACE-Step 1.5 for CPU inference (cover mode), next to this project:
#   ../.acestep/ACE-Step-1.5   code + checkpoints/ (2B turbo DiT, VAE, Qwen3 text encoder; ~6 GB)
#   ../.acestep/venv           Python 3.12 with CPU-only PyTorch
# Then:  SINGER=acestep ACESTEP_ROOT=../.acestep/ACE-Step-1.5 ACESTEP_PYTHON=../.acestep/venv/bin/python ./build.sh
# Needs network access to github.com, huggingface.co, download.pytorch.org and PyPI; and uv.
# Note: on first load ACE-Step also fetches the rest of its main bundle (incl. a 3.7 GB LM that cover mode never uses).
set -euo pipefail
cd "$(dirname "$0")/.."
D="${ACESTEP_DIR:-../.acestep}"; mkdir -p "$D"
[ -d "$D/ACE-Step-1.5" ] || git clone --depth 1 https://github.com/ace-step/ACE-Step-1.5.git "$D/ACE-Step-1.5"
[ -d "$D/venv" ] || uv venv -q -p python3.12 "$D/venv"
export VIRTUAL_ENV="$D/venv"
uv pip install -q torch==2.10.0 torchvision==0.25.0 torchaudio==2.10.0 --index-url https://download.pytorch.org/whl/cpu
uv pip install -q "transformers>=4.51.0,<4.58.0" "diffusers>=0.37.0" matplotlib scipy soundfile loguru einops "accelerate>=1.12.0" \
  fastapi diskcache uvicorn python-multipart numba "vector-quantize-pytorch>=1.27.15" "torchao>=0.16.0,<0.17.0" toml peft \
  modelscope typer-slim pytorch-wavelets pywavelets "setuptools<72" huggingface_hub safetensors
uv pip install -q --no-deps -e "$D/ACE-Step-1.5"
( cd "$D/ACE-Step-1.5" && "$D/venv/bin/python" -c "
from huggingface_hub import snapshot_download
snapshot_download('ACE-Step/Ace-Step1.5', local_dir='checkpoints',
                  allow_patterns=['acestep-v15-turbo/*', 'vae/*', 'Qwen3-Embedding-0.6B/*', '*.json', '*.md'])" )
echo "ACE-Step ready in $D"
