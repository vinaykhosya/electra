import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Schedule a task to run every minute
cron.schedule('* * * * *', async () => {
  console.log('Running cron job to check for schedules...');

  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching schedules:', error.message);
    return;
  }

  for (const schedule of schedules) {
    const { appliance_id, action, cron_expression } = schedule;

    // This is a simplified cron checker. For a real application, you would use a more robust library.
    const [minute, hour, dayOfMonth, month, dayOfWeek] = cron_expression.split(' ');
    const now = new Date();

    const isTimeMatch = 
      (minute === '*' || parseInt(minute) === now.getMinutes()) &&
      (hour === '*' || parseInt(hour) === now.getHours()) &&
      (dayOfMonth === '*' || parseInt(dayOfMonth) === now.getDate()) &&
      (month === '*' || parseInt(month) === now.getMonth() + 1) &&
      (dayOfWeek === '*' || parseInt(dayOfWeek) === now.getDay());

    if (isTimeMatch) {
      console.log(`Executing schedule for appliance ${appliance_id}: turning ${action}`);
      
      const { data: appliance, error: fetchError } = await supabase
        .from('appliances')
        .select('*')
        .eq('id', appliance_id)
        .single();

      if (fetchError) {
        console.error(`Error fetching appliance ${appliance_id}:`, fetchError.message);
        continue;
      }

      let updatedAppliance;

      if (action === 'on') {
        const { data, error } = await supabase
          .from('appliances')
          .update({ status: 'on', last_turned_on: new Date().toISOString() })
          .eq('id', appliance_id)
          .select()
          .single();
        if (error) {
          console.error(`Error turning on appliance ${appliance_id}:`, error.message);
          continue;
        }
        updatedAppliance = data;
      } else if (action === 'off') {
        const turnedOnAt = new Date(appliance.last_turned_on).getTime();
        const usageMs = new Date().getTime() - turnedOnAt;
        const totalUsageMs = (appliance.total_usage_ms || 0) + usageMs;

        const { data, error } = await supabase
          .from('appliances')
          .update({ status: 'off', total_usage_ms: totalUsageMs })
          .eq('id', appliance_id)
          .select()
          .single();
        if (error) {
          console.error(`Error turning off appliance ${appliance_id}:`, error.message);
          continue;
        }
        updatedAppliance = data;
      }
    }
  }
});
