import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://pcmlleeuxbymomjxhwlv.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjbWxsZWV1eGJ5bW9tanhod2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNzA2NzgsImV4cCI6MjEwMzk0NjY3OH0.WZCqgnt_7l88U-Yl_rAvhmXQLSKy70hT1Wjq8rf_qC0';

    const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = body.action || req.query?.action || 'list';

    // 1. LIST ALL STAFF & ADMIN PROFILES
    if (action === 'list') {
      const { data: staffList, error: listErr } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (listErr) {
        console.warn('admin_profiles list notice:', listErr.message);
        return res.status(200).json({ staff: [] });
      }

      return res.status(200).json({ staff: staffList || [] });
    }

    // 2. CREATE NEW STAFF ACCOUNT
    if (action === 'create') {
      const { email, password, name, role = 'Admin', role_title = 'Staff', permissions } = body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.endsWith('@admin.com') && !cleanEmail.endsWith('@superadmin.com')) {
        return res.status(400).json({
          error: 'Admin emails must end with either @admin.com or @superadmin.com',
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const assignedRole = cleanEmail.endsWith('@superadmin.com') ? 'Super Admin' : (role || 'Admin');
      const defaultPermissions = assignedRole === 'Super Admin'
        ? ['dashboard', 'products', 'orders', 'reviews', 'customize', 'profile']
        : (permissions && Array.isArray(permissions) && permissions.length > 0
            ? permissions
            : ['dashboard', 'orders']);

      let createdUserId = null;

      // If Service Role Key is configured, use admin auth API (instant confirmation)
      if (serviceRoleKey) {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: name || 'Staff Member',
            role: assignedRole,
          },
        });

        if (authErr) {
          return res.status(400).json({ error: authErr.message });
        }
        createdUserId = authData?.user?.id;
      } else {
        // Fallback with non-persisted client
        const nonPersistedClient = createClient(supabaseUrl, anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        });

        const { data: signUpData, error: signUpErr } = await nonPersistedClient.auth.signUp({
          email: cleanEmail,
          password: password,
          options: {
            data: {
              full_name: name || 'Staff Member',
              role: assignedRole,
            },
          },
        });

        if (signUpErr) {
          return res.status(400).json({ error: signUpErr.message });
        }
        createdUserId = signUpData?.user?.id;
      }

      // Upsert into admin_profiles
      const profilePayload = {
        email: cleanEmail,
        name: name || (cleanEmail.split('@')[0]),
        role: assignedRole,
        role_title: role_title || (assignedRole === 'Super Admin' ? 'Super Administrator' : 'Staff Specialist'),
        permissions: defaultPermissions,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (createdUserId) {
        profilePayload.id = createdUserId;
      }

      const { data: newProfile, error: profErr } = await supabase
        .from('admin_profiles')
        .upsert(profilePayload)
        .select()
        .single();

      if (profErr) {
        console.warn('Profile upsert warning:', profErr.message);
      }

      return res.status(200).json({
        success: true,
        message: `Account for ${cleanEmail} created successfully.`,
        staff: newProfile || profilePayload,
      });
    }

    // 3. UPDATE GRANULAR PERMISSIONS
    if (action === 'update-permissions') {
      const { staffId, permissions } = body;
      if (!staffId || !Array.isArray(permissions)) {
        return res.status(400).json({ error: 'staffId and permissions array are required' });
      }

      const { data, error } = await supabase
        .from('admin_profiles')
        .update({
          permissions: permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Staff permissions updated successfully',
        staff: data,
      });
    }

    // 4. TOGGLE ACTIVE STATUS
    if (action === 'toggle-status') {
      const { staffId, isActive } = body;
      if (!staffId || typeof isActive !== 'boolean') {
        return res.status(400).json({ error: 'staffId and boolean isActive are required' });
      }

      const { data, error } = await supabase
        .from('admin_profiles')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId)
        .select()
        .single();

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        message: `Staff status updated to ${isActive ? 'Active' : 'Suspended'}`,
        staff: data,
      });
    }

    // 5. DELETE STAFF PROFILE
    if (action === 'delete') {
      const { staffId } = body;
      if (!staffId) {
        return res.status(400).json({ error: 'staffId is required' });
      }

      if (serviceRoleKey) {
        try {
          await supabase.auth.admin.deleteUser(staffId);
        } catch (authDelErr) {
          console.warn('Auth user delete notice:', authDelErr.message);
        }
      }

      const { error } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', staffId);

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Staff account removed successfully',
      });
    }

    return res.status(400).json({ error: `Unsupported action: ${action}` });
  } catch (err) {
    console.error('admin-manage-staff error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
