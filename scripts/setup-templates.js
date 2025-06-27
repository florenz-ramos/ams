const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTemplates() {
  try {
    console.log('Setting up templates table...');
    
    // Create templates table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS templates (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          type VARCHAR(100) NOT NULL,
          default_name VARCHAR(255) NOT NULL,
          default_description TEXT,
          user_targets TEXT[] DEFAULT '{}',
          requirements TEXT[] DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });

    if (createError) {
      console.error('Error creating table:', createError);
      return;
    }

    // Insert attendance template
    const { error: insertError } = await supabase
      .from('templates')
      .upsert({
        name: 'attendance',
        type: 'Attendance',
        default_name: 'Attendance Management System',
        default_description: 'This project is created to manage attendance of faculty.',
        user_targets: ['Admin', 'Faculty', 'Students'],
        requirements: [
          'Faculty attendance logging',
          'Student attendance tracking',
          'Admin dashboard for attendance reports',
          'Notifications for absentees',
          'Export attendance data (CSV/Excel)',
          'Attendance summary and analytics'
        ]
      }, { onConflict: 'name' });

    if (insertError) {
      console.error('Error inserting template:', insertError);
      return;
    }

    console.log('✅ Templates setup completed successfully!');
    console.log('You can now delete the local attendance.json file.');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
}

setupTemplates(); 