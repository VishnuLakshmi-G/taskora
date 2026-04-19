from database_mongo import MongoDBManager

pending = list(MongoDBManager.find_documents('tasks', {'confirmation_status':'pending', 'status':'completed'}))
print('Total pending confirmations (completed):', len(pending))
for t in pending[:10]:
    print('id', t.get('id'), 'status', repr(t.get('status')), 'confirmation', t.get('confirmation_status'))
