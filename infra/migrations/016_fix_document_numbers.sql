-- 016_fix_document_numbers.sql
-- Quote and order numbers could never be generated.
--
-- generate_quote_number / generate_order_number (003, 006) read shops.slug, which does not
-- exist (shops has `code`), so every quote insert failed. Their sequence lookup was also wrong:
-- numbers look like CODE-YYYYMMDD-0001, but the lookup matched numbers *starting* with the
-- date, so it would have returned 0001 every time and hit the UNIQUE constraint on the second
-- quote of a day.
--
-- Both numbers are unique across all tenants while shop codes are only unique per tenant, so
-- the sequence counts every number with the same prefix, not just this shop's. An advisory
-- lock serializes callers for the rest of their transaction.

CREATE OR REPLACE FUNCTION generate_quote_number(p_tenant_id UUID, p_shop_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix TEXT;
  v_sequence INTEGER;
BEGIN
  v_prefix := COALESCE(
    (SELECT upper(code) FROM shops WHERE id = p_shop_id AND tenant_id = p_tenant_id),
    'Q'
  ) || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';

  PERFORM pg_advisory_xact_lock(hashtext('quote_number:' || v_prefix));

  SELECT COALESCE(MAX(CAST(substring(quote_number FROM length(v_prefix) + 1) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM quotes
  WHERE quote_number LIKE v_prefix || '%'
    AND substring(quote_number FROM length(v_prefix) + 1) ~ '^[0-9]+$';

  RETURN v_prefix || LPAD(v_sequence::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_order_number(p_tenant_id UUID, p_shop_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix TEXT;
  v_sequence INTEGER;
BEGIN
  v_prefix := COALESCE(
    (SELECT upper(code) FROM shops WHERE id = p_shop_id AND tenant_id = p_tenant_id),
    'O'
  ) || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';

  PERFORM pg_advisory_xact_lock(hashtext('order_number:' || v_prefix));

  SELECT COALESCE(MAX(CAST(substring(order_number FROM length(v_prefix) + 1) AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM orders
  WHERE order_number LIKE v_prefix || '%'
    AND substring(order_number FROM length(v_prefix) + 1) ~ '^[0-9]+$';

  RETURN v_prefix || LPAD(v_sequence::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
