export interface ProjectedVessel<T> {
  vessel: T;
  x: number;
  y: number;
}

/** Keep markers separated in screen space while retaining every underlying position. */
export function groupProjectedVessels<T>(projected: ProjectedVessel<T>[], minSpacing: number) {
  const groups: { anchor: ProjectedVessel<T>; members: T[] }[] = [];
  for (const point of projected) {
    const nearby = groups.find(({ anchor }) =>
      (point.x - anchor.x) ** 2 + (point.y - anchor.y) ** 2 < minSpacing ** 2
    );
    if (nearby) nearby.members.push(point.vessel);
    else groups.push({ anchor: point, members: [point.vessel] });
  }
  return groups;
}
