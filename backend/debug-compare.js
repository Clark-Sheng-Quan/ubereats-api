
import { dbQuery } from './db/client.js';

async function run() {
  try {
    const shopId = '672962931de176d07ac32c6e';
    
    console.log('--- Checking Earl Grey Tea (Item) ---');
    const items = await dbQuery('SELECT item_name, option_summary, modifier_group_ids FROM uber_items_local WHERE shop_id = $1 AND item_name ILIKE $2', [shopId, '%Earl Grey Tea%']);
    items.rows.forEach(r => {
      console.log(`Item: ${r.item_name}`);
      console.log(`Option Summary: ${r.option_summary}`);
      console.log(`Modifier IDs: ${JSON.stringify(r.modifier_group_ids.ids)}`);
    });

    console.log('\n--- Checking Modifier Groups ---');
    // Get all groups for this shop to see what's actually there
    const groups = await dbQuery('SELECT uber_modifier_group_id, modifier_group_name FROM uber_modifier_groups_local WHERE shop_id = $1', [shopId]);
    groups.rows.forEach(r => {
      if (r.modifier_group_name.toLowerCase().includes('upsize') || r.uber_modifier_group_id.includes('68e4964712a465ffa6ad1769')) {
         console.log(`ID: ${r.uber_modifier_group_id} | Name: ${r.modifier_group_name}`);
      }
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
