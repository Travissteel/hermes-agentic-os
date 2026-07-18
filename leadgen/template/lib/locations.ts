import locationsData from "@/data/locations.json";

export interface ServiceArea {
  slug: string;
  name: string;
  postcode: string;
  blurb: string;
}

const locations = locationsData as ServiceArea[];

export function getAllAreas(): ServiceArea[] {
  return locations;
}

export function getAreaBySlug(slug: string): ServiceArea | undefined {
  return locations.find((a) => a.slug === slug);
}
