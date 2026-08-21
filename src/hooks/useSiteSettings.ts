import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  is_default: boolean;
  payment_bkash: string;
  payment_nagad: string;
  hero_badge: string;
  hero_title: string;
  hero_highlight: string;
  hero_description: string;
  hero_image_url: string | null;
  primary_hue: number;
  primary_saturation: number;
  primary_lightness: number;
  stat_students: string;
  stat_lessons: string;
  stat_instructors: string;
  stat_materials: string;
  logo_url: string | null;
  og_image_url: string | null;
  favicon_url: string | null;
  site_name: string;
};

export const defaultSiteSettings: SiteSettings = {
  is_default: true,
  payment_bkash: "01633005730",
  payment_nagad: "01711950646",
  hero_badge: "Welcome to Premium Course",
  hero_title: "Master New Skills with",
  hero_highlight: "Premium Online Courses",
  hero_description:
    "Join thousands of students learning from expert instructors. Pay with bKash and Nagad.",
  hero_image_url: null,
  primary_hue: 142,
  primary_saturation: 70,
  primary_lightness: 42,
  stat_students: "10k+",
  stat_lessons: "500+",
  stat_instructors: "50+",
  stat_materials: "1k+",
  logo_url: null,
  og_image_url: null,
  favicon_url: null,
  site_name: "Premium Course",
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return { ...defaultSiteSettings, ...(data ?? {}) } as SiteSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
};
