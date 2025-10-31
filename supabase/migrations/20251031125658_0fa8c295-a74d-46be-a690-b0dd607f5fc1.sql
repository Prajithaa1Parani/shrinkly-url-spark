-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create links table
CREATE TABLE public.links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  custom_alias TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by_ip TEXT,
  disabled BOOLEAN DEFAULT false NOT NULL,
  click_count INTEGER DEFAULT 0 NOT NULL
);

-- Create clicks table for analytics
CREATE TABLE public.clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES public.links(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ip TEXT,
  country TEXT,
  referrer TEXT,
  user_agent TEXT
);

-- Create geo cache table
CREATE TABLE public.geo_cache (
  ip TEXT PRIMARY KEY,
  country TEXT NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create indexes for performance
CREATE INDEX idx_clicks_link_id ON public.clicks(link_id);
CREATE INDEX idx_clicks_timestamp ON public.clicks(timestamp DESC);
CREATE INDEX idx_links_short_id ON public.links(short_id);
CREATE INDEX idx_links_custom_alias ON public.links(custom_alias) WHERE custom_alias IS NOT NULL;
CREATE INDEX idx_links_expires_at ON public.links(expires_at) WHERE expires_at IS NOT NULL;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to increment click count
CREATE OR REPLACE FUNCTION public.increment_click_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.links
  SET click_count = click_count + 1
  WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-increment click count
CREATE TRIGGER on_click_insert
  AFTER INSERT ON public.clicks
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_click_count();

-- Enable Row Level Security
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geo_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for links (public read, admin write)
CREATE POLICY "Anyone can view active links"
  ON public.links FOR SELECT
  USING (NOT disabled AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Admins can insert links"
  ON public.links FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update links"
  ON public.links FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete links"
  ON public.links FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for clicks (public insert for tracking, admin read)
CREATE POLICY "Anyone can insert clicks"
  ON public.clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view clicks"
  ON public.clicks FOR SELECT
  USING (true);

-- RLS Policies for geo_cache (public read/write for caching)
CREATE POLICY "Anyone can read geo cache"
  ON public.geo_cache FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert geo cache"
  ON public.geo_cache FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update geo cache"
  ON public.geo_cache FOR UPDATE
  USING (true);

-- RLS Policies for user_roles (only admins can manage)
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert sample data: 3 demo links
INSERT INTO public.links (short_id, long_url, created_by_ip) VALUES
  ('demo01', 'https://lovable.dev', '192.168.1.1'),
  ('demo02', 'https://github.com', '192.168.1.2'),
  ('custom', 'https://google.com', '192.168.1.3');

-- Update the custom alias link
UPDATE public.links SET custom_alias = 'custom' WHERE short_id = 'custom';

-- Insert sample click events (10 clicks across the demo links)
INSERT INTO public.clicks (link_id, ip, country, referrer, user_agent) 
SELECT 
  l.id,
  '192.168.1.' || (random() * 255)::int::text,
  CASE (random() * 4)::int
    WHEN 0 THEN 'United States'
    WHEN 1 THEN 'United Kingdom'
    WHEN 2 THEN 'Germany'
    WHEN 3 THEN 'France'
    ELSE 'Canada'
  END,
  CASE (random() * 3)::int
    WHEN 0 THEN 'https://google.com'
    WHEN 1 THEN 'https://twitter.com'
    ELSE 'direct'
  END,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM public.links l, generate_series(1, 3);

-- Add some geo cache entries
INSERT INTO public.geo_cache (ip, country) VALUES
  ('192.168.1.1', 'United States'),
  ('192.168.1.2', 'United Kingdom'),
  ('192.168.1.3', 'Germany');