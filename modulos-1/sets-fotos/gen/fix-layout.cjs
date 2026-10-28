/* Inserta ${layout} faltante en regalos (antes de ${meta('regalos'...)) y
 * vestimenta (antes de ${meta('vestimenta'...)). */
const fs = require('fs');
const P = __dirname;
let c = fs.readFileSync(P + '/tpl-c.cjs', 'utf-8');
let n = 0;

const rAnchor = "${meta('regalos', 'regalos-sf' + S.num, S,";
if (c.includes(rAnchor)) {
  c = c.replace(rAnchor, '${layout}\n' + rAnchor);
  n++;
  console.log('✓ ${layout} regalos');
} else console.log('· regalos ya con layout');

const vAnchor = "${meta('vestimenta', 'vestimenta-sf' + S.num, S,";
if (c.includes(vAnchor)) {
  c = c.replace(vAnchor, '${layout}\n' + vAnchor);
  n++;
  console.log('✓ ${layout} vestimenta');
} else console.log('· vestimenta ya con layout');

fs.writeFileSync(P + '/tpl-c.cjs', c);
console.log('inserts:', n);
