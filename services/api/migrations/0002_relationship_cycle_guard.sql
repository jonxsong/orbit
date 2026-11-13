CREATE OR REPLACE FUNCTION prevent_relationship_cycle() RETURNS trigger AS $$
BEGIN
  IF NEW.relationship_type NOT IN ('depends_on', 'blocks') OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    WITH RECURSIVE reachable(node_id) AS (
      SELECT NEW.to_id
      UNION
      SELECT r.to_id
      FROM relationships r
      JOIN reachable q ON r.from_id = q.node_id
      WHERE r.user_id = NEW.user_id
        AND r.relationship_type IN ('depends_on', 'blocks')
        AND r.deleted_at IS NULL
    )
    SELECT 1 FROM reachable WHERE node_id = NEW.from_id
  ) THEN
    RAISE EXCEPTION 'relationship would create a dependency cycle' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER relationships_cycle_guard
BEFORE INSERT OR UPDATE OF from_id, to_id, relationship_type, deleted_at ON relationships
FOR EACH ROW EXECUTE FUNCTION prevent_relationship_cycle();

