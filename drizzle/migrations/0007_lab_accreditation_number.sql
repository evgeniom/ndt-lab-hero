ALTER TABLE public.lab_requests ADD COLUMN accreditation_number text NOT NULL DEFAULT '';
ALTER TABLE public.labs ADD COLUMN accreditation_number text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.lab_requests.accreditation_number IS 'Accreditation certificate number supplied during lab registration';
COMMENT ON COLUMN public.labs.accreditation_number IS 'Accreditation certificate number copied from the approved registration';