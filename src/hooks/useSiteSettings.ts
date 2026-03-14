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
  primary_hue: number;
  primary_saturation: number;
  primary_lightness: number;
};

export const defaultSiteSettings: SiteSettings = {
  is_default: true,
  payment_bkash: "01633005730",
  payment_nagad: "01711950646",
  hero_badge: "Welcome to CourseHUB",
  hero_title: "Master New Skills with",
  hero_highlight: "Premium Online Courses",
  hero_description: "Join thousands of students learning from expert instructors. Pay with bKash and Nagad.",
  primary_hue: 28,
  primary_saturation: 95,
  primary_lightness: 50,
};

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("is_default,payment_bkash,payment_nagad,hero_badge,hero_title,hero_highlight,hero_description,primary_hue,primary_saturation,primary_lightness")
        .eq("is_default", true)
        .maybeSingle();

      if (error) throw error;
      return { ...defaultSiteSettings, ...(data ?? {}) } as SiteSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
};
