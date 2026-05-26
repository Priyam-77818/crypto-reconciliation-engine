db = db.getSiblingDB('crypto_reconciliation');

db.createCollection('rawtransactions');
db.createCollection('normalizedtransactions');
db.createCollection('reconciliationruns');
db.createCollection('reconciliationresults');
db.createCollection('rejectedrows');

print('MongoDB initialized: crypto_reconciliation database and collections created.');
