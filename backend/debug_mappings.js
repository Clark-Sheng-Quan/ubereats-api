
import { dbQuery } from './db/client.js';

async function run() {
  const shop = '672962931de176d07ac32c6e';
  const result = await dbQuery('SELECT uber_option_id, uber_option_item_id FROM option_item_mappings WHERE shop_id=$1', [shop]);
  console.log('Total mappings for shop:', result.rows.length);
  
  const targets = [
    { opt: '675903604e454c2a96a0c194', item: '6759038c4e454c2a96a0c195' },
    { opt: '675903604e454c2a96a0c194', item: '675908fb4e454c2a96a0c19a' },
    { opt: '675916374e454c2a96a0c1a2-uber', item: '6759163d4e454c2a96a0c1a3' },
    { opt: '67591c4b4e454c2a96a0c1b5', item: '67591d6e4e454c2a96a0c1ba' }
  ];

  targets.forEach(t => {
    const match = result.rows.find(r => r.uber_option_id === t.opt && r.uber_option_item_id === t.item);
    console.log(`${t.opt} -> ${t.item}: ${match ? 'FOUND' : 'MISSING'}`);
    
    if (!match) {
        // Look for similar items
        const partialMatches = result.rows.filter(r => r.uber_option_item_id.includes(t.item.substring(0, 8)));
        if (partialMatches.length > 0) {
            console.log('  Similar item mappings found:');
            partialMatches.forEach(pm => console.log(`    ${pm.uber_option_id} -> ${pm.uber_option_item_id}`));
        }
    }
  });

  process.exit(0);
}

run();
