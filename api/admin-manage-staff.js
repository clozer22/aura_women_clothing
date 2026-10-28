import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerClient } from './_lib/supabaseServer.js';

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
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY;
    const supabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      'https://pcmlleeuxbymomjxhwlv.supabase.co';

    // Administrative Authentication Verification
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const callerHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const supabase = getSupabaseServerClient(serviceRoleKey || anonKey, callerHeaders);
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = body.action || req.query?.action || 'list';

    let callerUser = null;
    let callerEmail = '';
    let isSuperAdminCaller = false;

    if (token) {
      const { data: authUserData, error: authUserErr } = await supabase.auth.getUser(token);
      if (!authUserErr && authUserData?.user) {
        callerUser = authUserData.user;
        callerEmail = (callerUser.email || '').toLowerCase();
        isSuperAdminCaller = callerEmail.endsWith('@superadmin.com');
      }
    }

    // Check if any admin profiles exist yet (initial bootstrapping check)
    const { count: profileCount } = await supabase
      .from('admin_profiles')
      .select('*', { count: 'exact', head: true });

    const isBootstrapping = (profileCount === 0 || profileCount === null);

    // Enforce administrative authentication if not bootstrapping
    if (!isBootstrapping) {
      if (!callerUser) {
        return res.status(401).json({
          error: 'Unauthorized: Valid administrative session bearer token required.',
        });
      }
      if (!callerEmail.endsWith('@admin.com') && !callerEmail.endsWith('@superadmin.com')) {
        return res.status(403).json({
          error: 'Forbidden: Caller is not an authorized administrator.',
        });
      }
    }

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
        const nonPersistedClient = getSupabaseServerClient(anonKey);
        if (!nonPersistedClient) {
          return res.status(500).json({ error: 'Supabase client failed to initialize' });
        }

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

        // Supabase returns empty identities array if user already registered
        if (signUpData?.user?.identities && signUpData.user.identities.length === 0) {
          return res.status(400).json({ error: `A staff account for ${cleanEmail} is already registered.` });
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
        .upsert(profilePayload, { onConflict: 'email' })
        .select()
        .single();

      if (profErr) {
        console.error('Profile upsert failed:', profErr.message);
        return res.status(400).json({ error: `Staff created, but profile update failed: ${profErr.message}` });
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

      if (!isBootstrapping && !isSuperAdminCaller) {
        return res.status(403).json({ error: 'Forbidden: Only Super Administrators can delete staff accounts' });
      }

      // Use RPC to cleanly remove from both auth.users and admin_profiles
      try {
        const { error: rpcErr } = await supabase.rpc('admin_delete_staff_account', {
          staff_id: staffId,
        });
        if (!rpcErr) {
          return res.status(200).json({
            success: true,
            message: 'Staff account removed successfully',
          });
        }
      } catch (rpcEx) {
        console.warn('RPC delete notice:', rpcEx.message);
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
