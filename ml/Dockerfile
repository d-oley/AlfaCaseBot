
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt requirements-hybrid.txt ./

ARG ML_REQUIREMENTS=requirements-hybrid.txt

RUN if [ "$ML_REQUIREMENTS" = "requirements-hybrid.txt" ]; then \
      pip install --no-cache-dir \
        --index-url https://download.pytorch.org/whl/cpu \
        "torch>=2.6,<3.0"; \
    fi && \
    pip install --no-cache-dir -r "${ML_REQUIREMENTS}" && \
    if [ "$ML_REQUIREMENTS" = "requirements-hybrid.txt" ]; then \
      python -c "import torch; assert torch.version.cuda is None, 'CUDA PyTorch installed unexpectedly'"; \
    fi

COPY . .

RUN if [ "$ML_REQUIREMENTS" = "requirements-hybrid.txt" ]; then \
      test -s artifacts/best_censor_model.joblib && \
      test -s artifacts/rubert_tiny2_multitask/rubert_tiny2_multitask.pt && \
      test -s artifacts/rubert_tiny2_multitask/config.json && \
      test -s artifacts/rubert_tiny2_multitask/tokenizer/tokenizer.json || \
      { echo 'Missing hybrid model artifacts in Docker build context' >&2; exit 1; }; \
    fi

EXPOSE 5000

CMD ["uvicorn", "api.hybrid_app:app", "--host", "0.0.0.0", "--port", "5000"]
