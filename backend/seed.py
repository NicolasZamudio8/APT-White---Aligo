from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import SystemConfigModel, CryptoKeyModel, RedirectorModel, AgentModel, PlaybookModel, PlaybookStepModel
import datetime
import os

def seed_database(db: Session):
    print("[*] Creating database tables if they do not exist...")
    Base.metadata.create_all(bind=engine)
    print("[*] Seeding Database...")
    
    # 1. Seed System Configuration
    default_configs = [
        {"key": "security_level", "value": "High", "description": "Global security level of C2 payloads (Low/Medium/High)"},
        {"key": "beacon_interval", "value": "10", "description": "Beacon interval in seconds for agents heartbeat"},
        {"key": "log_level", "value": "INFO", "description": "LogLevel for server telemetry (DEBUG/INFO/WARNING/ERROR)"},
        {"key": "enable_ai", "value": "True", "description": "Enable AI Assistant integration (True/False)"},
        {"key": "enable_encryption", "value": "True", "description": "Enable dynamic packet payload encryption (True/False)"}
    ]
    for cfg in default_configs:
        exists = db.query(SystemConfigModel).filter_by(key=cfg["key"]).first()
        if not exists:
            db.add(SystemConfigModel(**cfg))
    
    # 2. Seed Default Cryptographic Keys
    default_key = db.query(CryptoKeyModel).filter_by(id="key-default").first()
    if not default_key:
        default_key = CryptoKeyModel(
            id="key-default",
            name="Default PSK",
            value=os.getenv("DEFAULT_PSK", "aligo-shared-secret-2024-v1"),
            algorithm="XOR-256",
            created_at=datetime.datetime.utcnow(),
            rotated_at=datetime.datetime.utcnow(),
            active=True
        )
        db.add(default_key)
        db.flush()

    # 3. Seed Default Redirectors
    default_redirectors = [
        {"id": "redir-main", "name": "Main C2 Server", "host": "c2.aligo.local", "port": 8000, "status": "online", "uplink_id": None},
        {"id": "redir-bog", "name": "Bogota Proxy", "host": "proxy-bog.aligo.local", "port": 9001, "status": "online", "uplink_id": "redir-main"},
        {"id": "redir-med", "name": "Medellin Proxy", "host": "proxy-med.aligo.local", "port": 9002, "status": "online", "uplink_id": "redir-main"}
    ]
    for rdr in default_redirectors:
        exists = db.query(RedirectorModel).filter_by(id=rdr["id"]).first()
        if not exists:
            db.add(RedirectorModel(**rdr))
    db.flush()

    # 4. Seed 33 Colombian Department Agents
    mock_agents_seeds = [
        {'id': 'ag-ant-1000', 'os': 'Windows 10', 'ip': '192.168.10.54', 'status': 'online', 'lat': 8.6193, 'lng': -76.3073, 'city': 'Antioquia'},
        {'id': 'ag-atl-1001', 'os': 'Linux', 'ip': '192.168.11.127', 'status': 'online', 'lat': 10.3612, 'lng': -74.8706, 'city': 'Atlantico'},
        {'id': 'ag-san-1002', 'os': 'Windows 10', 'ip': '192.168.12.2', 'status': 'online', 'lat': 4.7951, 'lng': -74.0229, 'city': 'Santafe de bogota d.c'},
        {'id': 'ag-bol-1003', 'os': 'Linux', 'ip': '192.168.13.127', 'status': 'offline', 'lat': 10.4236, 'lng': -75.1595, 'city': 'Bolivar'},
        {'id': 'ag-boy-1004', 'os': 'Windows 10', 'ip': '192.168.14.115', 'status': 'online', 'lat': 7.0275, 'lng': -72.2130, 'city': 'Boyaca'},
        {'id': 'ag-cal-1005', 'os': 'Linux', 'ip': '192.168.15.7', 'status': 'online', 'lat': 5.7527, 'lng': -74.6950, 'city': 'Caldas'},
        {'id': 'ag-caq-1006', 'os': 'Windows 10', 'ip': '192.168.16.143', 'status': 'online', 'lat': 2.4978, 'lng': -74.6926, 'city': 'Caqueta'},
        {'id': 'ag-cau-1007', 'os': 'Linux', 'ip': '192.168.17.52', 'status': 'online', 'lat': 2.9751, 'lng': -78.2116, 'city': 'Cauca'},
        {'id': 'ag-ces-1008', 'os': 'Windows 10', 'ip': '192.168.18.10', 'status': 'online', 'lat': 10.8562, 'lng': -73.2823, 'city': 'Cesar'},
        {'id': 'ag-cor-1009', 'os': 'Linux', 'ip': '192.168.19.30', 'status': 'online', 'lat': 9.4230, 'lng': -75.8195, 'city': 'Cordoba'},
        {'id': 'ag-cun-1010', 'os': 'Windows 10', 'ip': '192.168.20.82', 'status': 'online', 'lat': 5.7489, 'lng': -74.3296, 'city': 'Cundinamarca'},
        {'id': 'ag-cho-1011', 'os': 'Linux', 'ip': '192.168.21.152', 'status': 'offline', 'lat': 8.2717, 'lng': -77.0213, 'city': 'Choco'},
        {'id': 'ag-hui-1012', 'os': 'Windows 10', 'ip': '192.168.22.57', 'status': 'offline', 'lat': 3.2739, 'lng': -74.6360, 'city': 'Huila'},
        {'id': 'ag-la -1013', 'os': 'Linux', 'ip': '192.168.23.18', 'status': 'online', 'lat': 12.4235, 'lng': -71.6212, 'city': 'La guajira'},
        {'id': 'ag-mag-1014', 'os': 'Windows 10', 'ip': '192.168.24.131', 'status': 'online', 'lat': 11.3277, 'lng': -74.0918, 'city': 'Magdalena'},
        {'id': 'ag-met-1015', 'os': 'Linux', 'ip': '192.168.25.199', 'status': 'online', 'lat': 4.4449, 'lng': -71.0799, 'city': 'Meta'},
        {'id': 'ag-nar-1016', 'os': 'Windows 10', 'ip': '192.168.26.36', 'status': 'online', 'lat': 2.5774, 'lng': -77.9836, 'city': 'Nariño'},
        {'id': 'ag-nor-1017', 'os': 'Linux', 'ip': '192.168.27.85', 'status': 'offline', 'lat': 9.1340, 'lng': -73.0178, 'city': 'Norte de santander'},
        {'id': 'ag-qui-1018', 'os': 'Windows 10', 'ip': '192.168.28.69', 'status': 'online', 'lat': 4.6946, 'lng': -75.6721, 'city': 'Quindio'},
        {'id': 'ag-ris-1019', 'os': 'Linux', 'ip': '192.168.29.40', 'status': 'online', 'lat': 5.4751, 'lng': -75.8865, 'city': 'Risaralda'},
        {'id': 'ag-san-1020', 'os': 'Windows 10', 'ip': '192.168.30.153', 'status': 'online', 'lat': 8.1150, 'lng': -73.8001, 'city': 'Santander'},
        {'id': 'ag-suc-1021', 'os': 'Linux', 'ip': '192.168.31.173', 'status': 'online', 'lat': 9.8849, 'lng': -75.4831, 'city': 'Sucre'},
        {'id': 'ag-tol-1022', 'os': 'Windows 10', 'ip': '192.168.32.134', 'status': 'online', 'lat': 5.2814, 'lng': -74.8400, 'city': 'Tolima'},
        {'id': 'ag-val-1023', 'os': 'Linux', 'ip': '192.168.33.179', 'status': 'online', 'lat': 4.9736, 'lng': -76.0838, 'city': 'Valle del cauca'},
        {'id': 'ag-ara-1024', 'os': 'Windows 10', 'ip': '192.168.34.182', 'status': 'online', 'lat': 7.0593, 'lng': -70.6987, 'city': 'Arauca'},
        {'id': 'ag-cas-1025', 'os': 'Linux', 'ip': '192.168.35.49', 'status': 'online', 'lat': 6.2479, 'lng': -70.1725, 'city': 'Casanare'},
        {'id': 'ag-put-1026', 'os': 'Windows 10', 'ip': '192.168.36.131', 'status': 'offline', 'lat': 1.3164, 'lng': -76.5781, 'city': 'Putumayo'},
        {'id': 'ag-ama-1027', 'os': 'Linux', 'ip': '192.168.37.183', 'status': 'online', 'lat': 0.1186, 'lng': -71.3864, 'city': 'Amazonas'},
        {'id': 'ag-gua-1028', 'os': 'Windows 10', 'ip': '192.168.38.123', 'status': 'offline', 'lat': 3.8605, 'lng': -67.6878, 'city': 'Guainia'},
        {'id': 'ag-gua-1029', 'os': 'Linux', 'ip': '192.168.39.177', 'status': 'online', 'lat': 2.8375, 'lng': -71.2646, 'city': 'Guaviare'},
        {'id': 'ag-vau-1030', 'os': 'Windows 10', 'ip': '192.168.40.90', 'status': 'online', 'lat': 1.9853, 'lng': -70.1130, 'city': 'Vaupes'},
        {'id': 'ag-vic-1031', 'os': 'Linux', 'ip': '192.168.41.25', 'status': 'online', 'lat': 6.2795, 'lng': -67.7969, 'city': 'Vichada'},
        {'id': 'ag-arc-1032', 'os': 'Windows 10', 'ip': '192.168.42.100', 'status': 'online', 'lat': 12.5946, 'lng': -81.7130, 'city': 'San andres providencia y santa catalina'}
    ]
    for sag in mock_agents_seeds:
        exists = db.query(AgentModel).filter_by(id=sag["id"]).first()
        if not exists:
            # Map default keys and redirectors based on latitude/longitude (bog or med)
            redir_id = "redir-bog" if sag["lat"] > 6.0 else "redir-med"
            db.add(AgentModel(
                id=sag["id"],
                os=sag["os"],
                ip=sag["ip"],
                city=sag["city"],
                lat=sag["lat"],
                lng=sag["lng"],
                status=sag["status"],
                crypto_key_id="key-default",
                redirector_id=redir_id,
                last_seen=datetime.datetime.utcnow()
            ))
    db.flush()

    # 5. Seed Default Playbooks
    default_playbooks = [
        {
            "id": "pb-1",
            "name": "Reconocimiento Inicial",
            "description": "Obtiene informacion basica del sistema operativo y configuraciones de red del host objetivo.",
            "steps": [
                {"command": "whoami", "delay": 2, "mitre_tactics": ["T1033"]},
                {"command": "ipconfig", "delay": 3, "mitre_tactics": ["T1049", "T1016"]},
                {"command": "netstat", "delay": 2, "mitre_tactics": ["T1049"]}
            ]
        },
        {
            "id": "pb-2",
            "name": "Verificacion de Persistencia",
            "description": "Lista las tareas programadas y los usuarios registrados en el sistema.",
            "steps": [
                {"command": "hostname", "delay": 3, "mitre_tactics": ["T1082"]},
                {"command": "uname", "delay": 4, "mitre_tactics": ["T1082"]}
            ]
        }
    ]
    for pb in default_playbooks:
        exists = db.query(PlaybookModel).filter_by(id=pb["id"]).first()
        if not exists:
            db.add(PlaybookModel(id=pb["id"], name=pb["name"], description=pb["description"]))
            db.flush()
            for idx, step in enumerate(pb["steps"]):
                db.add(PlaybookStepModel(
                    playbook_id=pb["id"],
                    command=step["command"],
                    delay=step["delay"],
                    step_order=idx + 1,
                    mitre_tactics=step["mitre_tactics"]
                ))
    
    db.commit()
    print("[+] Seeding completed successfully.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
