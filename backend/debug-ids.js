
import { dbQuery } from './db/client.js';

async function run() {
  try {
    const ids = ['68e4964712a465ffa6ad1769', '68e4966812a465ffa6ad176b-uber', '68e49bb912a465ffa6ad177f', '68e49c7712a465ffa6ad1784-uber'];
    console.log('--- Checking Modifier Group IDs ---');
    for (const id of ids) {
      const res = await dbQuery('SELECT shop_id, uber_modifier_group_id, modifier_group_name FROM uber_modifier_groups_local WHERE uber_modifier_group_id = $1', [id]);
      console.log(`ID: ${id}`);
      if (res.rows.length === 0) {
        console.log('  NOT FOUND');
      } else {
        res.rows.forEach(r => console.log(`  Shop: ${r.shop_id} | Name: ${r.modifier_group_name}`));
      }
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
