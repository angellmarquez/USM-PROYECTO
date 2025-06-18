from pymongo import MongoClient

client = MongoClient("mongodb+srv://angel:angelito01@usm.2jhpojj.mongodb.net/?retryWrites=true&w=majority&appName=USM")
db = client['USM']
rutas = db.rutas

rutas_data = [
    {
        "nombre": "LA CALIFORNIA",
        "precio": "50 Bs",
        "hora_salida": "06:00 AM",
        "hora_fin": "10:00 PM",
        "ubicacion": "Frente al unicentro el marquez",
        "lat": 10.482470,
        "lng": -66.818723,
        "imagen": "brand/California.jpg"
    },
    {
        "nombre": "PLAZA-VENEZUELA",
        "precio": "$45",
        "hora_salida": "07:30 AM",
        "hora_fin": "09:30 PM",
        "ubicacion": "Caracas, Plaza Venezuela",
        "lat": "",
        "lng": "",
        "imagen": ""
    },
    {
        "nombre": "GUARENAS GUATIRE",
        "precio": "$60",
        "hora_salida": "06:00 AM",
        "hora_fin": "08:00 PM",
        "ubicacion": "Guarenas - Guatire",
        "lat": "",
        "lng": "",
        "imagen": ""
    },
    {
        "nombre": "LOS TEQUES",
        "precio": "$55",
        "hora_salida": "07:00 AM",
        "hora_fin": "09:00 PM",
        "ubicacion": "Los Teques, Miranda",
        "lat": "",
        "lng": "",
        "imagen": ""
    },
    {
        "nombre": "LA GUAIRA",
        "precio": "$65",
        "hora_salida": "05:30 AM",
        "hora_fin": "08:30 PM",
        "ubicacion": "La Guaira, Vargas",
        "lat": "",
        "lng": "",
        "imagen": ""
    },
    {
        "nombre": "CONCRESA",
        "precio": "$48",
        "hora_salida": "06:30 AM",
        "hora_fin": "09:15 PM",
        "ubicacion": "Concresa, Caracas",
        "lat": "",
        "lng": "",
        "imagen": ""
    }
]

for ruta in rutas_data:
    rutas.update_one(
        {"nombre": ruta["nombre"]},
        {
            "$set": {
                **ruta,
                "asistentes.ida": [],
                "asistentes.vuelta": []
            }
        },
        upsert=True
    )

print("Rutas actualizadas correctamente.")