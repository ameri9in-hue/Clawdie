#!/usr/bin/env bash
# Set up ACE-Step 1.5 for CPU inference (cover mode), next to this project:
#   ../.acestep/ACE-Step-1.5   code + checkpoints/
#   ../.acestep/venv           Python 3.12 with CPU-only PyTorch
# Then:  SINGER=acestep ACESTEP_ROOT=../.acestep/ACE-Step-1.5 ACESTEP_PYTHON=../.acestep/venv/bin/python ./build.sh
# Needs network access to github.com, huggingface.co, download.pytorch.org and PyPI; and uv.
# Weights: 2B turbo DiT, VAE, Qwen3 text encoder and the 1.7B planning LM (~10 GB).
set -euo pipefail
cd "$(dirname "$0")/.."
D="${ACESTEP_DIR:-../.acestep}"; mkdir -p "$D"
[ -d "$D/ACE-Step-1.5" ] || git clone --depth 1 https://github.com/ace-step/ACE-Step-1.5.git "$D/ACE-Step-1.5"
[ -d "$D/venv" ] || uv venv -q -p python3.12 "$D/venv"
export VIRTUAL_ENV="$D/venv"
uv pip install -q torch==2.10.0 torchvision==0.25.0 torchaudio==2.10.0 --index-url https://download.pytorch.org/whl/cpu
uv pip install -q "transformers>=4.51.0,<4.58.0" "diffusers>=0.37.0" matplotlib scipy soundfile loguru einops "accelerate>=1.12.0" \
  fastapi diskcache uvicorn python-multipart numba "vector-quantize-pytorch>=1.27.15" "torchao>=0.16.0,<0.17.0" toml peft \
  modelscope typer-slim pytorch-wavelets pywavelets "setuptools<72" huggingface_hub safetensors \
  demucs faster-whisper   # lyric_check.py: vocal separation + transcription
uv pip install -q --no-deps -e "$D/ACE-Step-1.5"
# Let CPU runs load weights straight into bfloat16 (ACESTEP_CPU_BF16=1): float32 peaks above 14 GB.
sed -i 's/self.dtype = torch.bfloat16 if resolved_device == "xpu" else torch.float32/self.dtype = torch.bfloat16 if resolved_device == "xpu" or os.environ.get("ACESTEP_CPU_BF16") == "1" else torch.float32/' \
  "$D/ACE-Step-1.5/acestep/core/generation/handler/init_service_orchestrator.py"
( cd "$D/ACE-Step-1.5" && "$D/venv/bin/python" -c "
from huggingface_hub import snapshot_download
snapshot_download('ACE-Step/Ace-Step1.5', local_dir='checkpoints',
                  allow_patterns=['acestep-v15-turbo/*', 'vae/*', 'Qwen3-Embedding-0.6B/*', 'acestep-5Hz-lm-1.7B/*', '*.json', '*.md'])" )
echo "ACE-Step ready in $D"
