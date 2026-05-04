FROM python:3.12-slim

WORKDIR /app

COPY . .

RUN pip install flask joblib langdetect scikit-learn numpy

EXPOSE 5000

CMD ["python", "app.py"]

