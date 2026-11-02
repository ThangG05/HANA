-- Recovered snapshot of public schema; apply only to a fresh Supabase project.
BEGIN;
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: hana_cam_sua_nhat_ky(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_cam_sua_nhat_ky"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  RAISE EXCEPTION 'Nhật ký chỉ ghi nối tiếp; không sửa hoặc xóa bản ghi.';
END;
$$;


--
-- Name: hana_cap_nhat_gio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_cap_nhat_gio"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.ngay_cap_nhat := clock_timestamp();
  RETURN NEW;
END;
$$;


--
-- Name: hana_chuan_hoa_sdt("text"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_chuan_hoa_sdt"("p_sdt" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $_$
  SELECT CASE
    WHEN p_sdt IS NULL OR btrim(p_sdt) = '' THEN NULL
    WHEN regexp_replace(p_sdt, '[^0-9]', '', 'g') ~ '^0[0-9]{9}$'
      THEN '84' || substring(regexp_replace(p_sdt, '[^0-9]', '', 'g') FROM 2)
    WHEN regexp_replace(p_sdt, '[^0-9]', '', 'g') ~ '^0084[0-9]{9}$'
      THEN substring(regexp_replace(p_sdt, '[^0-9]', '', 'g') FROM 3)
    ELSE nullif(regexp_replace(p_sdt, '[^0-9]', '', 'g'), '') END;
$_$;


--
-- Name: hana_ghi_trang_thai(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_ghi_trang_thai"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE v_actor uuid; v_ly_do text;
BEGIN
  v_actor := nullif(current_setting('hana.actor', true), '')::uuid;
  v_ly_do := nullif(current_setting('hana.ly_do', true), '');
  IF v_actor IS NULL THEN
    SELECT nv.nhan_vien_id INTO v_actor FROM public.nhan_vien nv
    WHERE nv.auth_user_id = auth.uid() AND nv.trang_thai_tai_khoan = 'hoat_dong';
  END IF;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lich_su_trang_thai(co_hoi_id, trang_thai_cu, trang_thai_moi, nguoi_thay_doi_id, ly_do)
    VALUES (NEW.co_hoi_id, NULL, NEW.trang_thai, v_actor, coalesce(v_ly_do, 'Tạo cơ hội'));
  ELSIF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    INSERT INTO public.lich_su_trang_thai(co_hoi_id, trang_thai_cu, trang_thai_moi, nguoi_thay_doi_id, ly_do)
    VALUES (NEW.co_hoi_id, OLD.trang_thai, NEW.trang_thai, v_actor, coalesce(v_ly_do, 'Cập nhật trạng thái'));
  END IF;
  RETURN NEW;
END; $$;


--
-- Name: hana_khoa_bao_gia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_bao_gia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.trang_thai <> 'nhap' THEN
      RAISE EXCEPTION 'hana_khoa: báo giá đã gửi hoặc đã chấp nhận không được xóa' USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.co_hoi_id IS DISTINCT FROM OLD.co_hoi_id
     OR NEW.phien_ban IS DISTINCT FROM OLD.phien_ban
     OR NEW.ngay_lap IS DISTINCT FROM OLD.ngay_lap
     OR NEW.nguoi_lap_id IS DISTINCT FROM OLD.nguoi_lap_id THEN
    RAISE EXCEPTION 'hana_khoa: không được đổi cơ hội, phiên bản, ngày lập hoặc người lập của báo giá' USING ERRCODE = '23514';
  END IF;

  IF OLD.trang_thai <> 'nhap' AND (
       NEW.hieu_luc_den IS DISTINCT FROM OLD.hieu_luc_den
       OR NEW.tham_kham_id IS DISTINCT FROM OLD.tham_kham_id) THEN
    RAISE EXCEPTION 'hana_khoa: báo giá đã gửi không được sửa nội dung, hãy tạo phiên bản mới' USING ERRCODE = '23514';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    IF NOT (
         (OLD.trang_thai = 'nhap'         AND NEW.trang_thai IN ('da_gui', 'huy'))
      OR (OLD.trang_thai = 'da_gui'       AND NEW.trang_thai IN ('da_chap_nhan', 'het_han', 'da_thay_the', 'huy'))
      OR (OLD.trang_thai = 'da_chap_nhan' AND NEW.trang_thai = 'da_thay_the')
    ) THEN
      RAISE EXCEPTION 'hana_khoa: không thể chuyển báo giá từ % sang %', OLD.trang_thai, NEW.trang_thai USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.khach_xac_nhan_luc IS DISTINCT FROM OLD.khach_xac_nhan_luc AND OLD.trang_thai <> 'nhap' THEN
    RAISE EXCEPTION 'hana_khoa: không được đổi thời điểm khách xác nhận' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: hana_khoa_ca_thuc_hien(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_ca_thuc_hien"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_bg text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'hana_khoa: ca thực hiện không được xóa, hãy hủy ca' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT trang_thai INTO v_bg FROM public.bao_gia WHERE bao_gia_id = NEW.bao_gia_id;
    IF v_bg IS DISTINCT FROM 'da_chap_nhan' THEN
      RAISE EXCEPTION 'hana_khoa: chỉ lập ca trên báo giá đã được khách chấp nhận' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai <> 'du_kien' THEN
      RAISE EXCEPTION 'hana_khoa: ca mới phải ở trạng thái dự kiến' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.khach_hang_id IS DISTINCT FROM OLD.khach_hang_id OR NEW.co_hoi_id IS DISTINCT FROM OLD.co_hoi_id
     OR NEW.tham_kham_id IS DISTINCT FROM OLD.tham_kham_id OR NEW.bao_gia_id IS DISTINCT FROM OLD.bao_gia_id
     OR NEW.chi_tiet_bao_gia_id IS DISTINCT FROM OLD.chi_tiet_bao_gia_id THEN
    RAISE EXCEPTION 'hana_khoa: không được đổi khách, cơ hội, lần khám, báo giá hoặc hạng mục của ca' USING ERRCODE = '23514';
  END IF;

  IF OLD.trang_thai IN ('hoan_thanh', 'huy') THEN
    IF to_jsonb(NEW) - 'ngay_cap_nhat' IS DISTINCT FROM to_jsonb(OLD) - 'ngay_cap_nhat' THEN
      RAISE EXCEPTION 'hana_khoa: ca đã % không sửa được', CASE OLD.trang_thai WHEN 'huy' THEN 'hủy' ELSE 'hoàn thành' END USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.trang_thai = 'dang_thuc_hien' THEN
    IF NEW.bat_dau_luc IS DISTINCT FROM OLD.bat_dau_luc OR NEW.bac_si_id IS DISTINCT FROM OLD.bac_si_id
       OR NEW.co_so_id IS DISTINCT FROM OLD.co_so_id OR NEW.kiem_tra_truoc_ca IS DISTINCT FROM OLD.kiem_tra_truoc_ca THEN
      RAISE EXCEPTION 'hana_khoa: ca đang thực hiện không được đổi bác sĩ, cơ sở, giờ bắt đầu hoặc kiểm tra trước ca' USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    IF NOT (
         (OLD.trang_thai = 'du_kien'        AND NEW.trang_thai IN ('hoan', 'dang_thuc_hien', 'huy'))
      OR (OLD.trang_thai = 'hoan'           AND NEW.trang_thai IN ('du_kien', 'huy'))
      OR (OLD.trang_thai = 'dang_thuc_hien' AND NEW.trang_thai = 'hoan_thanh')
    ) THEN
      RAISE EXCEPTION 'hana_khoa: ca không chuyển được từ % sang %', OLD.trang_thai, NEW.trang_thai USING ERRCODE = '23514';
    END IF;

    IF NEW.trang_thai = 'dang_thuc_hien' THEN
      IF NEW.bat_dau_luc IS NULL THEN
        RAISE EXCEPTION 'hana_khoa: cần ghi giờ bắt đầu thực tế' USING ERRCODE = '23514';
      END IF;
      IF coalesce(btrim(NEW.kiem_tra_truoc_ca), '') = '' THEN
        RAISE EXCEPTION 'hana_khoa: cần ghi kiểm tra trước ca trước khi bắt đầu' USING ERRCODE = '23514';
      END IF;
    END IF;

    IF NEW.trang_thai = 'hoan_thanh' THEN
      IF NEW.ket_thuc_luc IS NULL OR coalesce(btrim(NEW.ky_thuat_thuc_hien), '') = ''
         OR coalesce(btrim(NEW.huong_dan_sau_ca), '') = '' OR NEW.nguoi_ban_giao_id IS NULL THEN
        RAISE EXCEPTION 'hana_khoa: cần ghi giờ kết thúc, kỹ thuật thực hiện, hướng dẫn sau ca và người bàn giao' USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;


--
-- Name: hana_khoa_canh_bao_y_khoa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_canh_bao_y_khoa"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_ca text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'hana_khoa: cảnh báo y khoa không được xóa' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT trang_thai INTO v_ca FROM public.ca_thuc_hien WHERE ca_id = NEW.ca_id;
    IF v_ca IS DISTINCT FROM 'hoan_thanh' THEN
      RAISE EXCEPTION 'hana_khoa: chỉ báo cảnh báo cho ca đã hoàn thành' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai <> 'moi' THEN
      RAISE EXCEPTION 'hana_khoa: cảnh báo mới phải ở trạng thái mới' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.ca_id IS DISTINCT FROM OLD.ca_id OR NEW.mo_ta IS DISTINCT FROM OLD.mo_ta
     OR NEW.muc_uu_tien IS DISTINCT FROM OLD.muc_uu_tien OR NEW.thoi_diem_bao IS DISTINCT FROM OLD.thoi_diem_bao THEN
    RAISE EXCEPTION 'hana_khoa: không sửa nội dung cảnh báo' USING ERRCODE = '23514';
  END IF;
  IF OLD.trang_thai = 'da_dong' THEN
    RAISE EXCEPTION 'hana_khoa: cảnh báo đã đóng không sửa được' USING ERRCODE = '23514';
  END IF;
  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai AND NOT (
       (OLD.trang_thai = 'moi' AND NEW.trang_thai = 'da_nhan')
    OR (OLD.trang_thai = 'da_nhan' AND NEW.trang_thai IN ('dang_xu_ly', 'da_dong'))
    OR (OLD.trang_thai = 'dang_xu_ly' AND NEW.trang_thai = 'da_dong')) THEN
    RAISE EXCEPTION 'hana_khoa: cảnh báo không chuyển được từ % sang %', OLD.trang_thai, NEW.trang_thai USING ERRCODE = '23514';
  END IF;
  IF OLD.trang_thai <> 'moi' AND (NEW.bac_si_nhan_id IS DISTINCT FROM OLD.bac_si_nhan_id OR NEW.thoi_diem_tiep_nhan IS DISTINCT FROM OLD.thoi_diem_tiep_nhan) THEN
    RAISE EXCEPTION 'hana_khoa: không đổi bác sĩ hoặc giờ tiếp nhận sau khi đã nhận' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: hana_khoa_cham_soc_sau_ca(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_cham_soc_sau_ca"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_ca text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'hana_khoa: việc chăm sóc không được xóa, hãy hủy việc' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT trang_thai INTO v_ca FROM public.ca_thuc_hien WHERE ca_id = NEW.ca_id;
    IF v_ca IS DISTINCT FROM 'hoan_thanh' THEN
      RAISE EXCEPTION 'hana_khoa: chỉ chăm sóc sau ca cho ca đã hoàn thành' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai <> 'cho_thuc_hien' THEN
      RAISE EXCEPTION 'hana_khoa: việc chăm sóc mới phải ở trạng thái chờ thực hiện' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.ca_id IS DISTINCT FROM OLD.ca_id OR NEW.moc_id IS DISTINCT FROM OLD.moc_id THEN
    RAISE EXCEPTION 'hana_khoa: không đổi ca hoặc mốc của việc chăm sóc' USING ERRCODE = '23514';
  END IF;
  IF OLD.trang_thai <> 'cho_thuc_hien' THEN
    RAISE EXCEPTION 'hana_khoa: việc chăm sóc đã % không sửa được', OLD.trang_thai USING ERRCODE = '23514';
  END IF;
  IF NEW.trang_thai = 'hoan_thanh' AND (NEW.nguoi_phu_trach_id IS NULL OR coalesce(btrim(NEW.phan_hoi), '') = '' OR NEW.thoi_diem_thuc_te IS NULL) THEN
    RAISE EXCEPTION 'hana_khoa: hoàn thành việc chăm sóc cần có người phụ trách và phản hồi của khách' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: hana_khoa_chi_tiet_bao_gia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_chi_tiet_bao_gia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_id uuid;
  v_tt text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.bao_gia_id IS DISTINCT FROM OLD.bao_gia_id THEN
    RAISE EXCEPTION 'hana_khoa: không được chuyển hạng mục sang báo giá khác' USING ERRCODE = '23514';
  END IF;
  v_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.bao_gia_id ELSE NEW.bao_gia_id END;
  SELECT trang_thai INTO v_tt FROM public.bao_gia WHERE bao_gia_id = v_id FOR SHARE;
  IF v_tt IS DISTINCT FROM 'nhap' THEN
    RAISE EXCEPTION 'hana_khoa: báo giá đã gửi hoặc đã chấp nhận, không sửa được hạng mục' USING ERRCODE = '23514';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;


--
-- Name: hana_khoa_danh_gia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_danh_gia"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_ca text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'hana_khoa: đánh giá không được xóa' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.ca_id IS NOT NULL THEN
      SELECT trang_thai INTO v_ca FROM public.ca_thuc_hien WHERE ca_id = NEW.ca_id;
      IF v_ca IS DISTINCT FROM 'hoan_thanh' THEN
        RAISE EXCEPTION 'hana_khoa: chỉ đánh giá ca đã hoàn thành' USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.khach_hang_id IS DISTINCT FROM OLD.khach_hang_id OR NEW.ca_id IS DISTINCT FROM OLD.ca_id
     OR NEW.diem IS DISTINCT FROM OLD.diem OR NEW.thang_diem IS DISTINCT FROM OLD.thang_diem
     OR NEW.ngay_khao_sat IS DISTINCT FROM OLD.ngay_khao_sat THEN
    RAISE EXCEPTION 'hana_khoa: không sửa điểm đánh giá của khách' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: hana_khoa_giao_dich_sepay(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_giao_dich_sepay"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'hana_khoa: nhật ký SePay không được xóa' USING ERRCODE = '23514';
  END IF;
  IF NEW.sepay_id IS DISTINCT FROM OLD.sepay_id OR NEW.so_tien IS DISTINCT FROM OLD.so_tien
     OR NEW.noi_dung IS DISTINCT FROM OLD.noi_dung OR NEW.thoi_diem_ngan_hang IS DISTINCT FROM OLD.thoi_diem_ngan_hang THEN
    RAISE EXCEPTION 'hana_khoa: không được sửa nội dung nhật ký SePay' USING ERRCODE = '23514';
  END IF;
  IF OLD.ket_qua IN ('khop', 'da_xu_ly_tay', 'bo_qua') AND NEW.ket_qua IS DISTINCT FROM OLD.ket_qua THEN
    RAISE EXCEPTION 'hana_khoa: giao dịch SePay đã xử lý xong, không đổi kết quả' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: hana_khoa_lan_tham_kham(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_lan_tham_kham"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.bao_gia WHERE tham_kham_id = OLD.tham_kham_id AND trang_thai IN ('da_gui', 'da_chap_nhan')) THEN
    RAISE EXCEPTION 'hana_khoa: lần khám đã có báo giá được gửi, không sửa được' USING ERRCODE = '23514';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;


--
-- Name: hana_khoa_mau_cham_soc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_mau_cham_soc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'hana_khoa: mẫu chăm sóc không được xóa, hãy ngừng dùng' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.trang_thai <> 'nhap' THEN
      RAISE EXCEPTION 'hana_khoa: mẫu chăm sóc mới phải ở trạng thái nháp' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.dich_vu_id IS DISTINCT FROM OLD.dich_vu_id OR NEW.phien_ban IS DISTINCT FROM OLD.phien_ban THEN
    RAISE EXCEPTION 'hana_khoa: không đổi dịch vụ hoặc phiên bản của mẫu' USING ERRCODE = '23514';
  END IF;
  IF OLD.trang_thai = 'ngung_dung' THEN
    RAISE EXCEPTION 'hana_khoa: mẫu đã ngừng dùng không sửa được' USING ERRCODE = '23514';
  END IF;
  IF OLD.trang_thai = 'da_duyet' AND (NEW.trang_thai <> 'ngung_dung'
     OR NEW.nguoi_duyet_id IS DISTINCT FROM OLD.nguoi_duyet_id OR NEW.ngay_duyet IS DISTINCT FROM OLD.ngay_duyet) THEN
    RAISE EXCEPTION 'hana_khoa: mẫu đã duyệt chỉ có thể ngừng dùng, hãy tạo phiên bản mới để sửa' USING ERRCODE = '23514';
  END IF;
  IF OLD.trang_thai = 'nhap' AND NEW.trang_thai = 'da_duyet'
     AND NOT EXISTS (SELECT 1 FROM public.moc_cham_soc WHERE mau_id = NEW.mau_id) THEN
    RAISE EXCEPTION 'hana_khoa: mẫu phải có ít nhất một mốc trước khi duyệt' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: hana_khoa_moc_cham_soc(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_moc_cham_soc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_mau uuid;
  v_tt text;
BEGIN
  v_mau := CASE WHEN TG_OP = 'DELETE' THEN OLD.mau_id ELSE NEW.mau_id END;
  SELECT trang_thai INTO v_tt FROM public.mau_cham_soc WHERE mau_id = v_mau;
  IF v_tt IS DISTINCT FROM 'nhap' THEN
    RAISE EXCEPTION 'hana_khoa: chỉ sửa mốc chăm sóc khi mẫu còn là bản nháp' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.mau_id IS DISTINCT FROM OLD.mau_id THEN
    RAISE EXCEPTION 'hana_khoa: không chuyển mốc sang mẫu khác' USING ERRCODE = '23514';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;


--
-- Name: hana_khoa_thanh_toan(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION "public"."hana_khoa_thanh_toan"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_tong_bao_gia numeric;
  v_trang_thai_bg text;
  v_da_thu numeric;
  v_goc public.thanh_toan%ROWTYPE;
  v_da_hoan numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'hana_khoa: giao dịch thu hoặc hoàn không được xóa' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.trang_thai NOT IN ('cho_xac_nhan', 'thanh_cong') THEN
      RAISE EXCEPTION 'hana_khoa: giao dịch mới chỉ được ở trạng thái chờ xác nhận hoặc thành công' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.bao_gia_id IS DISTINCT FROM OLD.bao_gia_id
       OR NEW.loai_giao_dich IS DISTINCT FROM OLD.loai_giao_dich
       OR NEW.so_tien IS DISTINCT FROM OLD.so_tien
       OR NEW.phuong_thuc IS DISTINCT FROM OLD.phuong_thuc
       OR NEW.thoi_diem IS DISTINCT FROM OLD.thoi_diem
       OR NEW.thu_ngan_id IS DISTINCT FROM OLD.thu_ngan_id
       OR NEW.ma_doi_soat IS DISTINCT FROM OLD.ma_doi_soat
       OR NEW.giao_dich_goc_id IS DISTINCT FROM OLD.giao_dich_goc_id THEN
      RAISE EXCEPTION 'hana_khoa: không được sửa nội dung giao dịch, hãy hoàn tiền và ghi giao dịch mới' USING ERRCODE = '23514';
    END IF;
    IF (NEW.ma_giao_dich IS DISTINCT FROM OLD.ma_giao_dich OR NEW.ben_cung_cap IS DISTINCT FROM OLD.ben_cung_cap)
       AND NOT (OLD.trang_thai = 'cho_xac_nhan' AND OLD.ma_giao_dich IS NULL AND OLD.ben_cung_cap IS NULL) THEN
      RAISE EXCEPTION 'hana_khoa: không được sửa mã giao dịch đã ghi' USING ERRCODE = '23514';
    END IF;
    IF NEW.trang_thai IS NOT DISTINCT FROM OLD.trang_thai THEN
      RETURN NEW;
    END IF;
    IF OLD.trang_thai <> 'cho_xac_nhan' OR NEW.trang_thai NOT IN ('thanh_cong', 'that_bai', 'huy') THEN
      RAISE EXCEPTION 'hana_khoa: giao dịch % không đổi được sang %', OLD.trang_thai, NEW.trang_thai USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NEW.trang_thai <> 'thanh_cong' THEN
    RETURN NEW;
  END IF;

  SELECT trang_thai INTO v_trang_thai_bg FROM public.bao_gia WHERE bao_gia_id = NEW.bao_gia_id FOR UPDATE;

  IF NEW.loai_giao_dich <> 'hoan_tien' THEN
    IF v_trang_thai_bg IS DISTINCT FROM 'da_chap_nhan' THEN
      RAISE EXCEPTION 'hana_khoa: chỉ thu tiền trên báo giá đã được khách chấp nhận' USING ERRCODE = '23514';
    END IF;
    SELECT coalesce(sum(thanh_tien), 0) INTO v_tong_bao_gia FROM public.chi_tiet_bao_gia WHERE bao_gia_id = NEW.bao_gia_id;
    SELECT coalesce(sum(so_tien), 0) INTO v_da_thu FROM public.thanh_toan
     WHERE bao_gia_id = NEW.bao_gia_id AND trang_thai = 'thanh_cong' AND loai_giao_dich <> 'hoan_tien'
       AND thanh_toan_id <> NEW.thanh_toan_id;
    IF v_da_thu + NEW.so_tien > v_tong_bao_gia THEN
      RAISE EXCEPTION 'hana_khoa: tổng tiền thu vượt giá trị báo giá' USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT * INTO v_goc FROM public.thanh_toan WHERE thanh_toan_id = NEW.giao_dich_goc_id;
    IF NOT FOUND OR v_goc.loai_giao_dich = 'hoan_tien' OR v_goc.trang_thai <> 'thanh_cong' THEN
      RAISE EXCEPTION 'hana_khoa: chỉ hoàn tiền cho khoản thu đã thành công' USING ERRCODE = '23514';
    END IF;
    SELECT coalesce(sum(so_tien), 0) INTO v_da_hoan FROM public.thanh_toan
     WHERE giao_dich_goc_id = NEW.giao_dich_goc_id AND trang_thai = 'thanh_cong' AND thanh_toan_id <> NEW.thanh_toan_id;
    IF v_da_hoan + NEW.so_tien > v_goc.so_tien THEN
      RAISE EXCEPTION 'hana_khoa: tổng tiền hoàn vượt khoản thu gốc' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: bao_gia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."bao_gia" (
    "bao_gia_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "co_hoi_id" "uuid" NOT NULL,
    "tham_kham_id" "uuid" NOT NULL,
    "phien_ban" integer DEFAULT 1 NOT NULL,
    "ngay_lap" timestamp with time zone DEFAULT "now"() NOT NULL,
    "hieu_luc_den" timestamp with time zone,
    "trang_thai" "text" DEFAULT 'nhap'::"text" NOT NULL,
    "nguoi_lap_id" "uuid",
    "khach_xac_nhan_luc" timestamp with time zone,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "bao_gia_check" CHECK (("hieu_luc_den" >= "ngay_lap")),
    CONSTRAINT "bao_gia_check1" CHECK ((("trang_thai" <> 'da_chap_nhan'::"text") OR ("khach_xac_nhan_luc" IS NOT NULL))),
    CONSTRAINT "bao_gia_phien_ban_check" CHECK (("phien_ban" > 0)),
    CONSTRAINT "bao_gia_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['nhap'::"text", 'da_gui'::"text", 'da_chap_nhan'::"text", 'het_han'::"text", 'da_thay_the'::"text", 'huy'::"text"])))
);


--
-- Name: TABLE "bao_gia"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."bao_gia" IS 'Báo giá chính thức sau khám; một phiên bản được chấp nhận mỗi cơ hội.';


--
-- Name: ca_thuc_hien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ca_thuc_hien" (
    "ca_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "co_hoi_id" "uuid" NOT NULL,
    "tham_kham_id" "uuid" NOT NULL,
    "bao_gia_id" "uuid" NOT NULL,
    "chi_tiet_bao_gia_id" "uuid" NOT NULL,
    "bac_si_id" "uuid" NOT NULL,
    "co_so_id" "uuid" NOT NULL,
    "du_kien_luc" timestamp with time zone,
    "bat_dau_luc" timestamp with time zone,
    "ket_thuc_luc" timestamp with time zone,
    "trang_thai" "text" DEFAULT 'du_kien'::"text" NOT NULL,
    "kiem_tra_truoc_ca" "text",
    "ky_thuat_thuc_hien" "text",
    "huong_dan_sau_ca" "text",
    "nguoi_ban_giao_id" "uuid",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "ca_thuc_hien_check" CHECK ((("ket_thuc_luc" IS NULL) OR (("bat_dau_luc" IS NOT NULL) AND ("ket_thuc_luc" > "bat_dau_luc")))),
    CONSTRAINT "ca_thuc_hien_check1" CHECK ((("trang_thai" <> 'hoan_thanh'::"text") OR ("ket_thuc_luc" IS NOT NULL))),
    CONSTRAINT "ca_thuc_hien_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['du_kien'::"text", 'hoan'::"text", 'dang_thuc_hien'::"text", 'hoan_thanh'::"text", 'huy'::"text"])))
);


--
-- Name: TABLE "ca_thuc_hien"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."ca_thuc_hien" IS 'Ca thực hiện; thêm khach_hang_id và bao_gia_id để bảo đảm liên kết đúng khách.';


--
-- Name: canh_bao_y_khoa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."canh_bao_y_khoa" (
    "canh_bao_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ca_id" "uuid" NOT NULL,
    "thoi_diem_bao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mo_ta" "text" NOT NULL,
    "muc_uu_tien" "text" DEFAULT 'cao'::"text" NOT NULL,
    "bac_si_nhan_id" "uuid",
    "thoi_diem_tiep_nhan" timestamp with time zone,
    "huong_xu_ly" "text",
    "trang_thai" "text" DEFAULT 'moi'::"text" NOT NULL,
    "thoi_diem_dong" timestamp with time zone,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "canh_bao_y_khoa_check" CHECK (("thoi_diem_tiep_nhan" >= "thoi_diem_bao")),
    CONSTRAINT "canh_bao_y_khoa_check1" CHECK (("thoi_diem_dong" >= "thoi_diem_tiep_nhan")),
    CONSTRAINT "canh_bao_y_khoa_check2" CHECK ((("trang_thai" = 'moi'::"text") OR (("bac_si_nhan_id" IS NOT NULL) AND ("thoi_diem_tiep_nhan" IS NOT NULL)))),
    CONSTRAINT "canh_bao_y_khoa_check3" CHECK ((("trang_thai" <> 'da_dong'::"text") OR (("thoi_diem_dong" IS NOT NULL) AND ("huong_xu_ly" IS NOT NULL)))),
    CONSTRAINT "canh_bao_y_khoa_muc_uu_tien_check" CHECK (("muc_uu_tien" = ANY (ARRAY['binh_thuong'::"text", 'cao'::"text", 'khan_cap'::"text"]))),
    CONSTRAINT "canh_bao_y_khoa_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['moi'::"text", 'da_nhan'::"text", 'dang_xu_ly'::"text", 'da_dong'::"text"])))
);


--
-- Name: TABLE "canh_bao_y_khoa"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."canh_bao_y_khoa" IS 'Cảnh báo y khoa; lưu riêng việc báo và việc bác sĩ tiếp nhận.';


--
-- Name: cham_soc_sau_ca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."cham_soc_sau_ca" (
    "cham_soc_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ca_id" "uuid" NOT NULL,
    "moc_id" "uuid",
    "han_thuc_hien" timestamp with time zone NOT NULL,
    "nguoi_phu_trach_id" "uuid",
    "trang_thai" "text" DEFAULT 'cho_thuc_hien'::"text" NOT NULL,
    "thoi_diem_thuc_te" timestamp with time zone,
    "phan_hoi" "text",
    "huong_xu_ly" "text",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "cham_soc_sau_ca_check" CHECK ((("trang_thai" <> 'hoan_thanh'::"text") OR ("thoi_diem_thuc_te" IS NOT NULL))),
    CONSTRAINT "cham_soc_sau_ca_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['cho_thuc_hien'::"text", 'hoan_thanh'::"text", 'huy'::"text"])))
);


--
-- Name: TABLE "cham_soc_sau_ca"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."cham_soc_sau_ca" IS 'Lịch chăm sóc thực tế; mốc riêng có thể để moc_id trống.';


--
-- Name: chi_tiet_bao_gia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."chi_tiet_bao_gia" (
    "chi_tiet_bao_gia_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bao_gia_id" "uuid" NOT NULL,
    "dich_vu_id" "uuid" NOT NULL,
    "ten_hang_muc_tai_thoi_diem_bao_gia" "text" NOT NULL,
    "so_luong" integer DEFAULT 1 NOT NULL,
    "don_gia" numeric(18,0) NOT NULL,
    "giam_gia" numeric(18,0) DEFAULT 0 NOT NULL,
    "thanh_tien" numeric(18,0) GENERATED ALWAYS AS (((("so_luong")::numeric * "don_gia") - "giam_gia")) STORED,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "chi_tiet_bao_gia_check" CHECK (("giam_gia" <= (("so_luong")::numeric * "don_gia"))),
    CONSTRAINT "chi_tiet_bao_gia_don_gia_check" CHECK (("don_gia" >= (0)::numeric)),
    CONSTRAINT "chi_tiet_bao_gia_giam_gia_check" CHECK (("giam_gia" >= (0)::numeric)),
    CONSTRAINT "chi_tiet_bao_gia_so_luong_check" CHECK (("so_luong" > 0))
);


--
-- Name: TABLE "chi_tiet_bao_gia"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."chi_tiet_bao_gia" IS 'Hạng mục báo giá; thanh_tien tự tính, không nhập thủ công.';


--
-- Name: co_hoi_dich_vu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."co_hoi_dich_vu" (
    "co_hoi_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "dich_vu_id" "uuid" NOT NULL,
    "nguon_id" "uuid",
    "tu_van_vien_id" "uuid",
    "mong_muon" "text",
    "ngan_sach_tu" numeric(18,0),
    "ngan_sach_den" numeric(18,0),
    "thoi_diem_du_kien" "date",
    "trang_thai" "text" DEFAULT 'moi'::"text" NOT NULL,
    "ly_do_chua_chot" "text",
    "ngay_tiep_nhan" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_chot" timestamp with time zone,
    "ngay_dong" timestamp with time zone,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "co_hoi_dich_vu_check" CHECK (("ngan_sach_tu" <= "ngan_sach_den")),
    CONSTRAINT "co_hoi_dich_vu_check1" CHECK (("ngay_chot" >= "ngay_tiep_nhan")),
    CONSTRAINT "co_hoi_dich_vu_check2" CHECK (("ngay_dong" >= "ngay_tiep_nhan")),
    CONSTRAINT "co_hoi_dich_vu_ngan_sach_den_check" CHECK (("ngan_sach_den" >= (0)::numeric)),
    CONSTRAINT "co_hoi_dich_vu_ngan_sach_tu_check" CHECK (("ngan_sach_tu" >= (0)::numeric)),
    CONSTRAINT "co_hoi_dich_vu_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['moi'::"text", 'dang_tu_van'::"text", 'da_hen'::"text", 'da_kham'::"text", 'da_chot'::"text", 'dang_hau_phau'::"text", 'hoan_tat'::"text", 'can_nuoi_duong'::"text", 'ngung_cham_soc'::"text"])))
);


--
-- Name: TABLE "co_hoi_dich_vu"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."co_hoi_dich_vu" IS 'Một nhu cầu dịch vụ của một khách.';


--
-- Name: co_so; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."co_so" (
    "co_so_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ten_co_so" "text" NOT NULL,
    "dia_chi" "text",
    "so_dien_thoai" "text",
    "mui_gio" "text" DEFAULT 'Asia/Ho_Chi_Minh'::"text" NOT NULL,
    "gio_hoat_dong" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "co_so_gio_hoat_dong_check" CHECK (("jsonb_typeof"("gio_hoat_dong") = 'object'::"text")),
    CONSTRAINT "co_so_ten_co_so_check" CHECK (("btrim"("ten_co_so") <> ''::"text"))
);


--
-- Name: TABLE "co_so"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."co_so" IS 'Cơ sở phòng khám; giờ hoạt động lưu JSON theo ngày trong tuần.';


--
-- Name: cong_viec; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."cong_viec" (
    "cong_viec_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "co_hoi_id" "uuid",
    "lich_hen_id" "uuid",
    "loai_cong_viec" "text" NOT NULL,
    "noi_dung" "text" NOT NULL,
    "nguoi_phu_trach_id" "uuid",
    "han_hoan_thanh" timestamp with time zone NOT NULL,
    "muc_uu_tien" "text" DEFAULT 'binh_thuong'::"text" NOT NULL,
    "trang_thai" "text" DEFAULT 'cho_lam'::"text" NOT NULL,
    "hoan_thanh_luc" timestamp with time zone,
    "ket_qua" "text",
    "khoa_chong_trung" "text",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "cong_viec_check" CHECK ((("lich_hen_id" IS NULL) OR ("co_hoi_id" IS NOT NULL))),
    CONSTRAINT "cong_viec_check1" CHECK ((("trang_thai" <> 'hoan_thanh'::"text") OR ("hoan_thanh_luc" IS NOT NULL))),
    CONSTRAINT "cong_viec_muc_uu_tien_check" CHECK (("muc_uu_tien" = ANY (ARRAY['thap'::"text", 'binh_thuong'::"text", 'cao'::"text", 'khan_cap'::"text"]))),
    CONSTRAINT "cong_viec_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['cho_lam'::"text", 'dang_lam'::"text", 'hoan_thanh'::"text", 'huy'::"text"])))
);


--
-- Name: TABLE "cong_viec"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."cong_viec" IS 'Việc cần làm; khóa chống trùng dành cho tác vụ tự động.';


--
-- Name: danh_gia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."danh_gia" (
    "danh_gia_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "ca_id" "uuid",
    "ngay_khao_sat" "date" DEFAULT (("now"() AT TIME ZONE 'Asia/Ho_Chi_Minh'::"text"))::"date" NOT NULL,
    "diem" integer NOT NULL,
    "thang_diem" integer DEFAULT 5 NOT NULL,
    "nhan_xet" "text",
    "nguoi_xu_ly_id" "uuid",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "danh_gia_check" CHECK ((("diem" >= 0) AND ("diem" <= "thang_diem"))),
    CONSTRAINT "danh_gia_thang_diem_check" CHECK (("thang_diem" > 0))
);


--
-- Name: TABLE "danh_gia"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."danh_gia" IS 'Đánh giá theo thang điểm; 0..thang_diem, giao diện chọn thang phù hợp.';


--
-- Name: dich_vu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dich_vu" (
    "dich_vu_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ten_dich_vu" "text" NOT NULL,
    "nhom_dich_vu" "text" NOT NULL,
    "mo_ta" "text",
    "gia_tham_khao_tu" numeric(18,0),
    "gia_tham_khao_den" numeric(18,0),
    "thoi_luong_du_kien" integer,
    "dang_hoat_dong" boolean DEFAULT true NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "dich_vu_check" CHECK (("gia_tham_khao_tu" <= "gia_tham_khao_den")),
    CONSTRAINT "dich_vu_gia_tham_khao_den_check" CHECK (("gia_tham_khao_den" >= (0)::numeric)),
    CONSTRAINT "dich_vu_gia_tham_khao_tu_check" CHECK (("gia_tham_khao_tu" >= (0)::numeric)),
    CONSTRAINT "dich_vu_ten_dich_vu_check" CHECK (("btrim"("ten_dich_vu") <> ''::"text")),
    CONSTRAINT "dich_vu_thoi_luong_du_kien_check" CHECK (("thoi_luong_du_kien" > 0))
);


--
-- Name: TABLE "dich_vu"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."dich_vu" IS 'Dịch vụ; giá chỉ tham khảo, thời lượng tính bằng phút.';


--
-- Name: dong_y; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."dong_y" (
    "dong_y_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "ca_id" "uuid",
    "muc_dich" "text" NOT NULL,
    "trang_thai" "text" DEFAULT 'dong_y'::"text" NOT NULL,
    "phien_ban_noi_dung" "text" NOT NULL,
    "thoi_diem_dong_y" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thoi_diem_rut_lai" timestamp with time zone,
    "bang_chung" "text" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "dong_y_check" CHECK (("thoi_diem_rut_lai" >= "thoi_diem_dong_y")),
    CONSTRAINT "dong_y_check1" CHECK ((("trang_thai" = 'rut_lai'::"text") = ("thoi_diem_rut_lai" IS NOT NULL))),
    CONSTRAINT "dong_y_muc_dich_check" CHECK (("muc_dich" = ANY (ARRAY['thuc_hien_dich_vu'::"text", 'luu_anh'::"text", 'truyen_thong'::"text", 'marketing'::"text"]))),
    CONSTRAINT "dong_y_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['dong_y'::"text", 'rut_lai'::"text"])))
);


--
-- Name: TABLE "dong_y"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."dong_y" IS 'Đồng ý theo mục đích và phiên bản; khi đồng ý lại tạo bản ghi mới.';


--
-- Name: giao_dich_sepay; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."giao_dich_sepay" (
    "sepay_id" "text" NOT NULL,
    "so_tien" numeric(18,0) NOT NULL,
    "noi_dung" "text",
    "ma_tham_chieu" "text",
    "ngan_hang" "text",
    "so_tai_khoan" "text",
    "thoi_diem_ngan_hang" timestamp with time zone,
    "ket_qua" "text" NOT NULL,
    "ly_do" "text",
    "thanh_toan_id" "uuid",
    "ghi_chu_xu_ly" "text",
    "nguoi_xu_ly_id" "uuid",
    "xu_ly_luc" timestamp with time zone,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "giao_dich_sepay_ket_qua_check" CHECK (("ket_qua" = ANY (ARRAY['khop'::"text", 'chua_khop'::"text", 'da_xu_ly_tay'::"text", 'bo_qua'::"text"]))),
    CONSTRAINT "giao_dich_sepay_so_tien_check" CHECK (("so_tien" >= (0)::numeric))
);


--
-- Name: TABLE "giao_dich_sepay"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."giao_dich_sepay" IS 'Nhật ký thông báo tiền về từ SePay. sepay_id là id giao dịch của SePay (không đổi khi gửi lại).';


--
-- Name: khach_hang; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."khach_hang" (
    "khach_hang_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ho_ten" "text" NOT NULL,
    "ngay_sinh" "date",
    "so_dien_thoai" "text",
    "so_dien_thoai_chuan" "text" GENERATED ALWAYS AS ("public"."hana_chuan_hoa_sdt"("so_dien_thoai")) STORED,
    "email" "text",
    "zalo_id" "text",
    "khu_vuc" "text",
    "kenh_lien_he_uu_tien" "text",
    "khung_gio_lien_he" "text",
    "nguon_dau_tien_id" "uuid",
    "nhan_vien_phu_trach_id" "uuid",
    "khach_gioi_thieu_id" "uuid",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "khach_hang_check" CHECK (("khach_gioi_thieu_id" IS DISTINCT FROM "khach_hang_id")),
    CONSTRAINT "khach_hang_check1" CHECK ((COALESCE(NULLIF("btrim"("so_dien_thoai"), ''::"text"), NULLIF("btrim"("email"), ''::"text"), NULLIF("btrim"("zalo_id"), ''::"text")) IS NOT NULL)),
    CONSTRAINT "khach_hang_ho_ten_check" CHECK (("btrim"("ho_ten") <> ''::"text"))
);


--
-- Name: TABLE "khach_hang"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."khach_hang" IS 'Hồ sơ khách; không UNIQUE số điện thoại vì người thân có thể dùng chung.';


--
-- Name: ky_thanh_toan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."ky_thanh_toan" (
    "ky_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bao_gia_id" "uuid" NOT NULL,
    "so_ky" integer NOT NULL,
    "ngay_den_han" "date" NOT NULL,
    "so_tien_phai_tra" numeric(18,0) NOT NULL,
    "ben_thu_tien" "text" DEFAULT 'hana'::"text" NOT NULL,
    "doi_tac" "text",
    "ma_hop_dong_doi_tac" "text",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "ky_thanh_toan_ben_thu_tien_check" CHECK (("ben_thu_tien" = ANY (ARRAY['hana'::"text", 'doi_tac'::"text"]))),
    CONSTRAINT "ky_thanh_toan_check" CHECK ((("ben_thu_tien" <> 'doi_tac'::"text") OR ("doi_tac" IS NOT NULL))),
    CONSTRAINT "ky_thanh_toan_so_ky_check" CHECK (("so_ky" > 0)),
    CONSTRAINT "ky_thanh_toan_so_tien_phai_tra_check" CHECK (("so_tien_phai_tra" >= (0)::numeric))
);


--
-- Name: TABLE "ky_thanh_toan"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."ky_thanh_toan" IS 'Kỳ phải trả; tách nghĩa vụ với Hana và với đối tác.';


--
-- Name: lan_tham_kham; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."lan_tham_kham" (
    "tham_kham_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "co_hoi_id" "uuid" NOT NULL,
    "lich_hen_id" "uuid",
    "bac_si_id" "uuid" NOT NULL,
    "thoi_diem_kham" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tien_su" "text",
    "di_ung" "text",
    "ket_qua_tham_kham" "text",
    "phuong_an_de_xuat" "text",
    "ket_luan_dieu_kien" "text",
    "ma_ho_so_y_khoa_ngoai" "text",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid"
);


--
-- Name: TABLE "lan_tham_kham"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."lan_tham_kham" IS 'Hồ sơ lần khám, dữ liệu y khoa hạn chế truy cập.';


--
-- Name: lich_hen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."lich_hen" (
    "lich_hen_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "co_hoi_id" "uuid" NOT NULL,
    "co_so_id" "uuid" NOT NULL,
    "bac_si_id" "uuid",
    "phong" "text",
    "loai_lich_hen" "text" DEFAULT 'kham'::"text" NOT NULL,
    "bat_dau" timestamp with time zone NOT NULL,
    "ket_thuc" timestamp with time zone NOT NULL,
    "trang_thai" "text" DEFAULT 'cho_xac_nhan'::"text" NOT NULL,
    "thoi_diem_den" timestamp with time zone,
    "ly_do_huy" "text",
    "lich_hen_truoc_id" "uuid",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "lich_hen_check" CHECK (("ket_thuc" > "bat_dau")),
    CONSTRAINT "lich_hen_check1" CHECK (("lich_hen_truoc_id" IS DISTINCT FROM "lich_hen_id")),
    CONSTRAINT "lich_hen_loai_lich_hen_check" CHECK (("loai_lich_hen" = ANY (ARRAY['kham'::"text", 'thuc_hien'::"text", 'tai_kham'::"text"]))),
    CONSTRAINT "lich_hen_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['cho_xac_nhan'::"text", 'da_xac_nhan'::"text", 'da_den'::"text", 'hoan_thanh'::"text", 'huy'::"text", 'khong_den'::"text", 'da_doi_lich'::"text"])))
);


--
-- Name: TABLE "lich_hen"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."lich_hen" IS 'Lịch khám, thực hiện, tái khám; giữ lịch cũ khi đổi.';


--
-- Name: lich_su_trang_thai; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."lich_su_trang_thai" (
    "lich_su_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "co_hoi_id" "uuid" NOT NULL,
    "trang_thai_cu" "text",
    "trang_thai_moi" "text" NOT NULL,
    "thoi_diem" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_thay_doi_id" "uuid",
    "ly_do" "text",
    CONSTRAINT "lich_su_trang_thai_trang_thai_cu_check" CHECK (("trang_thai_cu" = ANY (ARRAY['moi'::"text", 'dang_tu_van'::"text", 'da_hen'::"text", 'da_kham'::"text", 'da_chot'::"text", 'dang_hau_phau'::"text", 'hoan_tat'::"text", 'can_nuoi_duong'::"text", 'ngung_cham_soc'::"text"]))),
    CONSTRAINT "lich_su_trang_thai_trang_thai_moi_check" CHECK (("trang_thai_moi" = ANY (ARRAY['moi'::"text", 'dang_tu_van'::"text", 'da_hen'::"text", 'da_kham'::"text", 'da_chot'::"text", 'dang_hau_phau'::"text", 'hoan_tat'::"text", 'can_nuoi_duong'::"text", 'ngung_cham_soc'::"text"])))
);


--
-- Name: TABLE "lich_su_trang_thai"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."lich_su_trang_thai" IS 'Nhật ký trạng thái tự tạo khi thêm hoặc đổi trạng thái cơ hội; chỉ ghi nối tiếp.';


--
-- Name: mau_cham_soc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."mau_cham_soc" (
    "mau_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "dich_vu_id" "uuid" NOT NULL,
    "phien_ban" integer DEFAULT 1 NOT NULL,
    "nguoi_duyet_id" "uuid",
    "ngay_duyet" timestamp with time zone,
    "trang_thai" "text" DEFAULT 'nhap'::"text" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "mau_cham_soc_check" CHECK ((("trang_thai" <> 'da_duyet'::"text") OR (("nguoi_duyet_id" IS NOT NULL) AND ("ngay_duyet" IS NOT NULL)))),
    CONSTRAINT "mau_cham_soc_phien_ban_check" CHECK (("phien_ban" > 0)),
    CONSTRAINT "mau_cham_soc_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['nhap'::"text", 'da_duyet'::"text", 'ngung_dung'::"text"])))
);


--
-- Name: TABLE "mau_cham_soc"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."mau_cham_soc" IS 'Mẫu chăm sóc theo dịch vụ; không tạo sẵn lịch y khoa chưa duyệt.';


--
-- Name: moc_cham_soc; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."moc_cham_soc" (
    "moc_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mau_id" "uuid" NOT NULL,
    "khoang_thoi_gian_sau_ca" integer NOT NULL,
    "don_vi" "text" DEFAULT 'ngay'::"text" NOT NULL,
    "noi_dung" "text" NOT NULL,
    "loai_lien_he" "text" NOT NULL,
    "vai_tro_phu_trach" "uuid",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "moc_cham_soc_don_vi_check" CHECK (("don_vi" = ANY (ARRAY['ngay'::"text", 'tuan'::"text", 'thang'::"text"]))),
    CONSTRAINT "moc_cham_soc_khoang_thoi_gian_sau_ca_check" CHECK (("khoang_thoi_gian_sau_ca" >= 0))
);


--
-- Name: TABLE "moc_cham_soc"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."moc_cham_soc" IS 'Mốc chăm sóc; vai_tro_phu_trach dùng FK thay cho chuỗi tự nhập.';


--
-- Name: nguon_khach; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."nguon_khach" (
    "nguon_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "kenh" "text" NOT NULL,
    "ten_chien_dich" "text",
    "ma_chien_dich" "text",
    "dang_hoat_dong" boolean DEFAULT true NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid"
);


--
-- Name: TABLE "nguon_khach"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."nguon_khach" IS 'Kênh và chiến dịch thu hút khách.';


--
-- Name: nhan_vien; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."nhan_vien" (
    "nhan_vien_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid",
    "ho_ten" "text" NOT NULL,
    "bo_phan" "text",
    "chuc_danh" "text",
    "co_so_id" "uuid",
    "trang_thai_tai_khoan" "text" DEFAULT 'hoat_dong'::"text" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "nhan_vien_ho_ten_check" CHECK (("btrim"("ho_ten") <> ''::"text")),
    CONSTRAINT "nhan_vien_trang_thai_tai_khoan_check" CHECK (("trang_thai_tai_khoan" = ANY (ARRAY['hoat_dong'::"text", 'khoa'::"text"])))
);


--
-- Name: TABLE "nhan_vien"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."nhan_vien" IS 'Nhân viên; auth_user_id liên kết tài khoản Supabase Auth, không lưu mật khẩu.';


--
-- Name: nhan_vien_vai_tro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."nhan_vien_vai_tro" (
    "nhan_vien_id" "uuid" NOT NULL,
    "vai_tro_id" "uuid" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid"
);


--
-- Name: TABLE "nhan_vien_vai_tro"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."nhan_vien_vai_tro" IS 'Một nhân viên có nhiều vai trò.';


--
-- Name: nhat_ky_truy_cap; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."nhat_ky_truy_cap" (
    "nhat_ky_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nguoi_dung_id" "uuid",
    "doi_tuong" "text" NOT NULL,
    "ma_ban_ghi" "text" NOT NULL,
    "hanh_dong" "text" NOT NULL,
    "thoi_diem" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "nhat_ky_truy_cap_hanh_dong_check" CHECK (("hanh_dong" = ANY (ARRAY['xem'::"text", 'them'::"text", 'sua'::"text", 'xoa'::"text", 'tai_xuong'::"text", 'xuat'::"text"])))
);


--
-- Name: TABLE "nhat_ky_truy_cap"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."nhat_ky_truy_cap" IS 'Nhật ký chỉ ghi nối tiếp; ứng dụng phải ghi sự kiện xem và xuất, SQL không tự ghi SELECT.';


--
-- Name: phan_bo_thanh_toan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."phan_bo_thanh_toan" (
    "thanh_toan_id" "uuid" NOT NULL,
    "ky_id" "uuid" NOT NULL,
    "bao_gia_id" "uuid" NOT NULL,
    "so_tien_phan_bo" numeric(18,0) NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "phan_bo_thanh_toan_so_tien_phan_bo_check" CHECK (("so_tien_phan_bo" > (0)::numeric))
);


--
-- Name: TABLE "phan_bo_thanh_toan"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."phan_bo_thanh_toan" IS 'Phân bổ giao dịch vào kỳ của cùng báo giá; bao_gia_id bổ sung để kiểm tra liên kết.';


--
-- Name: quyen_vai_tro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."quyen_vai_tro" (
    "vai_tro_id" "uuid" NOT NULL,
    "doi_tuong" "text" NOT NULL,
    "hanh_dong" "text" NOT NULL,
    "pham_vi" "text" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "quyen_vai_tro_hanh_dong_check" CHECK (("hanh_dong" = ANY (ARRAY['xem'::"text", 'them'::"text", 'sua'::"text", 'xoa'::"text", 'xuat'::"text", 'duyet'::"text"]))),
    CONSTRAINT "quyen_vai_tro_pham_vi_check" CHECK (("pham_vi" = ANY (ARRAY['duoc_giao'::"text", 'co_so'::"text", 'toan_bo'::"text"])))
);


--
-- Name: TABLE "quyen_vai_tro"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."quyen_vai_tro" IS 'Danh mục quyền dự kiến; cần viết RLS hoặc backend để thực thi.';


--
-- Name: tai_lieu; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tai_lieu" (
    "tai_lieu_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "ca_id" "uuid",
    "loai_tai_lieu" "text" NOT NULL,
    "vi_tri_luu_rieng_tu" "text" NOT NULL,
    "nguoi_tai_id" "uuid",
    "thoi_diem" timestamp with time zone DEFAULT "now"() NOT NULL,
    "muc_bao_mat" "text" DEFAULT 'han_che'::"text" NOT NULL,
    "muc_dich_su_dung" "text" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "tai_lieu_muc_bao_mat_check" CHECK (("muc_bao_mat" = ANY (ARRAY['noi_bo'::"text", 'han_che'::"text", 'y_khoa'::"text"])))
);


--
-- Name: TABLE "tai_lieu"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."tai_lieu" IS 'Chỉ lưu đường dẫn tệp riêng tư; không lưu URL ký có thời hạn.';


--
-- Name: thanh_toan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."thanh_toan" (
    "thanh_toan_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bao_gia_id" "uuid" NOT NULL,
    "loai_giao_dich" "text" NOT NULL,
    "so_tien" numeric(18,0) NOT NULL,
    "phuong_thuc" "text" NOT NULL,
    "trang_thai" "text" DEFAULT 'cho_xac_nhan'::"text" NOT NULL,
    "thoi_diem" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ma_giao_dich" "text",
    "ben_cung_cap" "text",
    "thu_ngan_id" "uuid",
    "giao_dich_goc_id" "uuid",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    "ma_doi_soat" "text",
    CONSTRAINT "thanh_toan_check" CHECK (("giao_dich_goc_id" IS DISTINCT FROM "thanh_toan_id")),
    CONSTRAINT "thanh_toan_check1" CHECK ((("loai_giao_dich" = 'hoan_tien'::"text") = ("giao_dich_goc_id" IS NOT NULL))),
    CONSTRAINT "thanh_toan_check2" CHECK ((("ma_giao_dich" IS NULL) OR ("ben_cung_cap" IS NOT NULL))),
    CONSTRAINT "thanh_toan_loai_giao_dich_check" CHECK (("loai_giao_dich" = ANY (ARRAY['dat_coc'::"text", 'thanh_toan'::"text", 'hoan_tien'::"text"]))),
    CONSTRAINT "thanh_toan_phuong_thuc_check" CHECK (("phuong_thuc" = ANY (ARRAY['tien_mat'::"text", 'chuyen_khoan'::"text", 'the'::"text", 'doi_tac'::"text"]))),
    CONSTRAINT "thanh_toan_so_tien_check" CHECK (("so_tien" > (0)::numeric)),
    CONSTRAINT "thanh_toan_trang_thai_check" CHECK (("trang_thai" = ANY (ARRAY['cho_xac_nhan'::"text", 'thanh_cong'::"text", 'that_bai'::"text", 'huy'::"text"])))
);


--
-- Name: TABLE "thanh_toan"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."thanh_toan" IS 'Giao dịch thu và hoàn; số tiền luôn dương, loại quyết định dấu báo cáo.';


--
-- Name: tuong_tac; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."tuong_tac" (
    "tuong_tac_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "khach_hang_id" "uuid" NOT NULL,
    "co_hoi_id" "uuid",
    "nhan_vien_id" "uuid",
    "kenh" "text" NOT NULL,
    "chieu" "text" NOT NULL,
    "thoi_diem" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thoi_luong_giay" integer,
    "noi_dung_tom_tat" "text",
    "ket_qua" "text",
    "la_tu_dong" boolean DEFAULT false NOT NULL,
    "he_thong_nguon" "text",
    "ma_su_kien_ngoai" "text",
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid",
    CONSTRAINT "tuong_tac_check" CHECK ((("ma_su_kien_ngoai" IS NULL) OR ("he_thong_nguon" IS NOT NULL))),
    CONSTRAINT "tuong_tac_chieu_check" CHECK (("chieu" = ANY (ARRAY['den'::"text", 'di'::"text"]))),
    CONSTRAINT "tuong_tac_thoi_luong_giay_check" CHECK (("thoi_luong_giay" >= 0))
);


--
-- Name: TABLE "tuong_tac"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."tuong_tac" IS 'Gọi, nhắn tin và trao đổi; mã ngoài duy nhất trong hệ thống nguồn.';


--
-- Name: v_tong_hop_bao_gia; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW "public"."v_tong_hop_bao_gia" WITH ("security_invoker"='true') AS
 WITH "hang_muc" AS (
         SELECT "chi_tiet_bao_gia"."bao_gia_id",
            "sum"("chi_tiet_bao_gia"."thanh_tien") AS "tong_bao_gia"
           FROM "public"."chi_tiet_bao_gia"
          GROUP BY "chi_tiet_bao_gia"."bao_gia_id"
        ), "tien" AS (
         SELECT "thanh_toan"."bao_gia_id",
            "sum"("thanh_toan"."so_tien") FILTER (WHERE ("thanh_toan"."loai_giao_dich" <> 'hoan_tien'::"text")) AS "tong_thu",
            "sum"("thanh_toan"."so_tien") FILTER (WHERE ("thanh_toan"."loai_giao_dich" = 'hoan_tien'::"text")) AS "tong_hoan"
           FROM "public"."thanh_toan"
          WHERE ("thanh_toan"."trang_thai" = 'thanh_cong'::"text")
          GROUP BY "thanh_toan"."bao_gia_id"
        )
 SELECT "bg"."bao_gia_id",
    "bg"."co_hoi_id",
    "bg"."phien_ban",
    "bg"."trang_thai",
    COALESCE("h"."tong_bao_gia", (0)::numeric) AS "tong_bao_gia",
    COALESCE("t"."tong_thu", (0)::numeric) AS "tong_thu",
    COALESCE("t"."tong_hoan", (0)::numeric) AS "tong_hoan",
    (COALESCE("t"."tong_thu", (0)::numeric) - COALESCE("t"."tong_hoan", (0)::numeric)) AS "thuc_thu"
   FROM (("public"."bao_gia" "bg"
     LEFT JOIN "hang_muc" "h" USING ("bao_gia_id"))
     LEFT JOIN "tien" "t" USING ("bao_gia_id"));


--
-- Name: VIEW "v_tong_hop_bao_gia"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW "public"."v_tong_hop_bao_gia" IS 'Tổng báo giá và tiền thực thu. Không mặc định chênh lệch là công nợ khi có hủy hoặc hoàn dịch vụ.';


--
-- Name: vai_tro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE "public"."vai_tro" (
    "vai_tro_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ma_vai_tro" "text" NOT NULL,
    "ten_vai_tro" "text" NOT NULL,
    "ngay_tao" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ngay_cap_nhat" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nguoi_tao_id" "uuid"
);


--
-- Name: TABLE "vai_tro"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE "public"."vai_tro" IS 'Danh mục vai trò; gán vai trò chưa tự cấp quyền API.';


--
-- Name: bao_gia bao_gia_bao_gia_id_co_hoi_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bao_gia"
    ADD CONSTRAINT "bao_gia_bao_gia_id_co_hoi_id_key" UNIQUE ("bao_gia_id", "co_hoi_id");


--
-- Name: bao_gia bao_gia_co_hoi_id_phien_ban_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bao_gia"
    ADD CONSTRAINT "bao_gia_co_hoi_id_phien_ban_key" UNIQUE ("co_hoi_id", "phien_ban");


--
-- Name: bao_gia bao_gia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bao_gia"
    ADD CONSTRAINT "bao_gia_pkey" PRIMARY KEY ("bao_gia_id");


--
-- Name: ca_thuc_hien ca_thuc_hien_ca_id_khach_hang_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_ca_id_khach_hang_id_key" UNIQUE ("ca_id", "khach_hang_id");


--
-- Name: ca_thuc_hien ca_thuc_hien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_pkey" PRIMARY KEY ("ca_id");


--
-- Name: canh_bao_y_khoa canh_bao_y_khoa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."canh_bao_y_khoa"
    ADD CONSTRAINT "canh_bao_y_khoa_pkey" PRIMARY KEY ("canh_bao_id");


--
-- Name: cham_soc_sau_ca cham_soc_sau_ca_ca_id_moc_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cham_soc_sau_ca"
    ADD CONSTRAINT "cham_soc_sau_ca_ca_id_moc_id_key" UNIQUE ("ca_id", "moc_id");


--
-- Name: cham_soc_sau_ca cham_soc_sau_ca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cham_soc_sau_ca"
    ADD CONSTRAINT "cham_soc_sau_ca_pkey" PRIMARY KEY ("cham_soc_id");


--
-- Name: chi_tiet_bao_gia chi_tiet_bao_gia_chi_tiet_bao_gia_id_bao_gia_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."chi_tiet_bao_gia"
    ADD CONSTRAINT "chi_tiet_bao_gia_chi_tiet_bao_gia_id_bao_gia_id_key" UNIQUE ("chi_tiet_bao_gia_id", "bao_gia_id");


--
-- Name: chi_tiet_bao_gia chi_tiet_bao_gia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."chi_tiet_bao_gia"
    ADD CONSTRAINT "chi_tiet_bao_gia_pkey" PRIMARY KEY ("chi_tiet_bao_gia_id");


--
-- Name: co_hoi_dich_vu co_hoi_dich_vu_co_hoi_id_khach_hang_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_hoi_dich_vu"
    ADD CONSTRAINT "co_hoi_dich_vu_co_hoi_id_khach_hang_id_key" UNIQUE ("co_hoi_id", "khach_hang_id");


--
-- Name: co_hoi_dich_vu co_hoi_dich_vu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_hoi_dich_vu"
    ADD CONSTRAINT "co_hoi_dich_vu_pkey" PRIMARY KEY ("co_hoi_id");


--
-- Name: co_so co_so_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_so"
    ADD CONSTRAINT "co_so_pkey" PRIMARY KEY ("co_so_id");


--
-- Name: cong_viec cong_viec_khoa_chong_trung_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cong_viec"
    ADD CONSTRAINT "cong_viec_khoa_chong_trung_key" UNIQUE ("khoa_chong_trung");


--
-- Name: cong_viec cong_viec_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cong_viec"
    ADD CONSTRAINT "cong_viec_pkey" PRIMARY KEY ("cong_viec_id");


--
-- Name: danh_gia danh_gia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."danh_gia"
    ADD CONSTRAINT "danh_gia_pkey" PRIMARY KEY ("danh_gia_id");


--
-- Name: dich_vu dich_vu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dich_vu"
    ADD CONSTRAINT "dich_vu_pkey" PRIMARY KEY ("dich_vu_id");


--
-- Name: dong_y dong_y_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dong_y"
    ADD CONSTRAINT "dong_y_pkey" PRIMARY KEY ("dong_y_id");


--
-- Name: giao_dich_sepay giao_dich_sepay_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."giao_dich_sepay"
    ADD CONSTRAINT "giao_dich_sepay_pkey" PRIMARY KEY ("sepay_id");


--
-- Name: khach_hang khach_hang_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."khach_hang"
    ADD CONSTRAINT "khach_hang_pkey" PRIMARY KEY ("khach_hang_id");


--
-- Name: ky_thanh_toan ky_thanh_toan_bao_gia_id_so_ky_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ky_thanh_toan"
    ADD CONSTRAINT "ky_thanh_toan_bao_gia_id_so_ky_key" UNIQUE ("bao_gia_id", "so_ky");


--
-- Name: ky_thanh_toan ky_thanh_toan_ky_id_bao_gia_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ky_thanh_toan"
    ADD CONSTRAINT "ky_thanh_toan_ky_id_bao_gia_id_key" UNIQUE ("ky_id", "bao_gia_id");


--
-- Name: ky_thanh_toan ky_thanh_toan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ky_thanh_toan"
    ADD CONSTRAINT "ky_thanh_toan_pkey" PRIMARY KEY ("ky_id");


--
-- Name: lan_tham_kham lan_tham_kham_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lan_tham_kham"
    ADD CONSTRAINT "lan_tham_kham_pkey" PRIMARY KEY ("tham_kham_id");


--
-- Name: lan_tham_kham lan_tham_kham_tham_kham_id_co_hoi_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lan_tham_kham"
    ADD CONSTRAINT "lan_tham_kham_tham_kham_id_co_hoi_id_key" UNIQUE ("tham_kham_id", "co_hoi_id");


--
-- Name: lich_hen lich_hen_khong_trung_bac_si; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_khong_trung_bac_si" EXCLUDE USING "gist" ("bac_si_id" WITH =, "tstzrange"("bat_dau", "ket_thuc") WITH &&) WHERE ((("bac_si_id" IS NOT NULL) AND ("trang_thai" = ANY (ARRAY['cho_xac_nhan'::"text", 'da_xac_nhan'::"text", 'da_den'::"text"]))));


--
-- Name: lich_hen lich_hen_khong_trung_phong; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_khong_trung_phong" EXCLUDE USING "gist" ("co_so_id" WITH =, "phong" WITH =, "tstzrange"("bat_dau", "ket_thuc") WITH &&) WHERE ((("phong" IS NOT NULL) AND ("trang_thai" = ANY (ARRAY['cho_xac_nhan'::"text", 'da_xac_nhan'::"text", 'da_den'::"text"]))));


--
-- Name: lich_hen lich_hen_lich_hen_id_co_hoi_id_khach_hang_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_lich_hen_id_co_hoi_id_khach_hang_id_key" UNIQUE ("lich_hen_id", "co_hoi_id", "khach_hang_id");


--
-- Name: lich_hen lich_hen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_pkey" PRIMARY KEY ("lich_hen_id");


--
-- Name: lich_su_trang_thai lich_su_trang_thai_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_su_trang_thai"
    ADD CONSTRAINT "lich_su_trang_thai_pkey" PRIMARY KEY ("lich_su_id");


--
-- Name: mau_cham_soc mau_cham_soc_dich_vu_id_phien_ban_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mau_cham_soc"
    ADD CONSTRAINT "mau_cham_soc_dich_vu_id_phien_ban_key" UNIQUE ("dich_vu_id", "phien_ban");


--
-- Name: mau_cham_soc mau_cham_soc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mau_cham_soc"
    ADD CONSTRAINT "mau_cham_soc_pkey" PRIMARY KEY ("mau_id");


--
-- Name: moc_cham_soc moc_cham_soc_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."moc_cham_soc"
    ADD CONSTRAINT "moc_cham_soc_pkey" PRIMARY KEY ("moc_id");


--
-- Name: nguon_khach nguon_khach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nguon_khach"
    ADD CONSTRAINT "nguon_khach_pkey" PRIMARY KEY ("nguon_id");


--
-- Name: nhan_vien nhan_vien_auth_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien"
    ADD CONSTRAINT "nhan_vien_auth_user_id_key" UNIQUE ("auth_user_id");


--
-- Name: nhan_vien nhan_vien_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien"
    ADD CONSTRAINT "nhan_vien_pkey" PRIMARY KEY ("nhan_vien_id");


--
-- Name: nhan_vien_vai_tro nhan_vien_vai_tro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien_vai_tro"
    ADD CONSTRAINT "nhan_vien_vai_tro_pkey" PRIMARY KEY ("nhan_vien_id", "vai_tro_id");


--
-- Name: nhat_ky_truy_cap nhat_ky_truy_cap_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhat_ky_truy_cap"
    ADD CONSTRAINT "nhat_ky_truy_cap_pkey" PRIMARY KEY ("nhat_ky_id");


--
-- Name: phan_bo_thanh_toan phan_bo_thanh_toan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phan_bo_thanh_toan"
    ADD CONSTRAINT "phan_bo_thanh_toan_pkey" PRIMARY KEY ("thanh_toan_id", "ky_id");


--
-- Name: quyen_vai_tro quyen_vai_tro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."quyen_vai_tro"
    ADD CONSTRAINT "quyen_vai_tro_pkey" PRIMARY KEY ("vai_tro_id", "doi_tuong", "hanh_dong", "pham_vi");


--
-- Name: tai_lieu tai_lieu_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tai_lieu"
    ADD CONSTRAINT "tai_lieu_pkey" PRIMARY KEY ("tai_lieu_id");


--
-- Name: thanh_toan thanh_toan_ben_cung_cap_ma_giao_dich_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thanh_toan"
    ADD CONSTRAINT "thanh_toan_ben_cung_cap_ma_giao_dich_key" UNIQUE ("ben_cung_cap", "ma_giao_dich");


--
-- Name: thanh_toan thanh_toan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thanh_toan"
    ADD CONSTRAINT "thanh_toan_pkey" PRIMARY KEY ("thanh_toan_id");


--
-- Name: thanh_toan thanh_toan_thanh_toan_id_bao_gia_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thanh_toan"
    ADD CONSTRAINT "thanh_toan_thanh_toan_id_bao_gia_id_key" UNIQUE ("thanh_toan_id", "bao_gia_id");


--
-- Name: tuong_tac tuong_tac_he_thong_nguon_ma_su_kien_ngoai_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tuong_tac"
    ADD CONSTRAINT "tuong_tac_he_thong_nguon_ma_su_kien_ngoai_key" UNIQUE ("he_thong_nguon", "ma_su_kien_ngoai");


--
-- Name: tuong_tac tuong_tac_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tuong_tac"
    ADD CONSTRAINT "tuong_tac_pkey" PRIMARY KEY ("tuong_tac_id");


--
-- Name: vai_tro vai_tro_ma_vai_tro_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vai_tro"
    ADD CONSTRAINT "vai_tro_ma_vai_tro_key" UNIQUE ("ma_vai_tro");


--
-- Name: vai_tro vai_tro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vai_tro"
    ADD CONSTRAINT "vai_tro_pkey" PRIMARY KEY ("vai_tro_id");


--
-- Name: bao_gia_co_hoi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bao_gia_co_hoi_id_idx" ON "public"."bao_gia" USING "btree" ("co_hoi_id");


--
-- Name: bao_gia_nguoi_lap_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bao_gia_nguoi_lap_id_idx" ON "public"."bao_gia" USING "btree" ("nguoi_lap_id");


--
-- Name: bao_gia_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bao_gia_nguoi_tao_id_idx" ON "public"."bao_gia" USING "btree" ("nguoi_tao_id");


--
-- Name: bao_gia_tham_kham_id_co_hoi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "bao_gia_tham_kham_id_co_hoi_id_idx" ON "public"."bao_gia" USING "btree" ("tham_kham_id", "co_hoi_id");


--
-- Name: ca_thuc_hien_bac_si_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_bac_si_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("bac_si_id");


--
-- Name: ca_thuc_hien_bao_gia_id_co_hoi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_bao_gia_id_co_hoi_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("bao_gia_id", "co_hoi_id");


--
-- Name: ca_thuc_hien_chi_tiet_bao_gia_id_bao_gia_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_chi_tiet_bao_gia_id_bao_gia_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("chi_tiet_bao_gia_id", "bao_gia_id");


--
-- Name: ca_thuc_hien_co_hoi_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_co_hoi_id_khach_hang_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("co_hoi_id", "khach_hang_id");


--
-- Name: ca_thuc_hien_co_so_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_co_so_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("co_so_id");


--
-- Name: ca_thuc_hien_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_khach_hang_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("khach_hang_id");


--
-- Name: ca_thuc_hien_nguoi_ban_giao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_nguoi_ban_giao_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("nguoi_ban_giao_id");


--
-- Name: ca_thuc_hien_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_nguoi_tao_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("nguoi_tao_id");


--
-- Name: ca_thuc_hien_tham_kham_id_co_hoi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ca_thuc_hien_tham_kham_id_co_hoi_id_idx" ON "public"."ca_thuc_hien" USING "btree" ("tham_kham_id", "co_hoi_id");


--
-- Name: canh_bao_y_khoa_bac_si_nhan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "canh_bao_y_khoa_bac_si_nhan_id_idx" ON "public"."canh_bao_y_khoa" USING "btree" ("bac_si_nhan_id");


--
-- Name: canh_bao_y_khoa_ca_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "canh_bao_y_khoa_ca_id_idx" ON "public"."canh_bao_y_khoa" USING "btree" ("ca_id");


--
-- Name: canh_bao_y_khoa_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "canh_bao_y_khoa_nguoi_tao_id_idx" ON "public"."canh_bao_y_khoa" USING "btree" ("nguoi_tao_id");


--
-- Name: cham_soc_sau_ca_ca_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cham_soc_sau_ca_ca_id_idx" ON "public"."cham_soc_sau_ca" USING "btree" ("ca_id");


--
-- Name: cham_soc_sau_ca_moc_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cham_soc_sau_ca_moc_id_idx" ON "public"."cham_soc_sau_ca" USING "btree" ("moc_id");


--
-- Name: cham_soc_sau_ca_nguoi_phu_trach_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cham_soc_sau_ca_nguoi_phu_trach_id_idx" ON "public"."cham_soc_sau_ca" USING "btree" ("nguoi_phu_trach_id");


--
-- Name: cham_soc_sau_ca_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cham_soc_sau_ca_nguoi_tao_id_idx" ON "public"."cham_soc_sau_ca" USING "btree" ("nguoi_tao_id");


--
-- Name: chi_tiet_bao_gia_bao_gia_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chi_tiet_bao_gia_bao_gia_id_idx" ON "public"."chi_tiet_bao_gia" USING "btree" ("bao_gia_id");


--
-- Name: chi_tiet_bao_gia_dich_vu_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chi_tiet_bao_gia_dich_vu_id_idx" ON "public"."chi_tiet_bao_gia" USING "btree" ("dich_vu_id");


--
-- Name: chi_tiet_bao_gia_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chi_tiet_bao_gia_nguoi_tao_id_idx" ON "public"."chi_tiet_bao_gia" USING "btree" ("nguoi_tao_id");


--
-- Name: co_hoi_dich_vu_dich_vu_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "co_hoi_dich_vu_dich_vu_id_idx" ON "public"."co_hoi_dich_vu" USING "btree" ("dich_vu_id");


--
-- Name: co_hoi_dich_vu_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "co_hoi_dich_vu_khach_hang_id_idx" ON "public"."co_hoi_dich_vu" USING "btree" ("khach_hang_id");


--
-- Name: co_hoi_dich_vu_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "co_hoi_dich_vu_nguoi_tao_id_idx" ON "public"."co_hoi_dich_vu" USING "btree" ("nguoi_tao_id");


--
-- Name: co_hoi_dich_vu_nguon_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "co_hoi_dich_vu_nguon_id_idx" ON "public"."co_hoi_dich_vu" USING "btree" ("nguon_id");


--
-- Name: co_hoi_dich_vu_tu_van_vien_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "co_hoi_dich_vu_tu_van_vien_id_idx" ON "public"."co_hoi_dich_vu" USING "btree" ("tu_van_vien_id");


--
-- Name: co_so_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "co_so_nguoi_tao_id_idx" ON "public"."co_so" USING "btree" ("nguoi_tao_id");


--
-- Name: cong_viec_co_hoi_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cong_viec_co_hoi_id_khach_hang_id_idx" ON "public"."cong_viec" USING "btree" ("co_hoi_id", "khach_hang_id");


--
-- Name: cong_viec_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cong_viec_khach_hang_id_idx" ON "public"."cong_viec" USING "btree" ("khach_hang_id");


--
-- Name: cong_viec_lich_hen_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cong_viec_lich_hen_id_idx" ON "public"."cong_viec" USING "btree" ("lich_hen_id");


--
-- Name: cong_viec_nguoi_phu_trach_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cong_viec_nguoi_phu_trach_id_idx" ON "public"."cong_viec" USING "btree" ("nguoi_phu_trach_id");


--
-- Name: cong_viec_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "cong_viec_nguoi_tao_id_idx" ON "public"."cong_viec" USING "btree" ("nguoi_tao_id");


--
-- Name: danh_gia_ca_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "danh_gia_ca_id_khach_hang_id_idx" ON "public"."danh_gia" USING "btree" ("ca_id", "khach_hang_id");


--
-- Name: danh_gia_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "danh_gia_khach_hang_id_idx" ON "public"."danh_gia" USING "btree" ("khach_hang_id");


--
-- Name: danh_gia_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "danh_gia_nguoi_tao_id_idx" ON "public"."danh_gia" USING "btree" ("nguoi_tao_id");


--
-- Name: danh_gia_nguoi_xu_ly_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "danh_gia_nguoi_xu_ly_id_idx" ON "public"."danh_gia" USING "btree" ("nguoi_xu_ly_id");


--
-- Name: dich_vu_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dich_vu_nguoi_tao_id_idx" ON "public"."dich_vu" USING "btree" ("nguoi_tao_id");


--
-- Name: dong_y_ca_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dong_y_ca_id_khach_hang_id_idx" ON "public"."dong_y" USING "btree" ("ca_id", "khach_hang_id");


--
-- Name: dong_y_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dong_y_khach_hang_id_idx" ON "public"."dong_y" USING "btree" ("khach_hang_id");


--
-- Name: dong_y_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "dong_y_nguoi_tao_id_idx" ON "public"."dong_y" USING "btree" ("nguoi_tao_id");


--
-- Name: idx_canh_bao_mo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_canh_bao_mo" ON "public"."canh_bao_y_khoa" USING "btree" ("bac_si_nhan_id", "thoi_diem_bao") WHERE ("trang_thai" <> 'da_dong'::"text");


--
-- Name: idx_cham_soc_den_han; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_cham_soc_den_han" ON "public"."cham_soc_sau_ca" USING "btree" ("nguoi_phu_trach_id", "han_thuc_hien") WHERE ("trang_thai" = 'cho_thuc_hien'::"text");


--
-- Name: idx_co_hoi_phu_trach; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_co_hoi_phu_trach" ON "public"."co_hoi_dich_vu" USING "btree" ("tu_van_vien_id", "trang_thai", "ngay_tiep_nhan");


--
-- Name: idx_dong_y_muc_dich; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_dong_y_muc_dich" ON "public"."dong_y" USING "btree" ("khach_hang_id", "muc_dich", "thoi_diem_dong_y" DESC);


--
-- Name: idx_khach_sdt; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_khach_sdt" ON "public"."khach_hang" USING "btree" ("so_dien_thoai_chuan");


--
-- Name: idx_lich_bac_si; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_lich_bac_si" ON "public"."lich_hen" USING "btree" ("bac_si_id", "bat_dau", "ket_thuc");


--
-- Name: idx_lich_phong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_lich_phong" ON "public"."lich_hen" USING "btree" ("co_so_id", "phong", "bat_dau");


--
-- Name: idx_nhat_ky_doi_tuong; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_nhat_ky_doi_tuong" ON "public"."nhat_ky_truy_cap" USING "btree" ("doi_tuong", "ma_ban_ghi", "thoi_diem");


--
-- Name: idx_viec_den_han; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "idx_viec_den_han" ON "public"."cong_viec" USING "btree" ("nguoi_phu_trach_id", "han_hoan_thanh") WHERE ("trang_thai" = ANY (ARRAY['cho_lam'::"text", 'dang_lam'::"text"]));


--
-- Name: ix_giao_dich_sepay_ket_qua; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ix_giao_dich_sepay_ket_qua" ON "public"."giao_dich_sepay" USING "btree" ("ket_qua", "ngay_tao" DESC);


--
-- Name: ix_giao_dich_sepay_thanh_toan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ix_giao_dich_sepay_thanh_toan" ON "public"."giao_dich_sepay" USING "btree" ("thanh_toan_id");


--
-- Name: khach_hang_khach_gioi_thieu_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "khach_hang_khach_gioi_thieu_id_idx" ON "public"."khach_hang" USING "btree" ("khach_gioi_thieu_id");


--
-- Name: khach_hang_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "khach_hang_nguoi_tao_id_idx" ON "public"."khach_hang" USING "btree" ("nguoi_tao_id");


--
-- Name: khach_hang_nguon_dau_tien_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "khach_hang_nguon_dau_tien_id_idx" ON "public"."khach_hang" USING "btree" ("nguon_dau_tien_id");


--
-- Name: khach_hang_nhan_vien_phu_trach_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "khach_hang_nhan_vien_phu_trach_id_idx" ON "public"."khach_hang" USING "btree" ("nhan_vien_phu_trach_id");


--
-- Name: ky_thanh_toan_bao_gia_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ky_thanh_toan_bao_gia_id_idx" ON "public"."ky_thanh_toan" USING "btree" ("bao_gia_id");


--
-- Name: ky_thanh_toan_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ky_thanh_toan_nguoi_tao_id_idx" ON "public"."ky_thanh_toan" USING "btree" ("nguoi_tao_id");


--
-- Name: lan_tham_kham_bac_si_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lan_tham_kham_bac_si_id_idx" ON "public"."lan_tham_kham" USING "btree" ("bac_si_id");


--
-- Name: lan_tham_kham_co_hoi_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lan_tham_kham_co_hoi_id_khach_hang_id_idx" ON "public"."lan_tham_kham" USING "btree" ("co_hoi_id", "khach_hang_id");


--
-- Name: lan_tham_kham_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lan_tham_kham_khach_hang_id_idx" ON "public"."lan_tham_kham" USING "btree" ("khach_hang_id");


--
-- Name: lan_tham_kham_lich_hen_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lan_tham_kham_lich_hen_id_idx" ON "public"."lan_tham_kham" USING "btree" ("lich_hen_id");


--
-- Name: lan_tham_kham_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lan_tham_kham_nguoi_tao_id_idx" ON "public"."lan_tham_kham" USING "btree" ("nguoi_tao_id");


--
-- Name: lich_hen_bac_si_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_hen_bac_si_id_idx" ON "public"."lich_hen" USING "btree" ("bac_si_id");


--
-- Name: lich_hen_co_hoi_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_hen_co_hoi_id_khach_hang_id_idx" ON "public"."lich_hen" USING "btree" ("co_hoi_id", "khach_hang_id");


--
-- Name: lich_hen_co_so_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_hen_co_so_id_idx" ON "public"."lich_hen" USING "btree" ("co_so_id");


--
-- Name: lich_hen_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_hen_khach_hang_id_idx" ON "public"."lich_hen" USING "btree" ("khach_hang_id");


--
-- Name: lich_hen_lich_hen_truoc_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_hen_lich_hen_truoc_id_idx" ON "public"."lich_hen" USING "btree" ("lich_hen_truoc_id");


--
-- Name: lich_hen_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_hen_nguoi_tao_id_idx" ON "public"."lich_hen" USING "btree" ("nguoi_tao_id");


--
-- Name: lich_su_trang_thai_co_hoi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_su_trang_thai_co_hoi_id_idx" ON "public"."lich_su_trang_thai" USING "btree" ("co_hoi_id");


--
-- Name: lich_su_trang_thai_nguoi_thay_doi_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lich_su_trang_thai_nguoi_thay_doi_id_idx" ON "public"."lich_su_trang_thai" USING "btree" ("nguoi_thay_doi_id");


--
-- Name: mau_cham_soc_dich_vu_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "mau_cham_soc_dich_vu_id_idx" ON "public"."mau_cham_soc" USING "btree" ("dich_vu_id");


--
-- Name: mau_cham_soc_nguoi_duyet_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "mau_cham_soc_nguoi_duyet_id_idx" ON "public"."mau_cham_soc" USING "btree" ("nguoi_duyet_id");


--
-- Name: mau_cham_soc_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "mau_cham_soc_nguoi_tao_id_idx" ON "public"."mau_cham_soc" USING "btree" ("nguoi_tao_id");


--
-- Name: moc_cham_soc_mau_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "moc_cham_soc_mau_id_idx" ON "public"."moc_cham_soc" USING "btree" ("mau_id");


--
-- Name: moc_cham_soc_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "moc_cham_soc_nguoi_tao_id_idx" ON "public"."moc_cham_soc" USING "btree" ("nguoi_tao_id");


--
-- Name: moc_cham_soc_vai_tro_phu_trach_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "moc_cham_soc_vai_tro_phu_trach_idx" ON "public"."moc_cham_soc" USING "btree" ("vai_tro_phu_trach");


--
-- Name: nguon_khach_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nguon_khach_nguoi_tao_id_idx" ON "public"."nguon_khach" USING "btree" ("nguoi_tao_id");


--
-- Name: nhan_vien_auth_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nhan_vien_auth_user_id_idx" ON "public"."nhan_vien" USING "btree" ("auth_user_id");


--
-- Name: nhan_vien_co_so_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nhan_vien_co_so_id_idx" ON "public"."nhan_vien" USING "btree" ("co_so_id");


--
-- Name: nhan_vien_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nhan_vien_nguoi_tao_id_idx" ON "public"."nhan_vien" USING "btree" ("nguoi_tao_id");


--
-- Name: nhan_vien_vai_tro_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nhan_vien_vai_tro_nguoi_tao_id_idx" ON "public"."nhan_vien_vai_tro" USING "btree" ("nguoi_tao_id");


--
-- Name: nhan_vien_vai_tro_nhan_vien_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nhan_vien_vai_tro_nhan_vien_id_idx" ON "public"."nhan_vien_vai_tro" USING "btree" ("nhan_vien_id");


--
-- Name: nhan_vien_vai_tro_vai_tro_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nhan_vien_vai_tro_vai_tro_id_idx" ON "public"."nhan_vien_vai_tro" USING "btree" ("vai_tro_id");


--
-- Name: nhat_ky_truy_cap_nguoi_dung_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "nhat_ky_truy_cap_nguoi_dung_id_idx" ON "public"."nhat_ky_truy_cap" USING "btree" ("nguoi_dung_id");


--
-- Name: phan_bo_thanh_toan_bao_gia_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "phan_bo_thanh_toan_bao_gia_id_idx" ON "public"."phan_bo_thanh_toan" USING "btree" ("bao_gia_id");


--
-- Name: phan_bo_thanh_toan_ky_id_bao_gia_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "phan_bo_thanh_toan_ky_id_bao_gia_id_idx" ON "public"."phan_bo_thanh_toan" USING "btree" ("ky_id", "bao_gia_id");


--
-- Name: phan_bo_thanh_toan_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "phan_bo_thanh_toan_nguoi_tao_id_idx" ON "public"."phan_bo_thanh_toan" USING "btree" ("nguoi_tao_id");


--
-- Name: quyen_vai_tro_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quyen_vai_tro_nguoi_tao_id_idx" ON "public"."quyen_vai_tro" USING "btree" ("nguoi_tao_id");


--
-- Name: quyen_vai_tro_vai_tro_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quyen_vai_tro_vai_tro_id_idx" ON "public"."quyen_vai_tro" USING "btree" ("vai_tro_id");


--
-- Name: tai_lieu_ca_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tai_lieu_ca_id_khach_hang_id_idx" ON "public"."tai_lieu" USING "btree" ("ca_id", "khach_hang_id");


--
-- Name: tai_lieu_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tai_lieu_khach_hang_id_idx" ON "public"."tai_lieu" USING "btree" ("khach_hang_id");


--
-- Name: tai_lieu_nguoi_tai_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tai_lieu_nguoi_tai_id_idx" ON "public"."tai_lieu" USING "btree" ("nguoi_tai_id");


--
-- Name: tai_lieu_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tai_lieu_nguoi_tao_id_idx" ON "public"."tai_lieu" USING "btree" ("nguoi_tao_id");


--
-- Name: thanh_toan_bao_gia_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thanh_toan_bao_gia_id_idx" ON "public"."thanh_toan" USING "btree" ("bao_gia_id");


--
-- Name: thanh_toan_giao_dich_goc_id_bao_gia_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thanh_toan_giao_dich_goc_id_bao_gia_id_idx" ON "public"."thanh_toan" USING "btree" ("giao_dich_goc_id", "bao_gia_id");


--
-- Name: thanh_toan_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thanh_toan_nguoi_tao_id_idx" ON "public"."thanh_toan" USING "btree" ("nguoi_tao_id");


--
-- Name: thanh_toan_thu_ngan_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "thanh_toan_thu_ngan_id_idx" ON "public"."thanh_toan" USING "btree" ("thu_ngan_id");


--
-- Name: tuong_tac_co_hoi_id_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tuong_tac_co_hoi_id_khach_hang_id_idx" ON "public"."tuong_tac" USING "btree" ("co_hoi_id", "khach_hang_id");


--
-- Name: tuong_tac_khach_hang_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tuong_tac_khach_hang_id_idx" ON "public"."tuong_tac" USING "btree" ("khach_hang_id");


--
-- Name: tuong_tac_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tuong_tac_nguoi_tao_id_idx" ON "public"."tuong_tac" USING "btree" ("nguoi_tao_id");


--
-- Name: tuong_tac_nhan_vien_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "tuong_tac_nhan_vien_id_idx" ON "public"."tuong_tac" USING "btree" ("nhan_vien_id");


--
-- Name: uq_bao_gia_da_chap_nhan; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uq_bao_gia_da_chap_nhan" ON "public"."bao_gia" USING "btree" ("co_hoi_id") WHERE ("trang_thai" = 'da_chap_nhan'::"text");


--
-- Name: uq_bao_gia_nhap; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uq_bao_gia_nhap" ON "public"."bao_gia" USING "btree" ("co_hoi_id") WHERE ("trang_thai" = 'nhap'::"text");


--
-- Name: uq_danh_gia_ca; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uq_danh_gia_ca" ON "public"."danh_gia" USING "btree" ("ca_id") WHERE ("ca_id" IS NOT NULL);


--
-- Name: uq_mau_cham_soc_da_duyet; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uq_mau_cham_soc_da_duyet" ON "public"."mau_cham_soc" USING "btree" ("dich_vu_id") WHERE ("trang_thai" = 'da_duyet'::"text");


--
-- Name: uq_mau_cham_soc_nhap; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uq_mau_cham_soc_nhap" ON "public"."mau_cham_soc" USING "btree" ("dich_vu_id") WHERE ("trang_thai" = 'nhap'::"text");


--
-- Name: uq_thanh_toan_ma_doi_soat; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "uq_thanh_toan_ma_doi_soat" ON "public"."thanh_toan" USING "btree" ("ma_doi_soat") WHERE ("ma_doi_soat" IS NOT NULL);


--
-- Name: vai_tro_nguoi_tao_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "vai_tro_nguoi_tao_id_idx" ON "public"."vai_tro" USING "btree" ("nguoi_tao_id");


--
-- Name: bao_gia hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."bao_gia" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: ca_thuc_hien hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."ca_thuc_hien" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: canh_bao_y_khoa hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."canh_bao_y_khoa" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: cham_soc_sau_ca hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."cham_soc_sau_ca" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: chi_tiet_bao_gia hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."chi_tiet_bao_gia" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: co_hoi_dich_vu hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."co_hoi_dich_vu" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: co_so hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."co_so" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: cong_viec hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."cong_viec" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: danh_gia hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."danh_gia" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: dich_vu hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."dich_vu" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: dong_y hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."dong_y" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: khach_hang hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."khach_hang" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: ky_thanh_toan hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."ky_thanh_toan" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: lan_tham_kham hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."lan_tham_kham" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: lich_hen hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."lich_hen" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: mau_cham_soc hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."mau_cham_soc" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: moc_cham_soc hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."moc_cham_soc" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: nguon_khach hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."nguon_khach" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: nhan_vien hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."nhan_vien" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: nhan_vien_vai_tro hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."nhan_vien_vai_tro" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: phan_bo_thanh_toan hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."phan_bo_thanh_toan" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: quyen_vai_tro hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."quyen_vai_tro" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: tai_lieu hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."tai_lieu" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: thanh_toan hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."thanh_toan" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: tuong_tac hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."tuong_tac" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: vai_tro hana_gio_sua; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_gio_sua" BEFORE UPDATE ON "public"."vai_tro" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cap_nhat_gio"();


--
-- Name: bao_gia hana_khoa_bao_gia; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_bao_gia" BEFORE DELETE OR UPDATE ON "public"."bao_gia" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_bao_gia"();


--
-- Name: ca_thuc_hien hana_khoa_ca_thuc_hien; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_ca_thuc_hien" BEFORE INSERT OR DELETE OR UPDATE ON "public"."ca_thuc_hien" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_ca_thuc_hien"();


--
-- Name: canh_bao_y_khoa hana_khoa_canh_bao_y_khoa; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_canh_bao_y_khoa" BEFORE INSERT OR DELETE OR UPDATE ON "public"."canh_bao_y_khoa" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_canh_bao_y_khoa"();


--
-- Name: cham_soc_sau_ca hana_khoa_cham_soc_sau_ca; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_cham_soc_sau_ca" BEFORE INSERT OR DELETE OR UPDATE ON "public"."cham_soc_sau_ca" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_cham_soc_sau_ca"();


--
-- Name: chi_tiet_bao_gia hana_khoa_chi_tiet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_chi_tiet" BEFORE INSERT OR DELETE OR UPDATE ON "public"."chi_tiet_bao_gia" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_chi_tiet_bao_gia"();


--
-- Name: danh_gia hana_khoa_danh_gia; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_danh_gia" BEFORE INSERT OR DELETE OR UPDATE ON "public"."danh_gia" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_danh_gia"();


--
-- Name: giao_dich_sepay hana_khoa_giao_dich_sepay; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_giao_dich_sepay" BEFORE DELETE OR UPDATE ON "public"."giao_dich_sepay" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_giao_dich_sepay"();


--
-- Name: lan_tham_kham hana_khoa_kham; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_kham" BEFORE DELETE OR UPDATE ON "public"."lan_tham_kham" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_lan_tham_kham"();


--
-- Name: mau_cham_soc hana_khoa_mau_cham_soc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_mau_cham_soc" BEFORE INSERT OR DELETE OR UPDATE ON "public"."mau_cham_soc" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_mau_cham_soc"();


--
-- Name: moc_cham_soc hana_khoa_moc_cham_soc; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_moc_cham_soc" BEFORE INSERT OR DELETE OR UPDATE ON "public"."moc_cham_soc" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_moc_cham_soc"();


--
-- Name: thanh_toan hana_khoa_thanh_toan; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_khoa_thanh_toan" BEFORE INSERT OR DELETE OR UPDATE ON "public"."thanh_toan" FOR EACH ROW EXECUTE FUNCTION "public"."hana_khoa_thanh_toan"();


--
-- Name: co_hoi_dich_vu hana_lich_su_co_hoi; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_lich_su_co_hoi" AFTER INSERT OR UPDATE OF "trang_thai" ON "public"."co_hoi_dich_vu" FOR EACH ROW EXECUTE FUNCTION "public"."hana_ghi_trang_thai"();


--
-- Name: lich_su_trang_thai hana_nhat_ky_trang_thai; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_nhat_ky_trang_thai" BEFORE DELETE OR UPDATE ON "public"."lich_su_trang_thai" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cam_sua_nhat_ky"();


--
-- Name: nhat_ky_truy_cap hana_nhat_ky_truy_cap; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER "hana_nhat_ky_truy_cap" BEFORE DELETE OR UPDATE ON "public"."nhat_ky_truy_cap" FOR EACH ROW EXECUTE FUNCTION "public"."hana_cam_sua_nhat_ky"();


--
-- Name: bao_gia bao_gia_co_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bao_gia"
    ADD CONSTRAINT "bao_gia_co_hoi_id_fkey" FOREIGN KEY ("co_hoi_id") REFERENCES "public"."co_hoi_dich_vu"("co_hoi_id") ON DELETE RESTRICT;


--
-- Name: bao_gia bao_gia_nguoi_lap_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bao_gia"
    ADD CONSTRAINT "bao_gia_nguoi_lap_id_fkey" FOREIGN KEY ("nguoi_lap_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: bao_gia bao_gia_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bao_gia"
    ADD CONSTRAINT "bao_gia_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: bao_gia bao_gia_tham_kham_id_co_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."bao_gia"
    ADD CONSTRAINT "bao_gia_tham_kham_id_co_hoi_id_fkey" FOREIGN KEY ("tham_kham_id", "co_hoi_id") REFERENCES "public"."lan_tham_kham"("tham_kham_id", "co_hoi_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_bac_si_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_bao_gia_id_co_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_bao_gia_id_co_hoi_id_fkey" FOREIGN KEY ("bao_gia_id", "co_hoi_id") REFERENCES "public"."bao_gia"("bao_gia_id", "co_hoi_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_chi_tiet_bao_gia_id_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_chi_tiet_bao_gia_id_bao_gia_id_fkey" FOREIGN KEY ("chi_tiet_bao_gia_id", "bao_gia_id") REFERENCES "public"."chi_tiet_bao_gia"("chi_tiet_bao_gia_id", "bao_gia_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("co_hoi_id", "khach_hang_id") REFERENCES "public"."co_hoi_dich_vu"("co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_co_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_co_so_id_fkey" FOREIGN KEY ("co_so_id") REFERENCES "public"."co_so"("co_so_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_nguoi_ban_giao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_nguoi_ban_giao_id_fkey" FOREIGN KEY ("nguoi_ban_giao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: ca_thuc_hien ca_thuc_hien_tham_kham_id_co_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ca_thuc_hien"
    ADD CONSTRAINT "ca_thuc_hien_tham_kham_id_co_hoi_id_fkey" FOREIGN KEY ("tham_kham_id", "co_hoi_id") REFERENCES "public"."lan_tham_kham"("tham_kham_id", "co_hoi_id") ON DELETE RESTRICT;


--
-- Name: canh_bao_y_khoa canh_bao_y_khoa_bac_si_nhan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."canh_bao_y_khoa"
    ADD CONSTRAINT "canh_bao_y_khoa_bac_si_nhan_id_fkey" FOREIGN KEY ("bac_si_nhan_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: canh_bao_y_khoa canh_bao_y_khoa_ca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."canh_bao_y_khoa"
    ADD CONSTRAINT "canh_bao_y_khoa_ca_id_fkey" FOREIGN KEY ("ca_id") REFERENCES "public"."ca_thuc_hien"("ca_id") ON DELETE RESTRICT;


--
-- Name: canh_bao_y_khoa canh_bao_y_khoa_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."canh_bao_y_khoa"
    ADD CONSTRAINT "canh_bao_y_khoa_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: cham_soc_sau_ca cham_soc_sau_ca_ca_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cham_soc_sau_ca"
    ADD CONSTRAINT "cham_soc_sau_ca_ca_id_fkey" FOREIGN KEY ("ca_id") REFERENCES "public"."ca_thuc_hien"("ca_id") ON DELETE RESTRICT;


--
-- Name: cham_soc_sau_ca cham_soc_sau_ca_moc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cham_soc_sau_ca"
    ADD CONSTRAINT "cham_soc_sau_ca_moc_id_fkey" FOREIGN KEY ("moc_id") REFERENCES "public"."moc_cham_soc"("moc_id") ON DELETE RESTRICT;


--
-- Name: cham_soc_sau_ca cham_soc_sau_ca_nguoi_phu_trach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cham_soc_sau_ca"
    ADD CONSTRAINT "cham_soc_sau_ca_nguoi_phu_trach_id_fkey" FOREIGN KEY ("nguoi_phu_trach_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: cham_soc_sau_ca cham_soc_sau_ca_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cham_soc_sau_ca"
    ADD CONSTRAINT "cham_soc_sau_ca_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: chi_tiet_bao_gia chi_tiet_bao_gia_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."chi_tiet_bao_gia"
    ADD CONSTRAINT "chi_tiet_bao_gia_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "public"."bao_gia"("bao_gia_id") ON DELETE RESTRICT;


--
-- Name: chi_tiet_bao_gia chi_tiet_bao_gia_dich_vu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."chi_tiet_bao_gia"
    ADD CONSTRAINT "chi_tiet_bao_gia_dich_vu_id_fkey" FOREIGN KEY ("dich_vu_id") REFERENCES "public"."dich_vu"("dich_vu_id") ON DELETE RESTRICT;


--
-- Name: chi_tiet_bao_gia chi_tiet_bao_gia_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."chi_tiet_bao_gia"
    ADD CONSTRAINT "chi_tiet_bao_gia_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: co_hoi_dich_vu co_hoi_dich_vu_dich_vu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_hoi_dich_vu"
    ADD CONSTRAINT "co_hoi_dich_vu_dich_vu_id_fkey" FOREIGN KEY ("dich_vu_id") REFERENCES "public"."dich_vu"("dich_vu_id") ON DELETE RESTRICT;


--
-- Name: co_hoi_dich_vu co_hoi_dich_vu_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_hoi_dich_vu"
    ADD CONSTRAINT "co_hoi_dich_vu_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: co_hoi_dich_vu co_hoi_dich_vu_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_hoi_dich_vu"
    ADD CONSTRAINT "co_hoi_dich_vu_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: co_hoi_dich_vu co_hoi_dich_vu_nguon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_hoi_dich_vu"
    ADD CONSTRAINT "co_hoi_dich_vu_nguon_id_fkey" FOREIGN KEY ("nguon_id") REFERENCES "public"."nguon_khach"("nguon_id") ON DELETE RESTRICT;


--
-- Name: co_hoi_dich_vu co_hoi_dich_vu_tu_van_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_hoi_dich_vu"
    ADD CONSTRAINT "co_hoi_dich_vu_tu_van_vien_id_fkey" FOREIGN KEY ("tu_van_vien_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: co_so co_so_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."co_so"
    ADD CONSTRAINT "co_so_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: cong_viec cong_viec_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cong_viec"
    ADD CONSTRAINT "cong_viec_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("co_hoi_id", "khach_hang_id") REFERENCES "public"."co_hoi_dich_vu"("co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: cong_viec cong_viec_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cong_viec"
    ADD CONSTRAINT "cong_viec_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: cong_viec cong_viec_lich_hen_id_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cong_viec"
    ADD CONSTRAINT "cong_viec_lich_hen_id_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("lich_hen_id", "co_hoi_id", "khach_hang_id") REFERENCES "public"."lich_hen"("lich_hen_id", "co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: cong_viec cong_viec_nguoi_phu_trach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cong_viec"
    ADD CONSTRAINT "cong_viec_nguoi_phu_trach_id_fkey" FOREIGN KEY ("nguoi_phu_trach_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: cong_viec cong_viec_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."cong_viec"
    ADD CONSTRAINT "cong_viec_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: danh_gia danh_gia_ca_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."danh_gia"
    ADD CONSTRAINT "danh_gia_ca_id_khach_hang_id_fkey" FOREIGN KEY ("ca_id", "khach_hang_id") REFERENCES "public"."ca_thuc_hien"("ca_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: danh_gia danh_gia_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."danh_gia"
    ADD CONSTRAINT "danh_gia_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: danh_gia danh_gia_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."danh_gia"
    ADD CONSTRAINT "danh_gia_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: danh_gia danh_gia_nguoi_xu_ly_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."danh_gia"
    ADD CONSTRAINT "danh_gia_nguoi_xu_ly_id_fkey" FOREIGN KEY ("nguoi_xu_ly_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: dich_vu dich_vu_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dich_vu"
    ADD CONSTRAINT "dich_vu_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: dong_y dong_y_ca_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dong_y"
    ADD CONSTRAINT "dong_y_ca_id_khach_hang_id_fkey" FOREIGN KEY ("ca_id", "khach_hang_id") REFERENCES "public"."ca_thuc_hien"("ca_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: dong_y dong_y_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dong_y"
    ADD CONSTRAINT "dong_y_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: dong_y dong_y_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."dong_y"
    ADD CONSTRAINT "dong_y_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: giao_dich_sepay giao_dich_sepay_nguoi_xu_ly_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."giao_dich_sepay"
    ADD CONSTRAINT "giao_dich_sepay_nguoi_xu_ly_id_fkey" FOREIGN KEY ("nguoi_xu_ly_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: giao_dich_sepay giao_dich_sepay_thanh_toan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."giao_dich_sepay"
    ADD CONSTRAINT "giao_dich_sepay_thanh_toan_id_fkey" FOREIGN KEY ("thanh_toan_id") REFERENCES "public"."thanh_toan"("thanh_toan_id") ON DELETE RESTRICT;


--
-- Name: khach_hang khach_hang_khach_gioi_thieu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."khach_hang"
    ADD CONSTRAINT "khach_hang_khach_gioi_thieu_id_fkey" FOREIGN KEY ("khach_gioi_thieu_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: khach_hang khach_hang_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."khach_hang"
    ADD CONSTRAINT "khach_hang_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: khach_hang khach_hang_nguon_dau_tien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."khach_hang"
    ADD CONSTRAINT "khach_hang_nguon_dau_tien_id_fkey" FOREIGN KEY ("nguon_dau_tien_id") REFERENCES "public"."nguon_khach"("nguon_id") ON DELETE RESTRICT;


--
-- Name: khach_hang khach_hang_nhan_vien_phu_trach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."khach_hang"
    ADD CONSTRAINT "khach_hang_nhan_vien_phu_trach_id_fkey" FOREIGN KEY ("nhan_vien_phu_trach_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: ky_thanh_toan ky_thanh_toan_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ky_thanh_toan"
    ADD CONSTRAINT "ky_thanh_toan_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "public"."bao_gia"("bao_gia_id") ON DELETE RESTRICT;


--
-- Name: ky_thanh_toan ky_thanh_toan_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."ky_thanh_toan"
    ADD CONSTRAINT "ky_thanh_toan_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: lan_tham_kham lan_tham_kham_bac_si_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lan_tham_kham"
    ADD CONSTRAINT "lan_tham_kham_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: lan_tham_kham lan_tham_kham_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lan_tham_kham"
    ADD CONSTRAINT "lan_tham_kham_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("co_hoi_id", "khach_hang_id") REFERENCES "public"."co_hoi_dich_vu"("co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: lan_tham_kham lan_tham_kham_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lan_tham_kham"
    ADD CONSTRAINT "lan_tham_kham_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: lan_tham_kham lan_tham_kham_lich_hen_id_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lan_tham_kham"
    ADD CONSTRAINT "lan_tham_kham_lich_hen_id_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("lich_hen_id", "co_hoi_id", "khach_hang_id") REFERENCES "public"."lich_hen"("lich_hen_id", "co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: lan_tham_kham lan_tham_kham_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lan_tham_kham"
    ADD CONSTRAINT "lan_tham_kham_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: lich_hen lich_hen_bac_si_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_bac_si_id_fkey" FOREIGN KEY ("bac_si_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: lich_hen lich_hen_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("co_hoi_id", "khach_hang_id") REFERENCES "public"."co_hoi_dich_vu"("co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: lich_hen lich_hen_co_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_co_so_id_fkey" FOREIGN KEY ("co_so_id") REFERENCES "public"."co_so"("co_so_id") ON DELETE RESTRICT;


--
-- Name: lich_hen lich_hen_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: lich_hen lich_hen_lich_hen_truoc_id_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_lich_hen_truoc_id_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("lich_hen_truoc_id", "co_hoi_id", "khach_hang_id") REFERENCES "public"."lich_hen"("lich_hen_id", "co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: lich_hen lich_hen_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_hen"
    ADD CONSTRAINT "lich_hen_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: lich_su_trang_thai lich_su_trang_thai_co_hoi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_su_trang_thai"
    ADD CONSTRAINT "lich_su_trang_thai_co_hoi_id_fkey" FOREIGN KEY ("co_hoi_id") REFERENCES "public"."co_hoi_dich_vu"("co_hoi_id") ON DELETE RESTRICT;


--
-- Name: lich_su_trang_thai lich_su_trang_thai_nguoi_thay_doi_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."lich_su_trang_thai"
    ADD CONSTRAINT "lich_su_trang_thai_nguoi_thay_doi_id_fkey" FOREIGN KEY ("nguoi_thay_doi_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: mau_cham_soc mau_cham_soc_dich_vu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mau_cham_soc"
    ADD CONSTRAINT "mau_cham_soc_dich_vu_id_fkey" FOREIGN KEY ("dich_vu_id") REFERENCES "public"."dich_vu"("dich_vu_id") ON DELETE RESTRICT;


--
-- Name: mau_cham_soc mau_cham_soc_nguoi_duyet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mau_cham_soc"
    ADD CONSTRAINT "mau_cham_soc_nguoi_duyet_id_fkey" FOREIGN KEY ("nguoi_duyet_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: mau_cham_soc mau_cham_soc_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."mau_cham_soc"
    ADD CONSTRAINT "mau_cham_soc_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: moc_cham_soc moc_cham_soc_mau_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."moc_cham_soc"
    ADD CONSTRAINT "moc_cham_soc_mau_id_fkey" FOREIGN KEY ("mau_id") REFERENCES "public"."mau_cham_soc"("mau_id") ON DELETE RESTRICT;


--
-- Name: moc_cham_soc moc_cham_soc_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."moc_cham_soc"
    ADD CONSTRAINT "moc_cham_soc_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: moc_cham_soc moc_cham_soc_vai_tro_phu_trach_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."moc_cham_soc"
    ADD CONSTRAINT "moc_cham_soc_vai_tro_phu_trach_fkey" FOREIGN KEY ("vai_tro_phu_trach") REFERENCES "public"."vai_tro"("vai_tro_id") ON DELETE RESTRICT;


--
-- Name: nguon_khach nguon_khach_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nguon_khach"
    ADD CONSTRAINT "nguon_khach_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: nhan_vien nhan_vien_auth_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien"
    ADD CONSTRAINT "nhan_vien_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;


--
-- Name: nhan_vien nhan_vien_co_so_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien"
    ADD CONSTRAINT "nhan_vien_co_so_id_fkey" FOREIGN KEY ("co_so_id") REFERENCES "public"."co_so"("co_so_id") ON DELETE RESTRICT;


--
-- Name: nhan_vien nhan_vien_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien"
    ADD CONSTRAINT "nhan_vien_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: nhan_vien_vai_tro nhan_vien_vai_tro_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien_vai_tro"
    ADD CONSTRAINT "nhan_vien_vai_tro_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: nhan_vien_vai_tro nhan_vien_vai_tro_nhan_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien_vai_tro"
    ADD CONSTRAINT "nhan_vien_vai_tro_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: nhan_vien_vai_tro nhan_vien_vai_tro_vai_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhan_vien_vai_tro"
    ADD CONSTRAINT "nhan_vien_vai_tro_vai_tro_id_fkey" FOREIGN KEY ("vai_tro_id") REFERENCES "public"."vai_tro"("vai_tro_id") ON DELETE RESTRICT;


--
-- Name: nhat_ky_truy_cap nhat_ky_truy_cap_nguoi_dung_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."nhat_ky_truy_cap"
    ADD CONSTRAINT "nhat_ky_truy_cap_nguoi_dung_id_fkey" FOREIGN KEY ("nguoi_dung_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: phan_bo_thanh_toan phan_bo_thanh_toan_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phan_bo_thanh_toan"
    ADD CONSTRAINT "phan_bo_thanh_toan_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "public"."bao_gia"("bao_gia_id") ON DELETE RESTRICT;


--
-- Name: phan_bo_thanh_toan phan_bo_thanh_toan_ky_id_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phan_bo_thanh_toan"
    ADD CONSTRAINT "phan_bo_thanh_toan_ky_id_bao_gia_id_fkey" FOREIGN KEY ("ky_id", "bao_gia_id") REFERENCES "public"."ky_thanh_toan"("ky_id", "bao_gia_id") ON DELETE RESTRICT;


--
-- Name: phan_bo_thanh_toan phan_bo_thanh_toan_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phan_bo_thanh_toan"
    ADD CONSTRAINT "phan_bo_thanh_toan_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: phan_bo_thanh_toan phan_bo_thanh_toan_thanh_toan_id_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."phan_bo_thanh_toan"
    ADD CONSTRAINT "phan_bo_thanh_toan_thanh_toan_id_bao_gia_id_fkey" FOREIGN KEY ("thanh_toan_id", "bao_gia_id") REFERENCES "public"."thanh_toan"("thanh_toan_id", "bao_gia_id") ON DELETE RESTRICT;


--
-- Name: quyen_vai_tro quyen_vai_tro_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."quyen_vai_tro"
    ADD CONSTRAINT "quyen_vai_tro_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: quyen_vai_tro quyen_vai_tro_vai_tro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."quyen_vai_tro"
    ADD CONSTRAINT "quyen_vai_tro_vai_tro_id_fkey" FOREIGN KEY ("vai_tro_id") REFERENCES "public"."vai_tro"("vai_tro_id") ON DELETE RESTRICT;


--
-- Name: tai_lieu tai_lieu_ca_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tai_lieu"
    ADD CONSTRAINT "tai_lieu_ca_id_khach_hang_id_fkey" FOREIGN KEY ("ca_id", "khach_hang_id") REFERENCES "public"."ca_thuc_hien"("ca_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: tai_lieu tai_lieu_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tai_lieu"
    ADD CONSTRAINT "tai_lieu_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: tai_lieu tai_lieu_nguoi_tai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tai_lieu"
    ADD CONSTRAINT "tai_lieu_nguoi_tai_id_fkey" FOREIGN KEY ("nguoi_tai_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: tai_lieu tai_lieu_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tai_lieu"
    ADD CONSTRAINT "tai_lieu_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: thanh_toan thanh_toan_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thanh_toan"
    ADD CONSTRAINT "thanh_toan_bao_gia_id_fkey" FOREIGN KEY ("bao_gia_id") REFERENCES "public"."bao_gia"("bao_gia_id") ON DELETE RESTRICT;


--
-- Name: thanh_toan thanh_toan_giao_dich_goc_id_bao_gia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thanh_toan"
    ADD CONSTRAINT "thanh_toan_giao_dich_goc_id_bao_gia_id_fkey" FOREIGN KEY ("giao_dich_goc_id", "bao_gia_id") REFERENCES "public"."thanh_toan"("thanh_toan_id", "bao_gia_id") ON DELETE RESTRICT;


--
-- Name: thanh_toan thanh_toan_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thanh_toan"
    ADD CONSTRAINT "thanh_toan_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: thanh_toan thanh_toan_thu_ngan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."thanh_toan"
    ADD CONSTRAINT "thanh_toan_thu_ngan_id_fkey" FOREIGN KEY ("thu_ngan_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: tuong_tac tuong_tac_co_hoi_id_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tuong_tac"
    ADD CONSTRAINT "tuong_tac_co_hoi_id_khach_hang_id_fkey" FOREIGN KEY ("co_hoi_id", "khach_hang_id") REFERENCES "public"."co_hoi_dich_vu"("co_hoi_id", "khach_hang_id") ON DELETE RESTRICT;


--
-- Name: tuong_tac tuong_tac_khach_hang_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tuong_tac"
    ADD CONSTRAINT "tuong_tac_khach_hang_id_fkey" FOREIGN KEY ("khach_hang_id") REFERENCES "public"."khach_hang"("khach_hang_id") ON DELETE RESTRICT;


--
-- Name: tuong_tac tuong_tac_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tuong_tac"
    ADD CONSTRAINT "tuong_tac_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: tuong_tac tuong_tac_nhan_vien_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."tuong_tac"
    ADD CONSTRAINT "tuong_tac_nhan_vien_id_fkey" FOREIGN KEY ("nhan_vien_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: vai_tro vai_tro_nguoi_tao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY "public"."vai_tro"
    ADD CONSTRAINT "vai_tro_nguoi_tao_id_fkey" FOREIGN KEY ("nguoi_tao_id") REFERENCES "public"."nhan_vien"("nhan_vien_id") ON DELETE RESTRICT;


--
-- Name: bao_gia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."bao_gia" ENABLE ROW LEVEL SECURITY;

--
-- Name: ca_thuc_hien; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ca_thuc_hien" ENABLE ROW LEVEL SECURITY;

--
-- Name: canh_bao_y_khoa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."canh_bao_y_khoa" ENABLE ROW LEVEL SECURITY;

--
-- Name: cham_soc_sau_ca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."cham_soc_sau_ca" ENABLE ROW LEVEL SECURITY;

--
-- Name: chi_tiet_bao_gia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."chi_tiet_bao_gia" ENABLE ROW LEVEL SECURITY;

--
-- Name: co_hoi_dich_vu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."co_hoi_dich_vu" ENABLE ROW LEVEL SECURITY;

--
-- Name: co_so; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."co_so" ENABLE ROW LEVEL SECURITY;

--
-- Name: cong_viec; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."cong_viec" ENABLE ROW LEVEL SECURITY;

--
-- Name: danh_gia; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."danh_gia" ENABLE ROW LEVEL SECURITY;

--
-- Name: dich_vu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."dich_vu" ENABLE ROW LEVEL SECURITY;

--
-- Name: dong_y; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."dong_y" ENABLE ROW LEVEL SECURITY;

--
-- Name: giao_dich_sepay; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."giao_dich_sepay" ENABLE ROW LEVEL SECURITY;

--
-- Name: khach_hang; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."khach_hang" ENABLE ROW LEVEL SECURITY;

--
-- Name: ky_thanh_toan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."ky_thanh_toan" ENABLE ROW LEVEL SECURITY;

--
-- Name: lan_tham_kham; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."lan_tham_kham" ENABLE ROW LEVEL SECURITY;

--
-- Name: lich_hen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."lich_hen" ENABLE ROW LEVEL SECURITY;

--
-- Name: lich_su_trang_thai; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."lich_su_trang_thai" ENABLE ROW LEVEL SECURITY;

--
-- Name: mau_cham_soc; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."mau_cham_soc" ENABLE ROW LEVEL SECURITY;

--
-- Name: moc_cham_soc; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."moc_cham_soc" ENABLE ROW LEVEL SECURITY;

--
-- Name: nguon_khach; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."nguon_khach" ENABLE ROW LEVEL SECURITY;

--
-- Name: nhan_vien; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."nhan_vien" ENABLE ROW LEVEL SECURITY;

--
-- Name: nhan_vien_vai_tro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."nhan_vien_vai_tro" ENABLE ROW LEVEL SECURITY;

--
-- Name: nhat_ky_truy_cap; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."nhat_ky_truy_cap" ENABLE ROW LEVEL SECURITY;

--
-- Name: phan_bo_thanh_toan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."phan_bo_thanh_toan" ENABLE ROW LEVEL SECURITY;

--
-- Name: quyen_vai_tro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."quyen_vai_tro" ENABLE ROW LEVEL SECURITY;

--
-- Name: tai_lieu; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tai_lieu" ENABLE ROW LEVEL SECURITY;

--
-- Name: thanh_toan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."thanh_toan" ENABLE ROW LEVEL SECURITY;

--
-- Name: tuong_tac; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."tuong_tac" ENABLE ROW LEVEL SECURITY;

--
-- Name: vai_tro; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."vai_tro" ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



COMMIT;
