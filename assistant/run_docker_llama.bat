@echo off
echo Starting Meta Llama 3.2 1B Instruct via Docker Model Runner...
echo Model: https://huggingface.co/meta-llama/Llama-3.2-1B-Instruct
echo Command: docker model run hf.co/meta-llama/Llama-3.2-1B-Instruct
echo.
docker model run hf.co/meta-llama/Llama-3.2-1B-Instruct
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Fallback: Running via standard Docker container...
    docker run -it --rm -p 8000:8000 --gpus all ghcr.io/huggingface/text-generation-inference:latest --model-id meta-llama/Llama-3.2-1B-Instruct
)

