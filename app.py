from flask import Flask, request, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from flask_mail import Mail, Message
from flask_session import Session
import random
import requests
import os
from bson import ObjectId
from flask import send_from_directory

app = Flask(__name__)
app.secret_key = 'TU_SECRETO_AQUI'  # Cambia esto por una clave secreta segura
CORS(app, supports_credentials=True)

# Cambia la configuración de sesión:
app.config['SESSION_TYPE'] = 'mongodb'
app.config['SESSION_MONGODB'] = MongoClient("mongodb+srv://angel:angelito01@usm.2jhpojj.mongodb.net/?retryWrites=true&w=majority&appName=USM")
app.config['SESSION_MONGODB_DB'] = 'USM'
app.config['SESSION_MONGODB_COLLECT'] = 'sessions'
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
Session(app)

# Configuración de Flask-Mail
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'aglmarquez2005@gmail.com'  # Cambia esto por tu correo
app.config['MAIL_PASSWORD'] = 'knmxjtcfjtsrktdp'  # Cambia esto por tu contraseña o App Password
app.config['MAIL_DEFAULT_SENDER'] = 'tu_correo@gmail.com'

mail = Mail(app)

client = MongoClient("mongodb+srv://angel:angelito01@usm.2jhpojj.mongodb.net/?retryWrites=true&w=majority&appName=USM")
db = client.get_database("USM")
users_collection = db.usuarios

FACULTADES = {
    "ingenieria-arquitectura": [
        "arquitectura",
        "ing.-sistemas",
        "ing.-industrial",
        "ing.-civil",
        "ing.-telecomunicaciones"
    ],
    "ciencias-economicas-sociales": [
        "comunicación-social",
        "economía",
        "administración",
        "contaduría-pública"
    ],
    "odontologia": ["odontología"],
    "farmacia": ["farmacia"],
    "derecho": ["derecho", "estudios-internacionales"]
}

# Almacenamiento temporal de códigos de verificación (en memoria)
verification_codes = {}

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'static', 'avatars')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def normalize_phone(phone):
    phone = phone.replace(' ', '').replace('-', '')
    if phone.startswith('+58'):
        phone = phone[3:]
    if phone.startswith('0'):
        phone = phone[1:]
    return phone

def send_whatsapp_code(phone, code):
    # UltraMsg requiere el número con +58
    phone = '+58' + phone if not phone.startswith('+58') else phone
    url = "https://api.ultramsg.com/instance110919/messages/chat"
    token = "wpt1sf4lepjdfu3042ggg"
    body = f"Tu código de verificación es: {code}"
    payload = f"token={token}&to={phone}&body={body}"
    headers = {'content-type': 'application/x-www-form-urlencoded'}
    response = requests.post(url, data=payload.encode('utf8').decode('iso-8859-1'), headers=headers)
    return response.status_code == 200

def send_email_code(email, code):
    try:
        msg = Message('Código de verificación USM', recipients=[email])
        msg.body = f'Tu código de verificación es: {code}'
        mail.send(msg)
        return True
    except Exception as e:
        print("Error enviando correo:", e)
        return False

# Ruta para enviar el código de verificación
@app.route('/send-code', methods=['POST'])
def send_code():
    data = request.json
    email = data.get('email')
    phone = data.get('phone')
    code = str(random.randint(100000, 999999))

    if phone:
        phone_norm = normalize_phone(phone)
        verification_codes[phone_norm] = code  # Guarda el código para el teléfono normalizado
        success = send_whatsapp_code(phone_norm, code)
        if success:
            return jsonify({'message': 'Código enviado por WhatsApp'}), 200
        else:
            return jsonify({'error': 'No se pudo enviar el código por WhatsApp'}), 500
    elif email:
        verification_codes[email] = code  # Guarda el código para el correo
        success = send_email_code(email, code)
        if success:
            return jsonify({'message': 'Código enviado por correo'}), 200
        else:
            return jsonify({'error': 'No se pudo enviar el código por correo'}), 500
    else:
        return jsonify({'error': 'Faltan datos'}), 400

# Ruta para verificar el código ingresado
@app.route('/verify-code', methods=['POST'])
def verify_code():
    data = request.json
    email = data.get('email')
    phone = data.get('phone')
    code = data.get('code')

    if not (email or phone) or not code:
        return jsonify({'error': 'Correo, número de teléfono o código no proporcionado'}), 400

    identifier = email if email else normalize_phone(phone)
    if identifier in verification_codes and verification_codes[identifier] == code:
        del verification_codes[identifier]  # Eliminar el código después de validarlo
        return jsonify({'message': 'Código verificado correctamente'}), 200
    else:
        return jsonify({'error': 'Código incorrecto o expirado'}), 400

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    usuario = data.get('usuario')
    contrasena = data.get('contrasena')
    facultad = data.get('facultad')
    carrera = data.get('carrera')
    direccion = data.get('direccion')
    email = data.get('email', '')
    telefono = normalize_phone(data.get('telefono', ''))
    nombre = data.get('nombre', '')
    apellido = data.get('apellido', '')

    if not all([usuario, contrasena, facultad, carrera, direccion]):
        return jsonify({'error': 'Faltan campos obligatorios'}), 400

    if facultad not in FACULTADES or carrera not in FACULTADES[facultad]:
        return jsonify({'error': 'Facultad o carrera no válida'}), 400

    # Verificar si el usuario ya existe
    if users_collection.find_one({'usuario': usuario}):
        return jsonify({'error': 'El usuario ya existe'}), 400

    users_collection.insert_one({
        'usuario': usuario,
        'contrasena': contrasena,
        'facultad': facultad,
        'carrera': carrera,
        'direccion': direccion,
        'email': email,
        'telefono': telefono,
        'nombre': nombre,
        'apellido': apellido
    })
    return jsonify({'message': 'Usuario registrado correctamente'}), 201

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    telefono = data.get('telefono')
    password = data.get('password')

    user = None
    if email:
        user = users_collection.find_one({'email': email})
    elif telefono:
        telefono = normalize_phone(telefono)
        user = users_collection.find_one({'telefono': telefono})

    if user and user['contrasena'] == password:
        session['user_id'] = str(user['_id'])  # Esto activa la sesión
        return jsonify({'success': True}), 200
    else:
        return jsonify({'success': False}), 401

@app.route('/user-info', methods=['GET'])
def user_info():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No autenticado'}), 401
    user = users_collection.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify({
        'nombre': user.get('nombre', ''),
        'apellido': user.get('apellido', ''),
        'email': user.get('email', ''),
        'telefono': user.get('telefono', ''),
        'avatar_url': user.get('avatar_url', ''),
        'facultad': user.get('facultad', ''),
        'carrera': user.get('carrera', ''),
        'direccion': user.get('direccion', ''),
        'about': user.get('about', ''),
        'parada_bus': user.get('parada_bus', ''),
        'horario_tabla': user.get('horario_tabla', {}),
        'horario_resumido': user.get('horario_resumido', {}),
        'hora_entrada': user.get('hora_entrada', ''),
        'ampm_entrada': user.get('ampm_entrada', ''),
        'hora_salida': user.get('hora_salida', ''),
        'ampm_salida': user.get('ampm_salida', '')
    })

@app.route('/check-password', methods=['POST'])
def check_password():
    data = request.json
    email = data.get('email')
    telefono = data.get('telefono')
    password = data.get('password')

    user = None
    if email:
        user = users_collection.find_one({'email': email})
    elif telefono:
        telefono = normalize_phone(telefono)
        user = users_collection.find_one({'telefono': telefono})

    if user and user['contrasena'] == password:
        return jsonify({'success': True}), 200
    else:
        return jsonify({'success': False}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/update-user', methods=['POST'])
def update_user():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No autenticado'}), 401
    user = users_collection.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'error': 'Usuario no encontrado'}), 404

    data = request.json
    campos_permitidos = [
        'nombre', 'apellido', 'facultad', 'carrera', 'direccion',
        'telefono', 'email', 'about', 'parada_bus',
        'horario_tabla', 'horario_resumido',
        'hora_entrada', 'ampm_entrada', 'hora_salida', 'ampm_salida'  # <--- AGREGADO
    ]
    update_data = {k: v for k, v in data.items() if k in campos_permitidos}
    if not update_data:
        return jsonify({'error': 'Nada para actualizar'}), 400

    users_collection.update_one({'_id': user['_id']}, {'$set': update_data})
    return jsonify({'success': True})

@app.route('/upload-avatar', methods=['POST'])
def upload_avatar():
    email = session.get('email')
    telefono = session.get('telefono')
    user = None
    if email:
        user = users_collection.find_one({'email': email})
    elif telefono:
        user = users_collection.find_one({'telefono': telefono})
    if not user:
        return jsonify({'error': 'Usuario no autenticado'}), 401

    file = request.files.get('avatar')
    if not file:
        return jsonify({'error': 'No se recibió archivo'}), 400

    filename = f"user_{str(user['_id'])}.png"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)
    avatar_url = f"/static/avatars/{filename}"
    users_collection.update_one({'_id': user['_id']}, {'$set': {'avatar_url': avatar_url}})
    return jsonify({'avatar_url': avatar_url})

@app.route('/remove-avatar', methods=['POST'])
def remove_avatar():
    email = session.get('email')
    telefono = session.get('telefono')
    user = None
    if email:
        user = users_collection.find_one({'email': email})
    elif telefono:
        user = users_collection.find_one({'telefono': telefono})
    if not user:
        return jsonify({'error': 'Usuario no autenticado'}), 401

    filename = f"user_{str(user['_id'])}.png"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    users_collection.update_one({'_id': user['_id']}, {'$unset': {'avatar_url': ""}})
    return jsonify({'ok': True})

@app.route('/static/avatars/<filename>')
def serve_avatar(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/rutas', methods=['GET'])
def get_rutas():
    rutas = list(db.rutas.find({}, {'_id': 0}))
    return jsonify(rutas)

@app.route('/check-user', methods=['POST'])
def check_user():
    data = request.json
    email = data.get('email')
    phone = data.get('phone')
    user = None
    if email:
        user = users_collection.find_one({'email': email})
    elif phone:
        phone = normalize_phone(phone)
        user = users_collection.find_one({'telefono': phone})
    return jsonify({'exists': bool(user)})

@app.route('/confirmar-asistencia', methods=['POST'])
def confirmar_asistencia():
    data = request.json
    nombre_ruta = data.get('nombre_ruta')
    sentido = data.get('sentido')  # 'ida' o 'vuelta'
    if not nombre_ruta or sentido not in ['ida', 'vuelta']:
        return jsonify({'error': 'Datos incompletos'}), 400

    ruta = db.rutas.find_one({'nombre': nombre_ruta})
    if not ruta:
        return jsonify({'error': 'Ruta no encontrada'}), 404

    # Inicializa los contadores si no existen
    if 'asistentes' not in ruta or not isinstance(ruta['asistentes'], dict):
        ruta['asistentes'] = {}
    if sentido not in ruta['asistentes'] or not isinstance(ruta['asistentes'][sentido], int):
        ruta['asistentes'][sentido] = 0

    # Incrementa el contador
    nuevo_valor = ruta['asistentes'][sentido] + 1
    db.rutas.update_one(
        {'_id': ruta['_id']},
        {'$set': {f'asistentes.{sentido}': nuevo_valor}}
    )

    return jsonify({'success': True, 'nuevo_total': nuevo_valor})


if __name__ == '__main__':
    app.run(debug=True)
