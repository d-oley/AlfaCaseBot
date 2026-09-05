FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt requirements-hybrid.txt ./
ARG ML_REQUIREMENTS=requirements.txt
RUN pip install --no-cache-dir -r ${ML_REQUIREMENTS}

COPY . .

EXPOSE 5000

CMD ["uvicorn", "api.llm_only_app:app", "--host", "0.0.0.0", "--port", "5000"]

