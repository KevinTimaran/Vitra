# Prender el .venv
source .venv/bin/activate.fish





=============================================================
Va dentro del IP_ADDRESS
http://192.168.168.58:8000
# comprovar que el backend esta corriendo
curl http://[IP_ADDRESS]/health
# Debe de decir = {"status":"ok"}

# Comprobar que el backend esta corriendo desde otro dispositivo en la misma red
curl http://[IP_ADDRESS]/health
# Debe de decir = {"status":"ok"}

# Probar el endpoint de imagen
curl -X POST "http://[IP_ADDRESS]/analyze/image" -F "image=@/home/kevin/Pictures/Captura de pantalla de 2026-10-08 10-59-12.png" -H "Content-Type: multipart/form-data"
# Debe de devolver un JSON con la descripción de la imagen
