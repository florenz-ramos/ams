'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function getTemplate(templateName: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .ilike('name', templateName)
      .single();
    
    if (error) {
      console.error(`Error fetching template ${templateName}:`, error);
      console.log('SUPABASE ERROR DEBUG', error);
      return null;
    }
    
    return {
      ...data,
      requirements: Array.isArray(data?.requirements) ? data.requirements : [],
      user_targets: Array.isArray(data?.user_targets) ? data.user_targets : [],
    };
  } catch (error) {
    console.error(`Error reading template ${templateName}:`, error);
    return null;
  }
} 