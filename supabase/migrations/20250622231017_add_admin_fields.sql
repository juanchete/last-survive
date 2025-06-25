-- Migración: Agregar campos de administración
-- Fecha: Enero 2025
-- Descripción: Campos para roles de admin, usuarios baneados, verificados y logs de acciones administrativas

-- 1. Agregar campos de administración a la tabla users
ALTER TABLE users 
ADD COLUMN role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
ADD COLUMN banned BOOLEAN DEFAULT FALSE,
ADD COLUMN verified BOOLEAN DEFAULT FALSE,
ADD COLUMN banned_at TIMESTAMP,
ADD COLUMN banned_reason TEXT,
ADD COLUMN banned_by UUID REFERENCES users(id),
ADD COLUMN verified_at TIMESTAMP,
ADD COLUMN verified_by UUID REFERENCES users(id);

-- 2. Crear tabla para logs de acciones administrativas
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    target_league_id UUID REFERENCES leagues(id),
    target_player_id INTEGER REFERENCES players(id),
    action_type VARCHAR(50) NOT NULL, -- 'ban_user', 'verify_user', 'edit_player', 'resolve_dispute', etc.
    action_details JSONB,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Crear índices para rendimiento
CREATE INDEX idx_admin_actions_admin_user ON admin_actions(admin_user_id);
CREATE INDEX idx_admin_actions_target_user ON admin_actions(target_user_id);
CREATE INDEX idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_banned ON users(banned);

-- 4. Función para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role IN ('admin', 'super_admin')
        AND NOT banned
    );
END;
$$;

-- 5. Función para banear un usuario
CREATE OR REPLACE FUNCTION ban_user(
    admin_id UUID,
    target_user_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Verificar que el admin tiene permisos
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Verificar que el usuario objetivo existe
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
        RETURN json_build_object('success', false, 'error', 'Usuario no encontrado');
    END IF;

    -- Banear usuario
    UPDATE users 
    SET 
        banned = TRUE,
        banned_at = NOW(),
        banned_reason = reason,
        banned_by = admin_id
    WHERE id = target_user_id;

    -- Registrar acción administrativa
    INSERT INTO admin_actions (admin_user_id, target_user_id, action_type, reason)
    VALUES (admin_id, target_user_id, 'ban_user', reason);

    RETURN json_build_object('success', true, 'message', 'Usuario baneado exitosamente');
END;
$$;

-- 6. Función para desbanear un usuario
CREATE OR REPLACE FUNCTION unban_user(
    admin_id UUID,
    target_user_id UUID,
    reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar permisos
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Desbanear usuario
    UPDATE users 
    SET 
        banned = FALSE,
        banned_at = NULL,
        banned_reason = NULL,
        banned_by = NULL
    WHERE id = target_user_id;

    -- Registrar acción
    INSERT INTO admin_actions (admin_user_id, target_user_id, action_type, reason)
    VALUES (admin_id, target_user_id, 'unban_user', reason);

    RETURN json_build_object('success', true, 'message', 'Usuario desbaneado exitosamente');
END;
$$;

-- 7. Función para verificar un usuario
CREATE OR REPLACE FUNCTION verify_user(
    admin_id UUID,
    target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar permisos
    IF NOT is_admin(admin_id) THEN
        RETURN json_build_object('success', false, 'error', 'Sin permisos de administrador');
    END IF;

    -- Verificar usuario
    UPDATE users 
    SET 
        verified = TRUE,
        verified_at = NOW(),
        verified_by = admin_id
    WHERE id = target_user_id;

    -- Registrar acción
    INSERT INTO admin_actions (admin_user_id, target_user_id, action_type)
    VALUES (admin_id, target_user_id, 'verify_user');

    RETURN json_build_object('success', true, 'message', 'Usuario verificado exitosamente');
END;
$$;

-- 8. Función para obtener estadísticas administrativas
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stats JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM users),
        'banned_users', (SELECT COUNT(*) FROM users WHERE banned = true),
        'verified_users', (SELECT COUNT(*) FROM users WHERE verified = true),
        'total_leagues', (SELECT COUNT(*) FROM leagues),
        'active_leagues', (SELECT COUNT(*) FROM leagues WHERE status = 'active'),
        'total_players', (SELECT COUNT(*) FROM players),
        'recent_actions', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'action_type', action_type,
                    'admin_user', (SELECT full_name FROM users WHERE id = admin_user_id),
                    'target_user', (SELECT full_name FROM users WHERE id = target_user_id),
                    'created_at', created_at,
                    'reason', reason
                )
            )
            FROM admin_actions 
            ORDER BY created_at DESC 
            LIMIT 10
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$;

-- 9. Crear un usuario admin por defecto (opcional - cambiar email)
-- INSERT INTO users (id, email, full_name, role, verified) 
-- VALUES (gen_random_uuid(), 'admin@lastsurvive.com', 'Super Admin', 'super_admin', true);

COMMENT ON TABLE admin_actions IS 'Registro de todas las acciones administrativas';
COMMENT ON FUNCTION is_admin IS 'Verifica si un usuario tiene permisos de administrador';
COMMENT ON FUNCTION ban_user IS 'Banea un usuario y registra la acción';
COMMENT ON FUNCTION verify_user IS 'Verifica un usuario y registra la acción'; 