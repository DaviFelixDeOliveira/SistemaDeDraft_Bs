-- Controle privado do cadastro e unicidade canônica dos identificadores.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.team_username_registry (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  canonical_username text NOT NULL UNIQUE
    CHECK (canonical_username ~ '^[a-z0-9]{3,32}$')
);
REVOKE ALL ON private.team_username_registry FROM PUBLIC,anon,authenticated;

-- Faz o backfill das contas existentes sem mudar suas credenciais.
INSERT INTO private.team_username_registry (user_id,canonical_username)
SELECT id,regexp_replace(lower(split_part(email,'@',1)),'[^a-z0-9]','','g')
FROM auth.users
WHERE email LIKE '%@teams.sistema-de-draft.invalid'
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.sync_team_username_registry()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,private AS $$
DECLARE v_key text;
BEGIN
 IF NEW.email IS NULL OR NEW.email NOT LIKE '%@teams.sistema-de-draft.invalid' THEN
   IF TG_OP = 'UPDATE' AND OLD.email LIKE '%@teams.sistema-de-draft.invalid' THEN
     RAISE EXCEPTION 'O identificador de equipe deve continuar interno.'
       USING ERRCODE='22023';
   END IF;
   RETURN NEW;
 END IF;
 v_key:=regexp_replace(lower(split_part(NEW.email,'@',1)),'[^a-z0-9]','','g');
 IF v_key !~ '^[a-z0-9]{3,32}$' THEN
   RAISE EXCEPTION 'Identificador de equipe inválido.' USING ERRCODE='22023';
 END IF;
 INSERT INTO private.team_username_registry(user_id,canonical_username)
 VALUES (NEW.id,v_key)
 ON CONFLICT(user_id) DO UPDATE SET canonical_username=excluded.canonical_username;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_team_username_on_auth ON auth.users;
CREATE TRIGGER sync_team_username_on_auth
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.sync_team_username_registry();

-- Cadastro fechado no BACKEND: modificar uma flag do frontend nunca reabre.
CREATE TABLE IF NOT EXISTS private.team_registration_control (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO private.team_registration_control(singleton,enabled)
VALUES(true,false) ON CONFLICT(singleton) DO UPDATE SET enabled=false;
REVOKE ALL ON private.team_registration_control FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION private.enforce_team_registration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,private AS $$
BEGIN
 IF NEW.email LIKE '%@teams.sistema-de-draft.invalid'
   AND NOT EXISTS (SELECT 1 FROM private.team_registration_control WHERE singleton AND enabled) THEN
   RAISE EXCEPTION 'Cadastro público desabilitado. Consulte o administrador.'
     USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS restrict_team_registration_auth ON auth.users;
CREATE TRIGGER restrict_team_registration_auth
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.enforce_team_registration();
