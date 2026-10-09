export interface Sticker {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number | null;
  rotation: number;
  layer?: "front" | "back";
  name: string;
  image_x?: number;
  image_y?: number;
  image_width?: number;
  audio?: string;
  audio_url?: string;
  click_text?: string;
  // Mobile specific overrides
  mobile_x?: number;
  mobile_y?: number;
  mobile_width?: number;
  mobile_rotation?: number;
  mobile_layer?: "front" | "back";
  mobile_hidden?: boolean;
}

export interface SlideContentData {
  text?: string;
  headline?: string;
  items?: { label: string; value: string }[];
  sections?: { title: string; items?: string[] }[];
}

export interface Slide {
  slug: string;
  title: string;
  type: string;
  order: number;
  content: SlideContentData;
  is_visible?: boolean;
  button_text: string | null;
  button_link: string | null;
  id: string;
}

export interface HotTake {
  id: string;
  content: string;
  category: string | null;
}
