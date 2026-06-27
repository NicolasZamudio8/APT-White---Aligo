FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY . .

# Exponer el puerto por defecto de FastAPI
EXPOSE 8000

# Variable de entorno de puerto para compatibilidad con servicios cloud (Render, Railway, Cloud Run)
ENV PORT=8000

# Arrancar el servidor, usando la variable de puerto
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
