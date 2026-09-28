FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt requirements-hybrid.txt ./
ARG ML_REQUIREMENTS=requirements.txt
RUN pip install --no-cache-dir -r ${ML_REQUIREMENTS}

COPY . .

RUN if [ "$ML_REQUIREMENTS" = "requirements-hybrid.txt" ]; then \
      test -s artifacts/best_censor_model.joblib && \
      test -s artifacts/rubert_tiny2_multitask/rubert_tiny2_multitask.pt && \
      test -s artifacts/rubert_tiny2_multitask/config.json && \
      test -s artifacts/rubert_tiny2_multitask/tokenizer/tokenizer.json || \
      { echo 'Missing hybrid model artifacts in Docker build context' >&2; exit 1; }; \
    fi

EXPOSE 5000

CMD ["uvicorn", "api.llm_only_app:app", "--host", "0.0.0.0", "--port", "5000"]

