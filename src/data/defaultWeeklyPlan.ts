import { ClassId, SchoolDay, ClassworkEntry, HomeworkEntry, TomorrowSpecialNote } from '../types';
import { WEEK1_CLASSWORK, WEEK1_HOMEWORK, WEEK1_SPECIAL_NOTES } from './week1Plan';
import { WEEK2_CLASSWORK, ALL_LINK_AND_WEEK2_HOMEWORK, WEEK2_SPECIAL_NOTES } from './week2Plan';
import { WEEK3_CLASSWORK, WEEK3_HOMEWORK, WEEK3_SPECIAL_NOTES } from './week3Plan';

export type { TomorrowSpecialNote };

export const SPECIAL_TEACHER_NOTES: TomorrowSpecialNote[] = [
  ...WEEK1_SPECIAL_NOTES,
  ...WEEK2_SPECIAL_NOTES,
  ...WEEK3_SPECIAL_NOTES,
];

export const DEFAULT_CLASSWORK: ClassworkEntry[] = [
  ...WEEK1_CLASSWORK,
  ...WEEK2_CLASSWORK,
  ...WEEK3_CLASSWORK,
];
export const INITIAL_CLASSWORK: ClassworkEntry[] = [
  ...WEEK1_CLASSWORK,
  ...WEEK2_CLASSWORK,
  ...WEEK3_CLASSWORK,
];

export const DEFAULT_HOMEWORK: HomeworkEntry[] = [
  ...WEEK1_HOMEWORK,
  ...ALL_LINK_AND_WEEK2_HOMEWORK,
  ...WEEK3_HOMEWORK,
];
export const INITIAL_HOMEWORK: HomeworkEntry[] = [
  ...WEEK1_HOMEWORK,
  ...ALL_LINK_AND_WEEK2_HOMEWORK,
  ...WEEK3_HOMEWORK,
];
