const Database = require('better-sqlite3');
const db = new Database('server/database.sqlite');

db.prepare("UPDATE knowledge_base SET category = 'xv-anos' WHERE category = 'xv-años'").run();
db.prepare("UPDATE knowledge_base SET category = 'cumpleanos' WHERE category = 'cumpleaños'").run();

const rows = db.prepare('SELECT id, category FROM knowledge_base').all();
console.log('DESPUES:');
rows.forEach(r => console.log('  id=' + r.id + ' category=' + JSON.stringify(r.category)));
db.close();