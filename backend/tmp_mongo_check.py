import os
from pymongo import MongoClient

# Load .env manually if present
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            if k not in os.environ:
                os.environ[k] = v

uri = os.getenv('MONGODB_URI')
if not uri:
    raise SystemExit('MONGODB_URI not set')

client = MongoClient(uri)
db = client.get_default_database()

pending = list(db.tasks.find({'confirmation_status': 'pending'}))
print('Total pending confirmations:', len(pending))
for t in pending[:10]:
    print('id', t.get('id'), 'status', repr(t.get('status')), 'confirmation', t.get('confirmation_status'))

pending_completed = list(db.tasks.find({'confirmation_status': 'pending', 'status': 'completed'}))
print('Total pending confirmations (completed):', len(pending_completed))
for t in pending_completed[:10]:
    print('id', t.get('id'), 'status', repr(t.get('status')), 'confirmation', t.get('confirmation_status'))
