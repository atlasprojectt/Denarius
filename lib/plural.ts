/** Formats a counted noun without provisional "(s)" copy. */
export function counted(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

