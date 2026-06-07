-- =============================================================================
-- Birim İstatistik — RLS yazma politikaları (cutover)
-- =============================================================================
-- Önce: 001_bi_profiles.sql ve 002_bi_data.sql çalıştırılmış olmalı
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Yardımcı fonksiyonlar
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bi_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT u.role
      FROM public.bi_users u
      WHERE u.firebase_uid = bi_firebase_uid()
    ),
    (
      SELECT p.role
      FROM public.bi_profiles p
      WHERE p.id = auth.uid()
    ),
    'viewer'
  );
$$;

CREATE OR REPLACE FUNCTION public.bi_can_enter_data()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bi_is_admin()
    OR bi_my_role() IN ('admin', 'proje_yetkilisi', 'editor');
$$;

CREATE OR REPLACE FUNCTION public.bi_can_finalize()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bi_is_admin()
    OR bi_my_role() IN ('admin', 'proje_yetkilisi');
$$;

CREATE OR REPLACE FUNCTION public.bi_has_assigned_birim(target_birim TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bi_is_admin()
    OR target_birim = ANY (bi_my_birimler());
$$;

-- ---------------------------------------------------------------------------
-- bi_users
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS bi_users_insert ON public.bi_users;
CREATE POLICY bi_users_insert ON public.bi_users FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND firebase_uid = bi_firebase_uid()
  );

DROP POLICY IF EXISTS bi_users_update ON public.bi_users;
CREATE POLICY bi_users_update ON public.bi_users FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR firebase_uid = bi_firebase_uid())
  )
  WITH CHECK (
    bi_is_admin()
    OR firebase_uid = bi_firebase_uid()
  );

DROP POLICY IF EXISTS bi_users_delete ON public.bi_users;
CREATE POLICY bi_users_delete ON public.bi_users FOR DELETE
  USING (auth.uid() IS NOT NULL AND bi_is_admin());

-- ---------------------------------------------------------------------------
-- Config tabloları (admin yazma)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS bi_config_birimler_write ON public.bi_config_birimler;
CREATE POLICY bi_config_birimler_write ON public.bi_config_birimler
  FOR ALL USING (auth.uid() IS NOT NULL AND bi_is_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND bi_is_admin());

DROP POLICY IF EXISTS bi_config_kat_ortak_write ON public.bi_config_kategoriler_ortak;
CREATE POLICY bi_config_kat_ortak_write ON public.bi_config_kategoriler_ortak
  FOR ALL USING (auth.uid() IS NOT NULL AND bi_is_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND bi_is_admin());

DROP POLICY IF EXISTS bi_config_kat_birim_write ON public.bi_config_kategoriler_birim;
CREATE POLICY bi_config_kat_birim_write ON public.bi_config_kategoriler_birim
  FOR ALL USING (auth.uid() IS NOT NULL AND bi_is_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND bi_is_admin());

DROP POLICY IF EXISTS bi_config_akis_write ON public.bi_config_akis;
CREATE POLICY bi_config_akis_write ON public.bi_config_akis
  FOR ALL USING (auth.uid() IS NOT NULL AND bi_is_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND bi_is_admin());

DROP POLICY IF EXISTS bi_config_hedef_write ON public.bi_config_hedefler;
CREATE POLICY bi_config_hedef_write ON public.bi_config_hedefler
  FOR ALL USING (auth.uid() IS NOT NULL AND bi_is_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND bi_is_admin());

DROP POLICY IF EXISTS bi_config_duyuru_write ON public.bi_config_duyuru;
CREATE POLICY bi_config_duyuru_write ON public.bi_config_duyuru
  FOR ALL USING (auth.uid() IS NOT NULL AND bi_is_admin())
  WITH CHECK (auth.uid() IS NOT NULL AND bi_is_admin());

-- config/admins Firestore'da yazılamaz; aynı kural
-- (service_role import scripti RLS bypass eder)

-- ---------------------------------------------------------------------------
-- İşlem kayıtları
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS bi_islem_insert ON public.bi_islem_kayitlari;
CREATE POLICY bi_islem_insert ON public.bi_islem_kayitlari FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bi_can_enter_data()
    AND bi_has_assigned_birim(birim)
    AND (user_id = bi_firebase_uid() OR bi_is_admin())
  );

DROP POLICY IF EXISTS bi_islem_update ON public.bi_islem_kayitlari;
CREATE POLICY bi_islem_update ON public.bi_islem_kayitlari FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      bi_is_admin()
      OR (
        bi_can_enter_data()
        AND bi_has_assigned_birim(birim)
        AND user_id = bi_firebase_uid()
      )
    )
  )
  WITH CHECK (
    bi_is_admin()
    OR (
      bi_can_enter_data()
      AND bi_has_assigned_birim(birim)
      AND user_id = bi_firebase_uid()
    )
  );

DROP POLICY IF EXISTS bi_islem_delete ON public.bi_islem_kayitlari;
CREATE POLICY bi_islem_delete ON public.bi_islem_kayitlari FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      bi_is_admin()
      OR (
        bi_can_enter_data()
        AND bi_has_assigned_birim(birim)
        AND user_id = bi_firebase_uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Kesinleşen günler, onaylar, izinler
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS bi_kesin_write ON public.bi_kesinlesen_gunler;
CREATE POLICY bi_kesin_write ON public.bi_kesinlesen_gunler
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR (bi_can_finalize() AND bi_has_assigned_birim(birim)))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bi_can_finalize()
    AND bi_has_assigned_birim(birim)
  );

DROP POLICY IF EXISTS bi_gun_onay_write ON public.bi_gun_onaylari;
CREATE POLICY bi_gun_onay_write ON public.bi_gun_onaylari
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR (bi_can_finalize() AND bi_has_assigned_birim(birim)))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bi_can_finalize()
    AND bi_has_assigned_birim(birim)
  );

DROP POLICY IF EXISTS bi_izin_write ON public.bi_personel_izinleri;
CREATE POLICY bi_izin_write ON public.bi_personel_izinleri
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR (bi_can_finalize() AND bi_has_assigned_birim(birim)))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bi_can_finalize()
    AND bi_has_assigned_birim(birim)
  );

DROP POLICY IF EXISTS bi_ay_birim_write ON public.bi_ay_birim_onaylari;
CREATE POLICY bi_ay_birim_write ON public.bi_ay_birim_onaylari
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND (bi_is_admin() OR (bi_can_finalize() AND bi_has_assigned_birim(birim)))
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND bi_can_finalize()
    AND bi_has_assigned_birim(birim)
  );

-- ---------------------------------------------------------------------------
-- Ay kapanışı, kilit talepleri, denetim
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS bi_ay_kapanis_write ON public.bi_ay_kapanislari;
CREATE POLICY bi_ay_kapanis_write ON public.bi_ay_kapanislari
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND (bi_is_admin() OR bi_can_finalize()));

DROP POLICY IF EXISTS bi_ay_kapanis_update ON public.bi_ay_kapanislari;
CREATE POLICY bi_ay_kapanis_update ON public.bi_ay_kapanislari
  FOR UPDATE
  USING (auth.uid() IS NOT NULL AND (bi_is_admin() OR bi_can_finalize()))
  WITH CHECK (auth.uid() IS NOT NULL AND (bi_is_admin() OR bi_can_finalize()));

DROP POLICY IF EXISTS bi_ay_kapanis_delete ON public.bi_ay_kapanislari;
CREATE POLICY bi_ay_kapanis_delete ON public.bi_ay_kapanislari
  FOR DELETE
  USING (auth.uid() IS NOT NULL AND bi_is_admin());

DROP POLICY IF EXISTS bi_kilit_insert ON public.bi_kilit_acma_talepleri;
CREATE POLICY bi_kilit_insert ON public.bi_kilit_acma_talepleri FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_kilit_update ON public.bi_kilit_acma_talepleri;
CREATE POLICY bi_kilit_update ON public.bi_kilit_acma_talepleri FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS bi_kilit_delete ON public.bi_kilit_acma_talepleri;
CREATE POLICY bi_kilit_delete ON public.bi_kilit_acma_talepleri FOR DELETE
  USING (auth.uid() IS NOT NULL AND bi_is_admin());

DROP POLICY IF EXISTS bi_audit_insert ON public.bi_audit_log;
CREATE POLICY bi_audit_insert ON public.bi_audit_log FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND actor_uid = bi_firebase_uid()
  );
