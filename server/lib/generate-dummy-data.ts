import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

const devices = [
  { name: 'Stove' },
  { name: 'Blender' },
  { name: 'Mixer' },
  { name: 'Radio Cooker' },
];

async function generateDummyData() {
  console.log('Starting dummy data generation...');

  const { data: home, error: homeError } = await supabase
    .from('homes')
    .select('id')
    .limit(1)
    .single();

  if (homeError || !home) {
    console.error('No homes found. Please create a home before seeding the database.');
    return;
  }

  for (const device of devices) {
    console.log(`Generating data for ${device.name}...`);

    const { data: appliance, error } = await supabase
      .from('appliances')
      .insert({ name: device.name, status: 'off', total_usage_ms: 0, home_id: home.id })
      .select()
      .single();

    if (error) {
      console.error(`Error creating appliance ${device.name}:`, error.message);
      continue;
    }

    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    let totalUsageMs = 0;

    for (let d = new Date(oneYearAgo); d <= now; d.setDate(d.getDate() + 1)) {
      // Simulate usage on random days
      if (Math.random() > 0.5) {
        const turnedOnAt = new Date(d);
        turnedOnAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const turnedOffAt = new Date(turnedOnAt);
        turnedOffAt.setMinutes(turnedOffAt.getMinutes() + Math.floor(Math.random() * 60));

        totalUsageMs += turnedOffAt.getTime() - turnedOnAt.getTime();

        await supabase.from('appliance_events').insert([
          {
            appliance_id: appliance.id,
            status: 'on',
            recorded_at: turnedOnAt.toISOString(),
          },
          {
            appliance_id: appliance.id,
            status: 'off',
            recorded_at: turnedOffAt.toISOString(),
          },
        ]);
      }
    }

    await supabase
      .from('appliances')
      .update({ total_usage_ms: totalUsageMs })
      .eq('id', appliance.id);
  }

  console.log('Dummy data generation complete.');
}

generateDummyData().catch(console.error);
