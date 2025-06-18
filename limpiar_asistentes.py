from pymongo import MongoClient

client = MongoClient("mongodb+srv://angel:angelito01@usm.2jhpojj.mongodb.net/?retryWrites=true&w=majority&appName=USM")
db = client['USM']
rutas = db.rutas

rutas.update_many({}, {'$set': {'asistentes.ida': [], 'asistentes.vuelta': []}})
print("Asistentes limpiados correctamente.")